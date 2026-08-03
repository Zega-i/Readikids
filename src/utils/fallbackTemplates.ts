/**
 * ReadiKids AI — Template Rencana Pendampingan lokal (offline fallback).
 *
 * Dipakai bila Gemini API tidak tersedia (offline / tanpa API key /
 * error). Template dipilih berdasarkan level indikasi per domain,
 * lalu dirangkai menjadi CompanionPlanResult dengan format identik
 * dengan output LLM sehingga UI tidak perlu membedakan sumbernya.
 *
 * v4.0: ditulis untuk PENDAMPING GENERIK (orang tua/wali/guru/tutor),
 * bukan khusus guru — plus blok panduan rujukan per level.
 */
import type {
  ChildProfileForPlan,
  CompanionPlanResult,
  RiskLevel,
} from '../types/telemetry';

export const SCREENING_DISCLAIMER =
  'Hasil ini adalah indikasi skrining awal, BUKAN diagnosis medis atau psikologis. ' +
  'Untuk pemeriksaan lanjutan, silakan berkonsultasi dengan psikolog anak, ' +
  'puskesmas, atau klinik tumbuh kembang.';

const DYSLEXIA_ACTIVITIES: Record<RiskLevel, string[]> = {
  LOW: [
    'Bacakan buku cerita bergambar 10–15 menit setiap hari sebagai kebiasaan menyenangkan.',
    'Ajak anak menebak bunyi awal kata dari benda di sekitar ("bola… bunyinya b!").',
  ],
  MEDIUM: [
    'Latih menulis huruf di pasir/tepung/punggung tangan sambil menyebutkan bunyinya (multisensori).',
    'Gunakan kartu huruf berwarna untuk membedakan pasangan huruf mirip (b–d, p–q).',
    'Sediakan waktu membaca tanpa tekanan waktu; hindari membandingkan dengan anak lain.',
  ],
  HIGH: [
    'Jadwalkan sesi membaca pendek (5–10 menit) tapi rutin setiap hari, akhiri selalu dengan pujian.',
    'Gunakan buku audio atau dibacakan bergantian agar minat terhadap cerita tetap tumbuh.',
    'Perkenalkan huruf lewat banyak indra sekaligus: lihat bentuknya, dengar bunyinya, raba/tulis besar di udara.',
  ],
};

const DYSCALCULIA_ACTIVITIES: Record<RiskLevel, string[]> = {
  LOW: [
    'Ajak anak menghitung benda nyata saat aktivitas harian (piring, mainan, anak tangga).',
  ],
  MEDIUM: [
    'Bermain ular tangga atau permainan papan lain yang berbasis hitungan langkah.',
    'Gunakan jari, kancing, atau kelereng saat berlatih penjumlahan sederhana.',
    'Latih menebak "kira-kira berapa" (estimasi) sebelum menghitung pasti.',
  ],
  HIGH: [
    'Latih membandingkan jumlah ("mana yang lebih banyak?") dengan benda nyata setiap hari.',
    'Gunakan garis bilangan yang digambar besar di kertas/lantai untuk melompat maju-mundur.',
    'Hindari drilling soal hitung berjumlah banyak; utamakan pemahaman konsep pelan-pelan.',
  ],
};

/**
 * Panduan rujukan berdasarkan level indikasi KESELURUHAN.
 * LOW tetap diberi panduan pasif agar pendamping tahu kapan perlu waspada.
 */
const REFERRAL_GUIDANCE: Record<RiskLevel, string[]> = {
  LOW: [
    'Saat ini belum ada pola yang mengharuskan konsultasi. Lakukan skrining ulang dalam 1–3 bulan untuk memantau perkembangan.',
    'Bila di kemudian hari anak tampak sangat kesulitan membaca/berhitung dibanding teman seusianya, pertimbangkan konsultasi.',
  ],
  MEDIUM: [
    'Amati anak selama 2–4 minggu sambil menjalankan aktivitas pendampingan di atas, lalu lakukan skrining ulang.',
    'Bila pola tidak membaik, konsultasikan ke puskesmas (poli tumbuh kembang) atau psikolog anak — bawa Laporan Rujukan dari aplikasi ini.',
    'Sampaikan juga pengamatan Anda sehari-hari kepada guru/pendamping belajar anak agar observasi lebih lengkap.',
  ],
  HIGH: [
    'Disarankan berkonsultasi dengan profesional dalam waktu dekat: psikolog anak, puskesmas (poli tumbuh kembang), atau klinik tumbuh kembang.',
    'Ekspor dan bawa Laporan Rujukan dari aplikasi ini — berisi metrik yang membantu profesional memulai asesmen.',
    'Ingat: indikasi tinggi BUKAN berarti anak pasti mengalami disleksia/diskalkulia — hanya profesional yang dapat memastikan.',
  ],
};

const LEVEL_LABEL: Record<RiskLevel, string> = {
  LOW: 'tampak tipikal',
  MEDIUM: 'ada pola yang sebaiknya diamati',
  HIGH: 'disarankan konsultasi dengan profesional',
};

/** Ringkasan dalam bahasa observasi — tanpa vonis, tanpa skor menonjol. */
function summarize(profile: ChildProfileForPlan): string {
  const { assessment } = profile;
  return (
    `Dari sesi bermain, pola belajar anak secara keseluruhan: ${LEVEL_LABEL[assessment.level]}. ` +
    `Pola terkait pengenalan huruf dan membaca: ${LEVEL_LABEL[assessment.domains.dyslexia]}; ` +
    `pola terkait angka dan berhitung: ${LEVEL_LABEL[assessment.domains.dyscalculia]}. ` +
    `Saran di bawah disusun dari praktik pendampingan belajar yang umum dan aman dilakukan siapa saja.`
  );
}

/** Bangun Rencana Pendampingan dari template lokal — deterministik & offline. */
export function generateLocalCompanionPlan(profile: ChildProfileForPlan): CompanionPlanResult {
  const { level, domains } = profile.assessment;

  return {
    source: 'local-template',
    generatedAt: Date.now(),
    summary: summarize(profile),
    companionActivities: [
      ...DYSLEXIA_ACTIVITIES[domains.dyslexia],
      ...DYSCALCULIA_ACTIVITIES[domains.dyscalculia],
    ],
    referralGuidance: REFERRAL_GUIDANCE[level],
    disclaimer: SCREENING_DISCLAIMER,
  };
}
