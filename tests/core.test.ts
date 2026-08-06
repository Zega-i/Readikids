/**
 * Unit test core engine ReadiKids AI (scope v4.0).
 * Jalankan: npm test  (atau: npx tsx tests/core.test.ts)
 *
 * Sengaja memakai node:assert tanpa framework agar bisa jalan
 * bahkan sebelum dependensi UI terpasang.
 */
import assert from 'node:assert/strict';
import {
  aggregateTrials,
  calculateCompositeRiskScore,
  computeNLEE,
  THRESHOLDS,
} from '../src/telemetry/MetricCalculator';
import { assessRisk, classifyLevel, LEVEL_THRESHOLDS } from '../src/ml/heuristic';
import { generateLocalCompanionPlan } from '../src/utils/fallbackTemplates';
import {
  buildCompanionPlanPrompt,
  generateCompanionPlan,
  parseGeminiPlan,
} from '../src/ml/llmRecommendation';
import {
  checkRescreeningCooldown,
  COOLDOWN_MIN_DAYS,
  validateAgeYears,
  validatePseudonym,
} from '../src/profiles/profileRules';
import { BehavioralSimulator } from '../src/utils/simulation';
import { TelemetryLogger, type TelemetryStore } from '../src/telemetry/TelemetryLogger';
import {
  REFERRAL_SERVICES,
  WHEN_TO_SEEK_HELP,
  CONSULTATION_CHECKLIST,
} from '../src/referral/referralGuide';
import {
  buildReferralReportPdf,
  PDF_DISCLAIMER,
  sanitizePdfText,
} from '../src/referral/reportPdf';
import {
  buildChildExport,
  parseChildExport,
  remapExportIds,
  EXPORT_FORMAT,
} from '../src/utils/dataTransfer';
import type {
  ChildProfile,
  ChildProfileForPlan,
  RiskAssessment,
  SessionRecord,
  TrialRecord,
} from '../src/types/telemetry';

let passed = 0;
function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  ✅ ${name}`);
    })
    .catch((err) => {
      console.error(`  ❌ ${name}`);
      console.error(err);
      process.exitCode = 1;
    });
}

function makeTrial(partial: Partial<TrialRecord>): TrialRecord {
  return {
    sessionId: 's1',
    gameId: 'visual',
    trialIndex: 0,
    stimulus: 'a',
    isReversalTarget: false,
    latencyMs: 1000,
    hesitationMs: 100,
    misclickCount: 0,
    correct: true,
    nleePercent: null,
    completedAt: 0,
    ...partial,
  };
}

const main = async () => {
  console.log('\n— MetricCalculator —');

  await test('computeNLEE: dasar & clamp 100', () => {
    assert.equal(computeNLEE(70, 50, 100), 20);
    assert.equal(computeNLEE(0, 50, 100), 50);
    assert.equal(computeNLEE(500, 0, 100), 100); // clamp
    assert.equal(computeNLEE(10, 10, 0), 0); // garis invalid → 0
  });

  await test('aggregateTrials: memisahkan reversal vs normal & rerata NLEE', () => {
    const trials = [
      makeTrial({ stimulus: 'a', latencyMs: 1000 }),
      makeTrial({ stimulus: 'm', latencyMs: 1200 }),
      makeTrial({ stimulus: 'b', isReversalTarget: true, latencyMs: 3000 }),
      makeTrial({ gameId: 'numberline', nleePercent: 10 }),
      makeTrial({ gameId: 'numberline', nleePercent: 20 }),
    ];
    const m = aggregateTrials(trials);
    assert.equal(m.normalLatencyMs, 1100);
    assert.equal(m.reversalLatencyMs, 3000);
    assert.equal(m.nleePercent, 15);
    assert.equal(m.trialCount, 5);
    assert.equal(m.accuracy, 1);
  });

  await test('komposit: anak tipikal → skor rendah', () => {
    const r = calculateCompositeRiskScore({
      normalLatencyMs: 1000,
      reversalLatencyMs: 1100, // ratio 1.1 — normal
      hesitationMs: 500,
      totalTimeMs: 10000, // HI 0.05 — normal
      nleePercent: 4, // jauh di bawah 15%
      accuracy: 0.95,
      misclickPerTrial: 0.1,
      trialCount: 20,
    });
    assert.ok(r.compositeScore < LEVEL_THRESHOLDS.MEDIUM, `score=${r.compositeScore}`);
  });

  await test('komposit: tepat di semua ambang riset → skor 100', () => {
    const r = calculateCompositeRiskScore({
      normalLatencyMs: 1000,
      reversalLatencyMs: 1000 * THRESHOLDS.REVERSAL_RATIO,
      hesitationMs: THRESHOLDS.HESITATION_INDEX * 10000,
      totalTimeMs: 10000,
      nleePercent: THRESHOLDS.NLEE_PERCENT,
      accuracy: 0.5,
      misclickPerTrial: 1,
      trialCount: 20,
    });
    assert.equal(r.compositeScore, 100);
  });

  await test('komposit: NLEE absen → bobot didistribusi ulang (tetap 0–100)', () => {
    const r = calculateCompositeRiskScore({
      normalLatencyMs: 1000,
      reversalLatencyMs: 2500,
      hesitationMs: 3500,
      totalTimeMs: 10000,
      nleePercent: null, // numberline tidak dimainkan
      accuracy: 0.8,
      misclickPerTrial: 0,
      trialCount: 10,
    });
    // reversal=100 & HI=100, tanpa NLEE → tetap 100, bukan 70.
    assert.equal(r.compositeScore, 100);
    assert.equal(r.raw.nleePercent, null);
  });

  console.log('\n— Heuristic Risk Engine —');

  await test('classifyLevel: batas LOW/MEDIUM/HIGH', () => {
    assert.equal(classifyLevel(0), 'LOW');
    assert.equal(classifyLevel(LEVEL_THRESHOLDS.MEDIUM - 1), 'LOW');
    assert.equal(classifyLevel(LEVEL_THRESHOLDS.MEDIUM), 'MEDIUM');
    assert.equal(classifyLevel(LEVEL_THRESHOLDS.HIGH - 1), 'MEDIUM');
    assert.equal(classifyLevel(LEVEL_THRESHOLDS.HIGH), 'HIGH');
    assert.equal(classifyLevel(100), 'HIGH');
  });

  await test('assessRisk: pola disleksia → domain dyslexia HIGH, dyscalculia LOW', () => {
    const a = assessRisk({
      sessionId: 's1',
      childRef: 'anon-01',
      metrics: {
        normalLatencyMs: 1000,
        reversalLatencyMs: 3200, // ratio 3.2 >> 2.5
        hesitationMs: 4000,
        totalTimeMs: 10000, // HI 0.4 > 0.35
        nleePercent: 3, // berhitung baik
        accuracy: 0.7,
        misclickPerTrial: 0.5,
        trialCount: 15,
      },
    });
    assert.equal(a.domains.dyslexia, 'HIGH');
    assert.equal(a.domains.dyscalculia, 'LOW');
    assert.equal(a.level, 'HIGH');
    assert.equal(a.childRef, 'anon-01');
  });

  await test('assessRisk: pola diskalkulia → dyscalculia HIGH, dyslexia LOW', () => {
    const a = assessRisk({
      sessionId: 's2',
      childRef: 'anon-02',
      metrics: {
        normalLatencyMs: 1000,
        reversalLatencyMs: 1050,
        hesitationMs: 800,
        totalTimeMs: 10000,
        nleePercent: 30, // 2× ambang
        accuracy: 0.75,
        misclickPerTrial: 0.2,
        trialCount: 15,
      },
    });
    assert.equal(a.domains.dyscalculia, 'HIGH');
    assert.equal(a.domains.dyslexia, 'LOW');
  });

  console.log('\n— Aturan Profil (usia, pseudonym, cooldown) —');

  await test('validateAgeYears: terima 6–9, tolak di luar & non-integer', () => {
    for (const age of [6, 7, 8, 9]) {
      assert.equal(validateAgeYears(age).valid, true, `usia ${age} harus valid`);
    }
    assert.equal(validateAgeYears(5).valid, false);
    assert.equal(validateAgeYears(10).valid, false);
    assert.equal(validateAgeYears(7.5).valid, false);
    assert.match(validateAgeYears(5).reason ?? '', /6–9 tahun/);
    assert.match(validateAgeYears(10).reason ?? '', /profesional/);
  });

  await test('validatePseudonym: tolak kosong & terlalu panjang', () => {
    assert.equal(validatePseudonym('Adi').valid, true);
    assert.equal(validatePseudonym('   ').valid, false);
    assert.equal(validatePseudonym('x'.repeat(31)).valid, false);
  });

  await test('cooldown: belum pernah skrining → bebas', () => {
    const c = checkRescreeningCooldown(null, Date.now());
    assert.equal(c.inCooldown, false);
    assert.equal(c.daysSinceLast, null);
  });

  await test('cooldown: < 14 hari → soft-block dengan pesan; ≥ 14 hari → bebas', () => {
    const now = 1_000_000_000_000;
    const day = 24 * 60 * 60 * 1000;
    const blocked = checkRescreeningCooldown(now - 5 * day, now);
    assert.equal(blocked.inCooldown, true);
    assert.equal(blocked.daysSinceLast, 5);
    assert.equal(blocked.daysRemaining, COOLDOWN_MIN_DAYS - 5);
    assert.match(blocked.message ?? '', /hafal|jenuh/);

    const free = checkRescreeningCooldown(now - COOLDOWN_MIN_DAYS * day, now);
    assert.equal(free.inCooldown, false);
    assert.equal(free.daysRemaining, 0);
  });

  console.log('\n— Behavioral Simulator —');

  await test('simulator nonaktif → data tidak berubah', () => {
    const sim = new BehavioralSimulator();
    const trial = makeTrial({ isReversalTarget: true, nleePercent: 10 });
    assert.deepEqual(sim.injectAnomaly(trial), trial);
  });

  await test('simulator aktif → anomali sesuai profil & hesitation ≤ latency', () => {
    const sim = new BehavioralSimulator();
    assert.equal(sim.toggle(), true);
    const out = sim.injectAnomaly(
      makeTrial({ isReversalTarget: true, latencyMs: 1000, hesitationMs: 400, nleePercent: 80 }),
    );
    assert.equal(out.latencyMs, 3200); // ×3.2
    assert.ok(out.hesitationMs <= out.latencyMs);
    assert.equal(out.nleePercent, 100); // 80+28 → clamp 100
    assert.equal(sim.toggle(), false);
  });

  console.log('\n— Rencana Pendampingan (fallback & parsing) —');

  const highRiskProfile: ChildProfileForPlan = {
    childRef: 'anon-01',
    ageYears: 7,
    assessment: assessRisk({
      sessionId: 's1',
      childRef: 'anon-01',
      metrics: {
        normalLatencyMs: 1000,
        reversalLatencyMs: 3200,
        hesitationMs: 4000,
        totalTimeMs: 10000,
        nleePercent: 30,
        accuracy: 0.6,
        misclickPerTrial: 1,
        trialCount: 15,
      },
    }),
  };

  await test('generateLocalCompanionPlan: struktur lengkap + rujukan + disclaimer', () => {
    const plan = generateLocalCompanionPlan(highRiskProfile);
    assert.equal(plan.source, 'local-template');
    assert.ok(plan.companionActivities.length >= 3);
    assert.ok(plan.referralGuidance.length >= 2);
    assert.match(plan.disclaimer, /BUKAN diagnosis/);
    // Bahasa observasi, bukan vonis: summary tidak boleh memvonis label.
    assert.ok(!plan.summary.includes('disleksia'), 'summary tidak boleh melabeli anak');
    assert.match(plan.summary, /konsultasi/); // level HIGH → ajakan konsultasi
  });

  await test('generateLocalCompanionPlan: level LOW → rujukan pasif (tanpa keharusan)', () => {
    const lowProfile: ChildProfileForPlan = {
      childRef: 'anon-03',
      ageYears: 8,
      assessment: assessRisk({
        sessionId: 's3',
        childRef: 'anon-03',
        metrics: {
          normalLatencyMs: 1000,
          reversalLatencyMs: 1100,
          hesitationMs: 500,
          totalTimeMs: 10000,
          nleePercent: 4,
          accuracy: 0.95,
          misclickPerTrial: 0.1,
          trialCount: 20,
        },
      }),
    };
    const plan = generateLocalCompanionPlan(lowProfile);
    assert.ok(plan.referralGuidance.length >= 1);
    assert.match(plan.referralGuidance[0], /belum ada pola/);
  });

  await test('generateCompanionPlan tanpa API key → jatuh ke template lokal', async () => {
    // Supaya tidak mencetak stack trace TypeError ke console saat testing
    const originalFetch = globalThis.fetch;
    const originalWarn = console.warn;
    globalThis.fetch = () => Promise.reject(new Error('Simulated fetch error'));
    console.warn = () => {}; // Silence the warning in test

    try {
      const plan = await generateCompanionPlan(highRiskProfile);
      assert.equal(plan.source, 'local-template');
    } finally {
      globalThis.fetch = originalFetch;
      console.warn = originalWarn;
    }
  });

  await test('buildCompanionPlanPrompt: tidak bocorkan childRef & minta JSON', () => {
    const prompt = buildCompanionPlanPrompt(highRiskProfile);
    assert.ok(!prompt.includes('anon-01'), 'prompt tidak boleh memuat identitas');
    assert.match(prompt, /companionActivities/);
    assert.match(prompt, /referralGuidance/);
    assert.match(prompt, /usiaTahun/);
    assert.ok(!prompt.includes('kelas'), 'prompt tidak lagi memakai konsep kelas');
  });

  await test('parseGeminiPlan: terima fence ```json & tolak skema salah', () => {
    const ok = parseGeminiPlan(
      '```json\n{"summary":"ok","companionActivities":["a"],"referralGuidance":["b"]}\n```',
    );
    assert.equal(ok.summary, 'ok');
    assert.throws(() => parseGeminiPlan('{"summary":"x"}'));
    // Skema lama (teacherRecommendations) juga harus ditolak.
    assert.throws(() =>
      parseGeminiPlan('{"summary":"x","teacherRecommendations":["a"],"parentActivities":["b"]}'),
    );
  });

  console.log('\n— TelemetryLogger (mock store) —');

  await test('batching: flush otomatis tiap 60 event + flush saat endSession', async () => {
    const written: unknown[][] = [];
    const putSessions: SessionRecord[] = [];
    const store: TelemetryStore = {
      sessions: {
        put: (async (s: SessionRecord) => {
          putSessions.push(s);
          return 's1';
        }) as TelemetryStore['sessions']['put'],
        update: async () => 1,
      },
      events: {
        bulkAdd: (async (items: unknown[]) => {
          written.push(items);
          return items.length;
        }) as TelemetryStore['events']['bulkAdd'],
      },
      trials: { add: async () => 1 },
    };
    let t = 0;
    const logger = new TelemetryLogger(store, { now: () => (t += 16) });

    await logger.startSession({
      id: 's1',
      childRef: 'anon-01',
      ageYears: 7,
      games: ['visual'],
      cooldownOverrideReason: 'sesi sebelumnya terputus',
    });
    // EVALUASI.md #6: alasan override cooldown WAJIB ikut tersimpan.
    assert.equal(putSessions.length, 1);
    assert.equal(putSessions[0].cooldownOverrideReason, 'sesi sebelumnya terputus');
    assert.equal(putSessions[0].ageYears, 7);
    for (let i = 0; i < 65; i++) logger.log('visual', 0, 'pointer_move', { x: i });
    // 1 event session_start + 65 → satu batch 60 sudah tertulis otomatis
    assert.equal(written.length, 1);
    assert.equal(written[0].length, 60);

    await logger.endSession();
    assert.equal(logger.activeSessionId, null);
    const total = written.reduce((a, b) => a + b.length, 0);
    assert.equal(total, 67); // 65 + session_start + session_end
  });

  await test('log tanpa sesi aktif → diabaikan tanpa error', () => {
    const store: TelemetryStore = {
      sessions: { put: async () => 's', update: async () => 1 },
      events: {
        bulkAdd: (async () => {
          throw new Error('tidak boleh terpanggil');
        }) as TelemetryStore['events']['bulkAdd'],
      },
      trials: { add: async () => 1 },
    };
    const logger = new TelemetryLogger(store);
    logger.log('visual', 0, 'hover'); // no-op
  });

  console.log('\n— Referral Bridge (panduan + PDF) —');

  await test('referralGuide: konten lengkap & bahasa observasi', () => {
    assert.ok(REFERRAL_SERVICES.length >= 3);
    for (const level of ['LOW', 'MEDIUM', 'HIGH'] as const) {
      assert.ok(WHEN_TO_SEEK_HELP[level].length > 50, `narasi ${level} terlalu pendek`);
    }
    assert.match(WHEN_TO_SEEK_HELP.HIGH, /BUKAN berarti/);
    assert.ok(CONSULTATION_CHECKLIST.length >= 3);
  });

  await test('sanitizePdfText: normalisasi tipografi & buang emoji', () => {
    assert.equal(sanitizePdfText('a–b — c'), 'a-b - c');
    assert.equal(sanitizePdfText('“kutipan” ‘x’'), '"kutipan" \'x\'');
    assert.equal(sanitizePdfText('skor ≥ 40, ±3'), 'skor >= 40, +/-3');
    assert.equal(sanitizePdfText('halo 🎉 dunia'), 'halo  dunia');
  });

  const sampleChild: ChildProfile = {
    id: 'child-1',
    pseudonym: 'Kiko',
    ageYears: 7,
    consentAt: 1000,
    createdAt: 1000,
  };

  await test('buildReferralReportPdf: PDF valid multi-halaman + metadata benar', async () => {
    const bytes = await buildReferralReportPdf({
      child: sampleChild,
      assessment: highRiskProfile.assessment,
      history: [
        { sessionId: 's1', createdAt: 1000, compositeScore: 80, hesitationIndex: 0.4, nleePercent: 30 },
        { sessionId: 's2', createdAt: 2000, compositeScore: 70, hesitationIndex: 0.35, nleePercent: 25 },
      ],
      plan: generateLocalCompanionPlan(highRiskProfile),
    });
    // Header berkas PDF valid.
    const head = Buffer.from(bytes.slice(0, 5)).toString('ascii');
    assert.equal(head, '%PDF-');
    assert.ok(bytes.length > 2000, 'PDF terlalu kecil — konten kemungkinan kosong');
    // Muat ulang untuk verifikasi struktural (konten stream terkompresi,
    // jadi teks tidak bisa dicari literal di byte mentah).
    const { PDFDocument } = await import('pdf-lib');
    const loaded = await PDFDocument.load(bytes);
    assert.ok(loaded.getPageCount() >= 2, `hanya ${loaded.getPageCount()} halaman`);
    assert.match(loaded.getTitle() ?? '', /Laporan Rujukan/);
    // Disclaimer resmi tidak boleh berubah bunyi intinya.
    assert.match(PDF_DISCLAIMER, /bukan Surat Diagnosis Medis\/Psikologis Resmi/);
  });

  console.log('\n— Ekspor/Impor Data (Tier 1.5) —');

  const sampleSession: SessionRecord = {
    id: 'sess-1',
    childRef: 'child-1',
    ageYears: 7,
    startedAt: 1000,
    endedAt: 2000,
    games: ['visual'],
  };
  const sampleAssessment: RiskAssessment = { ...highRiskProfile.assessment, id: 9, sessionId: 'sess-1', childRef: 'child-1' };

  await test('ekspor→parse roundtrip: struktur utuh & id auto-increment dibuang', () => {
    const trial = { ...makeTrial({ sessionId: 'sess-1' }), id: 5 };
    const pkg = buildChildExport(sampleChild, [sampleSession], [trial], [sampleAssessment]);
    assert.equal(pkg.format, EXPORT_FORMAT);
    assert.equal(pkg.trials[0].id, undefined);
    assert.equal(pkg.assessments[0].id, undefined);

    const parsed = parseChildExport(JSON.stringify(pkg));
    assert.equal(parsed.profile.pseudonym, 'Kiko');
    assert.equal(parsed.sessions.length, 1);
    assert.equal(parsed.trials.length, 1);
  });

  await test('parseChildExport: tolak JSON rusak, format asing, & versi lebih baru', () => {
    assert.throws(() => parseChildExport('bukan json'), /JSON/);
    assert.throws(() => parseChildExport('{"format":"lain"}'), /bukan berkas ekspor/);
    const pkg = buildChildExport(sampleChild, [], [], []);
    assert.throws(
      () => parseChildExport(JSON.stringify({ ...pkg, version: 999 })),
      /versi aplikasi yang lebih baru/,
    );
  });

  await test('remapExportIds: semua id baru & relasi childRef/sessionId tetap konsisten', () => {
    const trial = makeTrial({ sessionId: 'sess-1' });
    const pkg = buildChildExport(sampleChild, [sampleSession], [trial], [sampleAssessment]);
    let n = 0;
    const remapped = remapExportIds(pkg, () => `new-${++n}`);
    assert.notEqual(remapped.profile.id, 'child-1');
    assert.equal(remapped.sessions[0].childRef, remapped.profile.id);
    assert.equal(remapped.trials[0].sessionId, remapped.sessions[0].id);
    assert.equal(remapped.assessments[0].sessionId, remapped.sessions[0].id);
    assert.equal(remapped.assessments[0].childRef, remapped.profile.id);
  });

  console.log(`\n${passed} tes lulus.${process.exitCode ? ' (ADA KEGAGALAN)' : ''}`);
};

void main();
