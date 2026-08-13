import React, { useState, useEffect } from "react";
import { CiloKancil } from "../components/CiloKancil";
import CarbonFootprint from "./CarbonFootprint";
// ═══════════════════════════════════════════════════════════════════════════
// KONTRAK DATA — arsitektur v2 (membaca, 5 fase). Cocok dgn types/telemetry.ts.
// Prinsip: OBSERVASI, bukan diagnosis. Tidak ada bar/kategori rendah-sedang-tinggi
// berwarna; hasil disampaikan sebagai kalimat.
// ═══════════════════════════════════════════════════════════════════════════

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

interface PhaseView {
  phase: number; // 0-4
  reliability: number; // 0-100 (internal, tidak ditampilkan sbg warna)
  reached: boolean;
  level: RiskLevel;
}

interface AssessmentView {
  highestPhaseReached: number;
  phaseAgeGap: number;
  level: RiskLevel;
  perPhase: PhaseView[];
}

interface CompanionPlanResult {
  source: "gemini" | "local-template";
  generatedAt: number;
  summary: string;
  companionActivities: string[];
  referralGuidance: string[];
  /** Kalimat observasi lembut per fase, kunci "fase-0".."fase-4". */
  metricExplanations: Record<string, string>;
  disclaimer: string;
  /** Token Gemini terpakai (data nyata) — untuk estimasi jejak karbon. */
  aiUsage?: { promptTokens: number; outputTokens: number };
}

export interface ScreeningResult {
  sessionId: string;
  childName: string;
  childAgeYears: number;
  startedAt: number; // epoch ms
  endedAt: number; // epoch ms
  assessment: AssessmentView;
  plan: CompanionPlanResult;
}

interface ChildProfile {
  id: string;
  pseudonym: string;
  ageYears: number;
  createdAt: number;
}

// ── Nama & ikon ramah tiap tahap (bukan istilah klinis) ──
const PHASE_NAME: Record<number, string> = {
  0: "Mengenal arah & bentuk",
  1: "Mengenal huruf",
  2: "Huruf & bunyi",
  3: "Bermain dengan bunyi",
  4: "Merangkai kata",
};
const PHASE_EMOJI: Record<number, string> = { 0: "🧭", 1: "🔤", 2: "🔊", 3: "🎵", 4: "📖" };

// Disclaimer HARDCODE — keselamatan produk, tidak bergantung pada LLM.
const SAFETY_DISCLAIMER =
  "ReadiKids adalah alat bantu skrining awal, BUKAN alat diagnosis. Hasil ini adalah pengamatan cara anak bermain — kepastian hanya bisa diberikan oleh profesional.";

/** Kalimat kepala yang lembut (bukan vonis level). */
function softHeadline(a: AssessmentView): string {
  const watch = [...a.perPhase].sort((x, y) => x.phase - y.phase).find((p) => p.level !== "LOW");
  if (!watch) return "Tampak berkembang baik di tahap-tahap yang dimainkan.";
  return `Paling terbantu bila sesekali didampingi saat ${PHASE_NAME[watch.phase].toLowerCase()}.`;
}

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function formatCooldownWindow(endedAt: number): string {
  const start = new Date(endedAt + 14 * 24 * 60 * 60 * 1000);
  const end = new Date(endedAt + 28 * 24 * 60 * 60 * 1000);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${BULAN[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${BULAN[start.getMonth()].slice(0, 3)} – ${end.getDate()} ${BULAN[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// KOMPONEN UTAMA
// ═══════════════════════════════════════════════════════════════════════════

interface CompanionDashboardProps {
  activeProfile: ChildProfile;
  fetchLatestResult: (profileId: string) => Promise<ScreeningResult | null>;
  onSavePDF?: (result: ScreeningResult) => void;
  onStartNext?: () => void;
  nextButtonText?: string;
}

export default function CompanionDashboard({
  activeProfile,
  fetchLatestResult,
  onSavePDF,
  onStartNext,
  nextButtonText,
}: CompanionDashboardProps): JSX.Element {
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMisiRumahOpen, setIsMisiRumahOpen] = useState(false);
  const [isSaranOpen, setIsSaranOpen] = useState(true);
  const [isSkriningBerikutnyaOpen, setIsSkriningBerikutnyaOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLatestResult(activeProfile.id)
      .then((r) => { if (!cancelled) { setResult(r); setLoading(false); } })
      .catch(() => { if (!cancelled) { setResult(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [activeProfile.id, fetchLatestResult]);

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

  if (!result) {
    return (
      <Shell profileName={activeProfile.pseudonym} profileAge={activeProfile.ageYears}>
        <div className="flex flex-col items-center justify-center text-center h-[480px] gap-4 px-4 lg:px-8">
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

  const { assessment, plan } = result;
  const headline = softHeadline(assessment);
  const showReferral = assessment.level !== "LOW" && plan.referralGuidance.length > 0;

  return (
    <Shell
      profileName={result.childName}
      profileAge={result.childAgeYears}
      dateLabel={formatDate(result.endedAt)}
    >
      {/* ═══════════ HP ═══════════ */}
      <div className="lg:hidden">
        <div className="flex flex-col gap-4 px-4 py-5">

          {/* Ringkasan: posisi perjalanan + cerita Cilo + pengamatan per tahap */}
          <div className="bg-white rounded-3xl rk-sticker p-5">
            <div className="flex items-center justify-between gap-2">
              <JourneyChip phase={assessment.highestPhaseReached} />
              {plan.source === "local-template" && (
                <span className="font-bold text-[#a98f6f] text-[11px] shrink-0">Laporan standar</span>
              )}
            </div>

            <p className="font-black text-[#4a3728] text-lg mt-3 leading-snug">{headline}</p>

            <p className="font-black text-[#6b5a48] text-xs tracking-wider mt-4">KATA CILO…</p>
            <blockquote className="font-bold text-[#4a3728] text-lg leading-snug mt-2">“{plan.summary}”</blockquote>

            <div className="h-px bg-[#f3e9d7] my-5" />

            <p className="font-black text-[#6b5a48] text-xs tracking-wider">PENGAMATAN PER TAHAP</p>
            <PhaseObservations assessment={assessment} plan={plan} />
          </div>

          {/* Misi rumah */}
          <div className="bg-white rounded-3xl rk-sticker p-5 flex flex-col">
            <button onClick={() => setIsMisiRumahOpen(!isMisiRumahOpen)}
              className="flex items-center justify-between w-full text-left">
              <p className="font-black text-[#6b5a48] text-xs tracking-wider">MISI RUMAH MINGGU INI</p>
              <div className={`shrink-0 w-6 h-6 flex items-center justify-center text-[#8a7a66] transition-transform duration-300 origin-center ${isMisiRumahOpen ? 'rotate-180' : ''}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </button>
            <ul className="flex flex-col gap-3 mt-4">
              {plan.companionActivities.map((act, i) => (
                <li key={i} className={`flex items-start gap-3 ${!isMisiRumahOpen && i > 0 ? 'hidden' : ''}`}>
                  <span className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-[#eaf7e0] flex items-center justify-center text-xs font-black">{i + 1}</span>
                  {/* Saat minimize: pratinjau baris pertama di-clamp; saat terbuka: teks penuh */}
                  <span className={`font-bold text-[#4a3728] text-[15px] leading-snug ${!isMisiRumahOpen && i === 0 ? 'line-clamp-2' : ''}`}>{act}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Saran tindak lanjut — lembut, bisa di-minimize (seperti Misi Rumah) */}
          {showReferral && (
            <div className="bg-[#dff2f2] rounded-3xl p-5 border-2 border-[#2b8a8a]/30 shadow-[0px_5px_0px_#bfe0e0,0px_11px_16px_rgba(31,107,107,0.1)]">
              <button type="button" onClick={() => setIsSaranOpen(!isSaranOpen)}
                className="flex items-center justify-between w-full text-left gap-2 cursor-pointer">
                <p className="font-black text-[#1f6b6b] text-xs tracking-wider">💬 SARAN TINDAK LANJUT</p>
                <Chevron open={isSaranOpen} />
              </button>
              <ul className="flex flex-col gap-2.5 mt-4">
                {plan.referralGuidance.map((g, i) => (
                  <li key={i} className={`flex items-start gap-2.5 ${!isSaranOpen && i > 0 ? 'hidden' : ''}`}>
                    <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-[#2b8a8a]" />
                    <span className="font-bold text-[#1f6b6b] text-[15px] leading-snug">{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Skrining berikutnya — chevron sama seperti Misi Rumah */}
          <div className="bg-white rounded-3xl rk-sticker p-5 flex flex-col">
            <button type="button" onClick={() => setIsSkriningBerikutnyaOpen(!isSkriningBerikutnyaOpen)}
              className="flex items-center justify-between w-full text-left gap-2 cursor-pointer">
              <div>
                <p className="font-black text-[#6b5a48] text-xs tracking-wider">SKRINING BERIKUTNYA</p>
                <p className="font-black text-[#4a3728] text-base mt-1">Terbuka lagi {formatCooldownWindow(result.endedAt)}</p>
              </div>
              <Chevron open={isSkriningBerikutnyaOpen} />
            </button>
            {isSkriningBerikutnyaOpen && (
              <div className="mt-3">
                <div className="w-full h-2.5 rounded-full bg-[#f3e9d7] overflow-hidden">
                  <div className="h-full rounded-full bg-[#3e8e5a]" style={{ width: "32%" }} />
                </div>
                <p className="font-bold text-[#6b5a48] text-[13px] leading-snug mt-3">
                  Jeda 2–4 minggu menjaga hasil tetap jujur — anak tidak sekadar hafal permainannya.
                </p>
              </div>
            )}
          </div>

          {/* Jejak karbon sesi ini (green computing) — di paling bawah */}
          <CarbonFootprint result={result} />
        </div>

        {/* Bar aksi sticky */}
        <div className="sticky bottom-0 bg-[#eaf7e0]/95 backdrop-blur border-t border-[#cfe0c4] px-4 py-3 flex items-center gap-4">
          <div className="flex-1 flex flex-col items-stretch">
            <button type="button" onClick={() => onSavePDF?.(result)}
              className="py-3 px-5 bg-[#3e8e5a] rounded-full rk-sticker-btn active:scale-95 transition-transform cursor-pointer flex flex-col items-center gap-0.5">
              <span className="font-black text-white text-sm">📄 Simpan PDF</span>
              <span className="font-bold text-white/80 text-[11px]">Untuk laporan lebih detail</span>
            </button>
          </div>
          <button type="button" onClick={onStartNext}
            className="font-black text-[#3e8e5a] text-sm whitespace-nowrap active:scale-95 transition-transform cursor-pointer shrink-0">
            {nextButtonText || "Kembali →"}
          </button>
        </div>
      </div>

      {/* ═══════════ DESKTOP/WEB ═══════════ */}
      <div className="hidden lg:grid px-4 py-5 lg:px-8 lg:py-6 lg:grid-cols-[1.1fr_1fr] gap-4 lg:gap-6">

        {/* ══ KOLOM KIRI — HASIL UTAMA ══ */}
        <div className="bg-white rounded-3xl shadow-[0px_8px_24px_rgba(74,55,40,0.08)] p-5 lg:p-7 flex flex-col">
          <div className="flex items-center justify-between">
            <JourneyChip phase={assessment.highestPhaseReached} />
            {plan.source === "local-template" && (
              <span className="font-bold text-[#a98f6f] text-xs">Laporan standar (offline)</span>
            )}
          </div>

          <p className="font-black text-[#4a3728] text-lg mt-4 leading-snug">{headline}</p>

          <p className="font-black text-[#6b5a48] text-xs tracking-wider mt-5">KATA CILO…</p>
          <blockquote className="font-bold text-[#4a3728] text-xl leading-snug mt-2">“{plan.summary}”</blockquote>

          <div className="h-px bg-[#f3e9d7] my-6" />

          <p className="font-black text-[#6b5a48] text-xs tracking-wider">PENGAMATAN PER TAHAP</p>
          <PhaseObservations assessment={assessment} plan={plan} />

          <div className="h-px bg-[#f3e9d7] my-6" />

          <div className="flex items-center gap-3 lg:gap-5 mt-auto">
            <div className="flex flex-col items-start gap-1">
              <button type="button" onClick={() => onSavePDF?.(result)}
                className="px-6 py-3 bg-[#3e8e5a] rounded-full border-[3px] border-white shadow-md active:scale-95 transition-transform cursor-pointer flex flex-col items-center gap-0.5">
                <span className="font-black text-white text-sm">📄 Simpan Laporan (PDF)</span>
                <span className="font-bold text-white/80 text-[11px]">Untuk laporan lebih detail</span>
              </button>
            </div>
            <button type="button" onClick={onStartNext}
              className="font-bold text-[#3e8e5a] text-sm cursor-pointer hover:underline">
              {nextButtonText || "Kembali ke Beranda →"}
            </button>
          </div>
        </div>

        {/* ══ KOLOM KANAN ══ */}
        <div className="flex flex-col gap-4 lg:gap-6">
          <div className="bg-white rounded-3xl shadow-[0px_8px_24px_rgba(74,55,40,0.08)] p-5 lg:p-7">
            <p className="font-black text-[#6b5a48] text-xs tracking-wider">MISI RUMAH MINGGU INI</p>
            <ul className="flex flex-col gap-3 mt-4">
              {plan.companionActivities.map((act, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-[#eaf7e0] flex items-center justify-center text-xs">{i + 1}</span>
                  <span className="font-bold text-[#4a3728] text-[15px] leading-snug">{act}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-3xl shadow-[0px_8px_24px_rgba(74,55,40,0.08)] p-5 lg:p-7 flex flex-col">
            <button type="button" onClick={() => setIsSkriningBerikutnyaOpen(!isSkriningBerikutnyaOpen)}
              className="flex items-center justify-between w-full text-left gap-2 cursor-pointer">
              <div>
                <p className="font-black text-[#6b5a48] text-xs tracking-wider">SKRINING BERIKUTNYA</p>
                <p className="font-black text-[#4a3728] text-xl lg:text-2xl mt-2">
                  Terbuka lagi {formatCooldownWindow(result.endedAt)}
                </p>
              </div>
              <Chevron open={isSkriningBerikutnyaOpen} />
            </button>
            {isSkriningBerikutnyaOpen && (
              <>
                <div className="w-full h-2.5 rounded-full bg-[#f3e9d7] mt-4 overflow-hidden">
                  <div className="h-full rounded-full bg-[#3e8e5a]" style={{ width: "32%" }} />
                </div>
                <p className="font-bold text-[#6b5a48] text-[13px] leading-snug mt-3">
                  Jeda 2–4 minggu menjaga hasil tetap jujur — anak tidak sekadar hafal permainannya.
                </p>
              </>
            )}
          </div>

          {showReferral && (
            <div className="bg-[#dff2f2] rounded-3xl shadow-[0px_8px_24px_rgba(31,107,107,0.1)] p-5 lg:p-7 border-2 border-[#2b8a8a]/30">
              <button type="button" onClick={() => setIsSaranOpen(!isSaranOpen)}
                className="flex items-center justify-between w-full text-left gap-2 cursor-pointer">
                <p className="font-black text-[#1f6b6b] text-xs tracking-wider">💬 SARAN TINDAK LANJUT</p>
                <Chevron open={isSaranOpen} />
              </button>
              <ul className="flex flex-col gap-2.5 mt-4">
                {plan.referralGuidance.map((g, i) => (
                  <li key={i} className={`flex items-start gap-2.5 ${!isSaranOpen && i > 0 ? 'hidden' : ''}`}>
                    <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-[#2b8a8a]" />
                    <span className="font-bold text-[#1f6b6b] text-[15px] leading-snug">{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Jejak karbon sesi ini (green computing) */}
          <CarbonFootprint result={result} />
        </div>
      </div>
    </Shell>
  );
}

// ── Chip posisi perjalanan (warna hangat konsisten, BUKAN indikator risiko) ──
const JourneyChip = ({ phase }: { phase: number }) => (
  <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5" style={{ background: "#eaf7e0" }}>
    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#6dbb57" }} />
    <span className="font-black text-sm" style={{ color: "#2f5b23" }}>
      Sampai tahap {PHASE_NAME[phase]}
    </span>
  </div>
);

// ── Panah buka/tutup seragam (mengikuti Misi Rumah: panah bawah → atas) ──
const Chevron = ({ open }: { open: boolean }) => (
  <div className={`shrink-0 w-6 h-6 flex items-center justify-center text-[#8a7a66] transition-transform duration-300 origin-center ${open ? 'rotate-180' : ''}`}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  </div>
);

// ── Pengamatan per tahap: KALIMAT observasi, tanpa bar/kategori berwarna ──
const PhaseObservations = ({ assessment, plan }: { assessment: AssessmentView; plan: CompanionPlanResult }) => (
  <div className="flex flex-col gap-3.5 mt-3">
    {[...assessment.perPhase].sort((a, b) => a.phase - b.phase).map((p) => (
      <div key={p.phase} className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-lg" aria-hidden="true">{PHASE_EMOJI[p.phase]}</span>
        <div>
          <p className="font-black text-[#4a3728] text-sm">{PHASE_NAME[p.phase]}</p>
          <p className="font-bold text-[#7c6a55] text-[13px] leading-relaxed mt-0.5">
            {plan.metricExplanations[`fase-${p.phase}`] ?? "Belum ada catatan untuk tahap ini."}
          </p>
        </div>
      </div>
    ))}
  </div>
);

// ── Shell: navbar + strip disclaimer (dipakai semua state) ──
const Shell = ({ children, profileName, profileAge, dateLabel }: {
  children: React.ReactNode; profileName?: string; profileAge?: number; dateLabel?: string;
}) => (
  <main className="relative w-full min-h-[100dvh] font-nunito flex flex-col bg-[#fff6e9] lg:bg-[linear-gradient(180deg,#bfe5f5_0%,#eaf7e0_100%)]">
    <header className="lg:hidden bg-[#fbe9d5] px-5 pt-6 pb-5 shrink-0 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-black text-[#4a3728] text-3xl leading-[1.05]">Cerita<br />Petualangan</h1>
        {(profileName || dateLabel) && (
          <p className="font-bold text-[#8a7a66] text-xs mt-2 truncate">
            {[profileName, profileAge ? `${profileAge} th` : null, dateLabel].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <div className="shrink-0 w-[68px] h-[82px] relative -mt-1">
        <div className="absolute top-0 left-0 scale-[0.23] origin-top-left"><CiloKancil /></div>
      </div>
    </header>

    <header className="hidden lg:flex bg-white h-14 items-center px-4 lg:px-6 shrink-0 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
          <div className="w-full h-full transform scale-[0.12] origin-top-left -ml-1 -mt-1">
            <CiloKancil />
          </div>
        </div>
        <span className="font-black text-[#4a3728] text-lg tracking-tight">ReadiKids</span>
      </div>
      <div className="ml-auto flex items-center gap-2 lg:gap-5">
        {dateLabel && <span className="font-bold text-[#6b5a48] text-sm">{dateLabel}</span>}
        {profileName && (
          <span className="font-bold text-[#6b5a48] text-sm">
            🧒 {profileName}{profileAge ? ` · ${profileAge} th` : ""}
          </span>
        )}
      </div>
    </header>

    <div className="flex-1 max-w-[1280px] w-full mx-auto">{children}</div>

    <footer className="bg-[#f3e9d7] py-2.5 px-4 lg:py-3.5 lg:px-6 shrink-0 mt-auto">
      <p className="font-bold text-[#6b5a48] text-center max-w-4xl mx-auto leading-snug text-[11px] lg:text-[13px]">
        <span className="lg:hidden">⚠ Skrining awal, bukan diagnosis — kepastian dari profesional.</span>
        <span className="hidden lg:inline">⚠ {SAFETY_DISCLAIMER}</span>
      </p>
    </footer>
  </main>
);
