/**
 * ReadiKids AI — Behavioral Engine (feature extraction & progress tracking).
 *
 * Lapisan orkestrasi di atas MetricCalculator + heuristic:
 * - Mengambil trial dari DB, mengagregasi per-fase, menilai, menyimpan hasil.
 * - Membandingkan hasil antar sesi untuk progress tracking (observasi
 *   longitudinal untuk pendamping/profesional).
 *
 * Arsitektur v2 (membaca): berbasis profil per-fase & gap fase–usia.
 */
import { db } from '../telemetry/TelemetryDB';
import { assessReading } from '../ml/heuristic';
import type { PhaseId, RiskAssessment, RiskLevel, TrialRecord } from '../types/telemetry';

/**
 * Analisis satu sesi: baca seluruh trial dari IndexedDB, hitung profil fase +
 * level, simpan RiskAssessment, dan kembalikan hasilnya.
 */
export async function analyzeSession(sessionId: string): Promise<RiskAssessment | null> {
  const session = await db.sessions.get(sessionId);
  if (!session) return null;

  const trials = await db.trials.where('sessionId').equals(sessionId).toArray();
  if (trials.length === 0) return null;

  const assessment = buildAssessment(sessionId, session.childRef, session.ageYears, trials);
  await db.riskAssessments.add(assessment);
  return assessment;
}

/** Versi pure (tanpa DB) — dipakai analyzeSession dan unit test. */
export function buildAssessment(
  sessionId: string,
  childRef: string,
  ageYears: number,
  trials: TrialRecord[],
): RiskAssessment {
  return assessReading({ sessionId, childRef, ageYears, trials });
}

export interface ProgressPoint {
  sessionId: string;
  createdAt: number;
  highestPhaseReached: PhaseId;
  phaseAgeGap: number;
  level: RiskLevel;
}

/** Riwayat perkembangan satu anak lintas sesi (untuk grafik dashboard). */
export async function getChildProgress(childRef: string): Promise<ProgressPoint[]> {
  const assessments = await db.riskAssessments
    .where('childRef')
    .equals(childRef)
    .sortBy('createdAt');

  return assessments.map((a: RiskAssessment) => ({
    sessionId: a.sessionId,
    createdAt: a.createdAt,
    highestPhaseReached: a.highestPhaseReached,
    phaseAgeGap: a.phaseAgeGap,
    level: a.level,
  }));
}

/**
 * Delta perkembangan antara dua penilaian. improving = gap fase–usia mengecil
 * ATAU fase tertinggi bertambah. Berguna untuk narasi otomatis di dashboard.
 */
export function computeProgressDelta(
  previous: RiskAssessment,
  current: RiskAssessment,
): { gapDelta: number; phaseDelta: number; improving: boolean } {
  const gapDelta = current.phaseAgeGap - previous.phaseAgeGap;
  const phaseDelta = current.highestPhaseReached - previous.highestPhaseReached;
  return { gapDelta, phaseDelta, improving: gapDelta < 0 || phaseDelta > 0 };
}
