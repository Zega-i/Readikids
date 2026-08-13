/**
 * ReadiKids AI — Tipe data inti untuk Silent Behavioral Telemetry.
 *
 * Semua satuan waktu dalam milidetik (ms) kecuali disebutkan lain.
 * File ini TIDAK boleh mengimpor library eksternal agar core engine
 * tetap framework-agnostic dan mudah diuji.
 *
 * ARSITEKTUR v2 (skrining hambatan membaca — 5 fase Ehri, Fase 0–4):
 * pengukuran per-skill lintas fase → profil per-fase → fase tertinggi yang
 * dicapai andal + gap fase–usia. Model lama (disleksia/diskalkulia,
 * reversal/HI/NLEE) sudah dihapus. Detail: docs/refactor-v2.md, docs/matriks-skrining.md.
 */

/** Rentang usia anak yang valid untuk skrining (tahun). */
export const AGE_MIN = 6;
export const AGE_MAX = 9;

/** Fase perkembangan membaca (0 = fondasi pra-akademik … 4 = decoding). */
export type PhaseId = 0 | 1 | 2 | 3 | 4;

/** Mekanik game generik (dikoding sekali, dipakai ulang lintas skill). */
export type MechanicId =
  | 'pick' // ketuk pilihan yang benar
  | 'match' // cocokkan / sama–beda
  | 'path' // ikuti jalur / scanning arah
  | 'blend' // susun bunyi jadi kata
  | 'split' // pisah / hitung bunyi
  | 'swap' // ubah bunyi (hapus/ganti)
  | 'recall' // ingat urutan
  | 'build'; // susun / baca suku kata & kata

/** 20 skill terukur lintas 5 fase. Dikunci di docs/matriks-skrining.md. */
export type SkillId =
  // Fase 0 — Fondasi Pra-Akademik
  | 'orient'
  | 'shape'
  | 'track'
  | 'print'
  // Fase 1 — Diskriminasi Visual & Pengenalan Huruf
  | 'letter_vs_symbol'
  | 'letter_discrim'
  | 'letter_name'
  | 'letter_case'
  // Fase 2 — Hubungan Grafem–Fonem
  | 'graph_to_phon'
  | 'phon_to_graph'
  | 'digraph'
  // Fase 3 — Kesadaran Fonologis
  | 'sound_position'
  | 'blending'
  | 'segmenting'
  | 'manipulation'
  | 'phon_memory'
  // Fase 4 — Decoding
  | 'syllable'
  | 'word_build'
  | 'pseudoword'
  | 'morphology';

/** Pemetaan skill → fase (sumber kebenaran tunggal). */
export const SKILL_PHASE: Record<SkillId, PhaseId> = {
  orient: 0,
  shape: 0,
  track: 0,
  print: 0,
  letter_vs_symbol: 1,
  letter_discrim: 1,
  letter_name: 1,
  letter_case: 1,
  graph_to_phon: 2,
  phon_to_graph: 2,
  digraph: 2,
  sound_position: 3,
  blending: 3,
  segmenting: 3,
  manipulation: 3,
  phon_memory: 3,
  syllable: 4,
  word_build: 4,
  pseudoword: 4,
  morphology: 4,
};

/** Pemetaan skill → mekanik default. */
export const SKILL_MECHANIC: Record<SkillId, MechanicId> = {
  orient: 'match',
  shape: 'match',
  track: 'path',
  print: 'path',
  letter_vs_symbol: 'pick',
  letter_discrim: 'match',
  letter_name: 'pick',
  letter_case: 'pick',
  graph_to_phon: 'pick',
  phon_to_graph: 'pick',
  digraph: 'pick',
  sound_position: 'pick',
  blending: 'blend',
  segmenting: 'split',
  manipulation: 'swap',
  phon_memory: 'recall',
  syllable: 'build',
  word_build: 'build',
  pseudoword: 'build',
  morphology: 'build',
};

/**
 * Nilai valid `TrialRecord.errorType` (null bila jawaban benar).
 * Dikunci di docs/matriks-skrining.md.
 */
export type ErrorType =
  | 'mirror'
  | 'rotation'
  | 'shape-confusion'
  | 'direction'
  | 'sequence'
  | 'start-point'
  | 'random'
  | 'omission'
  | 'visual-similar'
  | 'case-confusion'
  | 'phonological'
  | 'segmental'
  | 'substitution'
  | 'position-swap'
  | 'order'
  | 'undercount'
  | 'overcount'
  | 'boundary'
  | 'no-change'
  | 'wrong-target'
  | 'intrusion'
  | 'lexicalization';

/** Jenis event mentah yang direkam logger. */
export type TelemetryEventType =
  | 'session_start'
  | 'session_end'
  | 'trial_start'
  | 'stimulus_shown'
  | 'hover' // pointer di atas pilihan jawaban (indikasi ragu)
  | 'pointer_move'
  | 'misclick' // klik di area bukan-target
  | 'answer'
  | 'drag_start'
  | 'drag_end'
  | 'trial_end'
  | 'idle'; // tidak ada interaksi > ambang tertentu

/** Konteks skill/mekanik untuk satu event atau trial. */
export interface TrialContext {
  skillId: SkillId;
  mechanicId: MechanicId;
  phase: PhaseId;
  /** Nomor urut trial (soal) dalam satu blok skill. */
  trialIndex: number;
}

/** Event telemetri mentah (granular, ditulis batch ke IndexedDB). */
export interface TelemetryEvent {
  /** Auto-increment primary key (diisi Dexie). */
  id?: number;
  sessionId: string;
  /** Konteks skill; null untuk event level-sesi (session_start/end). */
  skillId: SkillId | null;
  mechanicId: MechanicId | null;
  phase: PhaseId | null;
  trialIndex: number;
  type: TelemetryEventType;
  /** performance.now() relatif terhadap awal sesi. */
  t: number;
  /** Payload bebas per jenis event (posisi pointer, id target, dsb). */
  payload?: Record<string, unknown>;
}

/**
 * Rekaman hasil satu trial (satu soal) — unit analisis utama MetricCalculator.
 * Generik lintas mekanik; multi-sinyal (akurasi + latency + error + koreksi).
 */
export interface TrialRecord {
  id?: number;
  sessionId: string;
  skillId: SkillId;
  mechanicId: MechanicId;
  phase: PhaseId;
  trialIndex: number;
  /** Ringkasan stimulus (mis. "b", "🔊/m/", "ba-ku"). */
  stimulus: string;
  /** Soal demo/contoh — TIDAK ikut skor. */
  isDemo: boolean;
  /** Waktu dari stimulus tampil sampai jawaban final. */
  latencyMs: number;
  /** Total waktu ragu (hover di pilihan + idle) selama trial. */
  hesitationMs: number;
  /** Jumlah klik di luar target. */
  misclickCount: number;
  /** Benar/salah jawaban akhir. */
  correct: boolean;
  /** Klasifikasi error (null bila benar). */
  errorType: ErrorType | null;
  /** Anak sempat mengoreksi diri sebelum jawaban final. */
  selfCorrected: boolean;
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

/** Metadata satu sesi bermain (satu anak, satu rangkaian skrining). */
export interface SessionRecord {
  /** UUID sesi. */
  id: string;
  /** Referensi ke ChildProfile.id (pseudonym-based, tanpa identitas asli). */
  childRef: string;
  /** Usia anak (6–9) saat sesi — snapshot untuk kalibrasi ambang per usia. */
  ageYears: number;
  startedAt: number;
  endedAt: number | null;
  /** Daftar skill yang diprobe dalam sesi ini (adaptive → tidak selalu semua). */
  skills: SkillId[];
  /**
   * Alasan pendamping melanjutkan skrining meski masih dalam masa cooldown
   * (soft-block override). Null bila tidak melanggar cooldown.
   */
  cooldownOverrideReason?: string | null;
}

/** Tingkat indikasi hasil skrining (BUKAN diagnosis). */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/** Metrik agregat satu skill (input agregasi fase). */
export interface SkillMetric {
  skillId: SkillId;
  phase: PhaseId;
  /** Rasio benar 0–1 (item non-demo). */
  accuracy: number;
  medianLatencyMs: number;
  /** hesitation / total waktu (0–1). */
  hesitationRatio: number;
  /** Distribusi jenis error (errorType → jumlah). */
  errorProfile: Record<string, number>;
  itemsScored: number;
  /** Skor keandalan 0–100 (akurasi × konsistensi) — untuk agregasi fase. */
  reliability: number;
}

/** Agregat mentah satu fase (dari MetricCalculator, belum diklasifikasi). */
export interface PhaseAggregate {
  phase: PhaseId;
  /** Rata-rata reliability skill di fase (0–100). */
  reliability: number;
  skills: SkillMetric[];
}

/** Hasil satu fase setelah diklasifikasi heuristic. */
export interface PhaseResult extends PhaseAggregate {
  /** Apakah fase ini "dicapai andal". */
  reached: boolean;
  /** Level observasi fase (LOW = kuat … HIGH = perlu perhatian). */
  level: RiskLevel;
}

/** Hasil penilaian satu sesi (menggantikan komposit lama). */
export interface RiskAssessment {
  id?: number;
  sessionId: string;
  childRef: string;
  ageYears: number;
  createdAt: number;
  /** Fase tertinggi yang dicapai andal (kontigu dari fase 0). */
  highestPhaseReached: PhaseId;
  /** Fase yang diharapkan per usia − fase tercapai (≥0 = tertinggal). */
  phaseAgeGap: number;
  /** Level indikasi keseluruhan (diturunkan dari gap). */
  level: RiskLevel;
  perPhase: PhaseResult[];
}

/** Profil ringkas anak untuk pembuatan Rencana Pendampingan (tanpa identitas). */
export interface ChildProfileForPlan {
  childRef: string;
  ageYears: number;
  assessment: RiskAssessment;
  /** Catatan opsional pendamping (mis. "sering menghindar saat diminta membaca"). */
  companionNotes?: string;
}

/** Penjelasan naratif metrik untuk pendamping (kunci = "fase-0".."fase-4" atau skill). */
export type MetricExplanations = Record<string, string>;

/** Rencana Pendampingan hasil generator. */
export interface CompanionPlanResult {
  /** Sumber rencana: LLM via proxy Gemini ('gemini') atau 'local-template'. */
  source: 'gemini' | 'local-template';
  generatedAt: number;
  /** Ringkasan hasil dalam bahasa observasi (bukan vonis). */
  summary: string;
  /** Saran aktivitas pendampingan di rumah/di mana pun (bukan kurikulum). */
  companionActivities: string[];
  /** Panduan langkah rujukan ke layanan profesional. */
  referralGuidance: string[];
  /** Analisis dinamis per fase/skill. */
  metricExplanations: MetricExplanations;
  /** Disclaimer wajib — sistem ini bukan alat diagnosis. */
  disclaimer: string;
  /** Pemakaian token Gemini (dari usageMetadata proxy) — data nyata untuk estimasi karbon. */
  aiUsage?: { promptTokens: number; outputTokens: number };
}

/**
 * Rencana Pendampingan yang DISIMPAN sekali (di akhir skrining), agar misi
 * rumah & narasi konsisten di semua tampilan dan lintas platform.
 */
export interface StoredCompanionPlan extends CompanionPlanResult {
  /** Kunci utama — 1:1 dengan sesi. */
  sessionId: string;
  childRef: string;
  updatedAt: number;
}

/**
 * Status penyelesaian "misi rumah minggu ini" per anak per minggu.
 */
export interface MissionProgress {
  /** Kunci komposit `${childRef}:${weekKey}`. */
  id: string;
  childRef: string;
  /** Kunci minggu ISO, mis. "2026-W32". */
  weekKey: string;
  /** Indeks misi yang sudah ditandai selesai. */
  doneIndices: number[];
  updatedAt: number;
}
