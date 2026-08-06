/**
 * Konstanta ambang terkait number line (dipakai alur produksi).
 *
 * Catatan: bank soal prototipe lama (DEFAULT_TRIALS, CHEERS, GAME_LABEL,
 * GAME_EMOJI, tipe `Trial`) sudah dihapus bersama jalur `PrototypeScreening`/
 * `useScreeningSession`. Alur produksi memakai generator trial BER-SEED di
 * masing-masing game (`src/game/HutanHuruf|SungaiBunyi|BukitAngka/index.tsx`).
 */

/** NLEE ≤ 10% dianggap jawaban benar untuk metrik akurasi internal. */
export const LINE_CORRECT_TOLERANCE = 10;
