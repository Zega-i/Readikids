/**
 * ReadiKids AI — Heuristic Reading-Phase Engine (arsitektur v2).
 *
 * Mengubah agregat per-fase (MetricCalculator) → RiskAssessment:
 * - level observasi per fase (LOW/MEDIUM/HIGH)
 * - fase tertinggi yang dicapai andal (kontigu dari fase 0)
 * - gap fase–usia → level indikasi keseluruhan
 *
 * PENTING: output adalah OBSERVASI perkembangan membaca, BUKAN diagnosis.
 * Semua ambang & norma usia bersifat TENTATIF — wajib kalibrasi lapangan.
 */
import { aggregateByPhase } from '../telemetry/MetricCalculator';
import type {
  PhaseAggregate,
  PhaseId,
  PhaseResult,
  RiskAssessment,
  RiskLevel,
  TrialRecord,
} from '../types/telemetry';

/**
 * Ambang reliability (0–100) untuk level observasi per fase.
 * reliability ≥ REACHED → fase dianggap dikuasai (LOW).
 * Tentatif — kalibrasi lapangan.
 */
export const PHASE_THRESHOLDS = {
  /** ≥ ini → fase "dicapai andal" & level LOW. */
  REACHED: 70,
  /** ≥ ini (tapi < REACHED) → MEDIUM; di bawah ini → HIGH. */
  WATCH: 45,
} as const;

/**
 * Fase yang diharapkan sudah dikuasai per usia (norma AWAL, tentatif).
 * Ehri: full alphabetic ~usia 6–7; consolidated ~usia 7–8.
 */
export const PHASE_AGE_EXPECTATION: Record<number, PhaseId> = {
  6: 2,
  7: 3,
  8: 4,
  9: 4,
};

/** Level observasi satu fase dari reliability-nya. */
export function classifyPhaseLevel(reliability: number): RiskLevel {
  if (reliability >= PHASE_THRESHOLDS.REACHED) return 'LOW';
  if (reliability >= PHASE_THRESHOLDS.WATCH) return 'MEDIUM';
  return 'HIGH';
}

/** Level indikasi keseluruhan dari gap fase–usia. */
export function classifyGapLevel(gap: number): RiskLevel {
  if (gap <= 0) return 'LOW';
  if (gap === 1) return 'MEDIUM';
  return 'HIGH';
}

export interface AssessInput {
  sessionId: string;
  childRef: string;
  ageYears: number;
  /** Agregat per fase; bila absen, dihitung dari `trials`. */
  phases?: PhaseAggregate[];
  trials?: TrialRecord[];
}

/**
 * Fase tertinggi yang dicapai andal: fase terbesar `p` sedemikian sehingga
 * SEMUA fase 0..p berhasil dicapai (reliability ≥ REACHED). Kontigu — satu
 * fase gagal menghentikan rantai (fondasi harus kokoh dulu).
 */
function highestContiguousPhase(byPhase: Map<PhaseId, PhaseAggregate>): PhaseId {
  let highest: PhaseId = 0;
  let anyReached = false;
  for (let p = 0 as PhaseId; p <= 4; p = (p + 1) as PhaseId) {
    const agg = byPhase.get(p);
    if (agg && agg.reliability >= PHASE_THRESHOLDS.REACHED) {
      highest = p;
      anyReached = true;
    } else {
      break;
    }
  }
  // Bila fase 0 pun tak tercapai, kembalikan -1 secara semantik lewat gap;
  // di sini kita tetap 0 sebagai lantai, flag ditangani gap.
  return anyReached ? highest : (0 as PhaseId);
}

/** Penilaian membaca lengkap dari agregat fase (atau trial mentah). */
export function assessReading({
  sessionId,
  childRef,
  ageYears,
  phases,
  trials,
}: AssessInput): RiskAssessment {
  const aggs = phases ?? (trials ? aggregateByPhase(trials) : []);
  const byPhase = new Map<PhaseId, PhaseAggregate>(aggs.map((a) => [a.phase, a]));

  const perPhase: PhaseResult[] = aggs.map((a) => ({
    ...a,
    reached: a.reliability >= PHASE_THRESHOLDS.REACHED,
    level: classifyPhaseLevel(a.reliability),
  }));

  const fase0Reached = (byPhase.get(0)?.reliability ?? 0) >= PHASE_THRESHOLDS.REACHED;
  const highestPhaseReached = highestContiguousPhase(byPhase);
  const expected = PHASE_AGE_EXPECTATION[ageYears] ?? 4;

  // Bila fondasi (fase 0) tak tercapai, perlakukan sebagai "belum mencapai
  // fase mana pun" → gap dihitung dari −1 agar sinyalnya kuat.
  const effectiveReached = fase0Reached ? highestPhaseReached : -1;
  const phaseAgeGap = expected - effectiveReached;
  const level = classifyGapLevel(phaseAgeGap);

  return {
    sessionId,
    childRef,
    ageYears,
    createdAt: Date.now(),
    highestPhaseReached,
    phaseAgeGap,
    level,
    perPhase,
  };
}
