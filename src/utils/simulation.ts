/**
 * ReadiKids AI — Behavioral Simulator (mode demo).
 *
 * Menyuntikkan pola anomali khas disleksia/diskalkulia ke data trial
 * agar respon sistem dapat diperlihatkan saat presentasi tanpa
 * menunggu subjek nyata.
 *
 * Aktivasi: tekan Shift + D (lihat attachSimulatorHotkey).
 */
import type { TrialRecord } from '../types/telemetry';

export interface SimulationProfile {
  /** Pengali waktu ragu-ragu. */
  hesitationMultiplier: number;
  /** Pengali latency untuk trial huruf reversal. */
  reversalLatencyMultiplier: number;
  /** Penambahan NLEE (poin persen). */
  nleeBoost: number;
}

/** Profil default sesuai blueprint (Bab 10). */
export const DEFAULT_SIMULATION_PROFILE: SimulationProfile = {
  hesitationMultiplier: 3.5,
  reversalLatencyMultiplier: 3.2,
  nleeBoost: 28,
};

export class BehavioralSimulator {
  private active = false;

  constructor(private profile: SimulationProfile = DEFAULT_SIMULATION_PROFILE) {}

  toggle(): boolean {
    this.active = !this.active;
    console.info(`[Simulator] ${this.active ? 'AKTIF — pola anomali disuntikkan' : 'nonaktif'}`);
    return this.active;
  }

  get isActive(): boolean {
    return this.active;
  }

  setProfile(profile: SimulationProfile): void {
    this.profile = profile;
  }

  /**
   * Suntikkan anomali ke satu TrialRecord.
   * Bila simulator nonaktif, data dikembalikan apa adanya.
   */
  injectAnomaly(trial: TrialRecord): TrialRecord {
    if (!this.active) return trial;

    const latencyMs = trial.isReversalTarget
      ? trial.latencyMs * this.profile.reversalLatencyMultiplier
      : trial.latencyMs;
    const hesitationMs = Math.min(
      latencyMs, // waktu ragu tidak mungkin melebihi total waktu menjawab
      trial.hesitationMs * this.profile.hesitationMultiplier,
    );

    return {
      ...trial,
      latencyMs,
      hesitationMs,
      nleePercent:
        trial.nleePercent === null
          ? null
          : Math.min(100, trial.nleePercent + this.profile.nleeBoost),
    };
  }
}

/** Instance global untuk seluruh aplikasi. */
export const behavioralSimulator = new BehavioralSimulator();

/**
 * Pasang hotkey Shift+D pada window (dipanggil sekali di App).
 * Mengembalikan fungsi cleanup untuk useEffect.
 */
export function attachSimulatorHotkey(
  onToggle?: (active: boolean) => void,
): () => void {
  const handler = (e: KeyboardEvent): void => {
    if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
      const active = behavioralSimulator.toggle();
      onToggle?.(active);
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}
