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
import { THRESHOLDS } from '../ml/heuristic';
import type {
  ChildProfileForPlan,
  CompanionPlanResult,
  MetricExplanations,
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

/**
 * Menghasilkan kalimat observasi dinamis tapi deterministik untuk 3 metrik
 * (HI, RR, NLEE) menggunakan formula yang persis sama dengan MetricCalculator.
 */
function explainMetrics(profile: ChildProfileForPlan): MetricExplanations {
  const m = profile.assessment.metrics;

  // 1. Hesitation Index (HI)
  const hiRaw = m.totalTimeMs > 0 ? (m.hesitationMs / m.totalTimeMs) : 0;
  const hiPercent = Math.round(hiRaw * 100);
  const hiThresh = Math.round(THRESHOLDS.HESITATION_INDEX * 100);
  let hiStr = `Waktu ragu anak tercatat ${hiPercent}% dari total waktu menjawab. `;
  if (hiRaw >= THRESHOLDS.HESITATION_INDEX) {
    hiStr += `Angka ini berada di atas ekspektasi umum (${hiThresh}%), yang bisa menjadi sinyal kesulitan memproses informasi dengan cepat.`;
  } else {
    hiStr += `Angka ini masih dalam rentang wajar (di bawah ${hiThresh}%), menunjukkan kelancaran dalam memberikan respons.`;
  }

  // 2. Reversal Ratio (RR)
  let rrStr = '';
  if (m.normalLatencyMs > 0 && m.reversalLatencyMs > 0) {
    const rrRaw = m.reversalLatencyMs / m.normalLatencyMs;
    const rrFormatted = rrRaw.toFixed(1);
    rrStr = `Anak membutuhkan waktu ${rrFormatted}× lebih lama untuk merespons huruf-huruf yang mudah tertukar (seperti b/d). `;
    if (rrRaw >= THRESHOLDS.REVERSAL_RATIO) {
      rrStr += `Perbedaan yang signifikan ini (batas wajar ${THRESHOLDS.REVERSAL_RATIO}×) sering menjadi indikasi adanya tantangan dalam rotasi spasial visual.`;
    } else {
      rrStr += `Perbedaan ini tidak tergolong signifikan (batas wajar ${THRESHOLDS.REVERSAL_RATIO}×), sehingga tidak menunjukkan tanda kesulitan rotasi spasial visual.`;
    }
  } else {
    rrStr = 'Data huruf tidak cukup untuk dibandingkan secara statistik dalam sesi ini.';
  }

  // 3. Number Line Estimation Error (NLEE)
  let nleeStr = '';
  if (m.nleePercent !== null) {
    const nleeRaw = Math.round(m.nleePercent);
    nleeStr = `Deviasi saat meletakkan angka di garis bilangan rata-rata sebesar ${nleeRaw}% dari target. `;
    if (nleeRaw >= THRESHOLDS.NLEE_PERCENT) {
      nleeStr += `Tingkat deviasi ini melebihi rentang wajar (${THRESHOLDS.NLEE_PERCENT}%), yang bisa mencerminkan kesulitan dalam pemetaan angka-ke-ruang.`;
    } else {
      nleeStr += `Tingkat deviasi ini termasuk cukup akurat (di bawah batas ${THRESHOLDS.NLEE_PERCENT}%), menunjukkan pemahaman letak angka yang baik.`;
    }
  } else {
    nleeStr = 'Anak belum menyelesaikan permainan estimasi angka.';
  }

  return { hi: hiStr, rr: rrStr, nlee: nleeStr };
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
    metricExplanations: explainMetrics(profile),
    disclaimer: SCREENING_DISCLAIMER,
  };
}
