/**
 * ReadiKids AI — Client-Side Heuristic Risk Engine (Layer 1).
 *
 * Mengubah skor komposit + metrik mentah menjadi RiskAssessment:
 * - Level keseluruhan (LOW / MEDIUM / HIGH)
 * - Indikasi per domain (disleksia vs diskalkulia)
 *
 * PENTING: Output adalah INDIKASI SKRINING, bukan diagnosis medis.
 */
import {
  calculateCompositeRiskScore,
  THRESHOLDS,
} from '../telemetry/MetricCalculator';
import type {
  RiskAssessment,
  RiskLevel,
  TelemetryMetrics,
} from '../types/telemetry';

/** Ambang level skor komposit (0–100). */
export const LEVEL_THRESHOLDS = {
  /** score < MEDIUM → LOW */
  MEDIUM: 40,
  /** score >= HIGH → HIGH */
  HIGH: 70,
} as const;

export function classifyLevel(score: number): RiskLevel {
  if (score >= LEVEL_THRESHOLDS.HIGH) return 'HIGH';
  if (score >= LEVEL_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

/**
 * Indikasi domain disleksia: gabungan reversal ratio + hesitation index.
 * Indikasi domain diskalkulia: NLEE.
 */
function classifyDomains(
  metrics: TelemetryMetrics,
  reversalScore: number,
  hesitationScore: number,
  nleeScore: number,
): RiskAssessment['domains'] {
  // Disleksia — bobot internal: reversal 60%, hesitation 40%.
  const dyslexiaScore = reversalScore * 0.6 + hesitationScore * 0.4;
  // Diskalkulia — NLEE adalah sinyal utama; tanpa data numberline → LOW.
  const dyscalculiaScore = metrics.nleePercent === null ? 0 : nleeScore;

  return {
    dyslexia: classifyLevel(Math.round(dyslexiaScore)),
    dyscalculia: classifyLevel(Math.round(dyscalculiaScore)),
  };
}

export interface AssessInput {
  sessionId: string;
  childRef: string;
  metrics: TelemetryMetrics;
}

/** Jalankan penilaian risiko lengkap dari metrik agregat. */
export function assessRisk({ sessionId, childRef, metrics }: AssessInput): RiskAssessment {
  const composite = calculateCompositeRiskScore(metrics);
  const level = classifyLevel(composite.compositeScore);
  const domains = classifyDomains(
    metrics,
    composite.reversalScore,
    composite.hesitationScore,
    composite.nleeScore,
  );

  return {
    sessionId,
    childRef,
    createdAt: Date.now(),
    compositeScore: composite.compositeScore,
    level,
    breakdown: {
      reversalScore: composite.reversalScore,
      hesitationScore: composite.hesitationScore,
      nleeScore: composite.nleeScore,
    },
    domains,
    metrics,
  };
}

/** Ekspor ulang ambang riset agar dashboard cukup impor dari satu tempat. */
export { THRESHOLDS };
