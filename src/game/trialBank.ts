/**
 * ReadiKids AI — Item Bank & katalog dunia (arsitektur v2, membaca).
 *
 * Sumber konten tunggal untuk semua mekanik game. Setiap "jenis game" = satu
 * SkillId, punya bank soal (item). Mekanik generik membaca item dari sini —
 * menambah/mengubah soal = edit data di file ini, bukan menulis komponen baru.
 *
 * Struktur: 5 dunia (fase 0-4) -> daftar skill -> bank item per skill.
 * Peta skill->fase & skill->mekanik ada di src/types/telemetry.ts.
 *
 * ISIAN PER SKILL: 2 soal demo (contoh, tidak dihitung) + 8 soal skrining
 * = 10 total. Soal tambahan mengikuti mekanik & dunia skill (lihat
 * docs/matriks-skrining.md).
 */
import type { MechanicId, PhaseId, SkillId } from '../types/telemetry';
import { SKILL_MECHANIC, SKILL_PHASE } from '../types/telemetry';

// ═══════════════════════════════════════════════════════════════════════════
// TIPE
// ═══════════════════════════════════════════════════════════════════════════

/** Satu pilihan (ubin) dalam sebuah soal. */
export interface Choice {
  id: string;
  /** Teks di ubin (huruf, suku kata, angka). Kosong bila ubin gambar/suara. */
  label?: string;
  /** Emoji/gambar opsional. */
  image?: string;
  /** Teks yang diucapkan TTS saat ubin relevan (mis. bunyi huruf). */
  audio?: string;
}

/** Satu soal generik untuk mekanik pilihan/urutan. */
export interface Item {
  id: string;
  /** Instruksi lisan (TTS) untuk anak. */
  prompt: string;
  /** Stimulus teks besar di tengah (huruf/kata), atau null. */
  stimulusText?: string | null;
  /** Bunyi stimulus (TTS) yang diputar otomatis; string tunggal atau urutan (blending). */
  stimulusAudio?: string | string[];
  /** Ubin pilihan. */
  choices: Choice[];
  /** Id pilihan benar (untuk jawaban tunggal). */
  correctId?: string;
  /** Urutan benar (untuk mekanik build/recall). */
  correctOrder?: string[];
  /**
   * Jangan acak posisi ubin saat render. Dipakai bila jawaban benar SEMANTIS
   * bergantung posisi (mis. "ketuk yang paling kiri"). Tanpa ini, ChoiceGame
   * mengacak posisi jawaban agar anak tidak bisa menebak "selalu paling kiri".
   */
  noShuffle?: boolean;
  /** Peta id pilihan salah -> jenis error (untuk klasifikasi telemetri). */
  errorTags?: Record<string, string>;
}

/** Bank soal satu skill (satu "jenis game"). */
export interface SkillBank {
  skillId: SkillId;
  phase: PhaseId;
  mechanic: MechanicId;
  /** Nama ramah game (tampil di hub). */
  name: string;
  emoji: string;
  /** Kalimat pembuka lisan game. */
  intro: string;
  /** Soal contoh (tidak dihitung skor). */
  demo: Item[];
  /** Soal skrining. */
  items: Item[];
}

/** Satu dunia = satu fase, memuat beberapa skill (jenis game). */
export interface World {
  phase: PhaseId;
  key: string;
  name: string;
  emoji: string;
  /** Warna aksen dunia (mengikuti tema). */
  accent: string;
  skills: SkillId[];
}

// ═══════════════════════════════════════════════════════════════════════════
// KATALOG DUNIA
// ═══════════════════════════════════════════════════════════════════════════

export const WORLDS: World[] = [
  {
    phase: 0,
    key: 'fondasi',
    name: 'Padang Fondasi',
    emoji: '🌾',
    accent: '#8bb0d6',
    skills: ['orient', 'shape', 'track', 'print'],
  },
  {
    phase: 1,
    key: 'hutan',
    name: 'Hutan Huruf',
    emoji: '🌳',
    accent: '#6dbb57',
    skills: ['letter_vs_symbol', 'letter_discrim', 'letter_name', 'letter_case'],
  },
  {
    phase: 2,
    key: 'sungai',
    name: 'Sungai Bunyi',
    emoji: '🌊',
    accent: '#3fb2c4',
    skills: ['graph_to_phon', 'phon_to_graph', 'digraph'],
  },
  {
    phase: 3,
    key: 'gua',
    name: 'Gua Gema',
    emoji: '⛰️',
    accent: '#b57fd6',
    skills: ['sound_position', 'blending', 'segmenting', 'manipulation', 'phon_memory'],
  },
  {
    phase: 4,
    key: 'puncak',
    name: 'Puncak Kata',
    emoji: '⭐',
    accent: '#e0993a',
    skills: ['syllable', 'word_build', 'pseudoword', 'morphology'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER PEMBUAT SOAL (menjaga bank ringkas & konsisten)
// ═══════════════════════════════════════════════════════════════════════════

const c = (id: string, label?: string, extra: Partial<Choice> = {}): Choice => ({ id, label, ...extra });

/** Soal pilih-satu dari ubin berlabel. `correct` = id benar. */
function choiceItem(
  id: string,
  prompt: string,
  choices: Choice[],
  correctId: string,
  opts: { stimulusText?: string | null; stimulusAudio?: string | string[]; noShuffle?: boolean; errorTags?: Record<string, string> } = {},
): Item {
  return { id, prompt, choices, correctId, ...opts };
}

// ═══════════════════════════════════════════════════════════════════════════
// BANK PER SKILL
// ═══════════════════════════════════════════════════════════════════════════

const BANKS: SkillBank[] = [
  // ───────────────── FASE 0 — FONDASI ─────────────────
  {
    skillId: 'orient',
    phase: 0,
    mechanic: 'match',
    name: 'Arah Cilo',
    emoji: '🧭',
    intro: 'Pilih gambar yang menghadap ke arah yang sama.',
    demo: [
      choiceItem('orient-d1', 'Mana yang sama dengan contoh?', [c('a', '🦌'), c('b', '🦌')], 'a', { stimulusText: '🦌' }),
      choiceItem('orient-d2', 'Mana yang menghadap sama?', [c('a', '➡️'), c('b', '⬅️')], 'a', { stimulusText: '➡️', errorTags: { b: 'mirror' } }),
    ],
    items: [
      choiceItem('orient-1', 'Mana panah yang menghadap sama?', [c('a', '➡️'), c('b', '⬅️'), c('c', '⬆️')], 'a', { stimulusText: '➡️', errorTags: { b: 'mirror', c: 'rotation' } }),
      choiceItem('orient-2', 'Mana yang menghadap sama?', [c('a', '🐟'), c('b', '🐟')], 'b', { stimulusText: '🐟', errorTags: { a: 'mirror' } }),
      choiceItem('orient-3', 'Pilih yang arahnya sama.', [c('a', '👉'), c('b', '👈'), c('c', '👇')], 'a', { stimulusText: '👉', errorTags: { b: 'mirror', c: 'rotation' } }),
      choiceItem('orient-4', 'Mana yang tidak terbalik?', [c('a', '🌙'), c('b', '🌙')], 'a', { stimulusText: '🌙', errorTags: { b: 'rotation' } }),
      choiceItem('orient-5', 'Mana yang menghadap sama?', [c('a', '🚗'), c('b', '🚗'), c('c', '🚗')], 'c', { stimulusText: '🚗', errorTags: { a: 'mirror', b: 'rotation' } }),
      choiceItem('orient-6', 'Pilih arah yang sama.', [c('a', '↗️'), c('b', '↘️'), c('c', '↖️')], 'a', { stimulusText: '↗️', errorTags: { b: 'mirror', c: 'rotation' } }),
      choiceItem('orient-7', 'Pilih yang menghadap sama.', [c('a', '👈'), c('b', '👉'), c('c', '👆')], 'a', { stimulusText: '👈', errorTags: { b: 'mirror', c: 'rotation' } }),
      choiceItem('orient-8', 'Mana yang tidak terbalik?', [c('a', '🚀'), c('b', '🚀')], 'a', { stimulusText: '🚀', errorTags: { b: 'rotation' } }),
    ],
  },
  {
    skillId: 'shape',
    phase: 0,
    mechanic: 'match',
    name: 'Cari yang Sama',
    emoji: '🔷',
    intro: 'Temukan bentuk yang sama persis dengan contoh.',
    demo: [
      choiceItem('shape-d1', 'Mana yang sama?', [c('a', '🔵'), c('b', '🔺')], 'a', { stimulusText: '🔵' }),
      choiceItem('shape-d2', 'Cari yang sama persis.', [c('a', '🔶'), c('b', '🔷')], 'a', { stimulusText: '🔶' }),
    ],
    items: [
      choiceItem('shape-1', 'Mana yang sama dengan contoh?', [c('a', '⭐'), c('b', '❤️'), c('c', '⬛')], 'a', { stimulusText: '⭐', errorTags: { b: 'shape-confusion', c: 'shape-confusion' } }),
      choiceItem('shape-2', 'Pilih bentuk yang sama.', [c('a', '🔺'), c('b', '🔻'), c('c', '🔶')], 'a', { stimulusText: '🔺', errorTags: { b: 'rotation', c: 'shape-confusion' } }),
      choiceItem('shape-3', 'Mana yang sama?', [c('a', '🟩'), c('b', '🟢'), c('c', '🟦')], 'a', { stimulusText: '🟩', errorTags: { b: 'shape-confusion', c: 'shape-confusion' } }),
      choiceItem('shape-4', 'Cari yang sama persis.', [c('a', '✚'), c('b', '✖️'), c('c', '➖')], 'a', { stimulusText: '✚', errorTags: { b: 'rotation', c: 'shape-confusion' } }),
      choiceItem('shape-5', 'Mana yang sama?', [c('a', '🌸'), c('b', '🌼'), c('c', '🌺')], 'a', { stimulusText: '🌸', errorTags: { b: 'shape-confusion', c: 'shape-confusion' } }),
      choiceItem('shape-6', 'Pilih yang sama.', [c('a', '⬢'), c('b', '⬡'), c('c', '⭕')], 'a', { stimulusText: '⬢', errorTags: { b: 'shape-confusion', c: 'shape-confusion' } }),
      choiceItem('shape-7', 'Mana yang sama dengan contoh?', [c('a', '🔷'), c('b', '🔶'), c('c', '🔺')], 'a', { stimulusText: '🔷', errorTags: { b: 'shape-confusion', c: 'shape-confusion' } }),
      choiceItem('shape-8', 'Cari yang sama persis.', [c('a', '🌕'), c('b', '🌙'), c('c', '⭐')], 'a', { stimulusText: '🌕', errorTags: { b: 'shape-confusion', c: 'shape-confusion' } }),
    ],
  },
  {
    skillId: 'track',
    phase: 0,
    mechanic: 'path',
    name: 'Ikuti Jejak',
    emoji: '👣',
    intro: 'Ikuti jejak dari kiri ke kanan sampai ujung.',
    demo: [
      choiceItem('track-d1', 'Ketuk titik paling kiri untuk mulai.', [c('a', '•'), c('b', '•'), c('c', '•')], 'a', { noShuffle: true }),
      choiceItem('track-d2', 'Ikuti jejak dari kiri ke kanan. Ketuk yang paling kiri.', [c('a', '🐾'), c('b', '🐾'), c('c', '🐾')], 'a', { noShuffle: true }),
    ],
    items: [
      choiceItem('track-1', 'Mulai dari yang paling kiri.', [c('a', '🐾'), c('b', '🐾'), c('c', '🐾'), c('d', '🐾')], 'a', { noShuffle: true, errorTags: { b: 'start-point', c: 'start-point', d: 'start-point' } }),
      choiceItem('track-2', 'Ke arah mana kita membaca?', [c('a', '➡️ kanan'), c('b', '⬅️ kiri')], 'a', { errorTags: { b: 'direction' } }),
      choiceItem('track-3', 'Ketuk jejak berikutnya setelah yang ini.', [c('a', '🐾'), c('b', '🐾'), c('c', '🐾')], 'a', { noShuffle: true, errorTags: { b: 'sequence', c: 'sequence' } }),
      choiceItem('track-4', 'Mulai baris dari mana?', [c('a', 'kiri atas'), c('b', 'kanan atas'), c('c', 'kanan bawah')], 'a', { errorTags: { b: 'start-point', c: 'start-point' } }),
      choiceItem('track-5', 'Ketuk titik paling kiri.', [c('a', '•'), c('b', '•'), c('c', '•'), c('d', '•')], 'a', { noShuffle: true, errorTags: { b: 'start-point', c: 'start-point', d: 'start-point' } }),
      choiceItem('track-6', 'Setelah ujung kanan, lanjut ke mana?', [c('a', 'baris bawah kiri'), c('b', 'baris bawah kanan')], 'a', { errorTags: { b: 'direction' } }),
      choiceItem('track-7', 'Ketuk titik yang paling kiri.', [c('a', '•'), c('b', '•'), c('c', '•'), c('d', '•')], 'a', { noShuffle: true, errorTags: { b: 'start-point', c: 'start-point', d: 'start-point' } }),
      choiceItem('track-8', 'Baris kedua dibaca mulai dari?', [c('a', 'kiri'), c('b', 'kanan'), c('c', 'tengah')], 'a', { errorTags: { b: 'direction', c: 'start-point' } }),
    ],
  },
  {
    skillId: 'print',
    phase: 0,
    mechanic: 'path',
    name: 'Mana Tulisan?',
    emoji: '📄',
    intro: 'Kita cari mana yang tulisan dan bagaimana cara membacanya.',
    demo: [
      choiceItem('print-d1', 'Mana yang tulisan?', [c('a', 'buku'), c('b', '🧸')], 'a'),
      choiceItem('print-d2', 'Mana yang bisa dibaca?', [c('a', 'apel'), c('b', '🍎')], 'a'),
    ],
    items: [
      choiceItem('print-1', 'Mana yang bisa dibaca?', [c('a', 'rumah'), c('b', '🏠'), c('c', '🌳')], 'a', { errorTags: { b: 'shape-confusion', c: 'shape-confusion' } }),
      choiceItem('print-2', 'Di sebuah kalimat, kita mulai membaca dari?', [c('a', 'kiri'), c('b', 'kanan'), c('c', 'tengah')], 'a', { errorTags: { b: 'direction', c: 'start-point' } }),
      choiceItem('print-3', 'Mana kata, bukan gambar?', [c('a', 'ikan'), c('b', '🐟')], 'a', { errorTags: { b: 'shape-confusion' } }),
      choiceItem('print-4', 'Sebuah buku dibuka dan dibaca mulai dari?', [c('a', 'halaman depan'), c('b', 'halaman belakang')], 'a', { errorTags: { b: 'direction' } }),
      choiceItem('print-5', 'Mana yang huruf-huruf membentuk kata?', [c('a', 'bola'), c('b', '⚽'), c('c', '🎈')], 'a', { errorTags: { b: 'shape-confusion', c: 'shape-confusion' } }),
      choiceItem('print-6', 'Baris tulisan dibaca dari kiri ke...', [c('a', 'kanan'), c('b', 'atas'), c('c', 'bawah')], 'a', { errorTags: { b: 'direction', c: 'direction' } }),
      choiceItem('print-7', 'Mana yang bisa dibaca?', [c('a', '🚲'), c('b', 'sepeda')], 'b', { errorTags: { a: 'shape-confusion' } }),
      choiceItem('print-8', 'Antara gambar dan tulisan, mana yang kita baca?', [c('a', '🍦'), c('b', 'es krim')], 'b', { errorTags: { a: 'shape-confusion' } }),
    ],
  },

  // ───────────────── FASE 1 — HURUF ─────────────────
  {
    skillId: 'letter_vs_symbol',
    phase: 1,
    mechanic: 'pick',
    name: 'Huruf atau Bukan?',
    emoji: '🔎',
    intro: 'Pilih mana yang huruf.',
    demo: [
      choiceItem('lvs-d1', 'Mana yang huruf?', [c('a', 'A'), c('b', '5')], 'a'),
      choiceItem('lvs-d2', 'Mana yang huruf?', [c('a', 'B'), c('b', '4')], 'a'),
    ],
    items: [
      choiceItem('lvs-1', 'Mana yang huruf?', [c('a', 'm'), c('b', '3'), c('c', '★')], 'a', { errorTags: { b: 'random', c: 'random' } }),
      choiceItem('lvs-2', 'Mana yang huruf?', [c('a', '7'), c('b', 'k'), c('c', '@')], 'b', { errorTags: { a: 'random', c: 'random' } }),
      choiceItem('lvs-3', 'Mana yang huruf?', [c('a', '%'), c('b', '9'), c('c', 's')], 'c', { errorTags: { a: 'random', b: 'random' } }),
      choiceItem('lvs-4', 'Mana yang huruf?', [c('a', 'r'), c('b', '2'), c('c', '#')], 'a', { errorTags: { b: 'random', c: 'random' } }),
      choiceItem('lvs-5', 'Mana yang huruf?', [c('a', '4'), c('b', '&'), c('c', 'o')], 'c', { errorTags: { a: 'random', b: 'random' } }),
      choiceItem('lvs-6', 'Mana yang huruf?', [c('a', 'g'), c('b', '8'), c('c', '?')], 'a', { errorTags: { b: 'random', c: 'random' } }),
      choiceItem('lvs-7', 'Mana yang huruf?', [c('a', '6'), c('b', '!'), c('c', 'p')], 'c', { errorTags: { a: 'random', b: 'random' } }),
      choiceItem('lvs-8', 'Mana yang huruf?', [c('a', 't'), c('b', '0'), c('c', '+')], 'a', { errorTags: { b: 'random', c: 'random' } }),
    ],
  },
  {
    skillId: 'letter_discrim',
    phase: 1,
    mechanic: 'match',
    name: 'Kembaran Huruf',
    emoji: '👯',
    intro: 'Cari huruf yang sama persis dengan contoh.',
    demo: [
      choiceItem('ld-d1', 'Mana yang sama?', [c('a', 'a'), c('b', 'e')], 'a', { stimulusText: 'a' }),
      choiceItem('ld-d2', 'Cari huruf yang sama persis.', [c('a', 'm'), c('b', 'w')], 'a', { stimulusText: 'm' }),
    ],
    items: [
      choiceItem('ld-1', 'Mana yang sama dengan huruf ini?', [c('a', 'b'), c('b', 'd'), c('c', 'p')], 'a', { stimulusText: 'b', errorTags: { b: 'mirror', c: 'mirror' } }),
      choiceItem('ld-2', 'Cari huruf yang sama.', [c('a', 'q'), c('b', 'd'), c('c', 'p')], 'c', { stimulusText: 'p', errorTags: { a: 'mirror', b: 'mirror' } }),
      choiceItem('ld-3', 'Mana yang sama?', [c('a', 'n'), c('b', 'm'), c('c', 'u')], 'a', { stimulusText: 'n', errorTags: { b: 'shape-confusion', c: 'mirror' } }),
      choiceItem('ld-4', 'Cari kembarannya.', [c('a', 'd'), c('b', 'b'), c('c', 'a')], 'a', { stimulusText: 'd', errorTags: { b: 'mirror', c: 'shape-confusion' } }),
      choiceItem('ld-5', 'Mana yang sama?', [c('a', 'w'), c('b', 'm'), c('c', 'n')], 'a', { stimulusText: 'w', errorTags: { b: 'mirror', c: 'shape-confusion' } }),
      choiceItem('ld-6', 'Cari huruf yang sama.', [c('a', 'q'), c('b', 'p'), c('c', 'g')], 'a', { stimulusText: 'q', errorTags: { b: 'mirror', c: 'shape-confusion' } }),
      choiceItem('ld-7', 'Mana yang sama dengan huruf ini?', [c('a', 'p'), c('b', 'q'), c('c', 'b')], 'a', { stimulusText: 'p', errorTags: { b: 'mirror', c: 'mirror' } }),
      choiceItem('ld-8', 'Cari kembarannya.', [c('a', 'b'), c('b', 'd'), c('c', 'q')], 'a', { stimulusText: 'b', errorTags: { b: 'mirror', c: 'mirror' } }),
    ],
  },
  {
    skillId: 'letter_name',
    phase: 1,
    mechanic: 'pick',
    name: 'Huruf Apa Ini?',
    emoji: '🔡',
    intro: 'Dengar nama hurufnya, lalu pilih hurufnya.',
    demo: [
      choiceItem('ln-d1', 'Mana huruf "a"?', [c('a', 'a'), c('b', 'o')], 'a', { stimulusAudio: 'a' }),
      choiceItem('ln-d2', 'Mana huruf "o"?', [c('a', 'o'), c('b', 'a')], 'a', { stimulusAudio: 'huruf o' }),
    ],
    items: [
      choiceItem('ln-1', 'Mana huruf "em"?', [c('a', 'm'), c('b', 'n'), c('c', 'w')], 'a', { stimulusAudio: 'huruf em', errorTags: { b: 'visual-similar', c: 'visual-similar' } }),
      choiceItem('ln-2', 'Mana huruf "be"?', [c('a', 'd'), c('b', 'b'), c('c', 'p')], 'b', { stimulusAudio: 'huruf be', errorTags: { a: 'visual-similar', c: 'visual-similar' } }),
      choiceItem('ln-3', 'Mana huruf "es"?', [c('a', 'z'), c('b', 'c'), c('c', 's')], 'c', { stimulusAudio: 'huruf es', errorTags: { a: 'random', b: 'visual-similar' } }),
      choiceItem('ln-4', 'Mana huruf "er"?', [c('a', 'r'), c('b', 'n'), c('c', 'k')], 'a', { stimulusAudio: 'huruf er', errorTags: { b: 'visual-similar', c: 'random' } }),
      choiceItem('ln-5', 'Mana huruf "i"?', [c('a', 'l'), c('b', 'i'), c('c', 'j')], 'b', { stimulusAudio: 'huruf i', errorTags: { a: 'visual-similar', c: 'visual-similar' } }),
      choiceItem('ln-6', 'Mana huruf "ka"?', [c('a', 'k'), c('b', 'h'), c('c', 'x')], 'a', { stimulusAudio: 'huruf ka', errorTags: { b: 'visual-similar', c: 'random' } }),
      choiceItem('ln-7', 'Mana huruf "de"?', [c('a', 'b'), c('b', 'd'), c('c', 'p')], 'b', { stimulusAudio: 'huruf de', errorTags: { a: 'visual-similar', c: 'visual-similar' } }),
      choiceItem('ln-8', 'Mana huruf "pe"?', [c('a', 'q'), c('b', 'p'), c('c', 'b')], 'b', { stimulusAudio: 'huruf pe', errorTags: { a: 'visual-similar', c: 'visual-similar' } }),
    ],
  },
  {
    skillId: 'letter_case',
    phase: 1,
    mechanic: 'pick',
    name: 'Besar & Kecil',
    emoji: '🅰️',
    intro: 'Pasangkan huruf besar dengan huruf kecilnya.',
    demo: [
      choiceItem('lc-d1', 'Mana huruf kecil dari "A"?', [c('a', 'a'), c('b', 'e')], 'a', { stimulusText: 'A' }),
      choiceItem('lc-d2', 'Mana huruf besar dari "b"?', [c('a', 'B'), c('b', 'P')], 'a', { stimulusText: 'b' }),
    ],
    items: [
      choiceItem('lc-1', 'Mana pasangan kecil dari huruf ini?', [c('a', 'r'), c('b', 'n'), c('c', 'm')], 'a', { stimulusText: 'R', errorTags: { b: 'case-confusion', c: 'case-confusion' } }),
      choiceItem('lc-2', 'Mana pasangan besar dari huruf ini?', [c('a', 'B'), c('b', 'D'), c('c', 'P')], 'a', { stimulusText: 'b', errorTags: { b: 'case-confusion', c: 'case-confusion' } }),
      choiceItem('lc-3', 'Mana huruf kecil dari "E"?', [c('a', 'e'), c('b', 'c'), c('c', 'o')], 'a', { stimulusText: 'E', errorTags: { b: 'case-confusion', c: 'case-confusion' } }),
      choiceItem('lc-4', 'Mana huruf besar dari "g"?', [c('a', 'G'), c('b', 'C'), c('c', 'Q')], 'a', { stimulusText: 'g', errorTags: { b: 'case-confusion', c: 'case-confusion' } }),
      choiceItem('lc-5', 'Mana huruf kecil dari "M"?', [c('a', 'm'), c('b', 'n'), c('c', 'w')], 'a', { stimulusText: 'M', errorTags: { b: 'case-confusion', c: 'case-confusion' } }),
      choiceItem('lc-6', 'Mana huruf besar dari "t"?', [c('a', 'T'), c('b', 'F'), c('c', 'L')], 'a', { stimulusText: 't', errorTags: { b: 'case-confusion', c: 'case-confusion' } }),
      choiceItem('lc-7', 'Mana huruf kecil dari "N"?', [c('a', 'n'), c('b', 'm'), c('c', 'r')], 'a', { stimulusText: 'N', errorTags: { b: 'case-confusion', c: 'case-confusion' } }),
      choiceItem('lc-8', 'Mana huruf besar dari "k"?', [c('a', 'K'), c('b', 'R'), c('c', 'H')], 'a', { stimulusText: 'k', errorTags: { b: 'case-confusion', c: 'case-confusion' } }),
    ],
  },

  // ───────────────── FASE 2 — HURUF & BUNYI ─────────────────
  {
    skillId: 'graph_to_phon',
    phase: 2,
    mechanic: 'pick',
    name: 'Bunyi Huruf',
    emoji: '📣',
    intro: 'Lihat hurufnya, lalu pilih bunyi yang benar.',
    demo: [
      choiceItem('gp-d1', 'Bunyi apa untuk huruf ini?', [c('a', 'a', { audio: 'a' }), c('b', 'i', { audio: 'i' })], 'a', { stimulusText: 'a' }),
      choiceItem('gp-d2', 'Bunyi apa untuk huruf ini?', [c('a', '/b/', { audio: 'beh' }), c('b', '/d/', { audio: 'deh' })], 'a', { stimulusText: 'b' }),
    ],
    items: [
      choiceItem('gp-1', 'Bunyi apa untuk huruf ini?', [c('a', '/m/', { audio: 'mmm' }), c('b', '/n/', { audio: 'nnn' }), c('c', '/s/', { audio: 'sss' })], 'a', { stimulusText: 'm', errorTags: { b: 'phonological', c: 'phonological' } }),
      choiceItem('gp-2', 'Bunyi apa untuk huruf ini?', [c('a', '/b/', { audio: 'beh' }), c('b', '/d/', { audio: 'deh' }), c('c', '/p/', { audio: 'peh' })], 'a', { stimulusText: 'b', errorTags: { b: 'phonological', c: 'phonological' } }),
      choiceItem('gp-3', 'Bunyi apa untuk huruf ini?', [c('a', '/s/', { audio: 'sss' }), c('b', '/c/', { audio: 'ceh' }), c('c', '/t/', { audio: 'teh' })], 'a', { stimulusText: 's', errorTags: { b: 'phonological', c: 'phonological' } }),
      choiceItem('gp-4', 'Bunyi apa untuk huruf ini?', [c('a', '/u/', { audio: 'u' }), c('b', '/o/', { audio: 'o' }), c('c', '/a/', { audio: 'a' })], 'a', { stimulusText: 'u', errorTags: { b: 'phonological', c: 'phonological' } }),
      choiceItem('gp-5', 'Bunyi apa untuk huruf ini?', [c('a', '/k/', { audio: 'keh' }), c('b', '/g/', { audio: 'geh' }), c('c', '/h/', { audio: 'hhh' })], 'a', { stimulusText: 'k', errorTags: { b: 'phonological', c: 'phonological' } }),
      choiceItem('gp-6', 'Bunyi apa untuk huruf ini?', [c('a', '/r/', { audio: 'rrr' }), c('b', '/l/', { audio: 'lll' }), c('c', '/n/', { audio: 'nnn' })], 'a', { stimulusText: 'r', errorTags: { b: 'phonological', c: 'phonological' } }),
      choiceItem('gp-7', 'Bunyi apa untuk huruf ini?', [c('a', '/g/', { audio: 'geh' }), c('b', '/k/', { audio: 'keh' }), c('c', '/j/', { audio: 'jeh' })], 'a', { stimulusText: 'g', errorTags: { b: 'phonological', c: 'phonological' } }),
      choiceItem('gp-8', 'Bunyi apa untuk huruf ini?', [c('a', '/o/', { audio: 'o' }), c('b', '/a/', { audio: 'a' }), c('c', '/e/', { audio: 'e' })], 'a', { stimulusText: 'o', errorTags: { b: 'phonological', c: 'phonological' } }),
    ],
  },
  {
    skillId: 'phon_to_graph',
    phase: 2,
    mechanic: 'pick',
    name: 'Huruf dari Bunyi',
    emoji: '👂',
    intro: 'Dengar bunyinya, lalu pilih huruf yang benar.',
    demo: [
      choiceItem('pg-d1', 'Huruf mana yang berbunyi begini?', [c('a', 'a'), c('b', 'u')], 'a', { stimulusAudio: 'a' }),
      choiceItem('pg-d2', 'Huruf mana yang berbunyi /b/?', [c('a', 'b'), c('b', 'd')], 'a', { stimulusAudio: 'beh' }),
    ],
    items: [
      choiceItem('pg-1', 'Huruf mana yang berbunyi /m/?', [c('a', 'm'), c('b', 'n'), c('c', 'b')], 'a', { stimulusAudio: 'mmm', errorTags: { b: 'phonological', c: 'random' } }),
      choiceItem('pg-2', 'Huruf mana yang berbunyi /s/?', [c('a', 'c'), c('b', 's'), c('c', 'z')], 'b', { stimulusAudio: 'sss', errorTags: { a: 'phonological', c: 'phonological' } }),
      choiceItem('pg-3', 'Huruf mana yang berbunyi /d/?', [c('a', 'b'), c('b', 'd'), c('c', 't')], 'b', { stimulusAudio: 'deh', errorTags: { a: 'visual-similar', c: 'phonological' } }),
      choiceItem('pg-4', 'Huruf mana yang berbunyi /o/?', [c('a', 'o'), c('b', 'a'), c('c', 'u')], 'a', { stimulusAudio: 'o', errorTags: { b: 'phonological', c: 'phonological' } }),
      choiceItem('pg-5', 'Huruf mana yang berbunyi /k/?', [c('a', 'k'), c('b', 'g'), c('c', 'q')], 'a', { stimulusAudio: 'keh', errorTags: { b: 'phonological', c: 'visual-similar' } }),
      choiceItem('pg-6', 'Huruf mana yang berbunyi /l/?', [c('a', 'l'), c('b', 'r'), c('c', 'i')], 'a', { stimulusAudio: 'lll', errorTags: { b: 'phonological', c: 'visual-similar' } }),
      choiceItem('pg-7', 'Huruf mana yang berbunyi /g/?', [c('a', 'g'), c('b', 'k'), c('c', 'j')], 'a', { stimulusAudio: 'geh', errorTags: { b: 'phonological', c: 'phonological' } }),
      choiceItem('pg-8', 'Huruf mana yang berbunyi /p/?', [c('a', 'b'), c('b', 'p'), c('c', 'q')], 'b', { stimulusAudio: 'peh', errorTags: { a: 'phonological', c: 'visual-similar' } }),
    ],
  },
  {
    skillId: 'digraph',
    phase: 2,
    mechanic: 'pick',
    name: 'Bunyi Gabungan',
    emoji: '🔗',
    intro: 'Dua huruf bisa jadi satu bunyi. Pilih pasangannya.',
    demo: [
      choiceItem('dg-d1', 'Huruf mana yang berbunyi /ng/?', [c('a', 'ng'), c('b', 'na')], 'a', { stimulusAudio: 'nggg' }),
      choiceItem('dg-d2', 'Huruf mana yang berbunyi /ny/ seperti di "NYamuk"?', [c('a', 'ny'), c('b', 'ng')], 'a', { stimulusAudio: 'nyyy' }),
    ],
    items: [
      choiceItem('dg-1', 'Mana yang berbunyi /ng/ seperti di "banGUN"?', [c('a', 'ng'), c('b', 'ny'), c('c', 'n')], 'a', { stimulusAudio: 'nggg', errorTags: { b: 'phonological', c: 'segmental' } }),
      choiceItem('dg-2', 'Mana yang berbunyi /ny/ seperti di "NYamuk"?', [c('a', 'ng'), c('b', 'ny'), c('c', 'nj')], 'b', { stimulusAudio: 'nyyy', errorTags: { a: 'phonological', c: 'phonological' } }),
      choiceItem('dg-3', 'Mana yang berbunyi /sy/ seperti di "SYukur"?', [c('a', 'sy'), c('b', 'sa'), c('c', 's')], 'a', { stimulusAudio: 'sy', errorTags: { b: 'segmental', c: 'segmental' } }),
      choiceItem('dg-4', 'Mana yang berbunyi /kh/ seperti di "aKHir"?', [c('a', 'kh'), c('b', 'ka'), c('c', 'h')], 'a', { stimulusAudio: 'khhh', errorTags: { b: 'segmental', c: 'segmental' } }),
      choiceItem('dg-5', 'Kata "NGaji" diawali bunyi apa?', [c('a', 'ng'), c('b', 'n'), c('c', 'g')], 'a', { stimulusAudio: 'ngaji', errorTags: { b: 'segmental', c: 'segmental' } }),
      choiceItem('dg-6', 'Kata "NYanyi" diawali bunyi apa?', [c('a', 'ny'), c('b', 'ng'), c('c', 'n')], 'a', { stimulusAudio: 'nyanyi', errorTags: { b: 'phonological', c: 'segmental' } }),
      choiceItem('dg-7', 'Kata "KHItar" diawali bunyi apa?', [c('a', 'kh'), c('b', 'ka'), c('c', 'k')], 'a', { stimulusAudio: 'khitar', errorTags: { b: 'segmental', c: 'segmental' } }),
      choiceItem('dg-8', 'Mana yang berbunyi /ny/ seperti di "baNYak"?', [c('a', 'ny'), c('b', 'n'), c('c', 'ng')], 'a', { stimulusAudio: 'nyyy', errorTags: { b: 'segmental', c: 'phonological' } }),
    ],
  },

  // ───────────────── FASE 3 — BUNYI KATA ─────────────────
  {
    skillId: 'sound_position',
    phase: 3,
    mechanic: 'pick',
    name: 'Bunyi Awal/Akhir',
    emoji: '🎯',
    intro: 'Dengar kata, lalu pilih bunyi awal atau akhirnya.',
    demo: [
      choiceItem('sp-d1', 'Kata "mata" diawali bunyi apa?', [c('a', '/m/', { audio: 'mmm' }), c('b', '/t/', { audio: 'teh' })], 'a', { stimulusAudio: 'mata' }),
      choiceItem('sp-d2', 'Kata "susu" diawali bunyi apa?', [c('a', '/s/', { audio: 'sss' }), c('b', '/m/', { audio: 'mmm' })], 'a', { stimulusAudio: 'susu' }),
    ],
    items: [
      choiceItem('sp-1', 'Kata "bola" diawali bunyi apa?', [c('a', '/b/', { audio: 'beh' }), c('b', '/l/', { audio: 'lll' }), c('c', '/a/', { audio: 'a' })], 'a', { stimulusAudio: 'bola', errorTags: { b: 'position-swap', c: 'position-swap' } }),
      choiceItem('sp-2', 'Kata "sapi" diakhiri bunyi apa?', [c('a', '/s/', { audio: 'sss' }), c('b', '/i/', { audio: 'i' }), c('c', '/p/', { audio: 'peh' })], 'b', { stimulusAudio: 'sapi', errorTags: { a: 'position-swap', c: 'position-swap' } }),
      choiceItem('sp-3', 'Kata "nasi" diawali bunyi apa?', [c('a', '/n/', { audio: 'nnn' }), c('b', '/s/', { audio: 'sss' }), c('c', '/i/', { audio: 'i' })], 'a', { stimulusAudio: 'nasi', errorTags: { b: 'position-swap', c: 'position-swap' } }),
      choiceItem('sp-4', 'Kata "buku" diakhiri bunyi apa?', [c('a', '/u/', { audio: 'u' }), c('b', '/b/', { audio: 'beh' }), c('c', '/k/', { audio: 'keh' })], 'a', { stimulusAudio: 'buku', errorTags: { b: 'position-swap', c: 'position-swap' } }),
      choiceItem('sp-5', 'Kata "roti" diawali bunyi apa?', [c('a', '/r/', { audio: 'rrr' }), c('b', '/t/', { audio: 'teh' }), c('c', '/i/', { audio: 'i' })], 'a', { stimulusAudio: 'roti', errorTags: { b: 'position-swap', c: 'position-swap' } }),
      choiceItem('sp-6', 'Kata "meja" diakhiri bunyi apa?', [c('a', '/a/', { audio: 'a' }), c('b', '/m/', { audio: 'mmm' }), c('c', '/j/', { audio: 'jeh' })], 'a', { stimulusAudio: 'meja', errorTags: { b: 'position-swap', c: 'position-swap' } }),
      choiceItem('sp-7', 'Kata "kuda" diawali bunyi apa?', [c('a', '/k/', { audio: 'keh' }), c('b', '/d/', { audio: 'deh' }), c('c', '/u/', { audio: 'u' })], 'a', { stimulusAudio: 'kuda', errorTags: { b: 'position-swap', c: 'position-swap' } }),
      choiceItem('sp-8', 'Kata "padi" diakhiri bunyi apa?', [c('a', '/p/', { audio: 'peh' }), c('b', '/i/', { audio: 'i' }), c('c', '/d/', { audio: 'deh' })], 'b', { stimulusAudio: 'padi', errorTags: { a: 'position-swap', c: 'position-swap' } }),
    ],
  },
  {
    skillId: 'blending',
    phase: 3,
    mechanic: 'blend',
    name: 'Susun Bunyi',
    emoji: '🧩',
    intro: 'Dengar bunyi satu per satu, lalu tebak katanya.',
    demo: [
      choiceItem('bl-d1', 'Bunyi apa jika digabung?', [c('a', 'ibu', { image: '👩' }), c('b', 'sapi', { image: '🐄' })], 'a', { stimulusAudio: ['i', 'bu'] }),
      choiceItem('bl-d2', 'Gabungkan bunyinya, jadi kata apa?', [c('a', 'pagi', { image: '🌅' }), c('b', 'api', { image: '🔥' })], 'a', { stimulusAudio: ['pa', 'gi'] }),
    ],
    items: [
      choiceItem('bl-1', 'Gabungkan bunyinya, jadi kata apa?', [c('a', 'buku', { image: '📕' }), c('b', 'batu', { image: '🪨' }), c('c', 'bola', { image: '⚽' })], 'a', { stimulusAudio: ['bu', 'ku'], errorTags: { b: 'substitution', c: 'substitution' } }),
      choiceItem('bl-2', 'Gabungkan bunyinya.', [c('a', 'mata', { image: '👀' }), c('b', 'mama', { image: '👩' }), c('c', 'kaki', { image: '🦶' })], 'a', { stimulusAudio: ['ma', 'ta'], errorTags: { b: 'substitution', c: 'substitution' } }),
      choiceItem('bl-3', 'Jadi kata apa?', [c('a', 'sapu', { image: '🧹' }), c('b', 'sapi', { image: '🐄' }), c('c', 'susu', { image: '🥛' })], 'a', { stimulusAudio: ['sa', 'pu'], errorTags: { b: 'substitution', c: 'substitution' } }),
      choiceItem('bl-4', 'Gabungkan tiga bunyi ini.', [c('a', 'kucing', { image: '🐱' }), c('b', 'kancing', { image: '🔘' }), c('c', 'gunting', { image: '✂️' })], 'a', { stimulusAudio: ['ku', 'cing'], errorTags: { b: 'substitution', c: 'substitution' } }),
      choiceItem('bl-5', 'Jadi kata apa?', [c('a', 'roti', { image: '🍞' }), c('b', 'topi', { image: '🧢' }), c('c', 'roda', { image: '🛞' })], 'a', { stimulusAudio: ['ro', 'ti'], errorTags: { b: 'substitution', c: 'substitution' } }),
      choiceItem('bl-6', 'Gabungkan bunyinya.', [c('a', 'pisang', { image: '🍌' }), c('b', 'piring', { image: '🍽️' }), c('c', 'bintang', { image: '⭐' })], 'a', { stimulusAudio: ['pi', 'sang'], errorTags: { b: 'substitution', c: 'substitution' } }),
      choiceItem('bl-7', 'Gabungkan bunyinya.', [c('a', 'mobil', { image: '🚗' }), c('b', 'monyet', { image: '🐵' }), c('c', 'motor', { image: '🏍️' })], 'a', { stimulusAudio: ['mo', 'bil'], errorTags: { b: 'substitution', c: 'substitution' } }),
      choiceItem('bl-8', 'Jadi kata apa?', [c('a', 'rumah', { image: '🏠' }), c('b', 'roda', { image: '🛞' }), c('c', 'roti', { image: '🍞' })], 'a', { stimulusAudio: ['ru', 'mah'], errorTags: { b: 'substitution', c: 'substitution' } }),
    ],
  },
  {
    skillId: 'segmenting',
    phase: 3,
    mechanic: 'split',
    name: 'Pisah Bunyi',
    emoji: '✂️',
    intro: 'Hitung ada berapa suku bunyi dalam kata.',
    demo: [
      choiceItem('sg-d1', 'Berapa suku kata di "ma-ta"?', [c('a', '2'), c('b', '3')], 'a', { stimulusAudio: ['ma', 'ta'] }),
      choiceItem('sg-d2', 'Berapa suku kata di "a-yam"?', [c('a', '2'), c('b', '1')], 'a', { stimulusAudio: ['a', 'yam'] }),
    ],
    items: [
      choiceItem('sg-1', 'Berapa suku kata di "bu-ku"?', [c('a', '2'), c('b', '1'), c('c', '3')], 'a', { stimulusAudio: ['bu', 'ku'], errorTags: { b: 'undercount', c: 'overcount' } }),
      choiceItem('sg-2', 'Berapa suku kata di "se-pe-da"?', [c('a', '3'), c('b', '2'), c('c', '4')], 'a', { stimulusAudio: ['se', 'pe', 'da'], errorTags: { b: 'undercount', c: 'overcount' } }),
      choiceItem('sg-3', 'Berapa suku kata di "bo-la"?', [c('a', '2'), c('b', '3'), c('c', '1')], 'a', { stimulusAudio: ['bo', 'la'], errorTags: { b: 'overcount', c: 'undercount' } }),
      choiceItem('sg-4', 'Berapa suku kata di "ku-pu-ku-pu"?', [c('a', '4'), c('b', '2'), c('c', '3')], 'a', { stimulusAudio: ['ku', 'pu', 'ku', 'pu'], errorTags: { b: 'undercount', c: 'undercount' } }),
      choiceItem('sg-5', 'Berapa suku kata di "ga-jah"?', [c('a', '2'), c('b', '3'), c('c', '1')], 'a', { stimulusAudio: ['ga', 'jah'], errorTags: { b: 'overcount', c: 'undercount' } }),
      choiceItem('sg-6', 'Berapa suku kata di "ma-ta-ha-ri"?', [c('a', '4'), c('b', '3'), c('c', '5')], 'a', { stimulusAudio: ['ma', 'ta', 'ha', 'ri'], errorTags: { b: 'undercount', c: 'overcount' } }),
      choiceItem('sg-7', 'Berapa suku kata di "pe-lan-gi"?', [c('a', '3'), c('b', '2'), c('c', '4')], 'a', { stimulusAudio: ['pe', 'lan', 'gi'], errorTags: { b: 'undercount', c: 'overcount' } }),
      choiceItem('sg-8', 'Berapa suku kata di "a-yam"?', [c('a', '2'), c('b', '1'), c('c', '3')], 'a', { stimulusAudio: ['a', 'yam'], errorTags: { b: 'undercount', c: 'overcount' } }),
    ],
  },
  {
    skillId: 'manipulation',
    phase: 3,
    mechanic: 'swap',
    name: 'Ubah Bunyi',
    emoji: '🪄',
    intro: 'Ganti satu bunyi, jadi kata baru apa?',
    demo: [
      choiceItem('mn-d1', '"mata" jika /m/ diganti /k/ jadi?', [c('a', 'kata'), c('b', 'mama')], 'a', { stimulusAudio: 'mata' }),
      choiceItem('mn-d2', '"pita" jika /p/ diganti /s/ jadi?', [c('a', 'sita'), c('b', 'pita')], 'a', { stimulusAudio: 'pita' }),
    ],
    items: [
      choiceItem('mn-1', '"buku" jika /b/ diganti /k/ jadi?', [c('a', 'kuku'), c('b', 'baku'), c('c', 'buka')], 'a', { stimulusAudio: 'buku', errorTags: { b: 'wrong-target', c: 'substitution' } }),
      choiceItem('mn-2', '"topi" jika /t/ dihilangkan jadi?', [c('a', 'opi'), c('b', 'topi'), c('c', 'kopi')], 'a', { stimulusAudio: 'topi', errorTags: { b: 'no-change', c: 'substitution' } }),
      choiceItem('mn-3', '"bola" jika /b/ diganti /k/ jadi?', [c('a', 'kola'), c('b', 'bola'), c('c', 'bela')], 'a', { stimulusAudio: 'bola', errorTags: { b: 'no-change', c: 'wrong-target' } }),
      choiceItem('mn-4', '"kaki" jika /k/ pertama diganti /s/ jadi?', [c('a', 'saki'), c('b', 'kaku'), c('c', 'kaki')], 'a', { stimulusAudio: 'kaki', errorTags: { b: 'wrong-target', c: 'no-change' } }),
      choiceItem('mn-5', '"pagi" jika /p/ diganti /l/ jadi?', [c('a', 'lagi'), c('b', 'pagi'), c('c', 'padi')], 'a', { stimulusAudio: 'pagi', errorTags: { b: 'no-change', c: 'wrong-target' } }),
      choiceItem('mn-6', '"nasi" jika /n/ diganti /k/ jadi?', [c('a', 'kasi'), c('b', 'nasi'), c('c', 'nani')], 'a', { stimulusAudio: 'nasi', errorTags: { b: 'no-change', c: 'wrong-target' } }),
      choiceItem('mn-7', '"malam" jika /m/ diganti /d/ jadi?', [c('a', 'dalam'), c('b', 'malam'), c('c', 'malan')], 'a', { stimulusAudio: 'malam', errorTags: { b: 'no-change', c: 'wrong-target' } }),
      choiceItem('mn-8', '"satu" jika /s/ diganti /b/ jadi?', [c('a', 'batu'), c('b', 'satu'), c('c', 'sata')], 'a', { stimulusAudio: 'satu', errorTags: { b: 'no-change', c: 'wrong-target' } }),
    ],
  },
  {
    skillId: 'phon_memory',
    phase: 3,
    mechanic: 'recall',
    name: 'Ingat Bunyi',
    emoji: '🧠',
    intro: 'Dengar urutan bunyi, lalu ulangi urutannya.',
    demo: [
      { id: 'pm-d1', prompt: 'Ulangi urutan ini.', stimulusAudio: ['a', 'i'], choices: [c('a', 'a'), c('i', 'i')], correctOrder: ['a', 'i'] },
      { id: 'pm-d2', prompt: 'Ulangi urutannya.', stimulusAudio: ['o', 'e'], choices: [c('o', 'o'), c('e', 'e'), c('a', 'a')], correctOrder: ['o', 'e'] },
    ],
    items: [
      { id: 'pm-1', prompt: 'Ketuk sesuai urutan yang kamu dengar.', stimulusAudio: ['a', 'u'], choices: [c('a', 'a'), c('u', 'u'), c('i', 'i')], correctOrder: ['a', 'u'] },
      { id: 'pm-2', prompt: 'Ulangi urutannya.', stimulusAudio: ['ba', 'ku'], choices: [c('ba', 'ba'), c('ku', 'ku'), c('bu', 'bu')], correctOrder: ['ba', 'ku'] },
      { id: 'pm-3', prompt: 'Ulangi urutannya.', stimulusAudio: ['i', 'a', 'u'], choices: [c('i', 'i'), c('a', 'a'), c('u', 'u')], correctOrder: ['i', 'a', 'u'] },
      { id: 'pm-4', prompt: 'Ulangi urutannya.', stimulusAudio: ['ma', 'ta', 'ha'], choices: [c('ma', 'ma'), c('ta', 'ta'), c('ha', 'ha')], correctOrder: ['ma', 'ta', 'ha'] },
      { id: 'pm-5', prompt: 'Ulangi urutannya.', stimulusAudio: ['o', 'e', 'a'], choices: [c('o', 'o'), c('e', 'e'), c('a', 'a')], correctOrder: ['o', 'e', 'a'] },
      { id: 'pm-6', prompt: 'Ulangi urutannya.', stimulusAudio: ['sa', 'pi', 'ku'], choices: [c('sa', 'sa'), c('pi', 'pi'), c('ku', 'ku')], correctOrder: ['sa', 'pi', 'ku'] },
      { id: 'pm-7', prompt: 'Ulangi urutannya.', stimulusAudio: ['ta', 'ma', 'sa'], choices: [c('ta', 'ta'), c('ma', 'ma'), c('sa', 'sa')], correctOrder: ['ta', 'ma', 'sa'] },
      { id: 'pm-8', prompt: 'Ulangi urutannya.', stimulusAudio: ['i', 'u', 'o'], choices: [c('i', 'i'), c('u', 'u'), c('o', 'o')], correctOrder: ['i', 'u', 'o'] },
    ],
  },

  // ───────────────── FASE 4 — MERANGKAI KATA ─────────────────
  {
    skillId: 'syllable',
    phase: 4,
    mechanic: 'build',
    name: 'Baca Suku Kata',
    emoji: '🔠',
    intro: 'Susun huruf jadi suku kata yang benar.',
    demo: [
      { id: 'sy-d1', prompt: 'Susun jadi "ba".', stimulusAudio: 'ba', choices: [c('b', 'b'), c('a', 'a')], correctOrder: ['b', 'a'] },
      { id: 'sy-d2', prompt: 'Susun jadi "pa".', stimulusAudio: 'pa', choices: [c('p', 'p'), c('a', 'a')], correctOrder: ['p', 'a'] },
    ],
    items: [
      { id: 'sy-1', prompt: 'Susun jadi "bu".', stimulusAudio: 'bu', choices: [c('b', 'b'), c('u', 'u')], correctOrder: ['b', 'u'] },
      { id: 'sy-2', prompt: 'Susun jadi "ka".', stimulusAudio: 'ka', choices: [c('k', 'k'), c('a', 'a')], correctOrder: ['k', 'a'] },
      { id: 'sy-3', prompt: 'Susun jadi "tas".', stimulusAudio: 'tas', choices: [c('t', 't'), c('a', 'a'), c('s', 's')], correctOrder: ['t', 'a', 's'] },
      { id: 'sy-4', prompt: 'Susun jadi "mi".', stimulusAudio: 'mi', choices: [c('m', 'm'), c('i', 'i')], correctOrder: ['m', 'i'] },
      { id: 'sy-5', prompt: 'Susun jadi "pot".', stimulusAudio: 'pot', choices: [c('p', 'p'), c('o', 'o'), c('t', 't')], correctOrder: ['p', 'o', 't'] },
      { id: 'sy-6', prompt: 'Susun jadi "lu".', stimulusAudio: 'lu', choices: [c('l', 'l'), c('u', 'u')], correctOrder: ['l', 'u'] },
      { id: 'sy-7', prompt: 'Susun jadi "ri".', stimulusAudio: 'ri', choices: [c('r', 'r'), c('i', 'i')], correctOrder: ['r', 'i'] },
      { id: 'sy-8', prompt: 'Susun jadi "kut".', stimulusAudio: 'kut', choices: [c('k', 'k'), c('u', 'u'), c('t', 't')], correctOrder: ['k', 'u', 't'] },
    ],
  },
  {
    skillId: 'word_build',
    phase: 4,
    mechanic: 'build',
    name: 'Susun Kata',
    emoji: '🏗️',
    intro: 'Susun suku kata jadi sebuah kata.',
    demo: [
      { id: 'wb-d1', prompt: 'Susun jadi "buku".', stimulusAudio: 'buku', choices: [c('bu', 'bu'), c('ku', 'ku')], correctOrder: ['bu', 'ku'] },
      { id: 'wb-d2', prompt: 'Susun jadi "nasi".', stimulusAudio: 'nasi', choices: [c('na', 'na'), c('si', 'si')], correctOrder: ['na', 'si'] },
    ],
    items: [
      { id: 'wb-1', prompt: 'Susun jadi "sapi".', stimulusAudio: 'sapi', choices: [c('sa', 'sa'), c('pi', 'pi')], correctOrder: ['sa', 'pi'] },
      { id: 'wb-2', prompt: 'Susun jadi "mata".', stimulusAudio: 'mata', choices: [c('ma', 'ma'), c('ta', 'ta')], correctOrder: ['ma', 'ta'] },
      { id: 'wb-3', prompt: 'Susun jadi "sepeda".', stimulusAudio: 'sepeda', choices: [c('se', 'se'), c('pe', 'pe'), c('da', 'da')], correctOrder: ['se', 'pe', 'da'] },
      { id: 'wb-4', prompt: 'Susun jadi "kelapa".', stimulusAudio: 'kelapa', choices: [c('ke', 'ke'), c('la', 'la'), c('pa', 'pa')], correctOrder: ['ke', 'la', 'pa'] },
      { id: 'wb-5', prompt: 'Susun jadi "topi".', stimulusAudio: 'topi', choices: [c('to', 'to'), c('pi', 'pi')], correctOrder: ['to', 'pi'] },
      { id: 'wb-6', prompt: 'Susun jadi "matahari".', stimulusAudio: 'matahari', choices: [c('ma', 'ma'), c('ta', 'ta'), c('ha', 'ha'), c('ri', 'ri')], correctOrder: ['ma', 'ta', 'ha', 'ri'] },
      { id: 'wb-7', prompt: 'Susun jadi "pelangi".', stimulusAudio: 'pelangi', choices: [c('pe', 'pe'), c('lan', 'lan'), c('gi', 'gi')], correctOrder: ['pe', 'lan', 'gi'] },
      { id: 'wb-8', prompt: 'Susun jadi "kucing".', stimulusAudio: 'kucing', choices: [c('ku', 'ku'), c('cing', 'cing')], correctOrder: ['ku', 'cing'] },
    ],
  },
  {
    skillId: 'pseudoword',
    phase: 4,
    mechanic: 'build',
    name: 'Kata Ajaib',
    emoji: '✨',
    intro: 'Ini kata ajaib yang belum ada artinya. Dengar bunyinya, lalu susun!',
    demo: [
      { id: 'pw-d1', prompt: 'Susun jadi "mo-ka".', stimulusAudio: ['mo', 'ka'], choices: [c('mo', 'mo'), c('ka', 'ka')], correctOrder: ['mo', 'ka'] },
      { id: 'pw-d2', prompt: 'Susun jadi "ga-pi".', stimulusAudio: ['ga', 'pi'], choices: [c('ga', 'ga'), c('pi', 'pi')], correctOrder: ['ga', 'pi'] },
    ],
    items: [
      { id: 'pw-1', prompt: 'Susun jadi "te-pul".', stimulusAudio: ['te', 'pul'], choices: [c('te', 'te'), c('pul', 'pul')], correctOrder: ['te', 'pul'] },
      { id: 'pw-2', prompt: 'Susun jadi "lu-mi".', stimulusAudio: ['lu', 'mi'], choices: [c('lu', 'lu'), c('mi', 'mi')], correctOrder: ['lu', 'mi'] },
      { id: 'pw-3', prompt: 'Susun jadi "da-po".', stimulusAudio: ['da', 'po'], choices: [c('da', 'da'), c('po', 'po')], correctOrder: ['da', 'po'] },
      { id: 'pw-4', prompt: 'Susun jadi "ki-ne-sa".', stimulusAudio: ['ki', 'ne', 'sa'], choices: [c('ki', 'ki'), c('ne', 'ne'), c('sa', 'sa')], correctOrder: ['ki', 'ne', 'sa'] },
      { id: 'pw-5', prompt: 'Susun jadi "bo-tun".', stimulusAudio: ['bo', 'tun'], choices: [c('bo', 'bo'), c('tun', 'tun')], correctOrder: ['bo', 'tun'] },
      { id: 'pw-6', prompt: 'Susun jadi "se-ri-mu".', stimulusAudio: ['se', 'ri', 'mu'], choices: [c('se', 'se'), c('ri', 'ri'), c('mu', 'mu')], correctOrder: ['se', 'ri', 'mu'] },
      { id: 'pw-7', prompt: 'Susun jadi "ta-ro-ku".', stimulusAudio: ['ta', 'ro', 'ku'], choices: [c('ta', 'ta'), c('ro', 'ro'), c('ku', 'ku')], correctOrder: ['ta', 'ro', 'ku'] },
      { id: 'pw-8', prompt: 'Susun jadi "pi-nam".', stimulusAudio: ['pi', 'nam'], choices: [c('pi', 'pi'), c('nam', 'nam')], correctOrder: ['pi', 'nam'] },
    ],
  },
  {
    skillId: 'morphology',
    phase: 4,
    mechanic: 'build',
    name: 'Imbuhan',
    emoji: '🧵',
    intro: 'Tambah awalan/akhiran jadi kata baru. Dengar bunyinya!',
    demo: [
      { id: 'mo-d1', prompt: 'Susun "me" + "makan".', stimulusAudio: ['me', 'makan'], choices: [c('me', 'me'), c('makan', 'makan')], correctOrder: ['me', 'makan'] },
      { id: 'mo-d2', prompt: 'Susun "ber" + "lari".', stimulusAudio: ['ber', 'lari'], choices: [c('ber', 'ber'), c('lari', 'lari')], correctOrder: ['ber', 'lari'] },
    ],
    items: [
      { id: 'mo-1', prompt: 'Susun "di" + "baca".', stimulusAudio: ['di', 'baca'], choices: [c('di', 'di'), c('baca', 'baca')], correctOrder: ['di', 'baca'] },
      { id: 'mo-2', prompt: 'Susun "makan" + "an".', stimulusAudio: ['makan', 'an'], choices: [c('makan', 'makan'), c('an', 'an')], correctOrder: ['makan', 'an'] },
      { id: 'mo-3', prompt: 'Susun "ber" + "main".', stimulusAudio: ['ber', 'main'], choices: [c('ber', 'ber'), c('main', 'main')], correctOrder: ['ber', 'main'] },
      { id: 'mo-4', prompt: 'Susun "me" + "nulis".', stimulusAudio: ['me', 'nulis'], choices: [c('me', 'me'), c('nulis', 'nulis')], correctOrder: ['me', 'nulis'] },
      { id: 'mo-5', prompt: 'Susun "kupu" + "kupu" (kata ulang).', stimulusAudio: ['kupu', 'kupu'], choices: [c('kupu1', 'kupu'), c('kupu2', 'kupu')], correctOrder: ['kupu1', 'kupu2'] },
      { id: 'mo-6', prompt: 'Susun "per" + "main" + "an".', stimulusAudio: ['per', 'main', 'an'], choices: [c('per', 'per'), c('main', 'main'), c('an', 'an')], correctOrder: ['per', 'main', 'an'] },
      { id: 'mo-7', prompt: 'Susun "me" + "lihat".', stimulusAudio: ['me', 'lihat'], choices: [c('me', 'me'), c('lihat', 'lihat')], correctOrder: ['me', 'lihat'] },
      { id: 'mo-8', prompt: 'Susun "lari" + "lari" (kata ulang).', stimulusAudio: ['lari', 'lari'], choices: [c('lari1', 'lari'), c('lari2', 'lari')], correctOrder: ['lari1', 'lari2'] },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// AKSES
// ═══════════════════════════════════════════════════════════════════════════

const BANK_BY_SKILL = new Map<SkillId, SkillBank>(BANKS.map((b) => [b.skillId, b]));

export function getSkillBank(skillId: SkillId): SkillBank | undefined {
  return BANK_BY_SKILL.get(skillId);
}

export function getWorld(phase: PhaseId): World | undefined {
  return WORLDS.find((w) => w.phase === phase);
}

/** Semua skill dalam urutan dunia (fase 0→4). */
export const ALL_SKILLS: SkillId[] = WORLDS.flatMap((w) => w.skills);

// Sanity: pastikan setiap skill bank konsisten dengan peta fase/mekanik.
BANKS.forEach((b) => {
  if (SKILL_PHASE[b.skillId] !== b.phase) {
    console.warn(`[trialBank] fase skill ${b.skillId} tidak konsisten`);
  }
  if (SKILL_MECHANIC[b.skillId] !== b.mechanic) {
    console.warn(`[trialBank] mekanik skill ${b.skillId} tidak konsisten`);
  }
  if (b.demo.length !== 2) {
    console.warn(`[trialBank] skill ${b.skillId} harus punya 2 soal demo (kini ${b.demo.length})`);
  }
  if (b.items.length !== 8) {
    console.warn(`[trialBank] skill ${b.skillId} harus punya 8 soal skrining (kini ${b.items.length})`);
  }
});
