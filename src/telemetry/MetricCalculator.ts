/**
 * ReadiKids AI — MetricCalculator (arsitektur v2, membaca).
 *
 * Mengubah TrialRecord[] menjadi metrik per-skill lalu agregat per-fase.
 * Model lama (komposit reversal/HI/NLEE 40/30/30) sudah dihapus.
 *
 * Alur: TrialRecord[] → computeSkillMetric (per skill) → aggregatePhase
 * (per fase) → PhaseAggregate[]. Klasifikasi level & gap fase–usia ada di
 * `ml/heuristic.ts`. Fungsi di sini MURNI (tanpa dependensi eksternal).
 *
 * CATATAN KALIBRASI: skor `reliability` dan pembobotan bersifat tentatif
 * berbasis literatur — WAJIB dikalibrasi dari data lapangan (lihat CLAUDE.md).
 */
import type {
  PhaseAggregate,
  PhaseId,
  SkillId,
  SkillMetric,
  TrialRecord,
} from '../types/telemetry';
import { SKILL_PHASE } from '../types/telemetry';

const mean = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

/**
 * Metrik satu skill dari trial-trialnya.
 *
 * reliability = akurasi × konsistensi:
 *  - akurasi = benar / item non-demo
 *  - konsistensi = 1 − penalti keraguan (hesitationRatio, di-cap 0.5)
 * Skala 0–100. Tentatif — kalibrasi lapangan.
 */
export function computeSkillMetric(trials: TrialRecord[]): SkillMetric {
  const scored = trials.filter((t) => !t.isDemo);
  const skillId: SkillId = trials[0]?.skillId ?? scored[0]?.skillId;
  const phase: PhaseId = skillId ? SKILL_PHASE[skillId] : 0;

  const correct = scored.filter((t) => t.correct).length;
  const accuracy = scored.length > 0 ? correct / scored.length : 0;
  const medianLatencyMs = median(scored.map((t) => t.latencyMs));
  const totalTime = scored.reduce((a, t) => a + t.latencyMs, 0);
  const totalHes = scored.reduce((a, t) => a + t.hesitationMs, 0);
  const hesitationRatio = totalTime > 0 ? clamp(totalHes / totalTime, 0, 1) : 0;

  const errorProfile: Record<string, number> = {};
  for (const t of scored) {
    if (!t.correct && t.errorType) {
      errorProfile[t.errorType] = (errorProfile[t.errorType] ?? 0) + 1;
    }
  }

  const consistency = 1 - Math.min(0.5, hesitationRatio);
  const reliability = Math.round(accuracy * consistency * 100);

  return {
    skillId,
    phase,
    accuracy,
    medianLatencyMs,
    hesitationRatio,
    errorProfile,
    itemsScored: scored.length,
    reliability,
  };
}

/**
 * Agregasi seluruh trial satu sesi menjadi PhaseAggregate[] (satu per fase
 * yang punya data). Reliability fase = rata-rata reliability skill di fase.
 */
export function aggregateByPhase(trials: TrialRecord[]): PhaseAggregate[] {
  // Kelompokkan per skill.
  const bySkill = new Map<SkillId, TrialRecord[]>();
  for (const t of trials) {
    const arr = bySkill.get(t.skillId) ?? [];
    arr.push(t);
    bySkill.set(t.skillId, arr);
  }
  const skillMetrics: SkillMetric[] = [...bySkill.values()].map(computeSkillMetric);

  // Kelompokkan skill per fase.
  const byPhase = new Map<PhaseId, SkillMetric[]>();
  for (const m of skillMetrics) {
    const arr = byPhase.get(m.phase) ?? [];
    arr.push(m);
    byPhase.set(m.phase, arr);
  }

  return [...byPhase.entries()]
    .map(([phase, skills]) => ({
      phase,
      reliability: Math.round(mean(skills.map((s) => s.reliability))),
      skills,
    }))
    .sort((a, b) => a.phase - b.phase);
}
