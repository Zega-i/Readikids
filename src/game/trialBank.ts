/**
 * Bank trial skrining — DATA MURNI, terpisah dari UI dan dari mesin sesi.
 *
 * Bila desain/kurikulum soal berubah (jumlah trial, huruf, angka target,
 * urutan, penambahan jenis game), cukup ubah file ini — mesin sesi
 * (useScreeningSession) dan UI tidak perlu disentuh selama bentuk
 * `Trial` tetap. Jenis trial baru = tambah varian pada union `Trial`.
 *
 * Urutan default: pemanasan huruf biasa dulu, huruf cermin berselang
 * (catatan EVALUASI.md #1).
 */
import type { GameId } from '../types/telemetry';

export type Trial =
  | {
      kind: 'choice';
      gameId: Extract<GameId, 'visual' | 'phonics'>;
      /** Huruf yang benar. */
      target: string;
      options: string[];
      isReversal: boolean;
      prompt: string;
      tts: string;
    }
  | {
      kind: 'line';
      gameId: 'numberline';
      /** Posisi benar pada garis 0–100. */
      target: number;
      prompt: string;
      tts: string;
    };

const V_PROMPT = 'Mana yang sama seperti ini?';
const P_PROMPT = 'Huruf apa yang bunyinya seperti itu?';

/**
 * ⚠️ STATUS: `DEFAULT_TRIALS` adalah SET SOAL FIXED dari JALUR PROTOTIPE LAMA.
 * Hanya dikonsumsi `useScreeningSession.ts` (headless) + `PrototypeScreening.tsx`,
 * yang KEDUANYA TIDAK di-wire ke aplikasi live (`App.tsx` tak merujuknya).
 *
 * Alur PRODUKSI memakai generator TRIAL BER-SEED di masing-masing game
 * (`src/game/HutanHuruf|SungaiBunyi|BukitAngka/index.tsx`): komposisi
 * terstandardisasi TAPI urutan diacak ulang tiap sesi (`sessionSeed` baru).
 *
 * JANGAN menyimpulkan dari daftar fixed di bawah bahwa "sesi 2 tak diacak
 * ulang" — itu keliru; randomisasi antar-sesi ada di generator tiap game.
 * (Catatan: `LINE_CORRECT_TOLERANCE` di bawah TETAP dipakai alur live.)
 */
export const DEFAULT_TRIALS: Trial[] = [
  // — Huruf Ajaib (visual) —
  { kind: 'choice', gameId: 'visual', target: 'a', options: ['e', 'a', 'o', 'u'], isReversal: false, prompt: V_PROMPT, tts: 'Mana yang sama seperti huruf ini? Sentuh ubinnya!' },
  { kind: 'choice', gameId: 'visual', target: 'o', options: ['o', 'c', 'a', 'e'], isReversal: false, prompt: V_PROMPT, tts: 'Cari lagi huruf yang sama, ya!' },
  { kind: 'choice', gameId: 'visual', target: 'm', options: ['m', 'n', 'w', 'u'], isReversal: false, prompt: V_PROMPT, tts: 'Yang mana yang sama? Sentuh, ya!' },
  { kind: 'choice', gameId: 'visual', target: 'b', options: ['d', 'b', 'p', 'q'], isReversal: true, prompt: V_PROMPT, tts: 'Sekarang, cari huruf yang sama!' },
  { kind: 'choice', gameId: 'visual', target: 'a', options: ['u', 'e', 'a', 'o'], isReversal: false, prompt: V_PROMPT, tts: 'Cari huruf yang sama!' },
  { kind: 'choice', gameId: 'visual', target: 'd', options: ['b', 'd', 'q', 'p'], isReversal: true, prompt: V_PROMPT, tts: 'Yang mana yang sama?' },
  { kind: 'choice', gameId: 'visual', target: 'o', options: ['c', 'o', 'e', 'a'], isReversal: false, prompt: V_PROMPT, tts: 'Satu lagi, cari yang sama!' },
  { kind: 'choice', gameId: 'visual', target: 'p', options: ['q', 'p', 'b', 'd'], isReversal: true, prompt: V_PROMPT, tts: 'Terakhir untuk permainan ini! Yang mana yang sama?' },
  // — Tebak Bunyi (phonics) —
  { kind: 'choice', gameId: 'phonics', target: 'b', options: ['b', 'd', 'p'], isReversal: false, prompt: P_PROMPT, tts: 'Dengarkan ya... ba. Sentuh hurufnya!' },
  { kind: 'choice', gameId: 'phonics', target: 'm', options: ['n', 'm', 'w'], isReversal: false, prompt: P_PROMPT, tts: 'Dengarkan ya... ma. Sentuh hurufnya!' },
  { kind: 'choice', gameId: 'phonics', target: 'd', options: ['d', 'b', 't'], isReversal: false, prompt: P_PROMPT, tts: 'Dengarkan ya... da. Sentuh hurufnya!' },
  { kind: 'choice', gameId: 'phonics', target: 'p', options: ['q', 'p', 'b'], isReversal: false, prompt: P_PROMPT, tts: 'Dengarkan ya... pa. Sentuh hurufnya!' },
  // — Lompat Angka (numberline) —
  { kind: 'line', gameId: 'numberline', target: 50, prompt: 'Di mana rumah angka', tts: 'Di mana rumah angka lima puluh? Sentuh garisnya, lalu tekan Sudah!' },
  { kind: 'line', gameId: 'numberline', target: 25, prompt: 'Di mana rumah angka', tts: 'Sekarang, di mana rumah angka dua puluh lima?' },
  { kind: 'line', gameId: 'numberline', target: 75, prompt: 'Di mana rumah angka', tts: 'Di mana rumah angka tujuh puluh lima?' },
  { kind: 'line', gameId: 'numberline', target: 37, prompt: 'Di mana rumah angka', tts: 'Terakhir! Di mana rumah angka tiga puluh tujuh?' },
];

export const GAME_LABEL: Record<GameId, string> = {
  visual: 'Huruf Ajaib',
  phonics: 'Tebak Bunyi',
  numberline: 'Lompat Angka',
};

export const GAME_EMOJI: Record<GameId, string> = {
  visual: '🔤',
  phonics: '🔊',
  numberline: '🐸',
};

export const CHEERS = ['Ayo lanjut! 🎈', 'Terus semangat! 🌈', 'Satu lagi yuk! 🚀', 'Kamu keren! ✨'];

/**
 * NLEE ≤ 10% dianggap jawaban benar untuk metrik akurasi internal.
 * CATATAN: konstanta ini AKTIF — dipakai `resultsPipeline.ts` (alur live),
 * bukan bagian dari jalur prototipe `DEFAULT_TRIALS`.
 */
export const LINE_CORRECT_TOLERANCE = 10;
