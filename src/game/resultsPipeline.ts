/**
 * ReadiKids AI — Pipeline hasil skrining (W9: "Cilo menulis cerita").
 *
 * Menyatukan tiga jalur game menjadi satu hasil nyata:
 *   data 3 game -> TrialRecord[] -> aggregateTrials -> assessRisk
 *   -> generateCompanionPlan -> simpan IndexedDB (local-first)
 *   -> cermin ke server (best-effort) -> ScreeningResult untuk dashboard.
 *
 * LOCAL-FIRST: penyimpanan lokal & pembuatan rencana tidak pernah
 * menggagalkan alur; sync server bersifat opsional dan non-blocking.
 * Engine inti (MetricCalculator/heuristic) TIDAK diubah — hanya dipanggil.
 */
import { db } from '../telemetry/TelemetryDB';
import { aggregateTrials } from '../telemetry/MetricCalculator';
import { assessRisk } from '../ml/heuristic';
import { generateCompanionPlan } from '../ml/llmRecommendation';
import { pushSessionResult } from '../../backend/syncService';
import { LINE_CORRECT_TOLERANCE } from './trialBank';
import type {
  ChildProfile,
  GameId,
  SessionRecord,
  TrialRecord,
} from '../types/telemetry';
import type { TrialEvent as HutanTrialEvent } from './HutanHuruf';
import type { PhonicsTrialEvent } from './SungaiBunyi';
import type { NumberLineTrialEvent } from './BukitAngka';
import type { ScreeningResult } from '../companion/CompanionDashboard';

/**
 * Ubah tiga array telemetri game menjadi TrialRecord[] yang dipahami
 * MetricCalculator. Pemetaan menjaga makna metrik:
 *  - Hutan (visual): latency = reaksi; isReversalTarget = huruf cermin.
 *  - Sungai (phonics): hesitationMs sudah dihitung game (indikasi keraguan).
 *  - Bukit (numberline): nleePercent = deviasi spasial; lockDelay ~ keraguan.
 */
export function buildTrialRecords(
  sessionId: string,
  hutan: HutanTrialEvent[],
  sungai: PhonicsTrialEvent[],
  bukit: NumberLineTrialEvent[],
): TrialRecord[] {
  const now = Date.now();

  const visual: TrialRecord[] = hutan.map((e) => ({
    sessionId,
    gameId: 'visual',
    trialIndex: e.trialIndex,
    stimulus: e.stimulus,
    isReversalTarget: e.trialType === 'mirror',
    latencyMs: e.reactionTimeMs,
    hesitationMs: 0,
    misclickCount: 0,
    correct: e.isCorrect,
    nleePercent: null,
    completedAt: now,
  }));

  const phonics: TrialRecord[] = sungai.map((e) => ({
    sessionId,
    gameId: 'phonics',
    trialIndex: e.trialIndex,
    stimulus: e.stimulus,
    isReversalTarget: false,
    latencyMs: e.totalTimeMs,
    hesitationMs: Math.min(e.hesitationMs, e.totalTimeMs),
    misclickCount: 0,
    correct: e.isCorrect,
    nleePercent: null,
    completedAt: now,
  }));

  const numberline: TrialRecord[] = bukit.map((e) => ({
    sessionId,
    gameId: 'numberline',
    trialIndex: e.trialIndex,
    stimulus: String(e.target),
    isReversalTarget: false,
    latencyMs: e.totalTimeMs,
    hesitationMs: Math.min(e.lockDelayMs, e.totalTimeMs),
    misclickCount: 0,
    correct: e.nlee <= LINE_CORRECT_TOLERANCE,
    nleePercent: e.nlee,
    completedAt: now,
  }));

  return [...visual, ...phonics, ...numberline];
}

export interface RunScreeningInput {
  profile: ChildProfile;
  /** Epoch ms saat rangkaian petualangan dimulai. */
  startedAt: number;
  hutan: HutanTrialEvent[];
  sungai: PhonicsTrialEvent[];
  bukit: NumberLineTrialEvent[];
  cooldownOverrideReason?: string | null;
}

/**
 * Jalankan seluruh pipeline dan kembalikan ScreeningResult untuk dashboard.
 * Dipanggil dari layar W9 (processResults) — layar menunggu promise ini
 * selesai sebelum berpindah ke hasil.
 */
export async function runScreeningPipeline(
  input: RunScreeningInput,
): Promise<ScreeningResult> {
  const sessionId = crypto.randomUUID();
  const endedAt = Date.now();
  const games: GameId[] = ['visual', 'phonics', 'numberline'];

  const trials = buildTrialRecords(sessionId, input.hutan, input.sungai, input.bukit);
  const metrics = aggregateTrials(trials);
  const assessment = assessRisk({ sessionId, childRef: input.profile.id, metrics });

  const session: SessionRecord = {
    id: sessionId,
    childRef: input.profile.id,
    ageYears: input.profile.ageYears,
    startedAt: input.startedAt,
    endedAt,
    games,
    cooldownOverrideReason: input.cooldownOverrideReason ?? null,
  };

  // 1) Simpan lokal (sumber kebenaran). Best-effort — jangan gagalkan alur.
  try {
    await db.sessions.put(session);
    if (trials.length > 0) await db.trials.bulkAdd(trials);
    await db.riskAssessments.add(assessment);
  } catch (err) {
    console.error('[pipeline] gagal simpan lokal:', err);
  }

  // 2) Rencana pendampingan (LLM bila ada key, jika tidak template lokal).
  //    Dibangkitkan SEKALI di sini lalu DISIMPAN, agar misi & narasi konsisten
  //    di semua tampilan (beranda/dashboard/riwayat) dan tak berubah tiap buka.
  const plan = await generateCompanionPlan({
    childRef: input.profile.id,
    ageYears: input.profile.ageYears,
    assessment,
  });

  try {
    await db.companionPlans.put({
      sessionId,
      childRef: input.profile.id,
      source: plan.source,
      generatedAt: plan.generatedAt || Date.now(),
      summary: plan.summary,
      companionActivities: plan.companionActivities,
      referralGuidance: plan.referralGuidance,
      disclaimer: plan.disclaimer,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error('[pipeline] gagal simpan plan lokal:', err);
  }

  // 3) Cermin ke server bila Supabase dikonfigurasi (non-blocking).
  void pushSessionResult({ child: input.profile, session, assessment, plan }).then((r) => {
    if (!r.ok) console.info('[pipeline] sync server dilewati/gagal:', r.error);
  });

  return {
    sessionId,
    childName: input.profile.pseudonym,
    childAgeYears: input.profile.ageYears,
    startedAt: input.startedAt,
    endedAt,
    assessment: {
      compositeScore: assessment.compositeScore,
      level: assessment.level,
      breakdown: assessment.breakdown,
      domains: assessment.domains,
      metrics: assessment.metrics,
    },
    plan: {
      source: plan.source,
      generatedAt: plan.generatedAt || Date.now(),
      summary: plan.summary,
      companionActivities: plan.companionActivities,
      referralGuidance: plan.referralGuidance,
      disclaimer: plan.disclaimer,
    },
  };
}
