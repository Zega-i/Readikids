/**
 * ReadiKids AI — Template Rencana Pendampingan lokal (offline fallback).
 *
 * Dipakai bila Gemini API tidak tersedia (offline / tanpa API key / error).
 * Format identik dengan output LLM sehingga UI tidak perlu membedakan sumber.
 *
 * Arsitektur v2 (membaca): rencana disusun dari PROFIL PER-FASE. Bahasa
 * observasi yang HALUS & mudah diterima wali — tidak pernah memvonis atau
 * menampilkan kategori/level mentah.
 */
import type {
  ChildProfileForPlan,
  CompanionPlanResult,
  MetricExplanations,
  PhaseId,
  PhaseResult,
  RiskLevel,
} from '../types/telemetry';

export const SCREENING_DISCLAIMER =
  'Ini adalah alat bantu skrining awal untuk mengenali kemungkinan hambatan ' +
  'membaca sejak dini — BUKAN diagnosis. Untuk mengenal kebutuhan anak lebih ' +
  'dalam, Anda bisa mengobrol dengan guru, psikolog anak, atau layanan tumbuh kembang.';

/** Nama tahap yang ramah untuk wali (bukan istilah klinis). */
const PHASE_AREA: Record<PhaseId, string> = {
  0: 'mengenal arah dan bentuk',
  1: 'mengenal huruf',
  2: 'menghubungkan huruf dengan bunyinya',
  3: 'bermain dengan bunyi di dalam kata',
  4: 'merangkai suku kata menjadi kata',
};

/** Kegiatan pendampingan rumah per tahap — aman & menyenangkan. */
export const PHASE_ACTIVITIES: Record<PhaseId, string[]> = {
  0: [
    'Main puzzle atau menyusun balok bersama untuk melatih arah dan bentuk.',
    'Saat membaca buku, tunjuk kata dari kiri ke kanan agar anak terbiasa dengan arah membaca.',
  ],
  1: [
    'Kenalkan huruf lewat kartu atau tulisan di sekitar rumah, sebut namanya sambil bermain.',
    'Ajak mencari huruf yang sama, atau membedakan huruf yang mirip seperti b dan d, tanpa terburu-buru.',
  ],
  2: [
    'Tunjuk sebuah huruf lalu sebutkan bunyinya bersama-sama ("m… mmm").',
    'Tebak bunyi awal benda di sekitar ("bola… bunyinya b").',
  ],
  3: [
    'Tepuk tangan mengikuti suku kata sebuah kata (ba-ju, se-pe-da).',
    'Main menggabungkan bunyi jadi kata: sebutkan pelan "b-u-k-u", lalu minta anak menebak katanya.',
  ],
  4: [
    'Baca suku kata sederhana bersama (ba, bu, ka), lalu gabungkan menjadi kata.',
    'Susun kartu suku kata menjadi kata yang anak kenal, tanpa menekankan kecepatan.',
  ],
};

/**
 * Panduan tindak lanjut per level keseluruhan — disampaikan lembut & suportif.
 * SUMBER TUNGGAL rujukan: dibuat deterministik dari hasil perhitungan
 * (assessment.level), TIDAK dari LLM, agar indikator ↔ narasi selalu selaras.
 */
export const FOLLOW_UP: Record<RiskLevel, string[]> = {
  LOW: [
    'Untuk saat ini belum ada yang perlu dikhawatirkan — dampingi kegiatan membaca sehari-hari dan nikmati prosesnya bersama.',
    'Bila suatu saat anak tampak jauh lebih kesulitan membaca dibanding teman seusianya, tidak ada salahnya mengobrol dengan gurunya.',
  ],
  MEDIUM: [
    'Coba jalankan kegiatan pendampingan di atas selama beberapa minggu sambil mengamati perkembangan anak.',
    'Mengobrol dengan guru atau pendamping belajar anak bisa membantu melihat gambaran yang lebih lengkap.',
    'Bila dirasa perlu, laporan dari aplikasi ini bisa dibawa saat berkonsultasi.',
  ],
  HIGH: [
    'Mengobrol dengan guru, psikolog anak, atau layanan tumbuh kembang bisa sangat membantu untuk mengenal cara mendukung anak lebih dekat.',
    'Laporan dari aplikasi ini bisa dibawa sebagai bahan cerita saat berkonsultasi.',
    'Ini langkah pendampingan yang wajar dan bermanfaat — bukan pertanda ada sesuatu yang pasti salah pada anak.',
  ],
};

/** Kalimat observasi lembut per tahap (memakai level hanya untuk memilih nada). */
function phaseSentence(p: PhaseResult): string {
  const area = PHASE_AREA[p.phase];
  if (p.level === 'LOW') return `Anak tampak nyaman saat ${area}.`;
  if (p.level === 'MEDIUM')
    return `Saat ${area}, anak sesekali masih berhenti sejenak — bagian ini terbantu bila kadang didampingi.`;
  return `Saat ${area}, anak masih memerlukan dukungan lebih. Inilah bagian yang paling bermanfaat untuk didampingi bersama.`;
}

/**
 * Ringkasan naratif — observasi, tanpa vonis & tanpa skor menonjol.
 * Nada SELALU mengikuti level keseluruhan (assessment.level) agar tidak
 * bertentangan dengan indikator yang tampil di halaman hasil (mis. indikator
 * MEDIUM/HIGH tapi narasi "berkembang baik untuk usianya", atau sebaliknya).
 */
function summarize(profile: ChildProfileForPlan): string {
  const a = profile.assessment;
  const reachedArea = PHASE_AREA[a.highestPhaseReached];
  const watch = [...a.perPhase].sort((x, y) => x.phase - y.phase).find((p) => p.level !== 'LOW');
  let s = `Dari sesi bermain, anak sudah menunjukkan kenyamanan sampai tahap ${reachedArea}. `;
  if (a.level === 'LOW') {
    s += 'Tahap-tahap yang dimainkan tampak berkembang baik untuk usianya. ';
  } else if (watch) {
    s += `Tahap ${PHASE_AREA[watch.phase]} tampak paling terbantu bila didampingi. `;
  } else {
    s += 'Masih ada tahap berikutnya yang tampak belum sepenuhnya nyaman dan layak diamati lebih lanjut. ';
  }
  s += 'Saran di bawah adalah kegiatan sehari-hari yang aman dan menyenangkan dilakukan siapa saja.';
  return s;
}

/**
 * Narasi deterministik dari profil fase & level — summary + penjelasan per fase.
 * SUMBER TUNGGAL narasi: dipakai template lokal DAN sebagai pengaman narasi
 * LLM (Gemini) agar indikator ↔ kata-kata tidak pernah bertentangan. Tetap
 * bervariasi per anak karena disusun dari profil fase anak tersebut.
 */
export function buildDeterministicNarrative(profile: ChildProfileForPlan): {
  summary: string;
  metricExplanations: MetricExplanations;
} {
  const metricExplanations: MetricExplanations = {};
  for (const p of [...profile.assessment.perPhase].sort((x, y) => x.phase - y.phase)) {
    metricExplanations[`fase-${p.phase}`] = phaseSentence(p);
  }
  return { summary: summarize(profile), metricExplanations };
}

/** Bangun Rencana Pendampingan dari template lokal — deterministik & offline. */
export function generateLocalCompanionPlan(profile: ChildProfileForPlan): CompanionPlanResult {
  const a = profile.assessment;
  const { summary, metricExplanations } = buildDeterministicNarrative(profile);

  const needsSupport = [...a.perPhase]
    .filter((p) => p.level !== 'LOW')
    .sort((x, y) => x.phase - y.phase);

  let companionActivities = needsSupport.flatMap((p) => PHASE_ACTIVITIES[p.phase]).slice(0, 5);
  if (companionActivities.length === 0) {
    companionActivities = [
      'Lanjutkan membaca buku cerita bersama setiap hari sebagai kebiasaan menyenangkan.',
      'Ajak anak menceritakan ulang isi buku dengan kata-katanya sendiri.',
    ];
  }

  return {
    source: 'local-template',
    generatedAt: Date.now(),
    summary,
    companionActivities,
    referralGuidance: FOLLOW_UP[a.level],
    metricExplanations,
    disclaimer: SCREENING_DISCLAIMER,
  };
}
