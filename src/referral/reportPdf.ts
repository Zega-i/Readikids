/**
 * ReadiKids AI — Generator Laporan Skrining (PDF, 100% on-device).
 *
 * Dibuat dengan pdf-lib di browser — data tidak pernah meninggalkan perangkat.
 * Disclaimer "bukan surat diagnosis" dicetak sebagai HEADER dan FOOTER di
 * SETIAP halaman, agar tetap terbaca bila halaman dipisah/difoto.
 *
 * Arsitektur v2 (membaca): laporan disusun sebagai OBSERVASI dalam kalimat
 * yang deskriptif dan informatif — tanpa angka/persentase mentah dan tanpa
 * kategori risiko yang memvonis. Di bagian atas dicantumkan "Gambaran Pengamatan"
 * (diagram jaring laba-laba / radar segi enam, 5 fase + konsistensi) dengan
 * area yang diwarnai sesuai sejauh mana titik-titik tiap kategori terhubung.
 * Tiap tahap dijelaskan: apa yang diamati, pengamatan anak pada sesi ini,
 * dan kegiatan yang bisa dilakukan di rumah. Semua ambang bersifat tentatif
 * berbasis pengamatan, bukan penilaian akademik.
 */
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { FOLLOW_UP, PHASE_ACTIVITIES } from '../utils/fallbackTemplates';
import { COOLDOWN_MIN_DAYS, COOLDOWN_RECOMMENDED_DAYS } from '../profiles/profileRules';
import type { ProgressPoint } from '../analytics/BehavioralEngine';
import type { CarbonEstimate } from '../utils/carbonFootprint';
import type {
  ChildProfile,
  CompanionPlanResult,
  PhaseId,
  PhaseResult,
  RiskAssessment,
  RiskLevel,
} from '../types/telemetry';

export const PDF_DISCLAIMER =
  'Dokumen ini adalah Hasil Skrining Awal perkembangan membaca, bukan Surat Diagnosis Medis/Psikologis Resmi.';

/** Framing keseluruhan yang lembut (bukan vonis). */
const OVERALL_NOTE: Record<RiskLevel, string> = {
  LOW: 'Secara keseluruhan, perkembangan membaca anak tampak sesuai dengan yang umum untuk usianya.',
  MEDIUM:
    'Secara keseluruhan, ada tahap yang tampak sebaiknya diamati dan didampingi lebih lanjut di rumah.',
  HIGH: 'Secara keseluruhan, beberapa tahap tampak masih memerlukan dukungan lebih; mengobrol dengan guru atau profesional dapat membantu.',
};

/** Nama ramah tiap tahap membaca (0-4). */
const PHASE_NAME: Record<PhaseId, string> = {
  0: 'Mengenal arah & bentuk',
  1: 'Mengenal huruf',
  2: 'Menghubungkan huruf dengan bunyi',
  3: 'Bermain dengan bunyi di dalam kata',
  4: 'Merangkai suku kata menjadi kata',
};

/** Penjelasan informatif tiap tahap — apa yang diamati dan mengapa penting. */
const PHASE_DESC: Record<PhaseId, string> = {
  0: 'Tahap ini mengamati fondasi sebelum huruf bermakna: pengenalan arah (kiri-kanan, atas-bawah), ' +
    'pembedaan bentuk yang mirip, pelacakan mata dari kiri ke kanan, dan pemahaman bahwa gambar berbeda ' +
    'dari tulisan. Fondasi yang kokoh membuat anak lebih siap mempelajari huruf.',
  1: 'Tahap ini mengamati pengenalan huruf: membedakan huruf yang bentuknya mirip (seperti b dan d, p dan q), ' +
    'mengenal nama huruf, serta memahami huruf besar dan kecil. Kemampuan ini menjadi prasyarat sebelum anak ' +
    'mulai menghubungkan huruf dengan bunyinya.',
  2: 'Tahap ini mengamati hubungan antara huruf dan bunyi: melihat huruf lalu menyebutkan bunyinya, mendengar ' +
    'bunyi lalu memilih hurufnya, serta mengenali pasangan huruf khusus (seperti ng dan ny). Ini adalah jembatan ' +
    'inti menuju membaca kata.',
  3: 'Tahap ini mengamati kemampuan bermain dengan bunyi di dalam kata: menggabungkan bunyi menjadi kata, ' +
    'memisah-misah bunyi, dan mengubah bunyi tertentu. Kemampuan ini membantu anak tidak sekadar menghafal bentuk ' +
    'kata, melainkan benar-benar men-decode bunyi.',
  4: 'Tahap ini mengamati kemampuan merangkai suku kata menjadi kata: membaca suku kata sederhana (ba, ku), ' +
    'menggabungkannya menjadi kata, dan mengenali kata baru yang belum pernah dilihat. Ini adalah puncak ' +
    'keterampilan yang diamati untuk rentang usia 6-9 tahun.',
};

/** Kalimat observasi per fase bila tidak ada narasi dari rencana pendampingan. */
function phaseObservation(p: PhaseResult): string {
  const area = PHASE_NAME[p.phase].toLowerCase();
  if (p.level === 'LOW') {
    return `Anak tampak nyaman dan percaya diri saat ${area}. Bagian ini terlihat berkembang baik.`;
  }
  if (p.level === 'MEDIUM') {
    return `Saat ${area}, anak sesekali masih berhenti sejenak atau ragu. Bagian ini biasanya terbantu bila sesekali didampingi di rumah.`;
  }
  return `Saat ${area}, anak masih memerlukan dukungan lebih. Bagian inilah yang paling bermanfaat untuk didampingi bersama.`;
}

// — Geometri halaman A4 (point) —
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 50;
const CONTENT_TOP = PAGE_H - 78;
const CONTENT_BOTTOM = 64;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const COLOR_TEXT = rgb(0.16, 0.2, 0.28);
const COLOR_MUTED = rgb(0.42, 0.46, 0.55);
const COLOR_ACCENT = rgb(0.17, 0.54, 0.54); // teal kompas (#2B8A8A)
const COLOR_RULE = rgb(0.85, 0.87, 0.91);
const COLOR_CHART_FILL = rgb(0.29, 0.6, 0.6); // area jaring laba-laba (teal lebih gelap)
const COLOR_CHART_LINE = rgb(0.1, 0.37, 0.37);

/** Konversi hex (#RRGGBB) → pdf-lib rgb (0..1). */
function hexToRgb(hex: string): ReturnType<typeof rgb> {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

/**
 * Warna & label indikator kategori — DICOCEK dengan pill "JourneyChip" di
 * CompanionDashboard.tsx agar PDF merepresentasikan halaman hasil identik.
 */
const CATEGORY_STYLE: Record<
  RiskLevel,
  { bg: ReturnType<typeof rgb>; dot: ReturnType<typeof rgb>; text: ReturnType<typeof rgb>; label: string }
> = {
  LOW: { bg: hexToRgb('#eaf7e0'), dot: hexToRgb('#6dbb57'), text: hexToRgb('#2f5b23'), label: 'Berkembang Baik' },
  MEDIUM: { bg: hexToRgb('#fef6e0'), dot: hexToRgb('#e0993a'), text: hexToRgb('#6b5215'), label: 'Perlu Diamati' },
  HIGH: { bg: hexToRgb('#fdece9'), dot: hexToRgb('#d96b5a'), text: hexToRgb('#6b2a1f'), label: 'Perlu Didampingi Lebih' },
};

/** Label sumbu radar — segi enam: 5 fase + konsistensi. */
const RADAR_AXES: ReadonlyArray<{ label: string; sub: string }> = [
  { label: 'Fase 0', sub: 'Arah & bentuk' },
  { label: 'Fase 1', sub: 'Mengenal huruf' },
  { label: 'Fase 2', sub: 'Huruf & bunyi' },
  { label: 'Fase 3', sub: 'Bunyi kata' },
  { label: 'Fase 4', sub: 'Rangkai kata' },
  { label: 'Konsistensi', sub: 'Cara bermain' },
];

/**
 * Font standar PDF memakai encoding WinAnsi — karakter di luar itu (emoji,
 * panah, dsb.) membuat pdf-lib melempar error. Normalisasi ke ASCII.
 */
export function sanitizePdfText(text: string): string {
  return text
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/×/g, 'x')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/±/g, '+/-')
    .replace(/[•●▪]/g, '-')
    .replace(/→/g, '->')
    .replace(/[^\x00-\xFF]/g, '');
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line.length === 0 ? word : `${line} ${word}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || line.length === 0) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line.length > 0) lines.push(line);
  return lines;
}

class ReportWriter {
  page!: PDFPage;
  y = CONTENT_TOP;

  constructor(
    private readonly doc: PDFDocument,
    private readonly fonts: Fonts,
  ) {
    this.newPage();
  }

  newPage(): void {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.y = CONTENT_TOP;
  }

  private ensure(height: number): void {
    if (this.y - height < CONTENT_BOTTOM) this.newPage();
  }

  spacing(pt: number): void {
    this.y -= pt;
  }

  /** Banner judul di halaman pertama. */
  title(text: string, subtitle: string): void {
    this.ensure(70);
    this.spacing(4);
    this.page.drawText(sanitizePdfText(text), {
      x: MARGIN_X,
      y: this.y - 15,
      size: 19,
      font: this.fonts.bold,
      color: COLOR_TEXT,
    });
    this.y -= 24;
    this.page.drawText(sanitizePdfText(subtitle), {
      x: MARGIN_X,
      y: this.y - 9,
      size: 10,
      font: this.fonts.regular,
      color: COLOR_MUTED,
    });
    this.y -= 16;
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y },
      end: { x: MARGIN_X + CONTENT_W, y: this.y },
      thickness: 1.5,
      color: COLOR_ACCENT,
    });
    this.spacing(12);
  }

  heading(text: string): void {
    this.ensure(34);
    this.spacing(10);
    this.page.drawText(sanitizePdfText(text), {
      x: MARGIN_X,
      y: this.y - 13,
      size: 13,
      font: this.fonts.bold,
      color: COLOR_ACCENT,
    });
    this.y -= 20;
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y },
      end: { x: MARGIN_X + CONTENT_W, y: this.y },
      thickness: 0.8,
      color: COLOR_RULE,
    });
    this.spacing(10);
  }

  paragraph(
    text: string,
    opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; indent?: number } = {},
  ): void {
    const size = opts.size ?? 10;
    const font = opts.bold ? this.fonts.bold : this.fonts.regular;
    const indent = opts.indent ?? 0;
    const lines = wrapText(sanitizePdfText(text), font, size, CONTENT_W - indent);
    const lineH = size * 1.45;
    for (const line of lines) {
      this.ensure(lineH);
      this.page.drawText(line, {
        x: MARGIN_X + indent,
        y: this.y - size,
        size,
        font,
        color: opts.color ?? COLOR_TEXT,
      });
      this.y -= lineH;
    }
  }

  bullet(text: string): void {
    const size = 10;
    const lines = wrapText(sanitizePdfText(text), this.fonts.regular, size, CONTENT_W - 14);
    const lineH = size * 1.45;
    lines.forEach((line, i) => {
      this.ensure(lineH);
      if (i === 0) {
        this.page.drawText('-', {
          x: MARGIN_X + 2,
          y: this.y - size,
          size,
          font: this.fonts.bold,
          color: COLOR_ACCENT,
        });
      }
      this.page.drawText(line, {
        x: MARGIN_X + 14,
        y: this.y - size,
        size,
        font: this.fonts.regular,
        color: COLOR_TEXT,
      });
      this.y -= lineH;
    });
    this.spacing(2);
  }

  keyValue(label: string, value: string): void {
    const size = 10;
    const lineH = size * 1.55;
    this.ensure(lineH);
    this.page.drawText(sanitizePdfText(label), {
      x: MARGIN_X,
      y: this.y - size,
      size,
      font: this.fonts.regular,
      color: COLOR_MUTED,
    });
    this.page.drawText(sanitizePdfText(value), {
      x: MARGIN_X + 190,
      y: this.y - size,
      size,
      font: this.fonts.bold,
      color: COLOR_TEXT,
    });
    this.y -= lineH;
  }

  /**
   * Indikator kategori observasi — merepresentasikan pill "JourneyChip" di
   * halaman hasil (indikator ↔ PDF selalu selaras karena level datang dari
   * perhitungan yang sama). Kotak + titik warna + label observasi, tanpa
   * menyebut skor/level mentah.
   */
  indicatorChip(category: RiskLevel, phaseLabel: string): void {
    const style = CATEGORY_STYLE[category];
    const height = 28;
    this.ensure(height + 14);
    const yMid = this.y - height / 2;
    this.page.drawRectangle({
      x: MARGIN_X,
      y: yMid - height / 2,
      width: CONTENT_W,
      height,
      color: style.bg,
    });
    // Lingkaran berwarna besar (mirip emoji 🟢/🟡/🟠) + garis pinggir putih
    // agar indikator kategori terlihat jelas dan selaras dengan pill halaman hasil.
    this.page.drawCircle({ x: MARGIN_X + 20, y: yMid, size: 9, color: style.dot });
    this.page.drawCircle({
      x: MARGIN_X + 20,
      y: yMid,
      size: 9,
      borderColor: rgb(1, 1, 1),
      borderWidth: 2,
    });
    this.page.drawText(style.label, {
      x: MARGIN_X + 36,
      y: yMid - 6,
      size: 12,
      font: this.fonts.bold,
      color: style.text,
    });
    const phaseText = `Sampai tahap ${sanitizePdfText(phaseLabel)}`;
    const pw = this.fonts.bold.widthOfTextAtSize(phaseText, 10);
    this.page.drawText(phaseText, {
      x: PAGE_W - MARGIN_X - pw,
      y: yMid - 5.5,
      size: 10,
      font: this.fonts.bold,
      color: COLOR_MUTED,
    });
    this.y -= height + 10;
  }

  /**
   * Diagram jaring laba-laba (radar) segi enam — nilai 0–100 per sumbu
   * (5 fase + konsistensi). Area diwarnai teal sesuai titik-titik yang
   * terhubung: semakin banyak sumbu yang menjauh dari pusat, semakin luas
   * area yang terlihat.
   */
  radarChart(values: number[], caption: string): void {
    const n = values.length;
    if (n < 3) return;
    const R = 96;
    const totalH = R * 2 + 56;
    this.ensure(totalH);
    const cx = MARGIN_X + CONTENT_W / 2;
    const cy = this.y - R - 14;
    const page = this.page;

    const angleOf = (i: number) => ((90 + (i * 360) / n) * Math.PI) / 180;
    const vertex = (i: number, r: number) => ({
      x: cx + r * Math.cos(angleOf(i)),
      y: cy + r * Math.sin(angleOf(i)),
    });

    // pdf-lib drawSvgPath membalik sumbu Y (SVG y-down → PDF y-up) dan
    // meletakkan hasilnya di (0,0). Agar koordinat PDF kita tepat, negasikan Y.
    // Wajib diawali perintah M — tanpa M, titik pertama dianggap 'l' dari (0,0)
    // sehingga poligon menjadi segitiga dari kiri-bawah, bukan segi enam.
    const polygonPath = (pts: ReadonlyArray<{ x: number; y: number }>): string => {
      const fmt = (pt: { x: number; y: number }) => `${pt.x.toFixed(2)} ${(-pt.y).toFixed(2)}`;
      return `M ${fmt(pts[0])} ${pts.slice(1).map((pt) => `L ${fmt(pt)}`).join(' ')} Z`;
    };

    // Jaring laba-laba: 5 cincin grid + 6 benang sumbu
    for (const frac of [0.2, 0.4, 0.6, 0.8, 1]) {
      page.drawSvgPath(
        polygonPath(Array.from({ length: n }, (_, i) => vertex(i, R * frac))),
        { borderColor: COLOR_RULE, borderWidth: 0.6 },
      );
    }

    // Sumbu + label
    for (let i = 0; i < n; i++) {
      const tip = vertex(i, R);
      page.drawLine({ start: { x: cx, y: cy }, end: tip, thickness: 0.6, color: COLOR_RULE });
      const axis = RADAR_AXES[i];
      if (!axis) continue;
      const lx = cx + (R + 4) * Math.cos(angleOf(i));
      const ly = cy + (R + 4) * Math.sin(angleOf(i));
      const t1 = sanitizePdfText(axis.label);
      const t2 = sanitizePdfText(axis.sub);
      const w1 = this.fonts.bold.widthOfTextAtSize(t1, 8);
      const w2 = this.fonts.regular.widthOfTextAtSize(t2, 7);
      page.drawText(t1, { x: lx - w1 / 2, y: ly - 4, size: 8, font: this.fonts.bold, color: COLOR_TEXT });
      page.drawText(t2, { x: lx - w2 / 2, y: ly - 13, size: 7, font: this.fonts.regular, color: COLOR_MUTED });
    }

    // Area data anak — warna teal lebih gelap, mengikuti titik-titik terhubung
    const pts = values.map((v, i) => vertex(i, (R * Math.min(Math.max(v, 0), 100)) / 100));
    page.drawSvgPath(polygonPath(pts), {
      color: COLOR_CHART_FILL,
      borderColor: COLOR_CHART_LINE,
      borderWidth: 1.8,
    });
    for (const pt of pts) {
      page.drawCircle({ x: pt.x, y: pt.y, size: 3.5, color: COLOR_CHART_LINE });
    }

    this.y = cy - R - 22;
    this.paragraph(caption, { size: 8, color: COLOR_MUTED });
    this.spacing(8);
  }
}

function drawHeadersAndFooters(doc: PDFDocument, fonts: Fonts): void {
  const pages = doc.getPages();
  const total = pages.length;
  const disclaimer = sanitizePdfText(PDF_DISCLAIMER);
  pages.forEach((page, i) => {
    page.drawText('ReadiKids AI - Laporan Skrining Membaca', {
      x: MARGIN_X,
      y: PAGE_H - 34,
      size: 10,
      font: fonts.bold,
      color: COLOR_ACCENT,
    });
    page.drawText(disclaimer, {
      x: MARGIN_X,
      y: PAGE_H - 48,
      size: 7.5,
      font: fonts.bold,
      color: COLOR_MUTED,
    });
    page.drawLine({
      start: { x: MARGIN_X, y: PAGE_H - 56 },
      end: { x: PAGE_W - MARGIN_X, y: PAGE_H - 56 },
      thickness: 1,
      color: COLOR_RULE,
    });
    page.drawLine({
      start: { x: MARGIN_X, y: 46 },
      end: { x: PAGE_W - MARGIN_X, y: 46 },
      thickness: 1,
      color: COLOR_RULE,
    });
    page.drawText(disclaimer, {
      x: MARGIN_X,
      y: 34,
      size: 7.5,
      font: fonts.bold,
      color: COLOR_MUTED,
    });
    page.drawText(`Halaman ${i + 1} dari ${total}`, {
      x: PAGE_W - MARGIN_X - 70,
      y: 22,
      size: 8,
      font: fonts.regular,
      color: COLOR_MUTED,
    });
  });
}

export interface ReferralReportInput {
  child: ChildProfile;
  /** Penilaian yang dilaporkan (umumnya yang terbaru). */
  assessment: RiskAssessment;
  /** Riwayat seluruh sesi anak (boleh kosong). */
  history: ProgressPoint[];
  /** Rencana pendampingan terakhir (opsional). */
  plan: CompanionPlanResult | null;
  /** Estimasi jejak karbon sesi (opsional — dihitung dari data nyata). */
  carbon?: CarbonEstimate | null;
}

const fmtDate = (epochMs: number): string =>
  new Date(epochMs).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/** Narasi gap fase–usia — observasi, tanpa label. */
function gapNarrative(gap: number): string {
  if (gap <= 0) return 'Pencapaian ini sejalan dengan pola yang umum tampak pada anak seusianya.';
  if (gap === 1)
    return 'Masih ada satu tahap yang tampak belum senyaman tahap lain - wajar untuk diamati dan didampingi lebih lanjut.';
  return 'Masih ada beberapa tahap yang tampak memerlukan dukungan lebih dibanding pola umum anak seusianya.';
}

/** Nilai radar: reliability 5 fase + rata-rata sebagai sumbu "Konsistensi". */
function computeRadarValues(perPhase: PhaseResult[]): number[] {
  const byPhase = new Map<number, number>(perPhase.map((p) => [p.phase, p.reliability]));
  const phases: number[] = [0, 1, 2, 3, 4].map((ph) => byPhase.get(ph) ?? 0);
  const probed = phases.filter((_, i) => byPhase.has(i));
  const mean = probed.length > 0 ? probed.reduce((a, b) => a + b, 0) / probed.length : 0;
  const filled = phases.map((v, i) => (byPhase.has(i) ? v : mean));
  filled.push(mean);
  return filled;
}

/** Paragraf ringkasan deskriptif — memadukan data sesi, gap, dan rencana. */
function buildSummary(
  input: ReferralReportInput,
  perPhase: PhaseResult[],
): string {
  const { child, assessment } = input;
  const reached = PHASE_NAME[assessment.highestPhaseReached].toLowerCase();
  const watch = [...perPhase].sort((a, b) => a.phase - b.phase).find((p) => p.level !== 'LOW');

  let s = `Pada sesi ${fmtDate(assessment.createdAt)}, ${child.pseudonym} menyelesaikan rangkaian permainan yang mengamati ${Math.max(perPhase.length, 1)} tahap perkembangan membaca. `;
  s += `Dari pola yang terekam, ${child.pseudonym} tampak paling nyaman sampai tahap ${reached}. `;
  s += gapNarrative(assessment.phaseAgeGap);
  if (watch) {
    s += `Bagian yang paling terbantu bila didampingi adalah tahap ${PHASE_NAME[watch.phase].toLowerCase()}. `;
  }
  return s;
}

/** Paragraf pengantar rencana pendampingan — prosa singkat, mengapa bagian ini.
 *  Nada mengikuti level keseluruhan agar tidak bertentangan dengan indikator. */
function buildPlanIntro(input: ReferralReportInput, perPhase: PhaseResult[]): string {
  const { assessment } = input;
  const watch = perPhase.filter((p) => p.level !== 'LOW').sort((a, b) => a.phase - b.phase);

  let s = '';
  if (watch.length > 0) {
    const areas = watch.map((p) => PHASE_NAME[p.phase].toLowerCase());
    s += `Dari pengamatan sesi ini, bagian yang paling bermanfaat untuk didampingi adalah tahap ${areas.join(' dan ')}. `;
  } else if (assessment.level === 'LOW') {
    s += 'Dari pengamatan sesi ini, tahap-tahap yang dimainkan tampak berkembang baik untuk usianya. ';
  } else {
    s += `Dari pengamatan sesi ini, anak tampak nyaman sampai tahap ${PHASE_NAME[assessment.highestPhaseReached].toLowerCase()} - dan tahap berikutnya layak untuk diamati serta didampingi lebih lanjut. `;
  }
  s += 'Kegiatan berikut aman dan menyenangkan untuk dicoba bersama di rumah - bukan daftar tugas yang harus tuntas, ';
  s += 'melainkan cara sederhana menguatkan kebiasaan membaca lewat bermain. ';
  s += 'Cukup pilih satu atau dua kegiatan dulu, lakukan secara rutin, lalu tambahkan yang lain seiring anak mulai terbiasa.';
  return s;
}

/** Saran & tindak lanjut — narasi observasional, informatif, tanpa rujukan
 *  ke fasilitas/profesional kesehatan dan tanpa unsur diagnosis. */
function buildFollowUpNarrative(
  input: ReferralReportInput,
  perPhase: PhaseResult[],
): string {
  const { child } = input;
  const watch = perPhase
    .filter((p) => p.level !== 'LOW')
    .sort((a, b) => a.phase - b.phase);

  let s = '';
  s += `Perkembangan membaca berlangsung bertahap, dan setiap anak bergerak dengan ritme yang berbeda-beda. `;
  s += `Yang paling berharga sekarang adalah kerutinan: jadikan kegiatan di atas bagian dari waktu santai bersama ${child.pseudonym}, `;
  s += `lalu amati perubahannya dari minggu ke minggu. `;
  if (watch.length > 0) {
    const areas = watch.map((p) => PHASE_NAME[p.phase].toLowerCase());
    s += `Berikan dukungan ekstra terutama saat ${areas.join(' dan ')}, `;
    s += 'dan tempatkan kegiatan ini sebagai permainan yang dinanti, bukan latihan yang diuji. ';
  }
  s += `Apabila setelah beberapa minggu ${child.pseudonym} tampak semakin nyaman, sesi skrining berikutnya `;
  s += `(dapat diulang setelah jeda ${COOLDOWN_MIN_DAYS}-${COOLDOWN_RECOMMENDED_DAYS} hari) bisa membantu melihat arah perkembangannya dengan lebih jelas. `;
  s += `Laporan ini hanya gambaran dari satu sesi bermain - bukan penilaian akhir. `;
  s += `Yang terpenting adalah kemajuan kecil yang terjadi hari demi hari.`;
  return s;
}

/** Format gram CO2e ramah baca (koma desimal, tanpa banyak angka belakang). */
function fmtCarbonGrams(g: number): string {
  const s = g >= 100 ? g.toFixed(0) : g >= 1 ? g.toFixed(1) : g.toFixed(2);
  return s.replace('.', ',');
}

/**
 * Narasi jejak karbon dalam bahasa mudah — menjelaskan bahwa angka ini
 * perkiraan berbasis model dari sesi nyata, bukan pengukuran lab.
 */
function buildCarbonNarrative(input: ReferralReportInput): string[] {
  const c = input.carbon;
  if (!c) return [];
  const total = fmtCarbonGrams(c.totalGCO2e);
  const dev = fmtCarbonGrams(c.breakdown.deviceGCO2e);
  const trf = fmtCarbonGrams(c.breakdown.transferGCO2e);
  const ai = fmtCarbonGrams(c.breakdown.aiGCO2e);
  const sync = fmtCarbonGrams(c.breakdown.syncGCO2e);

  const parts: string[] = [
    `Setiap sesi bermain memakai sedikit listrik: di perangkat, saat mengirim data, dan (bila dipakai) saat AI menyusun rencana. ` +
      `Sesi ini diperkirakan menghasilkan sekitar ${total} g CO2e - sangat kecil, sebanding dengan menyalakan lampu beberapa menit. ` +
      `Angka ini hanya perkiraan dari pola bermain anak (lama menjawab, jumlah soal, dan panjang teks), bukan pengukuran laboratorium.`,
  ];

  const rows: string[] = [];
  rows.push(`Perangkat (anak bermain): ${dev} g`);
  rows.push(`Transfer data: ${trf} g`);
  rows.push(`AI / Gemini (rencana pendampingan): ${ai} g`);
  rows.push(`Sinkronisasi: ${sync} g`);
  parts.push(`Rinciannya: ${rows.join('; ')}.`);

  parts.push(
    'Perkiraan ini memakai metode SCI (ISO/IEC 21031) dan model SWDM v4. Besarannya bergantung pada ' +
      'perangkat, jaringan, dan sumber listrik, serta tidak berkaitan dengan hasil skrining anak.',
  );
  return parts;
}

/** Bangun dokumen PDF dan kembalikan byte-nya (untuk diunduh/diuji). */
export async function buildReferralReportPdf(input: ReferralReportInput): Promise<Uint8Array> {
  const { child, assessment, history, plan } = input;
  const doc = await PDFDocument.create();
  doc.setTitle('Laporan Skrining Membaca - ReadiKids AI');
  doc.setProducer('ReadiKids AI (on-device)');
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const w = new ReportWriter(doc, fonts);

  const perPhase = [...assessment.perPhase].sort((a, b) => a.phase - b.phase);

  // — Banner judul —
  w.title(
    'Laporan Hasil Skrining Membaca',
    'ReadiKids AI - pemetaan observasi perkembangan membaca anak usia 6-9 tahun',
  );
  w.paragraph(PDF_DISCLAIMER, { size: 8.5, color: COLOR_MUTED });
  w.spacing(6);

  // — Indikator kategori observasi (identik dengan pill di halaman hasil) —
  w.indicatorChip(assessment.level, PHASE_NAME[assessment.highestPhaseReached]);
  w.spacing(8);

  let section = 1;

  // 1 — Data skrining (identitas + apa yang dilakukan)
  w.heading(`${section}. Data Skrining`);
  w.keyValue('Nama panggilan anak', child.pseudonym);
  w.keyValue('Usia saat skrining', `${child.ageYears} tahun`);
  w.keyValue('Tanggal sesi dinilai', fmtDate(assessment.createdAt));
  w.keyValue('Jumlah sesi terekam', String(Math.max(history.length, 1)));
  w.keyValue('Laporan dibuat', fmtDate(Date.now()));
  w.spacing(4);
  w.paragraph(
    'Apa yang dilakukan dalam sesi ini: anak bermain melalui serangkaian permainan singkat yang mengamati ' +
      Math.max(perPhase.length, 1) +
      ' tahap perkembangan membaca. Setiap permainan dirancang agar anak melakukan tugas membaca (atau tugas ' +
      'dasar yang menopang membaca) tanpa merasa sedang diuji. Dari cara bermain - benar atau tidak, cepat atau ' +
      'lambat, ragu atau yakin - aplikasi mencatat pola yang kemudian dirangkum menjadi laporan ini.',
    { size: 9.5 },
  );
  w.spacing(2);
  w.paragraph(
    'Catatan privasi: aplikasi tidak merekam nama lengkap, NIK, atau sekolah. ' +
      'Seluruh data tersimpan hanya di perangkat pendamping.',
    { size: 8.5, color: COLOR_MUTED },
  );
  section += 1;

  // 2 — Gambaran pengamatan (jaring laba-laba)
  w.heading(`${section}. Gambaran Pengamatan`);
  w.radarChart(
    computeRadarValues(perPhase),
    'Cara membaca: semakin jauh titik dari pusat, semakin kokoh kemampuan anak pada kategori itu. ' +
      'Area teal menunjukkan sejauh mana titik-titik di tiap kategori terhubung - bukan nilai sekolah.',
  );
  w.paragraph(
    `Diagram di atas memiliki 6 sumbu: ${RADAR_AXES.map((a) => a.label).join(', ')}. ` +
      'Keenam sumbu itu mengamati posisi anak dalam perjalanan membaca. Pola yang luas dan merata berarti ' +
      'anak tampak nyaman di banyak kategori; pola yang sempit di sebagian sumbu berarti ada kategori yang ' +
      'masih perlu didampingi.',
    { size: 9.5, color: COLOR_MUTED },
  );
  section += 1;

  // 3 — Ringkasan perkembangan membaca
  w.heading(`${section}. Ringkasan Perkembangan Membaca`);
  w.paragraph(buildSummary(input, perPhase));
  if (plan) {
    w.spacing(4);
    w.paragraph(`"Kata Cilo: ${plan.summary}"`, { size: 9.5, color: COLOR_ACCENT });
  }
  w.spacing(4);
  w.paragraph(OVERALL_NOTE[assessment.level]);
  const nextWindow = assessment.createdAt + 14 * 24 * 60 * 60 * 1000;
  w.paragraph(
    `Skrining berikutnya disarankan sekitar ${fmtDate(nextWindow)} atau setelahnya (jeda 2-4 minggu menjaga hasil tetap jujur).`,
    { size: 8.5, color: COLOR_MUTED },
  );
  w.paragraph(
    'Catatan ini adalah hasil pemetaan pola bermain anak, bukan penilaian kemampuan akademik ' +
      'dan bukan diagnosis.',
    { size: 8.5, color: COLOR_MUTED },
  );
  section += 1;

  // 4 — Tahap perkembangan membaca (deskriptif per tahap)
  w.heading(`${section}. Tahap Perkembangan Membaca`);
  w.paragraph(
    'Perkembangan membaca pada anak usia 6-9 tahun umumnya berjalan bertahap, dan setiap tahap dibangun di ' +
      'atas tahap sebelumnya. Bagian ini menjelaskan apa yang diamati di tiap tahap, pengamatan anak pada ' +
      'sesi ini, serta kegiatan yang bisa dilakukan di rumah.',
    { size: 9.5, color: COLOR_MUTED },
  );
  for (const p of perPhase) {
    w.paragraph(`Tahap ${p.phase + 1} - ${PHASE_NAME[p.phase]}`, { bold: true, color: COLOR_ACCENT });
    w.paragraph(`Tentang tahap ini: ${PHASE_DESC[p.phase]}`, { indent: 10, size: 9.5 });
    const sentence = plan?.metricExplanations?.[`fase-${p.phase}`];
    w.paragraph(`Pengamatan sesi ini: ${sentence ?? phaseObservation(p)}`, { indent: 10, size: 9.5 });
    const acts = PHASE_ACTIVITIES[p.phase];
    if (acts) {
      w.paragraph('Kegiatan yang bisa dilakukan di rumah:', {
        indent: 10,
        size: 9,
        bold: true,
        color: COLOR_MUTED,
      });
      for (const act of acts) w.bullet(act);
    }
    w.spacing(6);
  }
  section += 1;

  // 5 — Posisi membaca & pola yang terlihat
  w.heading(`${section}. Posisi & Pola yang Terlihat`);
  const reached = PHASE_NAME[assessment.highestPhaseReached].toLowerCase();
  w.paragraph(
    `Dari seluruh pengamatan pada sesi ini, ${child.pseudonym} tampak paling nyaman sampai tahap ${reached}. ` +
      gapNarrative(assessment.phaseAgeGap),
  );
  const strong = perPhase.filter((p) => p.level === 'LOW').sort((a, b) => a.phase - b.phase);
  const watch = perPhase
    .filter((p) => p.level !== 'LOW')
    .sort((a, b) => a.phase - b.phase);
  if (strong.length > 0) {
    w.spacing(4);
    w.paragraph(
      `Tahap yang tampak berkembang baik: ${strong
        .map((p) => PHASE_NAME[p.phase].toLowerCase())
        .join(', ')}. Bagian ini bisa menjadi modal untuk membangun kepercayaan diri anak.`,
    );
  }
  if (watch.length > 0) {
    w.spacing(4);
    w.paragraph(
      `Tahap yang paling terbantu bila didampingi: ${watch
        .map((p) => PHASE_NAME[p.phase].toLowerCase())
        .join(', ')}. Kondisi ini wajar pada anak usia ${child.ageYears} tahun dan umumnya berkembang ` +
        'dengan pendampingan yang rutin dan santai.',
    );
  }
  section += 1;

  // 6 — Riwayat sesi (longitudinal)
  if (history.length > 0) {
    w.heading(`${section}. Riwayat Sesi`);
    const first = history[0];
    const last = history[history.length - 1];
    w.paragraph(
      `Perjalanan ${child.pseudonym} dari sesi ke sesi, berdasarkan pengamatan yang terekam:`,
      { size: 9.5, color: COLOR_MUTED },
    );
    for (const p of history) {
      w.bullet(`${fmtDate(p.createdAt)} - sampai tahap ${PHASE_NAME[p.highestPhaseReached]}`);
    }
    if (last.highestPhaseReached > first.highestPhaseReached) {
      w.paragraph(
        `Antara sesi pertama dan sesi terakhir, ${child.pseudonym} tampak berkembang: tahap yang dicapai ` +
          `bertambah dari ${PHASE_NAME[first.highestPhaseReached].toLowerCase()} ke ` +
          `${PHASE_NAME[last.highestPhaseReached].toLowerCase()}.`,
      );
    } else {
      w.paragraph(
        `Antara sesi pertama dan terakhir, tahap yang dicapai tampak bertahan di ` +
          `${PHASE_NAME[last.highestPhaseReached].toLowerCase()}. Kondisi yang stabil seperti ini wajar - ` +
          'pengamatan berulang membantu melihat pola yang lebih jelas.',
      );
    }
    section += 1;
  }

  // 7 — Rencana pendampingan (narasi + poin)
  if (plan) {
    w.heading(`${section}. Rencana Pendampingan`);
    w.paragraph(buildPlanIntro(input, perPhase));
    if (plan.companionActivities.length > 0) {
      w.spacing(4);
      w.paragraph('Kegiatan yang bisa dicoba bersama anak:', { bold: true });
      for (const activity of plan.companionActivities) w.bullet(activity);
    }
    section += 1;
  }

  // 8 — Saran & tindak lanjut (selalu tampil sebagai bagian tersendiri)
  w.heading(`${section}. Saran & Tindak Lanjut`);
  w.paragraph(buildFollowUpNarrative(input, perPhase));
  // Poin tindak lanjut IDENTIK dengan kotak "Saran Tindak Lanjut" di halaman
  // hasil — deterministik dari FOLLOW_UP[assessment.level] (sumber tunggal),
  // sehingga indikator ↔ saran di PDF selalu selaras dengan layar.
  w.spacing(4);
  for (const g of FOLLOW_UP[assessment.level]) w.bullet(g);
  section += 1;

  // 9 — Jejak karbon sesi (opsional; bila data tersedia) — di paling bawah
  const carbonNotes = buildCarbonNarrative(input);
  if (carbonNotes.length > 0) {
    w.heading(`${section}. Jejak Karbon Sesi Ini`);
    for (const note of carbonNotes) w.paragraph(note, { size: 9.5 });
  }

  drawHeadersAndFooters(doc, fonts);
  return doc.save();
}

/**
 * Unduh byte PDF sebagai file — lintas platform (APK → share sheet, web →
 * Web Share API / blob). Lihat utils/savePdf.ts untuk detailnya.
 */
export async function downloadPdf(bytes: Uint8Array, filename: string): Promise<void> {
  const { savePdf } = await import('../utils/savePdf');
  return savePdf(bytes, filename);
}