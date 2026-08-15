import { useEffect, useState } from "react";
import { CiloKancil } from "../components/CiloKancil";
import type { ChildProfile } from "../types/telemetry";
import type { ScreeningResult } from "./CompanionDashboard";
import { getAllScreeningResults } from "./dashboardData";

interface RiwayatLaporanProps {
  activeProfile: ChildProfile;
  onBack: () => void;
  /** Klik satu sesi → buka langsung laporan hasil sesi tersebut. */
  onOpenResult: (sessionId: string) => void;
}

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const COOLDOWN_DAYS = 14;

function formatTanggal(ms: number): string {
  const d = new Date(ms);
  const waktu = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}, ${waktu}`;
}
/** Tanggal ringkas "26 Jul". */
function shortDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)}`;
}

// Nama ramah tiap tahap membaca (0-4).
const PHASE_NAME: Record<number, string> = {
  0: "Mengenal arah & bentuk",
  1: "Mengenal huruf",
  2: "Huruf & bunyi",
  3: "Bermain dengan bunyi",
  4: "Merangkai kata",
};

// Chip posisi perkembangan membaca — framing observasi, BUKAN indikator risiko.
const POSITION_STYLE = { background: "#eaf7e0", color: "#2f5b23" };

export default function RiwayatLaporan({ activeProfile, onBack, onOpenResult }: RiwayatLaporanProps) {
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAllScreeningResults(activeProfile.id)
      .then((data) => setResults(data))
      .catch((err) => console.error("Gagal mengambil riwayat:", err))
      .finally(() => setLoading(false));
  }, [activeProfile.id]);

  const total = results.length;
  // results[0] = terbaru. Petualangan berikutnya = terakhir + cooldown.
  const nextDate = total > 0 ? shortDate(results[0].endedAt + COOLDOWN_DAYS * 24 * 60 * 60 * 1000) : null;

  return (
    <main className="relative w-full min-h-[100dvh] font-nunito flex flex-col bg-[#fff6e9] lg:bg-[linear-gradient(180deg,#bfe5f5_0%,#eaf7e0_100%)]">
      {/* Navbar — desktop */}
      <header className="hidden lg:flex bg-white h-14 items-center px-4 lg:px-6 shrink-0 shadow-sm">
        <button onClick={onBack} className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
            <div className="w-full h-full transform scale-[0.12] origin-top-left -ml-1 -mt-1">
              <CiloKancil />
            </div>
          </div>
          <span className="font-black text-[#4a3728] text-lg tracking-tight">ReadiKids · Riwayat</span>
        </button>
        <div className="ml-auto">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-full font-black text-sm transition-colors text-[#6b5a48] hover:text-[#4a3728] cursor-pointer bg-[#f3e9d7] hover:bg-[#e8dfce]"
          >
            ← Kembali ke Beranda
          </button>
        </div>
      </header>

      {/* ═══════════════ HP (mengikuti mockup 66-2) ═══════════════ */}
      <div className="lg:hidden flex-1 px-5 pt-5 pb-8">
        <button
          type="button"
          onClick={onBack}
          aria-label="Kembali"
          className="w-11 h-11 rounded-full bg-white shadow-[0px_2px_8px_rgba(74,55,40,0.12)] flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
        >
          <span className="font-black text-2xl text-[#4a3728] leading-none -mt-0.5">←</span>
        </button>

        <h1 className="font-black text-[#4a3728] text-3xl leading-[1.05] mt-4">Jejak<br />Petualangan</h1>
        <p className="font-bold text-[#8a7a66] text-sm mt-1">
          {activeProfile.pseudonym} · tren lebih penting dari satu hasil
        </p>

        {loading ? (
          <div className="flex items-center gap-3 py-10">
            <div className="w-7 h-7 rounded-full border-4 border-[#cfe8d6] border-t-[#3e8e5a] animate-spin" />
            <span className="font-bold text-[#6b5a48]">Memuat riwayat…</span>
          </div>
        ) : total === 0 ? (
          <div className="bg-white rounded-3xl rk-sticker p-6 text-center mt-6">
            <span className="text-5xl block mb-3">🌱</span>
            <p className="font-black text-[#4a3728] text-lg">Belum ada riwayat</p>
            <p className="text-sm font-bold text-[#8a7a66] mt-2">
              Selesaikan petualangan pertama untuk melihat jejaknya di sini.
            </p>
          </div>
        ) : (
          <>
            {/* Banner petualangan berikutnya */}
            {nextDate && (
              <div className="bg-[#eaf3ff] rounded-2xl px-4 py-3 flex items-center gap-2 mt-5">
                <span className="text-lg shrink-0">🗓</span>
                <p className="font-black text-[#2b5c8a] text-sm">petualangan berikutnya: setelah {nextDate}</p>
              </div>
            )}

            {/* Daftar sesi — tiap kartu = tombol buka hasil */}
            <div className="flex flex-col gap-3 mt-4">
              {results.map((res, i) => {
                const num = total - i;
                const isNewest = i === 0;
                return (
                  <button
                    key={res.sessionId}
                    type="button"
                    onClick={() => onOpenResult(res.sessionId)}
                    className={`w-full text-left bg-white rounded-3xl rk-sticker p-4 flex items-start gap-3 active:scale-[0.99] transition-transform cursor-pointer ${isNewest ? "ring-2 ring-[#6dbb57]/40" : ""}`}
                  >
                    <span className="w-11 h-11 rounded-full bg-[#f3e2cf] flex items-center justify-center text-lg shrink-0" aria-hidden="true">🐾</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-black text-[#4a3728] text-base">#{num} · {shortDate(res.endedAt)}</p>
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black"
                          style={POSITION_STYLE}>
                          🗺️ Sampai tahap {PHASE_NAME[res.assessment.highestPhaseReached]}
                        </span>
                      </div>
                      <p className="font-bold text-[#8a7a66] text-xs leading-snug mt-1 line-clamp-2">
                        {res.plan.summary}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Catatan tren */}
            <p className="text-center font-bold text-[#8a7a66] text-xs leading-relaxed mt-6 px-2">
              pola yang menetap bisa jadi bahan pengamatan — buka hasil untuk melihat detail & unduh Laporan PDF 📄
            </p>
          </>
        )}
      </div>

      {/* ═══════════════ DESKTOP/WEB ═══════════════ */}
      <div className="hidden lg:block flex-1 max-w-[1280px] w-full mx-auto px-8 py-8">
        <div className="bg-white rounded-3xl shadow-[0px_8px_24px_rgba(74,55,40,0.08)] p-8 max-w-3xl mx-auto">
          <div className="mb-6 pb-6 border-b-2 border-[#f3e9d7] flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#f3e9d7] flex items-center justify-center text-3xl shrink-0">🧒</div>
            <div>
              <h1 className="font-black text-[#4a3728] text-2xl">Riwayat Skrining: {activeProfile.pseudonym}</h1>
              <p className="font-bold text-[#6b5a48] text-sm mt-1">
                Usia {activeProfile.ageYears} tahun · klik sesi untuk membuka hasilnya
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 py-10 justify-center">
              <div className="w-8 h-8 rounded-full border-4 border-[#cfe8d6] border-t-[#3e8e5a] animate-spin" />
              <span className="font-bold text-[#6b5a48]">Memuat riwayat…</span>
            </div>
          ) : total === 0 ? (
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
                <button
                  key={res.sessionId}
                  type="button"
                  onClick={() => onOpenResult(res.sessionId)}
                  className="w-full text-left bg-white border-2 border-[#f3e9d7] rounded-2xl p-5 hover:border-[#cfe8d6] hover:bg-[#fafffb] transition-colors cursor-pointer flex items-start justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">📅</span>
                      <span className="font-black text-[#4a3728] text-base">{formatTanggal(res.endedAt)}</span>
                    </div>
                    <div className="max-w-sm">
                      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 border border-white shadow-sm" style={{ background: "#eaf7e0" }}>
                        <span className="text-base">🗺️</span>
                        <span className="text-xs font-black" style={{ color: "#2f5b23" }}>
                          Sampai tahap {PHASE_NAME[res.assessment.highestPhaseReached]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="font-black text-[#3e8e5a] text-sm shrink-0 self-center">Buka hasil ›</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Strip disclaimer */}
      <footer className="bg-[#f3e9d7] py-2.5 px-4 lg:py-3.5 lg:px-6 shrink-0 mt-auto">
        <p className="font-bold text-[#6b5a48] text-center max-w-4xl mx-auto leading-snug text-[11px] lg:text-[13px]">
          <span className="lg:hidden">Skrining awal, bukan diagnosis — kepastian dari profesional.</span>
          <span className="hidden lg:inline">ReadiKids adalah skrining awal, bukan alat diagnosis — kepastian hanya dari profesional.</span>
        </p>
      </footer>
    </main>
  );
}
