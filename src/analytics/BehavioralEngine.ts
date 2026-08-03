/**
 * ReadiKids AI — Behavioral Engine (feature extraction & progress tracking).
 *
 * Lapisan orkestrasi di atas MetricCalculator + heuristic:
 * - Mengambil trial dari DB, mengagregasi, menilai risiko, menyimpan hasil.
 * - Membandingkan hasil antar sesi untuk progress tracking (data
 *   observasi longitudinal untuk profesional).
 */
import { db } from '../telemetry/TelemetryDB';
import { aggregateTrials } from '../telemetry/MetricCalculator';
import { assessRisk } from '../ml/heuristic';
import type { RiskAssessment, TrialRecord } from '../types/telemetry';

/**
 * Analisis satu sesi: baca seluruh trial dari IndexedDB,
 * hitung metrik + risiko, simpan RiskAssessment, dan kembalikan hasilnya.
 */
export async function analyzeSession(sessionId: string): Promise<RiskAssessment | null> {
  const session = await db.sessions.get(sessionId);
  if (!session) return null;

  const trials = await db.trials.where('sessionId').equals(sessionId).toArray();
  if (trials.length === 0) return null;

  const assessment = buildAssessment(sessionId, session.childRef, trials);
  await db.riskAssessments.add(assessment);
  return assessment;
}

/** Versi pure (tanpa DB) — dipakai analyzeSession dan unit test. */
export function buildAssessment(
  sessionId: string,
  childRef: string,
  trials: TrialRecord[],
): RiskAssessment {
  const metrics = aggregateTrials(trials);
  return assessRisk({ sessionId, childRef, metrics });
}

export interface ProgressPoint {
  sessionId: string;
  createdAt: number;
  compositeScore: number;
  hesitationIndex: number;
  nleePercent: number | null;
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
    compositeScore: a.compositeScore,
    hesitationIndex:
      a.metrics.totalTimeMs > 0 ? a.metrics.hesitationMs / a.metrics.totalTimeMs : 0,
    nleePercent: a.metrics.nleePercent,
  }));
}

/**
 * Delta perkembangan antara dua penilaian (negatif = membaik).
 * Berguna untuk narasi otomatis di Companion Dashboard.
 */
export function computeProgressDelta(
  previous: RiskAssessment,
  current: RiskAssessment,
): { scoreDelta: number; improving: boolean } {
  const scoreDelta = current.compositeScore - previous.compositeScore;
  return { scoreDelta, improving: scoreDelta < 0 };
}
