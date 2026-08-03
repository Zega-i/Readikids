import React, { useState, useEffect } from "react";
import { CiloKancil } from "../components/CiloKancil";
// ═══════════════════════════════════════════════════════════════════════════
// KONTRAK DATA — cocok dengan src/types/telemetry.ts & src/ml/heuristic.ts
// ═══════════════════════════════════════════════════════════════════════════

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

interface TelemetryMetrics {
  normalLatencyMs: number;
  reversalLatencyMs: number;
  hesitationMs: number;
  totalTimeMs: number;
  nleePercent: number | null;
  accuracy: number;
  misclickPerTrial: number;
  trialCount: number;
}

interface RiskAssessment {
  compositeScore: number;
  level: RiskLevel;
  breakdown: { reversalScore: number; hesitationScore: number; nleeScore: number };
  domains: { dyslexia: RiskLevel; dyscalculia: RiskLevel };
  metrics: TelemetryMetrics;
}

interface CompanionPlanResult {
  source: "gemini" | "openrouter" | "local-template";
  summary: string;
  companionActivities: string[];
  referralGuidance: string[];
  disclaimer: string;
}

export interface ScreeningResult {
  sessionId: string;
  childName: string;
  childAgeYears: number;
  startedAt: number; // epoch ms
  endedAt: number;   // epoch ms
  assessment: RiskAssessment;
  plan: CompanionPlanResult;
}

interface ChildProfile {
  id: string; // uuid
  pseudonym: string; // "Harimau Terbang"
  ageYears: number; // 6-9
  createdAt: number; // epoch ms
}

// ═══════════════════════════════════════════════════════════════════════════
// PEMETAAN LEVEL → LABEL RAMAH ORANG TUA (tidak pernah tampilkan HIGH/LOW mentah)
// ═══════════════════════════════════════════════════════════════════════════

const LEVEL_BADGE: Record<RiskLevel, { short: string; dot: string; bg: string; text: string }> = {
  LOW:    { short: "Tipikal",             dot: "#6dbb57", bg: "#eaf7e0", text: "#2f5b23" },
  MEDIUM: { short: "Perlu diamati",       dot: "#e8a53a", bg: "#fff3d6", text: "#9a6b00" },
  HIGH:   { short: "Konsultasi Spesialis", dot: "#2b8a8a", bg: "#dff2f2", text: "#1f6b6b" }, // teal tegas, bukan merah menakutkan
};

const LEVEL_HEADLINE: Record<RiskLevel, string> = {
  LOW:    "Pola belajar tampak tipikal",
  MEDIUM: "Ada pola yang sebaiknya diamati",
  HIGH:   "Disarankan konsultasi profesional",
};

// Disclaimer HARDCODE — keselamatan produk, tidak bergantung pada LLM
const SAFETY_DISCLAIMER =
  "ReadiKids adalah alat skrining awal, BUKAN alat diagnosis. Hasil ini adalah pengamatan perilaku belajar — kepastian hanya bisa diberikan oleh profesional.";

// ═══════════════════════════════════════════════════════════════════════════
// UTIL — hitung jendela cooldown & format tanggal Indonesia
// ═══════════════════════════════════════════════════════════════════════════

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function formatCooldownWindow(endedAt: number): string {
  const start = new Date(endedAt + 14 * 24 * 60 * 60 * 1000);
  const end   = new Date(endedAt + 28 * 24 * 60 * 60 * 1000);
  // "9–23 Agustus 2026" bila bulan sama, atau "30 Ags – 13 Sep 2026" bila beda
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${BULAN[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${BULAN[start.getMonth()].slice(0,3)} – ${end.getDate()} ${BULAN[end.getMonth()].slice(0,3)} ${end.getFullYear()}`;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${BULAN[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// KOMPONEN UTAMA
// ═══════════════════════════════════════════════════════════════════════════

interface CompanionDashboardProps {
  activeProfile: ChildProfile;
  /** Fetch hasil skrining TERAKHIR anak dari Dexie. Kembalikan null bila belum ada. */
  fetchLatestResult: (profileId: string) => Promise<ScreeningResult | null>;
  onSavePDF?: (result: ScreeningResult) => void;
  onStartNext?: () => void;   // "Mulai lagi" → W11 beranda / peta
}

export default function CompanionDashboard({
  activeProfile,
  fetchLatestResult,
  onSavePDF,
  onStartNext,
}: CompanionDashboardProps): JSX.Element {
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLatestResult(activeProfile.id)
      .then((r) => { if (!cancelled) { setResult(r); setLoading(false); } })
      .catch(() => { if (!cancelled) { setResult(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [activeProfile.id, fetchLatestResult]);

  // ── Loading ──
  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center h-[500px] gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-[#e8dfce] border-t-[#c98a4b] animate-spin" />
          <p className="font-bold text-[#8a7a66] text-sm">Membuka cerita…</p>
        </div>
      </Shell>
    );
  }

  // ── Empty state — anak belum pernah menyelesaikan sesi ──
  if (!result) {
    return (
      <Shell profileName={activeProfile.pseudonym} profileAge={activeProfile.ageYears}>
        <div className="flex flex-col items-center justify-center text-center h-[480px] gap-4 px-8">
          <span className="text-6xl">🌱</span>
          <h2 className="font-black text-[#4a3728] text-2xl">Belum ada cerita</h2>
          <p className="font-bold text-[#8a7a66] text-base max-w-md">
            {activeProfile.pseudonym} belum menyelesaikan petualangan. Setelah selesai bermain,
            Cilo akan menuliskan ceritanya di sini.
          </p>
          <button type="button" onClick={onStartNext}
            className="mt-2 px-8 py-3.5 bg-[#6dbb57] rounded-full border-4 border-white shadow-md font-black text-[#4a3728] text-base active:scale-95 transition-transform cursor-pointer">
            🎒 Mulai Petualangan
          </button>
        </div>
      </Shell>
    );
  }

  // ── Data siap ──
  const { assessment, plan } = result;
  const mainLevel = assessment.level;
  const badge = LEVEL_BADGE[mainLevel];
  const showReferral =
    mainLevel === "HIGH" ||
    assessment.domains.dyslexia === "HIGH" ||
    assessment.domains.dyscalculia === "HIGH";

  const dysBadge = LEVEL_BADGE[assessment.domains.dyslexia];
  const calBadge = LEVEL_BADGE[assessment.domains.dyscalculia];

  return (
    <Shell
      profileName={result.childName}
      profileAge={result.childAgeYears}
      dateLabel={formatDate(result.endedAt)}
    >
      <div className="px-8 py-6 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6">

        {/* ══ KOLOM KIRI — HASIL UTAMA ══ */}
        <div className="bg-white rounded-3xl shadow-[0px_8px_24px_rgba(74,55,40,0.08)] p-7 flex flex-col">
          {/* Badge kesimpulan */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5"
              style={{ background: badge.bg }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: badge.dot }} />
              <span className="font-black text-sm uppercase tracking-wide" style={{ color: badge.text }}>
                {badge.short}
              </span>
            </div>
            {/* Penanda sumber — transparansi offline */}
            {plan.source === "local-template" && (
              <span className="font-bold text-[#a98f6f] text-xs">Laporan standar (offline)</span>
            )}
          </div>

          {/* Headline kalimat lengkap */}
          <p className="font-black text-[#4a3728] text-lg mt-4">{LEVEL_HEADLINE[mainLevel]}</p>

          {/* Kutipan "Kata Cilo" — dari LLM */}
          <p className="font-black text-[#6b5a48] text-xs tracking-wider mt-5">KATA CILO…</p>
          <blockquote className="font-black text-[#4a3728] text-2xl leading-snug mt-2">
            “{plan.summary}”
          </blockquote>

          <div className="h-px bg-[#f3e9d7] my-6" />

          {/* Pengamatan per area — dari assessment.domains */}
          <p className="font-black text-[#6b5a48] text-xs tracking-wider">PENGAMATAN PER AREA</p>
          <div className="flex flex-col gap-3 mt-3">
            <DomainRow emoji="🔤" label="Baca-tulis" badge={dysBadge} />
            <DomainRow emoji="🔢" label="Berhitung"  badge={calBadge} />
          </div>

          <div className="h-px bg-[#f3e9d7] my-6" />

          {/* Aksi */}
          <div className="flex items-center gap-5 mt-auto">
            <button type="button" onClick={() => onSavePDF?.(result)}
              className="px-6 py-3 bg-[#3e8e5a] rounded-full border-[3px] border-white shadow-md font-black text-white text-sm active:scale-95 transition-transform cursor-pointer">
              📄 Simpan Laporan (PDF)
            </button>
            <button type="button" onClick={onStartNext}
              className="font-bold text-[#3e8e5a] text-sm cursor-pointer hover:underline">
              Kembali ke Beranda →
            </button>
          </div>
        </div>

        {/* ══ KOLOM KANAN ══ */}
        <div className="flex flex-col gap-6">

          {/* Misi Rumah — companionActivities (string[] utuh, tanpa kotak menit) */}
          <div className="bg-white rounded-3xl shadow-[0px_8px_24px_rgba(74,55,40,0.08)] p-7">
            <p className="font-black text-[#6b5a48] text-xs tracking-wider">MISI RUMAH MINGGU INI</p>
            <ul className="flex flex-col gap-3 mt-4">
              {plan.companionActivities.map((act, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-[#eaf7e0] flex items-center justify-center text-xs">
                    {i + 1}
                  </span>
                  <span className="font-bold text-[#4a3728] text-[15px] leading-snug">{act}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Skrining berikutnya — dihitung dari endedAt + cooldown */}
          <div className="bg-white rounded-3xl shadow-[0px_8px_24px_rgba(74,55,40,0.08)] p-7">
            <p className="font-black text-[#6b5a48] text-xs tracking-wider">SKRINING BERIKUTNYA</p>
            <p className="font-black text-[#4a3728] text-2xl mt-2">
              Terbuka lagi {formatCooldownWindow(result.endedAt)}
            </p>
            <div className="w-full h-2.5 rounded-full bg-[#f3e9d7] mt-4 overflow-hidden">
              <div className="h-full rounded-full bg-[#3e8e5a]" style={{ width: "32%" }} />
            </div>
            <p className="font-bold text-[#6b5a48] text-[13px] leading-snug mt-3">
              Jeda 2–4 minggu menjaga hasil tetap jujur — anak tidak sekadar hafal permainannya.
            </p>
          </div>

          {/* Saran Tindak Lanjut — HANYA saat HIGH (referralGuidance) */}
          {showReferral && plan.referralGuidance.length > 0 && (
            <div className="bg-[#dff2f2] rounded-3xl shadow-[0px_8px_24px_rgba(31,107,107,0.1)] p-7 border-2 border-[#2b8a8a]/30">
              <p className="font-black text-[#1f6b6b] text-xs tracking-wider">🩺 SARAN TINDAK LANJUT</p>
              <ul className="flex flex-col gap-2.5 mt-4">
                {plan.referralGuidance.map((g, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-[#2b8a8a]" />
                    <span className="font-bold text-[#1f6b6b] text-[15px] leading-snug">{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

// ── Baris domain (Baca-tulis / Berhitung) ──
const DomainRow = ({ emoji, label, badge }: { emoji: string; label: string; badge: typeof LEVEL_BADGE[RiskLevel] }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <span className="text-lg">{emoji}</span>
      <span className="font-black text-[#4a3728] text-base">{label}</span>
    </div>
    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ background: badge.bg }}>
      <span className="w-2 h-2 rounded-full" style={{ background: badge.dot }} />
      <span className="font-bold text-sm" style={{ color: badge.text }}>{badge.short}</span>
    </div>
  </div>
);

// ── Shell: navbar + strip disclaimer (dipakai semua state) ──
const Shell = ({ children, profileName, profileAge, dateLabel }: {
  children: React.ReactNode; profileName?: string; profileAge?: number; dateLabel?: string;
}) => (
  <main className="relative w-full min-h-[100dvh] font-nunito bg-[linear-gradient(180deg,#bfe5f5_0%,#eaf7e0_100%)] flex flex-col">
    {/* Navbar */}
    <header className="bg-white h-14 flex items-center px-6 shrink-0 shadow-sm">
      <div className="flex items-center gap-2">
        {/* Cilo Bear Mini Logo */}
        <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
          <div className="w-full h-full transform scale-[0.12] origin-top-left -ml-1 -mt-1">
            <CiloKancil />
          </div>
        </div>
        <span className="font-black text-[#4a3728] text-lg tracking-tight">ReadiKids</span>
      </div>
      <div className="ml-auto flex items-center gap-5">
        {dateLabel && <span className="font-bold text-[#6b5a48] text-sm">{dateLabel}</span>}
        {profileName && (
          <span className="font-bold text-[#6b5a48] text-sm">
            🧒 {profileName}{profileAge ? ` · ${profileAge} th` : ""}
          </span>
        )}
      </div>
    </header>

    {/* Konten */}
    <div className="flex-1 max-w-[1280px] w-full mx-auto">{children}</div>

    {/* Strip disclaimer — HARDCODE, selalu tampil */}
    <footer className="bg-[#f3e9d7] py-3.5 px-6 shrink-0 mt-auto">
      <p className="font-bold text-[#6b5a48] text-[13px] text-center max-w-4xl mx-auto">
        ⚠ {SAFETY_DISCLAIMER}
      </p>
    </footer>
  </main>
);