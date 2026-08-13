/**
 * ReadiKids AI — Pipeline hasil skrining (arsitektur v2, membaca).
 *
 * Menyatukan trial dari mekanik game menjadi satu hasil nyata:
 *   TrialRecord[] -> assessReading (profil per-fase) -> generateCompanionPlan
 *   -> simpan IndexedDB (local-first) -> cermin ke server (best-effort)
 *   -> ScreeningResult untuk dashboard.
 *
 * GENERIK: menerima TrialRecord[] apa pun (dari 8 mekanik/20 skill), bukan lagi
 * tiga game hardcoded. Engine inti (MetricCalculator/heuristic) hanya dipanggil.
 * LOCAL-FIRST: simpan lokal & rencana tidak pernah menggagalkan alur; sync
 * server opsional & non-blocking.
 */
import { db } from '../telemetry/TelemetryDB';
import { assessReading } from '../ml/heuristic';
import { generateCompanionPlan } from '../ml/llmRecommendation';
import { pushSessionResult } from '../../backend/syncService';
import type {
  ChildProfile,
  ChildProfileForPlan,
  CompanionPlanResult,
  SessionRecord,
  SkillId,
  TrialRecord,
} from '../types/telemetry';
import type { ScreeningResult } from '../companion/CompanionDashboard';

export interface RunScreeningInput {
  profile: ChildProfile;
  /** Epoch ms saat rangkaian petualangan dimulai. */
  startedAt: number;
  /** Semua trial dari mekanik game dalam sesi ini (TrialRecord v2). */
  trials: TrialRecord[];
  /** Skill yang diprobe dalam sesi (metadata sesi; adaptive → tak selalu semua). */
  skills: SkillId[];
  cooldownOverrideReason?: string | null;
  /**
   * Override generator rencana — untuk pengujian/QA (mis. memaksa template
   * lokal tanpa panggilan jaringan). Default: generateCompanionPlan.
   */
  planGenerator?: (profile: ChildProfileForPlan) => Promise<CompanionPlanResult>;
}

/**
 * Jalankan seluruh pipeline dan kembalikan ScreeningResult untuk dashboard.
 * Dipanggil dari layar pemrosesan hasil (Cilo menulis cerita).
 */
export async function runScreeningPipeline(input: RunScreeningInput): Promise<ScreeningResult> {
  const sessionId = crypto.randomUUID();
  const endedAt = Date.now();
  // Pastikan setiap trial membawa sessionId sesi ini.
  const trials: TrialRecord[] = input.trials.map((t) => ({ ...t, sessionId }));

  const assessment = assessReading({
    sessionId,
    childRef: input.profile.id,
    ageYears: input.profile.ageYears,
    trials,
  });

  const session: SessionRecord = {
    id: sessionId,
    childRef: input.profile.id,
    ageYears: input.profile.ageYears,
    startedAt: input.startedAt,
    endedAt,
    skills: input.skills,
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
  //    Dibangkitkan SEKALI lalu DISIMPAN agar misi & narasi konsisten di semua
  //    tampilan dan tak berubah tiap buka.
  const plan = await (input.planGenerator ?? generateCompanionPlan)({
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
      metricExplanations: plan.metricExplanations,
      disclaimer: plan.disclaimer,
      ...(plan.aiUsage ? { aiUsage: plan.aiUsage } : {}),
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
      highestPhaseReached: assessment.highestPhaseReached,
      phaseAgeGap: assessment.phaseAgeGap,
      level: assessment.level,
      perPhase: assessment.perPhase,
    },
    plan: {
      source: plan.source,
      generatedAt: plan.generatedAt || Date.now(),
      summary: plan.summary,
      companionActivities: plan.companionActivities,
      referralGuidance: plan.referralGuidance,
      metricExplanations: plan.metricExplanations,
      disclaimer: plan.disclaimer,
      ...(plan.aiUsage ? { aiUsage: plan.aiUsage } : {}),
    },
  };
}
