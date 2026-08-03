/**
 * ReadiKids AI — MetricCalculator.
 *
 * Mengubah kumpulan TrialRecord menjadi TelemetryMetrics agregat,
 * lalu menghitung skor komposit risiko sesuai formulasi blueprint:
 *
 * 1. Letter-Reversal Latency Ratio = latency(b/d/p/q) / latency(a/m/o)
 *    → Ratio > 2.5 mengindikasikan hambatan orientasi spasial huruf.
 * 2. Hesitation Index (HI) = waktu ragu / total waktu menjawab
 *    → HI > 0.35 menunjukkan keraguan kognitif.
 * 3. NLEE = |posisi jawaban − posisi target| / panjang garis × 100%
 *    → NLEE > 15% mengindikasikan defisit representasi mental angka.
 *
 * Bobot komposit: reversal 40%, HI 30%, NLEE 30%.
 * Murni fungsi (pure) — tanpa dependensi eksternal, mudah diuji.
 */
import type { TelemetryMetrics, TrialRecord } from '../types/telemetry';

/** Ambang riset (lihat Bab 6.2 blueprint). */
export const THRESHOLDS = {
  REVERSAL_RATIO: 2.5,
  HESITATION_INDEX: 0.35,
  NLEE_PERCENT: 15,
} as const;

/** Bobot skor komposit. */
export const WEIGHTS = {
  reversal: 0.4,
  hesitation: 0.3,
  nlee: 0.3,
} as const;

const mean = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Hitung NLEE satu trial number line.
 * @param answerPos  posisi jawaban anak (px atau unit apa pun)
 * @param targetPos  posisi benar pada garis
 * @param lineLength panjang total garis (unit sama)
 */
export function computeNLEE(answerPos: number, targetPos: number, lineLength: number): number {
  if (lineLength <= 0) return 0;
  return Math.min(100, (Math.abs(answerPos - targetPos) / lineLength) * 100);
}

/** Agregasi seluruh trial satu sesi menjadi metrik siap-skor. */
export function aggregateTrials(trials: TrialRecord[]): TelemetryMetrics {
  const visualTrials = trials.filter((t) => t.gameId === 'visual');
  const reversal = visualTrials.filter((t) => t.isReversalTarget);
  const normal = visualTrials.filter((t) => !t.isReversalTarget);
  const nleeValues = trials
    .filter((t) => t.gameId === 'numberline' && t.nleePercent !== null)
    .map((t) => t.nleePercent as number);

  const totalTimeMs = trials.reduce((a, t) => a + t.latencyMs, 0);
  const hesitationMs = trials.reduce((a, t) => a + t.hesitationMs, 0);
  const misclicks = trials.reduce((a, t) => a + t.misclickCount, 0);
  const correct = trials.filter((t) => t.correct).length;

  return {
    normalLatencyMs: mean(normal.map((t) => t.latencyMs)),
    reversalLatencyMs: mean(reversal.map((t) => t.latencyMs)),
    hesitationMs,
    totalTimeMs,
    nleePercent: nleeValues.length > 0 ? mean(nleeValues) : null,
    accuracy: trials.length > 0 ? correct / trials.length : 0,
    misclickPerTrial: trials.length > 0 ? misclicks / trials.length : 0,
    trialCount: trials.length,
  };
}

export interface CompositeResult {
  compositeScore: number;
  reversalScore: number;
  hesitationScore: number;
  nleeScore: number;
  /** Nilai mentah untuk ditampilkan di dashboard. */
  raw: {
    reversalRatio: number | null;
    hesitationIndex: number;
    nleePercent: number | null;
  };
}

/**
 * Skor komposit 0–100.
 *
 * Setiap sub-skor dinormalisasi terhadap ambang risetnya:
 * tepat di ambang = 100 poin sub-skor (indikasi kuat), lalu di-cap 100.
 *
 * Bila suatu metrik tidak tersedia (mis. game numberline belum
 * dimainkan → nlee null), bobotnya didistribusikan ulang secara
 * proporsional ke metrik yang ada, sehingga skor tetap 0–100.
 */
export function calculateCompositeRiskScore(metrics: TelemetryMetrics): CompositeResult {
  // 1. Letter-Reversal Latency Ratio
  const hasReversal = metrics.reversalLatencyMs > 0 && metrics.normalLatencyMs > 0;
  const reversalRatio = hasReversal
    ? metrics.reversalLatencyMs / Math.max(1, metrics.normalLatencyMs)
    : null;
  const reversalScore =
    reversalRatio === null
      ? 0
      : Math.min(100, (reversalRatio / THRESHOLDS.REVERSAL_RATIO) * 100);

  // 2. Hesitation Index
  const hi = metrics.hesitationMs / Math.max(1, metrics.totalTimeMs);
  const hesitationScore = Math.min(100, (hi / THRESHOLDS.HESITATION_INDEX) * 100);

  // 3. NLEE
  const hasNlee = metrics.nleePercent !== null;
  const nleeScore = hasNlee
    ? Math.min(100, ((metrics.nleePercent as number) / THRESHOLDS.NLEE_PERCENT) * 100)
    : 0;

  // Redistribusi bobot bila ada metrik yang absen.
  let wReversal = reversalRatio !== null ? WEIGHTS.reversal : 0;
  let wHesitation = WEIGHTS.hesitation; // HI selalu tersedia bila ada trial
  let wNlee = hasNlee ? WEIGHTS.nlee : 0;
  const totalW = wReversal + wHesitation + wNlee;
  if (totalW === 0) {
    return {
      compositeScore: 0,
      reversalScore: 0,
      hesitationScore: 0,
      nleeScore: 0,
      raw: { reversalRatio, hesitationIndex: hi, nleePercent: metrics.nleePercent },
    };
  }
  wReversal /= totalW;
  wHesitation /= totalW;
  wNlee /= totalW;

  const compositeScore = Math.round(
    reversalScore * wReversal + hesitationScore * wHesitation + nleeScore * wNlee,
  );

  return {
    compositeScore,
    reversalScore: Math.round(reversalScore),
    hesitationScore: Math.round(hesitationScore),
    nleeScore: Math.round(nleeScore),
    raw: { reversalRatio, hesitationIndex: hi, nleePercent: metrics.nleePercent },
  };
}
