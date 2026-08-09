/**
 * ReadiKids AI — Generator Laporan Rujukan (PDF, 100% on-device).
 *
 * Dibuat dengan pdf-lib di browser — data tidak pernah meninggalkan
 * perangkat. Sesuai blueprint v4.0 Bab 7.1 & 11 (anti-misuse):
 * disclaimer "bukan surat diagnosis" dicetak sebagai HEADER dan FOOTER
 * di SETIAP halaman, agar tetap terbaca bila halaman dipisah/difoto.
 *
 * Isi laporan ditujukan ganda: ringkas bagi pendamping, dan memuat
 * metrik teknis + ambang riset bagi profesional penerima rujukan.
 */
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import {
  CONSULTATION_CHECKLIST,
  REFERRAL_SERVICES,
  WHEN_TO_SEEK_HELP,
} from './referralGuide';
import { THRESHOLDS } from '../telemetry/MetricCalculator';
import type { ProgressPoint } from '../analytics/BehavioralEngine';
import type {
  ChildProfile,
  CompanionPlanResult,
  RiskAssessment,
  RiskLevel,
} from '../types/telemetry';

export const PDF_DISCLAIMER =
  'Dokumen ini adalah Hasil Skrining Awal Risiko Belajar, bukan Surat Diagnosis Medis/Psikologis Resmi.';

const LEVEL_LABEL: Record<RiskLevel, string> = {
  LOW: 'Pola belajar tampak tipikal',
  MEDIUM: 'Ada pola yang sebaiknya diamati',
  HIGH: 'Disarankan konsultasi dengan profesional',
};

// — Geometri halaman A4 (point) —
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 50;
const CONTENT_TOP = PAGE_H - 78; // di bawah strip header
const CONTENT_BOTTOM = 64; // di atas strip footer
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const COLOR_TEXT = rgb(0.16, 0.2, 0.28);
const COLOR_MUTED = rgb(0.42, 0.46, 0.55);
const COLOR_ACCENT = rgb(0.28, 0.26, 0.72);
const COLOR_RULE = rgb(0.85, 0.87, 0.91);

/**
 * Font standar PDF memakai encoding WinAnsi — karakter di luar itu
 * (emoji, panah, dsb.) membuat pdf-lib melempar error. Normalisasi
 * karakter tipografis umum ke padanan ASCII-nya.
 */
export function sanitizePdfText(text: string): string {
  return text
    .replace(/[–—]/g, '-') // – —
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/×/g, 'x')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/±/g, '+/-')
    .replace(/[•●▪]/g, '-')
    .replace(/→/g, '->')
    // Sisa karakter non-Latin-1 (emoji dll.) dibuang diam-diam.
    .replace(/[^\x00-\xFF]/g, '');
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

/** Pecah teks menjadi baris-baris yang muat pada lebar tertentu. */
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

/** Penulis konten mengalir: otomatis pindah halaman saat penuh. */
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
}

/** Gambar header + footer disclaimer pada SETIAP halaman (dipanggil terakhir). */
function drawHeadersAndFooters(doc: PDFDocument, fonts: Fonts): void {
  const pages = doc.getPages();
  const total = pages.length;
  const disclaimer = sanitizePdfText(PDF_DISCLAIMER);
  pages.forEach((page, i) => {
    // — Header —
    page.drawText('ReadiKids AI - Laporan Rujukan Skrining', {
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
    // — Footer —
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
}

const fmtDate = (epochMs: number): string =>
  new Date(epochMs).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/** Bangun dokumen PDF dan kembalikan byte-nya (untuk diunduh/diuji). */
export async function buildReferralReportPdf(input: ReferralReportInput): Promise<Uint8Array> {
  const { child, assessment, history, plan } = input;
  const doc = await PDFDocument.create();
  doc.setTitle('Laporan Rujukan Skrining - ReadiKids AI');
  doc.setProducer('ReadiKids AI (on-device)');
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const w = new ReportWriter(doc, fonts);

  // 1 — Identitas laporan (pseudonym saja, tanpa identitas asli)
  w.heading('1. Data Skrining');
  w.keyValue('Nama panggilan anak', child.pseudonym);
  w.keyValue('Usia saat skrining', `${child.ageYears} tahun`);
  w.keyValue('Tanggal sesi dinilai', fmtDate(assessment.createdAt));
  w.keyValue('Jumlah sesi terekam', String(Math.max(history.length, 1)));
  w.keyValue('Laporan dibuat', fmtDate(Date.now()));
  w.paragraph(
    'Catatan privasi: aplikasi tidak merekam nama lengkap, NIK, atau sekolah. Seluruh data ' +
      'tersimpan hanya di perangkat pendamping.',
    { size: 8.5, color: COLOR_MUTED },
  );

  // 2 — Hasil kategori (bahasa observasi)
  w.heading('2. Hasil Skrining (Kategori Indikasi)');
  w.keyValue('Keseluruhan', LEVEL_LABEL[assessment.level]);
  w.keyValue('Area huruf & membaca', LEVEL_LABEL[assessment.domains.dyslexia]);
  w.keyValue('Area angka & berhitung', LEVEL_LABEL[assessment.domains.dyscalculia]);
  w.paragraph(
    'Kategori di atas adalah hasil pemetaan pola interaksi anak selama bermain, bukan penilaian ' +
      'kemampuan akademik dan bukan diagnosis.',
    { size: 8.5, color: COLOR_MUTED },
  );

  // 3 — Metrik teknis untuk profesional
  w.heading('3. Metrik Teknis (untuk Profesional)');
  const m = assessment.metrics;
  const hi = m.totalTimeMs > 0 ? m.hesitationMs / m.totalTimeMs : 0;
  const reversalRatio = m.normalLatencyMs > 0 ? m.reversalLatencyMs / m.normalLatencyMs : null;
  w.keyValue('Skor komposit indikasi', `${assessment.compositeScore} / 100`);
  w.keyValue(
    'Letter-Reversal Latency Ratio',
    `${reversalRatio === null ? 'tidak tersedia' : reversalRatio.toFixed(2)} (ambang riset ${THRESHOLDS.REVERSAL_RATIO})`,
  );
  w.keyValue('Hesitation Index', `${hi.toFixed(3)} (ambang riset ${THRESHOLDS.HESITATION_INDEX})`);
  w.keyValue(
    'Number Line Estimation Error',
    m.nleePercent === null
      ? 'tidak tersedia (game garis bilangan tidak dimainkan)'
      : `${m.nleePercent.toFixed(1)}% (ambang riset ${THRESHOLDS.NLEE_PERCENT}%)`,
  );
  w.keyValue('Akurasi jawaban', `${(m.accuracy * 100).toFixed(0)}%`);
  w.keyValue('Rerata misclick per soal', m.misclickPerTrial.toFixed(2));
  w.keyValue('Jumlah soal dianalisis', String(m.trialCount));
  w.paragraph(
    'Metode: telemetri perilaku senyap selama mini-game (waktu reaksi, keraguan/hover, estimasi ' +
      'garis bilangan). Skor komposit = rasio pembalikan huruf (bobot 40%) + indeks keraguan (30%) ' +
      '+ galat estimasi garis bilangan (30%), dinormalisasi terhadap ambang literatur. Instrumen ' +
      'ini adalah alat skrining; ambang belum dikalibrasi klinis pada populasi lokal.',
    { size: 8.5, color: COLOR_MUTED },
  );

  // 4 — Riwayat sesi
  if (history.length > 0) {
    w.heading('4. Riwayat Sesi (Observasi Longitudinal)');
    for (const p of history) {
      const parts = [
        `${fmtDate(p.createdAt)}: skor ${p.compositeScore}/100`,
        `indeks keraguan ${(p.hesitationIndex * 100).toFixed(0)}%`,
      ];
      if (p.nleePercent !== null) parts.push(`NLEE ${p.nleePercent.toFixed(0)}%`);
      w.bullet(parts.join(', '));
    }
  }

  // 5 — Ringkasan rencana pendampingan
  if (plan) {
    w.heading(`${history.length > 0 ? 5 : 4}. Rencana Pendampingan & Analisis Metrik`);
    w.paragraph(plan.summary);
    w.spacing(4);
    if (plan.metricExplanations) {
      w.bullet(plan.metricExplanations.hi);
      w.bullet(plan.metricExplanations.rr);
      w.bullet(plan.metricExplanations.nlee);
      w.spacing(4);
    }
    w.paragraph('Aktivitas yang disarankan:', { bold: true });
    for (const activity of plan.companionActivities) w.bullet(activity);
  }

  // 6 — Panduan rujukan
  w.heading('Kapan & Ke Mana Mencari Bantuan');
  w.paragraph(WHEN_TO_SEEK_HELP[assessment.level]);
  w.spacing(6);
  for (const svc of REFERRAL_SERVICES) {
    w.paragraph(svc.name, { bold: true });
    w.paragraph(svc.description, { indent: 10, size: 9 });
    w.paragraph(`Cara akses: ${svc.howToAccess}`, { indent: 10, size: 9, color: COLOR_MUTED });
    w.spacing(6);
  }
  w.paragraph('Yang berguna dibawa saat konsultasi:', { bold: true });
  for (const item of CONSULTATION_CHECKLIST) w.bullet(item);

  drawHeadersAndFooters(doc, fonts);
  return doc.save();
}

/** Unduh byte PDF sebagai file (hanya di browser). */
export function downloadPdf(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
