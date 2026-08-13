/**
 * ReadiKids AI — Estimasi jejak karbon per sesi skrining (Green Computing).
 *
 * Unit pengukuran: **gram CO2eq per SESI skrining** (bukan per halaman) —
 * karena setiap sesi berbeda (jumlah soal, durasi, apakah AI dipanggil), semua
 * masukan diambil dari data nyata sesi, bukan angka statis.
 *
 * ── Metodologi (dikutip, bukan karangan) ────────────────────────────────────
 * 1. SCI — Software Carbon Intensity, ISO/IEC 21031:2024 (Green Software
 *    Foundation):  CO2e per R = (E × I + M) / R,  dengan R = 1 sesi skrining.
 *    M (embodied) sengaja TIDAK disertakan (lihat keterbatasan) → SCI ≈ E × I.
 * 2. SWDM v4 — Sustainable Web Design Model v4 (default CO2.js v0.18+,
 *    Green Web Foundation, Juli 2024). Intensitas energi transfer (kWh/GB):
 *    data centre 0.067 (0.055 op + 0.012 emb) · jaringan 0.072 ·
 *    perangkat pengguna 0.161. Default grid intensity **494 gCO2e/kWh**
 *    (Ember "World"). Kami memakai segmen **data centre + jaringan** (0.139
 *    kWh/GB) untuk transfer/sinkronisasi, dan model energi perangkat terpisah
 *    (durasi aktif) agar tidak menghitung dua kali.
 * 3. Energi perangkat: durasi aktif (jumlah latency trial + estimasi waktu
 *    sintesis suara TTS) × daya perangkat (~4 W, HP saat dipakai aktif).
 * 4. Inferensi AI: energi per 1.000 token kelas model kecil/flash dari
 *    benchmark "How Hungry is AI?" (arXiv 2505.09598, 2025) & LLM-Perf
 *    Leaderboard (~0.4–0.8 Wh / 1.000 token → default 0.6 Wh). Bila token tak
 *    tercatat, diestimasi dari panjang prompt (token ≈ 0.28/karakter).
 *
 * PENTING: SEMUA nilai adalah **ESTIMASI berbasis model**, bukan pengukuran
 * lab. Faktor default = nilai standar terkini dan boleh diganti per-region
 * lewat `factors`. Ambang kelas beban (ringan/sedang/berat) bersifat
 * TENTATIF — wajib kalibrasi lapangan seperti ambang skor lainnya.
 */
import type { SessionRecord, TrialRecord } from '../types/telemetry';

/** Masukan estimasi — seluruhnya berasal dari data sesi nyata. */
export interface SessionCarbonInput {
  /** Waktu aktif pemrosesan di perangkat (ms) — sum latency trial + overhead. */
  deviceActiveMs: number;
  /** Jumlah ucapan TTS (sintesis suara = beban CPU perangkat). */
  ttsUtteranceCount: number;
  /** Data yang ditransfer selama sesi (bytes), mis. bundle aplikasi. */
  dataTransferBytes: number;
  /** Payload sinkronisasi agregat ke server (bytes). */
  syncPayloadBytes: number;
  /** Pemakaian AI untuk rencana pendampingan. */
  ai?: {
    source: 'gemini' | 'local-template';
    /** Token terukur (bila usageMetadata tersedia). */
    promptTokens?: number;
    outputTokens?: number;
    /** Fallback bila token tak tercatat (estimasi dari panjang teks). */
    promptChars?: number;
    outputChars?: number;
  };
}

/** Faktor model — nilai standar, boleh disetel per-region. */
export interface CarbonFactors {
  /** Intensitas karbon listrik (gCO2e/kWh). Default 494 (Ember "World", SWDM v4). */
  gridIntensityGCO2ePerKWh: number;
  /** Daya perangkat saat aktif (kW). Default 0.004 (HP ~4W). */
  devicePowerKw: number;
  /** Energi per GB segmen data centre (kWh/GB) — SWDM v4 (op+emb). */
  energyKwhPerGBDataCentre: number;
  /** Energi per GB segmen jaringan (kWh/GB) — SWDM v4 (op+emb). */
  energyKwhPerGBNetwork: number;
  /** Energi inferensi AI per 1.000 token (kWh) — flash-class. */
  aiKwhPer1000Tokens: number;
  /** Fraksi hosting energi terbarukan (0–1) — pengurang segmen data centre. */
  greenHostingFactor: number;
  /** Estimasi durasi audio per ucapan TTS (ms). */
  ttsMsPerUtterance: number;
  /** Estimasi token per karakter teks (fallback bila token tak tercatat). */
  tokensPerChar: number;
}

export const DEFAULT_FACTORS: CarbonFactors = {
  gridIntensityGCO2ePerKWh: 494,
  devicePowerKw: 0.004,
  energyKwhPerGBDataCentre: 0.067, // SWDM v4: 0.055 op + 0.012 emb
  energyKwhPerGBNetwork: 0.072, // SWDM v4: 0.059 op + 0.013 emb
  aiKwhPer1000Tokens: 0.0006, // ~0,6 Wh/1.000 token, flash-class
  greenHostingFactor: 0,
  ttsMsPerUtterance: 2000,
  tokensPerChar: 0.28,
};

/** Rincian emisi per sumber — agar pop-out bisa menampilkan per-sumber. */
export interface CarbonBreakdown {
  deviceGCO2e: number;
  transferGCO2e: number;
  aiGCO2e: number;
  syncGCO2e: number;
}

export interface CarbonEstimate {
  /** Total gram CO2eq untuk SESI ini. */
  totalGCO2e: number;
  breakdown: CarbonBreakdown;
  /** Apakah AI benar-benar dipanggil (server-side inference). */
  aiCalled: boolean;
  /** Kelas beban untuk label highlight. */
  loadClass: 'ringan' | 'sedang' | 'berat';
  /** Transparansi: metodologi & faktor yang dipakai. */
  methodology: string;
  usedFactors: CarbonFactors;
  /** Selalu estimasi, bukan pengukuran. */
  isEstimate: true;
}

/** Ambang kelas beban (gCO2e). TENTATIF — kalibrasi lapangan. */
export const LOAD_CLASS_THRESHOLDS_GCO2E = { RINGAN_MAX: 1.5, SEDANG_MAX: 3.0 } as const;

/** Klasifikasi kelas beban dari total emisi. */
export function classifyLoadClass(totalGCO2e: number): CarbonEstimate['loadClass'] {
  if (totalGCO2e < LOAD_CLASS_THRESHOLDS_GCO2E.RINGAN_MAX) return 'ringan';
  if (totalGCO2e < LOAD_CLASS_THRESHOLDS_GCO2E.SEDANG_MAX) return 'sedang';
  return 'berat';
}

const GB = 1e9;

/** Energi (kWh) dari byte yang ditransfer — segmen data centre + jaringan. */
function serverTransferKwh(bytes: number, f: CarbonFactors): number {
  const gb = bytes / GB;
  const dc = f.energyKwhPerGBDataCentre * (1 - f.greenHostingFactor);
  return gb * (dc + f.energyKwhPerGBNetwork);
}

/** Estimasi jumlah token dari panjang teks. */
export function estimateTokensFromChars(chars: number, tokensPerChar: number = DEFAULT_FACTORS.tokensPerChar): number {
  return Math.max(0, Math.round(chars * tokensPerChar));
}

/**
 * Estimasi jejak karbon satu sesi skrining.
 * MURNI (tanpa efek samping, tanpa I/O) — mudah diuji.
 */
export function estimateSessionCarbon(input: SessionCarbonInput, factors: CarbonFactors = DEFAULT_FACTORS): CarbonEstimate {
  const f = factors;

  // 1) Energi perangkat: durasi aktif + sintesis TTS → kWh → gCO2e.
  const ttsMs = input.ttsUtteranceCount * f.ttsMsPerUtterance;
  const deviceActiveHours = (input.deviceActiveMs + ttsMs) / 3_600_000;
  const deviceKwh = deviceActiveHours * f.devicePowerKw;
  const deviceGCO2e = deviceKwh * f.gridIntensityGCO2ePerKWh;

  // 2) Transfer data (bundle / aset sesi) — data centre + jaringan.
  const transferGCO2e = serverTransferKwh(input.dataTransferBytes, f) * f.gridIntensityGCO2ePerKWh;

  // 3) Inferensi AI — 0 bila tidak memanggil (template lokal).
  const ai = input.ai;
  const aiCalled = ai?.source === 'gemini';
  let aiGCO2e = 0;
  if (aiCalled) {
    const promptTokens = ai.promptTokens ?? estimateTokensFromChars(ai.promptChars ?? 0, f.tokensPerChar);
    const outputTokens = ai.outputTokens ?? estimateTokensFromChars(ai.outputChars ?? 0, f.tokensPerChar);
    const aiKwh = ((promptTokens + outputTokens) / 1000) * f.aiKwhPer1000Tokens;
    aiGCO2e = aiKwh * f.gridIntensityGCO2ePerKWh;
  }

  // 4) Sinkronisasi agregat ke server — data centre + jaringan (kecil).
  const syncGCO2e = serverTransferKwh(input.syncPayloadBytes, f) * f.gridIntensityGCO2ePerKWh;

  const totalGCO2e = deviceGCO2e + transferGCO2e + aiGCO2e + syncGCO2e;

  return {
    totalGCO2e,
    breakdown: { deviceGCO2e, transferGCO2e, aiGCO2e, syncGCO2e },
    aiCalled,
    loadClass: classifyLoadClass(totalGCO2e),
    methodology: 'SCI (ISO/IEC 21031:2024) × SWDM v4 (CO2.js v0.18) — estimasi berbasis data sesi',
    usedFactors: f,
    isEstimate: true,
  };
}

/** Biaya tetap berjalan aplikasi (ms) per sesi — shell/render awal. */
export const APP_SHELL_ACTIVE_MS = 60_000;

/**
 * Penyusun masukan dari data nyata sesi. SEMUA turunan = data aktual:
 *  - deviceActiveMs  = sum latency trial (waktu aktif anak menjawab) + overhead shell
 *  - ttsUtteranceCount ≈ 2 ucapan per trial (instruksi + stimulus)
 *  - ai               = dari plan.source; panjang teks prompt/response bila ada
 */
export function buildSessionCarbonInput(args: {
  session: Pick<SessionRecord, 'startedAt' | 'endedAt'>;
  trials: TrialRecord[];
  dataTransferBytes: number;
  syncPayloadBytes?: number;
  ai: {
    source: 'gemini' | 'local-template';
    /** Token nyata (dari usageMetadata bila tersedia). */
    promptTokens?: number;
    outputTokens?: number;
    /** Fallback bila token tak tercatat (estimasi dari panjang teks). */
    promptChars?: number;
    outputChars?: number;
  };
}): SessionCarbonInput {
  const latencySumMs = args.trials.reduce((a, t) => a + (t.latencyMs || 0), 0);
  return {
    deviceActiveMs: APP_SHELL_ACTIVE_MS + latencySumMs,
    ttsUtteranceCount: args.trials.length * 2,
    dataTransferBytes: args.dataTransferBytes,
    syncPayloadBytes: args.syncPayloadBytes ?? 0,
    ai: args.ai,
  };
}
