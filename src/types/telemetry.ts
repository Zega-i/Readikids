/**
 * ReadiKids AI — Tipe data inti untuk Silent Behavioral Telemetry.
 *
 * Semua satuan waktu dalam milidetik (ms) kecuali disebutkan lain.
 * File ini TIDAK boleh mengimpor library eksternal agar core engine
 * tetap framework-agnostic dan mudah diuji.
 *
 * Scope v4.0: pengguna umum (pendamping), anak usia 6–9 tahun,
 * output berupa Rencana Pendampingan + panduan rujukan.
 */

/** Rentang usia anak yang valid untuk skrining (tahun). */
export const AGE_MIN = 6;
export const AGE_MAX = 9;

/** Jenis mini-game sumber data telemetri. */
export type GameId = 'visual' | 'phonics' | 'numberline';

/** Jenis event mentah yang direkam logger. */
export type TelemetryEventType =
  | 'session_start'
  | 'session_end'
  | 'trial_start'
  | 'stimulus_shown'
  | 'hover'          // pointer di atas pilihan jawaban (indikasi ragu)
  | 'pointer_move'
  | 'misclick'       // klik di area bukan-target
  | 'answer'
  | 'drag_start'     // khusus number line
  | 'drag_end'
  | 'trial_end'
  | 'idle';          // tidak ada interaksi > ambang tertentu

/** Event telemetri mentah (granular, ditulis batch ke IndexedDB). */
export interface TelemetryEvent {
  /** Auto-increment primary key (diisi Dexie). */
  id?: number;
  sessionId: string;
  gameId: GameId;
  /** Nomor urut trial (soal) dalam satu sesi game. */
  trialIndex: number;
  type: TelemetryEventType;
  /** performance.now() relatif terhadap awal sesi. */
  t: number;
  /** Payload bebas per jenis event (posisi pointer, id target, dsb). */
  payload?: Record<string, unknown>;
}

/**
 * Rekaman hasil satu trial (satu soal) — unit analisis utama
 * MetricCalculator. Ditulis sekali saat trial selesai.
 */
export interface TrialRecord {
  id?: number;
  sessionId: string;
  gameId: GameId;
  trialIndex: number;
  /** Stimulus yang ditampilkan, mis. huruf 'b' atau angka target 37. */
  stimulus: string;
  /**
   * Apakah stimulus termasuk target reversal (b/d/p/q).
   * Hanya relevan untuk game 'visual'.
   */
  isReversalTarget: boolean;
  /** Waktu dari stimulus tampil sampai jawaban final. */
  latencyMs: number;
  /** Total waktu ragu (hover di pilihan + idle) selama trial. */
  hesitationMs: number;
  /** Jumlah klik di luar target. */
  misclickCount: number;
  /** Benar/salah jawaban akhir. */
  correct: boolean;
  /**
   * Number Line Estimation Error dalam persen (0–100).
   * Hanya relevan untuk game 'numberline'; selain itu null.
   */
  nleePercent: number | null;
  /** Epoch ms saat trial selesai (untuk progress tracking antar sesi). */
  completedAt: number;
}

/**
 * Profil anak yang diskrining — dikelola oleh pendamping.
 * PRIVASI: hanya pseudonym/nama panggilan; JANGAN simpan nama lengkap,
 * NIK, atau nama sekolah.
 */
export interface ChildProfile {
  /** UUID profil — dipakai sebagai childRef di seluruh tabel lain. */
  id: string; // uuid
  /** Nama panggilan / pseudonym pilihan pendamping. */
  pseudonym: string; // "Harimau Terbang"
  /** Usia dalam tahun; valid hanya 6–9 (AGE_MIN..AGE_MAX). */
  ageYears: number; // 6-9
  createdAt: number; // epoch ms
}

/** Metadata satu sesi bermain (satu anak, satu rangkaian game). */
export interface SessionRecord {
  /** UUID sesi. */
  id: string;
  /** Referensi ke ChildProfile.id (pseudonym-based, tanpa identitas asli). */
  childRef: string;
  /** Usia anak (6–9) saat sesi — snapshot untuk kalibrasi ambang per usia. */
  ageYears: number;
  startedAt: number;
  endedAt: number | null;
  /** Daftar game yang dimainkan dalam sesi ini. */
  games: GameId[];
  /**
   * Alasan pendamping melanjutkan skrining meski masih dalam masa
   * cooldown (soft-block override). Null bila tidak melanggar cooldown.
   */
  cooldownOverrideReason?: string | null;
}

/** Metrik agregat satu sesi — input utama risk engine. */
export interface TelemetryMetrics {
  /** Rerata latency huruf non-reversal (a/m/o...). */
  normalLatencyMs: number;
  /** Rerata latency huruf reversal (b/d/p/q). */
  reversalLatencyMs: number;
  /** Total waktu ragu-ragu seluruh trial. */
  hesitationMs: number;
  /** Total waktu menjawab seluruh trial. */
  totalTimeMs: number;
  /** Rerata NLEE (%) dari game numberline; null bila tidak dimainkan. */
  nleePercent: number | null;
  /** Rasio jawaban benar 0–1 (metrik sekunder, bukan penentu utama). */
  accuracy: number;
  /** Total misclick per trial (indikasi kontrol motorik/atensi). */
  misclickPerTrial: number;
  /** Jumlah trial yang dianalisis. */
  trialCount: number;
}

/** Tingkat indikasi risiko hasil skrining (BUKAN diagnosis). */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/** Domain kesulitan belajar yang diskrining. */
export type ScreeningDomain = 'dyslexia' | 'dyscalculia';

/** Hasil penilaian risiko satu sesi. */
export interface RiskAssessment {
  id?: number;
  sessionId: string;
  childRef: string;
  createdAt: number;
  /** Skor komposit 0–100. */
  compositeScore: number;
  level: RiskLevel;
  /** Rincian skor per metrik (0–100, sudah dinormalisasi ambang). */
  breakdown: {
    reversalScore: number;
    hesitationScore: number;
    nleeScore: number;
  };
  /** Indikasi per domain beserta level masing-masing. */
  domains: Record<ScreeningDomain, RiskLevel>;
  /** Metrik mentah yang mendasari penilaian (untuk dashboard & audit). */
  metrics: TelemetryMetrics;
}

/** Profil ringkas anak untuk pembuatan Rencana Pendampingan (tanpa identitas). */
export interface ChildProfileForPlan {
  childRef: string;
  ageYears: number;
  assessment: RiskAssessment;
  /** Catatan opsional pendamping (mis. "sering menghindar saat diminta membaca"). */
  companionNotes?: string;
}

export interface MetricExplanations {
  hi: string;
  rr: string;
  nlee: string;
}

/** Rencana Pendampingan hasil generator (pengganti IEP pada v2). */
export interface CompanionPlanResult {
  /** Sumber rencana: LLM via proxy Gemini ('gemini') atau 'local-template' (fallback offline). */
  source: 'gemini' | 'local-template';
  generatedAt: number;
  /** Ringkasan hasil dalam bahasa observasi (bukan vonis). */
  summary: string;
  /** Saran aktivitas pendampingan di rumah/di mana pun (bukan kurikulum). */
  companionActivities: string[];
  /** Panduan langkah rujukan ke layanan profesional. */
  referralGuidance: string[];
  /** Analisis dinamis untuk metrik spesifik game */
  metricExplanations: MetricExplanations;
  /** Disclaimer wajib — sistem ini bukan alat diagnosis. */
  disclaimer: string;
}

/**
 * Rencana Pendampingan yang DISIMPAN sekali (di akhir skrining), agar misi
 * rumah & narasi konsisten di semua tampilan (beranda, dashboard, riwayat)
 * dan lintas platform (web ↔ APK) — tanpa dibangkitkan ulang (yang bisa
 * berbeda karena LLM non-deterministik) dan agar indeks centang misi stabil.
 */
export interface StoredCompanionPlan extends CompanionPlanResult {
  /** Kunci utama — 1:1 dengan sesi. */
  sessionId: string;
  childRef: string;
  updatedAt: number;
}

/**
 * Status penyelesaian "misi rumah minggu ini" per anak per minggu.
 * Disimpan on-device (Dexie). doneIndices mengacu ke posisi item dalam
 * daftar aktivitas pendampingan (companionActivities) yang ditampilkan
 * di Beranda Pendamping.
 */
export interface MissionProgress {
  /** Kunci komposit `${childRef}:${weekKey}` (mis. "uuid:2026-W32"). */
  id: string;
  /** Referensi ke ChildProfile.id. */
  childRef: string;
  /** Kunci minggu ISO, mis. "2026-W32". */
  weekKey: string;
  /** Indeks misi yang sudah ditandai selesai. */
  doneIndices: number[];
  updatedAt: number;
}
