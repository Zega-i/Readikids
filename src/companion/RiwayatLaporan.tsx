import { useEffect, useState } from "react";
import { CiloKancil } from "../components/CiloKancil";
import type { ChildProfile } from "../types/telemetry";
import type { ScreeningResult } from "./CompanionDashboard";
import { getAllScreeningResults } from "./dashboardData";
import { buildReferralReportPdf } from "../referral/reportPdf";

interface RiwayatLaporanProps {
  activeProfile: ChildProfile;
  onBack: () => void;
  onOpenResult: (sessionId: string) => void;
}

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function formatTanggal(ms: number): string {
  const d = new Date(ms);
  const waktu = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}, ${waktu}`;
}

const LEVEL_LABEL: Record<"LOW" | "MEDIUM" | "HIGH", { text: string; color: string; dot: string; bg: string }> = {
  LOW:    { text: "Tipikal",       color: "#2f5b23", dot: "#6dbb57", bg: "#eaf7e0" },
  MEDIUM: { text: "Perlu diamati", color: "#9a6b00", dot: "#e8a53a", bg: "#fff6e9" },
  HIGH:   { text: "Konsultasi",    color: "#1f6b6b", dot: "#2b8a8a", bg: "#eaf3ff" },
};

export default function RiwayatLaporan({ activeProfile, onBack, onOpenResult }: RiwayatLaporanProps) {
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAllScreeningResults(activeProfile.id)
      .then((data) => {
        setResults(data);
      })
      .catch((err) => {
        console.error("Gagal mengambil riwayat:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeProfile.id]);

  const handleDownloadPDF = async (result: ScreeningResult) => {
    try {
      const pdfBytes = await buildReferralReportPdf({
        child: activeProfile,
        assessment: {
          sessionId: result.sessionId,
          childRef: activeProfile.id,
          createdAt: result.endedAt,
          compositeScore: result.assessment.compositeScore,
          level: result.assessment.level,
          breakdown: result.assessment.breakdown,
          domains: result.assessment.domains,
          metrics: result.assessment.metrics,
        },
        history: [], // Untuk kesederhanaan versi saat ini
        plan: result.plan
      });
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `Laporan_ReadiKids_${activeProfile.pseudonym}_${new Date(result.endedAt).toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal membuat PDF:", err);
      alert("Gagal mengunduh laporan PDF.");
    }
  };

  return (
    <main className="relative w-full min-h-[100dvh] font-nunito bg-[linear-gradient(180deg,#bfe5f5_0%,#eaf7e0_100%)] flex flex-col">
      {/* Navbar */}
      <header className="bg-white h-14 flex items-center px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
              <div className="w-full h-full transform scale-[0.12] origin-top-left -ml-1 -mt-1">
                <CiloKancil />
              </div>
            </div>
            <span className="font-black text-[#4a3728] text-lg tracking-tight">ReadiKids · Riwayat</span>
          </button>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-full font-black text-xs sm:text-sm transition-colors text-[#6b5a48] hover:text-[#4a3728] cursor-pointer bg-[#f3e9d7] hover:bg-[#e8dfce]"
          >
            ← Kembali ke Beranda
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-[1280px] w-full mx-auto px-8 py-8">
        <div className="bg-white rounded-3xl shadow-[0px_8px_24px_rgba(74,55,40,0.08)] p-6 md:p-8 max-w-3xl mx-auto">
          <div className="mb-6 pb-6 border-b-2 border-[#f3e9d7] flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#f3e9d7] flex items-center justify-center text-3xl shrink-0">
              🧒
            </div>
            <div>
              <h1 className="font-black text-[#4a3728] text-2xl">Riwayat Skrining: {activeProfile.pseudonym}</h1>
              <p className="font-bold text-[#6b5a48] text-sm mt-1">
                Usia {activeProfile.ageYears} tahun · diurutkan dari yang terbaru
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 py-10 justify-center">
              <div className="w-8 h-8 rounded-full border-4 border-[#cfe8d6] border-t-[#3e8e5a] animate-spin" />
              <span className="font-bold text-[#6b5a48]">Memuat riwayat…</span>
            </div>
          ) : results.length === 0 ? (
            <div className="bg-[#fff6e9] rounded-2xl p-8 text-center border-2 border-[#f3e9d7] my-4">
              <span className="text-5xl block mb-3">🌱</span>
              <p className="font-black text-[#4a3728] text-lg">Belum ada riwayat petualangan.</p>
              <p className="text-sm font-bold text-[#8a7a66] mt-2">
                Selesaikan petualangan pertama untuk melihat hasilnya di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((res) => (
                <div key={res.sessionId} className="bg-white border-2 border-[#f3e9d7] rounded-2xl p-5 hover:border-[#cfe8d6] transition-colors">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Info Waktu & Metrik */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">📅</span>
                        <span className="font-black text-[#4a3728] text-base">
                          {formatTanggal(res.endedAt)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 max-w-sm">
                        {/* Disleksia Badge */}
                        <div className={`rounded-xl px-3 py-2 flex items-center gap-2 border shadow-sm border-white`} style={{ backgroundColor: LEVEL_LABEL[res.assessment.domains.dyslexia].bg }}>
                          <span className="text-lg">🔤</span>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-[#4a3728] uppercase">Baca-Tulis</span>
                            <span className="text-xs font-bold" style={{ color: LEVEL_LABEL[res.assessment.domains.dyslexia].color }}>
                              {LEVEL_LABEL[res.assessment.domains.dyslexia].text}
                            </span>
                          </div>
                        </div>
                        {/* Diskalkulia Badge */}
                        <div className={`rounded-xl px-3 py-2 flex items-center gap-2 border shadow-sm border-white`} style={{ backgroundColor: LEVEL_LABEL[res.assessment.domains.dyscalculia].bg }}>
                          <span className="text-lg">🔢</span>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-[#4a3728] uppercase">Berhitung</span>
                            <span className="text-xs font-bold" style={{ color: LEVEL_LABEL[res.assessment.domains.dyscalculia].color }}>
                              {LEVEL_LABEL[res.assessment.domains.dyscalculia].text}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex md:flex-col gap-2 w-full md:w-auto shrink-0 md:items-end">
                      <button
                        onClick={() => onOpenResult(res.sessionId)}
                        className="flex-1 md:flex-none px-4 py-2.5 rounded-xl font-black text-sm bg-[#6dbb57] text-white hover:bg-[#5da549] transition-transform active:scale-95 cursor-pointer shadow-sm text-center"
                      >
                        Buka Hasil ›
                      </button>
                      <button
                        onClick={() => void handleDownloadPDF(res)}
                        className="flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-sm bg-[#f3e9d7] text-[#6b5a48] hover:bg-[#e8dfce] hover:text-[#4a3728] transition-colors cursor-pointer text-center"
                      >
                        📄 Unduh PDF
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Strip disclaimer */}
      <footer className="bg-[#f3e9d7] py-3.5 px-6 shrink-0 mt-auto">
        <p className="font-bold text-[#6b5a48] text-[13px] text-center max-w-4xl mx-auto">
          ReadiKids adalah skrining awal, bukan alat diagnosis — kepastian hanya dari profesional.
        </p>
      </footer>
    </main>
  );
}