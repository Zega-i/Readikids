/**
 * ReadiKids AI — Konten panduan rujukan statis (Referral Bridge).
 *
 * "Kapan & ke mana mencari bantuan" — informasi umum non-afiliasi
 * (blueprint v4.0 Bab 2.3 pilar 3). Dipakai oleh Laporan Rujukan PDF
 * dan (kelak) halaman panduan di Companion Mode.
 *
 * Aturan bahasa: observasi & suportif, tanpa vonis, tanpa janji hasil.
 */
import type { RiskLevel } from '../types/telemetry';

/** Jenis layanan profesional yang umum tersedia di Indonesia. */
export interface ReferralService {
  name: string;
  description: string;
  /** Cara umum mengaksesnya. */
  howToAccess: string;
}

export const REFERRAL_SERVICES: ReferralService[] = [
  {
    name: 'Puskesmas — Poli Tumbuh Kembang / Poli Anak',
    description:
      'Pintu masuk pertama yang paling terjangkau. Dokter dapat melakukan pemeriksaan awal ' +
      'tumbuh kembang dan memberi surat rujukan BPJS ke layanan lanjutan bila diperlukan.',
    howToAccess:
      'Datang langsung dengan KTP/KK dan kartu BPJS (bila ada); sampaikan kekhawatiran tentang ' +
      'perkembangan belajar anak dan tunjukkan Laporan Rujukan ini.',
  },
  {
    name: 'Psikolog Anak / Biro Psikologi',
    description:
      'Profesional yang berwenang melakukan asesmen psikoedukasi lengkap, termasuk memastikan ' +
      'ada-tidaknya disleksia, diskalkulia, atau kondisi lain yang memengaruhi belajar.',
    howToAccess:
      'Tersedia di rumah sakit (poli jiwa/psikologi anak), biro psikologi swasta, atau layanan ' +
      'psikologi kampus. Asesmen umumnya berbayar; sebagian ditanggung BPJS melalui rujukan puskesmas.',
  },
  {
    name: 'Klinik Tumbuh Kembang Anak',
    description:
      'Layanan terpadu (dokter anak, psikolog, terapis) untuk anak dengan hambatan perkembangan ' +
      'atau kesulitan belajar — cocok bila diperlukan pemeriksaan dari beberapa sisi sekaligus.',
    howToAccess:
      'Tersedia di rumah sakit besar dan klinik swasta di kota. Sebagian menerima rujukan BPJS ' +
      'dari puskesmas.',
  },
  {
    name: 'Guru / Guru Pendamping Khusus (bila anak bersekolah)',
    description:
      'Guru melihat anak setiap hari dan dapat memperkaya observasi, menyesuaikan cara mengajar, ' +
      'serta menghubungkan dengan layanan pendidikan inklusif di sekolah.',
    howToAccess:
      'Ajak bicara wali kelas secara pribadi; sampaikan pola yang Anda amati di rumah dan hasil ' +
      'skrining ini sebagai bahan diskusi — bukan sebagai label anak.',
  },
];

/** Narasi "kapan perlu mencari bantuan" per level indikasi keseluruhan. */
export const WHEN_TO_SEEK_HELP: Record<RiskLevel, string> = {
  LOW:
    'Saat ini belum ada pola yang mengharuskan konsultasi. Lanjutkan aktivitas pendampingan, ' +
    'dan lakukan skrining ulang dalam 1-3 bulan. Bila sehari-hari anak tampak jauh lebih ' +
    'kesulitan membaca/berhitung dibanding anak seusianya, konsultasi tetap terbuka kapan saja.',
  MEDIUM:
    'Jalankan aktivitas pendampingan selama 2-4 minggu sambil mengamati anak, lalu lakukan ' +
    'skrining ulang. Bila polanya menetap atau bertambah, jadwalkan konsultasi ke puskesmas ' +
    'atau psikolog anak dengan membawa laporan ini.',
  HIGH:
    'Disarankan menjadwalkan konsultasi dalam waktu dekat ke salah satu layanan di bawah. ' +
    'Ini BUKAN berarti anak pasti mengalami disleksia/diskalkulia - hasil skrining hanya ' +
    'menunjukkan pola yang sebaiknya diperiksa profesional lebih awal, karena pendampingan ' +
    'yang dimulai dini memberi hasil terbaik.',
};

/** Hal-hal yang berguna dibawa/disampaikan saat konsultasi. */
export const CONSULTATION_CHECKLIST: string[] = [
  'Laporan Rujukan dari aplikasi ini (berisi metrik dan riwayat sesi).',
  'Contoh pekerjaan anak: buku tulis, hasil menggambar/menulis, PR.',
  'Catatan pengamatan sehari-hari: kapan anak kesulitan, bagaimana reaksinya.',
  'Riwayat kesehatan singkat: pendengaran, penglihatan, riwayat kelahiran.',
  'Pertanyaan yang ingin Anda ajukan - tuliskan agar tidak terlupa.',
];
