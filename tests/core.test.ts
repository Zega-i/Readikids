/**
 * Unit test core engine ReadiKids AI (arsitektur v2 — skrining membaca).
 * Jalankan: npm test  (atau: npx tsx tests/core.test.ts)
 *
 * Cakupan v2: MetricCalculator (skill→fase), Heuristic (level fase + gap
 * fase–usia), Aturan Profil, TelemetryLogger. Tes untuk modul yang belum
 * dimigrasi (LLM/fallback/referral/ekspor) akan dipulihkan saat modul
 * tersebut ikut dirombak (lihat docs/refactor-v2.md).
 */
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { computeSkillMetric, aggregateByPhase } from '../src/telemetry/MetricCalculator';
import {
  assessReading,
  classifyPhaseLevel,
  classifyGapLevel,
  PHASE_THRESHOLDS,
} from '../src/ml/heuristic';
import {
  checkRescreeningCooldown,
  COOLDOWN_MIN_DAYS,
  validateAgeYears,
  validatePseudonym,
} from '../src/profiles/profileRules';
import { TelemetryLogger, type TelemetryStore } from '../src/telemetry/TelemetryLogger';
import {
  SKILL_MECHANIC,
  SKILL_PHASE,
  type ChildProfile,
  type CompanionPlanResult,
  type PhaseId,
  type PhaseResult,
  type RiskAssessment,
  type RiskLevel,
  type SessionRecord,
  type SkillId,
  type TrialRecord,
} from '../src/types/telemetry';
import { buildReferralReportPdf, sanitizePdfText } from '../src/referral/reportPdf';
import {
  buildSessionCarbonInput,
  classifyLoadClass,
  DEFAULT_FACTORS,
  estimateSessionCarbon,
} from '../src/utils/carbonFootprint';

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

function makeTrial(partial: Partial<TrialRecord> & { skillId?: SkillId } = {}): TrialRecord {
  const skillId: SkillId = partial.skillId ?? 'letter_name';
  return {
    sessionId: 's1',
    skillId,
    mechanicId: partial.mechanicId ?? SKILL_MECHANIC[skillId],
    phase: SKILL_PHASE[skillId],
    trialIndex: 0,
    stimulus: 'b',
    isDemo: false,
    latencyMs: 1000,
    hesitationMs: 0,
    misclickCount: 0,
    correct: true,
    errorType: null,
    selfCorrected: false,
    completedAt: 0,
    ...partial,
    // pastikan phase konsisten dengan skillId final
    ...(partial.skillId ? { phase: SKILL_PHASE[partial.skillId] } : {}),
  };
}

/** Buat n trial untuk satu skill dengan sebagian benar. */
function skillTrials(skillId: SkillId, correctCount: number, total: number): TrialRecord[] {
  return Array.from({ length: total }, (_, i) =>
    makeTrial({
      skillId,
      trialIndex: i,
      correct: i < correctCount,
      errorType: i < correctCount ? null : 'random',
    }),
  );
}

const main = async () => {
  console.log('\n— MetricCalculator (skill → fase) —');

  await test('computeSkillMetric: akurasi, error profile, demo diabaikan', () => {
    const trials = [
      makeTrial({ skillId: 'letter_discrim', correct: true }),
      makeTrial({ skillId: 'letter_discrim', correct: true }),
      makeTrial({ skillId: 'letter_discrim', correct: false, errorType: 'mirror' }),
      makeTrial({ skillId: 'letter_discrim', isDemo: true, correct: false, errorType: 'mirror' }),
    ];
    const m = computeSkillMetric(trials);
    assert.equal(m.skillId, 'letter_discrim');
    assert.equal(m.phase, 1);
    assert.equal(m.itemsScored, 3); // demo tidak dihitung
    assert.ok(Math.abs(m.accuracy - 2 / 3) < 1e-9);
    assert.equal(m.errorProfile.mirror, 1);
    assert.equal(m.reliability, 67); // 2/3 × 1 × 100
  });

  await test('computeSkillMetric: keraguan menurunkan reliability', () => {
    const m = computeSkillMetric([
      makeTrial({ correct: true, latencyMs: 1000, hesitationMs: 500 }),
    ]);
    // akurasi 1, hesitationRatio 0.5 → consistency 0.5 → reliability 50
    assert.equal(m.reliability, 50);
  });

  await test('aggregateByPhase: kelompok per fase, terurut, reliability rata-rata', () => {
    const trials = [
      ...skillTrials('orient', 2, 2), // fase 0
      ...skillTrials('letter_name', 1, 2), // fase 1, akurasi 0.5
    ];
    const aggs = aggregateByPhase(trials);
    assert.equal(aggs.length, 2);
    assert.equal(aggs[0].phase, 0);
    assert.equal(aggs[0].reliability, 100);
    assert.equal(aggs[1].phase, 1);
    assert.equal(aggs[1].reliability, 50);
  });

  console.log('\n— Heuristic (level fase + gap fase–usia) —');

  await test('classifyPhaseLevel: batas REACHED/WATCH', () => {
    assert.equal(classifyPhaseLevel(PHASE_THRESHOLDS.REACHED), 'LOW');
    assert.equal(classifyPhaseLevel(PHASE_THRESHOLDS.REACHED - 1), 'MEDIUM');
    assert.equal(classifyPhaseLevel(PHASE_THRESHOLDS.WATCH), 'MEDIUM');
    assert.equal(classifyPhaseLevel(PHASE_THRESHOLDS.WATCH - 1), 'HIGH');
  });

  await test('classifyGapLevel: 0→LOW, 1→MEDIUM, ≥2→HIGH', () => {
    assert.equal(classifyGapLevel(-1), 'LOW');
    assert.equal(classifyGapLevel(0), 'LOW');
    assert.equal(classifyGapLevel(1), 'MEDIUM');
    assert.equal(classifyGapLevel(2), 'HIGH');
  });

  await test('assessReading: anak kuat sesuai usia → gap 0, LOW', () => {
    const trials = [
      ...skillTrials('orient', 3, 3), // fase 0
      ...skillTrials('letter_name', 3, 3), // fase 1
      ...skillTrials('graph_to_phon', 3, 3), // fase 2
      ...skillTrials('blending', 3, 3), // fase 3
      ...skillTrials('syllable', 3, 3), // fase 4
    ];
    const a = assessReading({ sessionId: 's1', childRef: 'anon-01', ageYears: 8, trials });
    assert.equal(a.highestPhaseReached, 4);
    assert.equal(a.phaseAgeGap, 0);
    assert.equal(a.level, 'LOW');
    assert.equal(a.perPhase.length, 5);
  });

  await test('assessReading: tertahan di fase 1 (usia 8) → gap 3, HIGH', () => {
    const trials = [
      ...skillTrials('orient', 3, 3), // fase 0 kuat
      ...skillTrials('letter_name', 3, 3), // fase 1 kuat
      ...skillTrials('graph_to_phon', 0, 3), // fase 2 runtuh
      ...skillTrials('blending', 3, 3), // fase 3 (tak relevan — rantai putus di 2)
    ];
    const a = assessReading({ sessionId: 's2', childRef: 'anon-02', ageYears: 8, trials });
    assert.equal(a.highestPhaseReached, 1);
    assert.equal(a.phaseAgeGap, 3);
    assert.equal(a.level, 'HIGH');
    // fase 2 ter-flag HIGH
    const p2 = a.perPhase.find((p) => p.phase === 2);
    assert.equal(p2?.level, 'HIGH');
    assert.equal(p2?.reached, false);
  });

  await test('assessReading: fondasi (fase 0) gagal → sinyal kuat (HIGH)', () => {
    const trials = [
      ...skillTrials('orient', 0, 3), // fase 0 runtuh
      ...skillTrials('letter_name', 3, 3),
    ];
    const a = assessReading({ sessionId: 's3', childRef: 'anon-03', ageYears: 6, trials });
    // fase 0 tak tercapai → effectiveReached -1 → gap = 2 - (-1) = 3
    assert.equal(a.phaseAgeGap, 3);
    assert.equal(a.level, 'HIGH');
  });

  console.log('\n— Aturan Profil (usia, pseudonym, cooldown) —');

  await test('validateAgeYears: terima 6–9, tolak di luar & non-integer', () => {
    for (const age of [6, 7, 8, 9]) {
      assert.equal(validateAgeYears(age).valid, true, `usia ${age} harus valid`);
    }
    assert.equal(validateAgeYears(5).valid, false);
    assert.equal(validateAgeYears(10).valid, false);
    assert.equal(validateAgeYears(7.5).valid, false);
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

  await test('cooldown: < 14 hari → soft-block; ≥ 14 hari → bebas', () => {
    const now = 1_000_000_000_000;
    const day = 24 * 60 * 60 * 1000;
    const blocked = checkRescreeningCooldown(now - 5 * day, now);
    assert.equal(blocked.inCooldown, true);
    assert.equal(blocked.daysSinceLast, 5);
    assert.equal(blocked.daysRemaining, COOLDOWN_MIN_DAYS - 5);

    const free = checkRescreeningCooldown(now - COOLDOWN_MIN_DAYS * day, now);
    assert.equal(free.inCooldown, false);
    assert.equal(free.daysRemaining, 0);
  });

  console.log('\n— TelemetryLogger (mock store, konteks skill baru) —');

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
      skills: ['letter_name'],
      cooldownOverrideReason: 'sesi sebelumnya terputus',
    });
    assert.equal(putSessions.length, 1);
    assert.equal(putSessions[0].cooldownOverrideReason, 'sesi sebelumnya terputus');
    assert.deepEqual(putSessions[0].skills, ['letter_name']);

    const ctx = { skillId: 'letter_name' as SkillId, mechanicId: 'pick' as const, phase: 1 as const, trialIndex: 0 };
    for (let i = 0; i < 65; i++) logger.log('pointer_move', ctx, { x: i });
    // 1 event session_start + 65 → satu batch 60 tertulis otomatis
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
    logger.log('hover', null); // no-op
  });

  console.log('\n— Green Computing (estimasi karbon per sesi) —');

  await test('estimateSessionCarbon: tanpa AI → aiGCO2e 0; dengan AI → lebih besar', () => {
    const base = {
      deviceActiveMs: 100_000,
      ttsUtteranceCount: 20,
      dataTransferBytes: 1_000_000,
      syncPayloadBytes: 5_000,
    };
    const noAi = estimateSessionCarbon({ ...base, ai: { source: 'local-template' } });
    const withAi = estimateSessionCarbon({
      ...base,
      ai: { source: 'gemini', promptTokens: 500, outputTokens: 300 },
    });
    assert.equal(noAi.breakdown.aiGCO2e, 0);
    assert.ok(withAi.breakdown.aiGCO2e > 0);
    assert.ok(withAi.totalGCO2e > noAi.totalGCO2e);
    assert.equal(noAi.aiCalled, false);
    assert.equal(withAi.aiCalled, true);
    assert.equal(noAi.isEstimate, true);
  });

  await test('estimateSessionCarbon: skala mengikuti data (durasi & jumlah soal)', () => {
    const short = estimateSessionCarbon({
      deviceActiveMs: 100_000,
      ttsUtteranceCount: 10,
      dataTransferBytes: 0,
      syncPayloadBytes: 0,
      ai: { source: 'local-template' },
    });
    const long = estimateSessionCarbon({
      deviceActiveMs: 900_000,
      ttsUtteranceCount: 200,
      dataTransferBytes: 0,
      syncPayloadBytes: 0,
      ai: { source: 'local-template' },
    });
    assert.ok(long.totalGCO2e > short.totalGCO2e);
  });

  await test('estimateSessionCarbon: token fallback dari panjang teks', () => {
    const viaTokens = estimateSessionCarbon({
      deviceActiveMs: 0,
      ttsUtteranceCount: 0,
      dataTransferBytes: 0,
      syncPayloadBytes: 0,
      ai: { source: 'gemini', promptTokens: 700, outputTokens: 300 },
    });
    // 2500×0.28 ≈ 700 token, 1100×0.28 ≈ 308 token
    const viaChars = estimateSessionCarbon({
      deviceActiveMs: 0,
      ttsUtteranceCount: 0,
      dataTransferBytes: 0,
      syncPayloadBytes: 0,
      ai: { source: 'gemini', promptChars: 2500, outputChars: 1100 },
    });
    assert.ok(Math.abs(viaTokens.breakdown.aiGCO2e - viaChars.breakdown.aiGCO2e) < 0.01);
  });

  await test('estimateSessionCarbon: greenHostingFactor menghapus segmen data centre', () => {
    const bytes = 100_000_000;
    const plain = estimateSessionCarbon({
      deviceActiveMs: 0,
      ttsUtteranceCount: 0,
      dataTransferBytes: bytes,
      syncPayloadBytes: 0,
      ai: { source: 'local-template' },
    });
    const green = estimateSessionCarbon(
      {
        deviceActiveMs: 0,
        ttsUtteranceCount: 0,
        dataTransferBytes: bytes,
        syncPayloadBytes: 0,
        ai: { source: 'local-template' },
      },
      { ...DEFAULT_FACTORS, greenHostingFactor: 1 },
    );
    assert.ok(green.breakdown.transferGCO2e < plain.breakdown.transferGCO2e);
    // rasio pengurangan = 0.067 / (0.067 + 0.072)
    assert.ok(
      Math.abs(
        (plain.breakdown.transferGCO2e - green.breakdown.transferGCO2e) /
          plain.breakdown.transferGCO2e -
          0.067 / 0.139,
      ) < 1e-9,
    );
  });

  await test('classifyLoadClass: ambang ringan/sedang/berat (tentatif)', () => {
    assert.equal(classifyLoadClass(0.5), 'ringan');
    assert.equal(classifyLoadClass(1.5), 'sedang');
    assert.equal(classifyLoadClass(4.0), 'berat');
  });

  await test('buildSessionCarbonInput: turunan dari data sesi nyata', () => {
    const trials = [
      makeTrial({ correct: true, latencyMs: 2000 }),
      makeTrial({ correct: true, latencyMs: 3000 }),
    ];
    const input = buildSessionCarbonInput({
      session: { startedAt: 0, endedAt: 60_000 },
      trials,
      dataTransferBytes: 1_500_000,
      syncPayloadBytes: 200,
      ai: { source: 'local-template' },
    });
    assert.equal(input.deviceActiveMs, 60_000 + 5000); // shell + sum latency
    assert.equal(input.ttsUtteranceCount, 4); // 2 per trial
    assert.equal(input.dataTransferBytes, 1_500_000);
    assert.equal(input.syncPayloadBytes, 200);
    assert.equal(input.ai?.source, 'local-template');
  });

  console.log('\n— Laporan PDF (referral/reportPdf) —');

  await test('sanitizePdfText: karakter non-WinAnsi di-normalisasi ke ASCII', () => {
    const out = sanitizePdfText('Anak \u201Csiap\u201D \u2014 3 \u00D7 \u2026 \uD83E\uDD34 \u2265 2');
    assert.ok([...out].every((c) => c.charCodeAt(0) <= 0xff));
    assert.ok(!out.includes('\u2014'));
    assert.ok(out.includes('"siap"'));
  });

  await test('buildReferralReportPdf: PDF valid dengan radar + narasi observasi', async () => {
    const child: ChildProfile = { id: 'c1', pseudonym: 'Harimau', ageYears: 8, createdAt: 0 };
    const perPhase: PhaseResult[] = [0, 1, 2, 3, 4].map((phase) => {
      const reliability = 95 - phase * 12;
      return {
        phase: phase as PhaseId,
        reliability,
        skills: [],
        reached: reliability >= 70,
        level: (reliability >= 70 ? 'LOW' : 'MEDIUM') as RiskLevel,
      };
    });
    const assessment: RiskAssessment = {
      sessionId: 's1',
      childRef: 'c1',
      ageYears: 8,
      createdAt: 0,
      highestPhaseReached: 2,
      phaseAgeGap: 2,
      level: 'MEDIUM',
      perPhase,
    };
    const plan: CompanionPlanResult = {
      source: 'local-template',
      generatedAt: 0,
      summary:
        'Dari sesi bermain, anak sudah menunjukkan kenyamanan sampai tahap menghubungkan huruf dengan bunyi.',
      companionActivities: ['Ajak mencari huruf yang sama, tanpa terburu-buru.'],
      referralGuidance: ['Jalankan kegiatan pendampingan selama beberapa minggu.'],
      metricExplanations: { 'fase-0': 'Anak tampak nyaman saat mengenal arah dan bentuk.' },
      disclaimer: 'Bukan diagnosis.',
    };

    // Estimasi jejak karbon nyata (dari helper murni) untuk memastikan PDF
    // memuat bagian "Jejak Karbon Sesi Ini" dengan narasi yang bisa dibaca.
    const carbonEstimate = estimateSessionCarbon(
      buildSessionCarbonInput({
        session: { startedAt: 0, endedAt: 60_000 },
        trials: [
          {
            sessionId: 's1', skillId: 'blending', mechanicId: 'blend', phase: 3, trialIndex: 0,
            stimulus: 'buku', isDemo: false, latencyMs: 800, hesitationMs: 40, misclickCount: 0,
            correct: true, errorType: null, selfCorrected: false, completedAt: 1000,
          } as TrialRecord,
        ],
        dataTransferBytes: 1_000_000,
        ai: { source: 'local-template', outputChars: 400 },
      }),
    );

    const bytes = await buildReferralReportPdf({ child, assessment, history: [], plan, carbon: carbonEstimate });
    assert.ok(bytes.length > 1000);
    assert.equal(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]), '%PDF');

    // Dekompresi stream FlateDecode + decode teks hex → pastikan bagian karbon
    // (judul section & istilah CO2e) benar-benar dicetak di PDF.
    const raw = Buffer.from(bytes);
    const ascii = raw.toString('latin1');
    let decoded = '';
    const streamRe = /(?<!end)stream[\r\n]+/g;
    let m: RegExpExecArray | null;
    while ((m = streamRe.exec(ascii)) !== null) {
      const sMark = m.index + m[0].length;
      const eMark = ascii.indexOf('endstream', sMark);
      if (eMark === -1) break;
      const comp = raw.subarray(sMark, eMark);
      const body = comp[comp.length - 1] === 0x0a || comp[comp.length - 1] === 0x0d
        ? comp.subarray(0, comp.length - 1)
        : comp;
      try { decoded += inflateSync(body).toString('latin1'); } catch { /* bukan FlateDecode */ }
      streamRe.lastIndex = eMark + 1;
    }
    const hexText = [...decoded.matchAll(/<([0-9A-Fa-f]+)>/g)]
      .map((m) => m[1])
      .filter((h) => h.length % 2 === 0)
      .map((h) => {
        let s = '';
        for (let i = 0; i < h.length; i += 2) s += String.fromCharCode(parseInt(h.slice(i, i + 2), 16));
        return s;
      })
      .join('\n');
    const pdfText = `${decoded}\n${hexText}`;
    assert.ok(pdfText.includes('Jejak Karbon Sesi Ini'), 'PDF harus memuat judul bagian Jejak Karbon');
    assert.ok(pdfText.includes('CO2e'), 'PDF harus memuat istilah CO2e di bagian karbon');
    assert.ok(pdfText.includes('bukan pengukuran laboratorium'), 'PDF harus memuat narasi disclaimer karbon');
  });

  console.log(`\n${passed} tes lulus.${process.exitCode ? ' (ADA KEGAGALAN)' : ''}`);
};

void main();
