import { useState, useEffect } from "react";
import { CiloKancil } from "../components/CiloKancil";

// ═══════════════════════════════════════════════════════════════════════════
// KONTRAK DATA — konsisten dengan telemetry.ts & heuristic.ts
// ═══════════════════════════════════════════════════════════════════════════

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";


// Ringkasan satu sesi untuk tampilan tren (bukan objek hasil penuh)
interface SessionSummary {
  sessionId: string;
  endedAt: number; // epoch ms
  domains: { dyslexia: RiskLevel; dyscalculia: RiskLevel };
}

export interface BerandaData {
  totalSessions: number;
  lastEndedAt: number | null;          // null bila belum pernah main
  recentSessions: SessionSummary[];    // maks 3, terlama→terbaru
  latestSessionId: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTIL
// ═══════════════════════════════════════════════════════════════════════════

const DAY = 24 * 60 * 60 * 1000;
const COOLDOWN_DAYS = 14;
const BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];

function daysSince(ms: number): number {
  return Math.floor((Date.now() - ms) / DAY);
}
function formatUnlockDate(lastEndedAt: number): string {
  const d = new Date(lastEndedAt + COOLDOWN_DAYS * DAY);
  return `${d.getDate()} ${BULAN[d.getMonth()]}`;
}
function relativeLast(lastEndedAt: number): string {
  const d = daysSince(lastEndedAt);
  if (d === 0) return "hari ini";
  if (d === 1) return "kemarin";
  return `${d} hari lalu`;
}

// Label ramah untuk status domain (tidak pernah HIGH/LOW mentah)
const LEVEL_LABEL: Record<RiskLevel, { text: string; color: string; dot: string }> = {
  LOW:    { text: "tipikal",       color: "#2f5b23", dot: "#6dbb57" },
  MEDIUM: { text: "perlu diamati", color: "#9a6b00", dot: "#e8a53a" },
  HIGH:   { text: "konsultasi",    color: "#1f6b6b", dot: "#2b8a8a" },
};

// ═══════════════════════════════════════════════════════════════════════════
// KOMPONEN UTAMA
// ═══════════════════════════════════════════════════════════════════════════

interface BerandaPendampingProps {
  activeProfile: import("../types/telemetry").ChildProfile;
  allProfiles?: import("../types/telemetry").ChildProfile[];        // untuk dropdown "ganti"
  fetchBerandaData: (profileId: string) => Promise<BerandaData>;
  onSwitchProfile?: (profileId: string) => void;
  onAddChild?: () => void; // Prop baru untuk masuk ke ParentConsent
  onStartAdventure: (override?: { reason: string }) => void; // cooldown override opsional
  onOpenLatestStory?: (sessionId: string) => void;
  onOpenHistory?: () => void;
  onOpenManage?: () => void;
  onToLanding?: () => void;
}

export const BerandaPendamping = ({
  activeProfile,
  allProfiles = [],
  fetchBerandaData,
  onSwitchProfile,
  onAddChild,
  onStartAdventure,
  onOpenLatestStory,
  onOpenHistory,
  onOpenManage,
  onToLanding,
}: BerandaPendampingProps): JSX.Element => {
  const [data, setData] = useState<BerandaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchBerandaData(activeProfile.id)
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) { setData(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [activeProfile.id, fetchBerandaData]);

  const neverPlayed = !data || data.totalSessions === 0 || data.lastEndedAt === null;
  const locked = !neverPlayed && data!.lastEndedAt !== null
    && daysSince(data!.lastEndedAt) < COOLDOWN_DAYS;

  // Tombol mulai: bila terkunci → HANYA menampikan info, tombol disable (kecuali belum pernah main sama sekali)
  const handleStart = () => {
    if (locked) return; // Do nothing if locked
    onStartAdventure();
  };

  return (
    <main className="relative w-full min-h-[100dvh] font-nunito bg-[linear-gradient(180deg,#bfe5f5_0%,#eaf7e0_100%)] flex flex-col">
      {/* Navbar */}
      <header className="bg-white h-14 flex items-center px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onToLanding} className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
              <div className="w-full h-full transform scale-[0.12] origin-top-left -ml-1 -mt-1">
                <CiloKancil />
              </div>
            </div>
            <span className="font-black text-[#4a3728] text-lg tracking-tight">ReadiKids · Beranda</span>
          </button>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <button onClick={onOpenManage} className="font-bold text-[#6b5a48] text-sm cursor-pointer hover:text-[#4a3728]">
            ⚙ Kelola
          </button>
          {onToLanding && (
            <button
              type="button"
              onClick={onToLanding}
              className="px-4 py-2 rounded-full font-black text-xs sm:text-sm transition-colors text-[#6b5a48] hover:text-[#4a3728] cursor-pointer bg-[#f3e9d7] hover:bg-[#e8dfce]"
            >
              ← Keluar
            </button>
          )}
        </div>
      </header>

      {/* Konten */}
      <div className="flex-1 max-w-[1280px] w-full mx-auto px-8 py-8">
        {/* Sapaan */}
        <h1 className="font-black text-[#4a3728] text-3xl sm:text-4xl">Halo! 🌿</h1>
        <p className="font-bold text-[#6b5a48] text-base sm:text-lg mt-2">
          Siap menemani {activeProfile.pseudonym} bertualang lagi?
        </p>

        {loading ? (
          <div className="flex items-center gap-3 mt-10">
            <div className="w-8 h-8 rounded-full border-4 border-[#cfe8d6] border-t-[#3e8e5a] animate-spin" />
            <span className="font-bold text-[#6b5a48]">Memuat…</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6 mt-6">

            {/* ══ KIRI — kartu mulai ══ */}
            <div className="bg-white rounded-3xl shadow-[0px_8px_24px_rgba(74,55,40,0.08)] p-7 flex flex-col">
              {/* profil anak */}
              <div className="flex items-start justify-between relative">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">🧒</span>
                  <div>
                    <p className="font-black text-[#4a3728] text-xl">
                      {activeProfile.pseudonym} · {activeProfile.ageYears} tahun
                    </p>
                    <p className="font-bold text-[#6b5a48] text-sm mt-0.5">
                      {neverPlayed
                        ? "belum ada petualangan"
                        : `${data!.totalSessions} petualangan selesai · terakhir ${relativeLast(data!.lastEndedAt!)}`}
                    </p>
                  </div>
                </div>
                {/* ganti profil & tambah profil */}
                <div className="flex flex-col items-end gap-1">
                  <button onClick={() => setShowProfileMenu((s) => !s)}
                    className="font-bold text-[#3e8e5a] text-sm cursor-pointer shrink-0">
                    ganti ›
                  </button>
                  <button onClick={onAddChild}
                    className="font-bold text-[#8a7a66] text-[11px] cursor-pointer shrink-0 hover:text-[#4a3728] flex items-center gap-1 bg-[#fff6e9] px-2 py-1 rounded-md mt-1 transition-colors">
                    <span className="text-[14px] leading-none">+</span> anak baru
                  </button>
                </div>

                {showProfileMenu && (
                  <div className="absolute right-0 top-8 bg-white rounded-2xl shadow-lg border border-[#f3e9d7] py-2 z-20 min-w-[180px]">
                    {allProfiles.length === 0 && (
                      <p className="px-4 py-2 text-sm font-bold text-[#8a7a66]">Hanya satu profil</p>
                    )}
                    {allProfiles.map((p) => (
                      <button key={p.id}
                        onClick={() => { onSwitchProfile?.(p.id); setShowProfileMenu(false); }}
                        className={`block w-full text-left px-4 py-2 text-sm font-bold cursor-pointer hover:bg-[#f7f2e8] ${p.id === activeProfile.id ? "text-[#3e8e5a]" : "text-[#4a3728]"}`}>
                        {p.pseudonym} · {p.ageYears} th {p.id === activeProfile.id && "✓"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-px bg-[#f3e9d7] my-6" />

              {/* tombol mulai — disable saat cooldown */}
              <button type="button" onClick={handleStart}
                disabled={locked}
                className={`w-full rounded-3xl border-4 border-white shadow-md font-black py-6 text-2xl transition-transform ${locked ? "bg-[#e8dfce] text-[#a98f6f] cursor-not-allowed opacity-80" : "bg-[#6dbb57] text-[#4a3728] cursor-pointer active:scale-95"}`}>
                {locked
                  ? `Terbuka ${formatUnlockDate(data!.lastEndedAt!)}`
                  : "🎒  MULAI PETUALANGAN"}
              </button>
              <p className="font-bold text-[#6b5a48] text-sm text-center mt-3">
                {locked
                  ? "waktu skrining belum tiba"
                  : "±15 menit · anak main di layar penuh, Anda cukup menemani"}
              </p>

              {/* cooldown info */}
              {!neverPlayed && (
                <div className="bg-[#eaf3ff] rounded-2xl px-4 py-3 mt-5 flex items-start gap-3">
                  <span className="text-xl shrink-0">🗓</span>
                  <div>
                    <p className="font-black text-[#2b5c8a] text-sm">
                      Skrining berikutnya terbuka {formatUnlockDate(data!.lastEndedAt!)}
                    </p>
                    <p className="font-bold text-[#4a6b8a] text-xs mt-0.5">
                      jeda menjaga hasil tetap jujur.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ══ KANAN ══ */}
            <div className="flex flex-col gap-6">
              {/* tren 3 sesi terakhir */}
              {!neverPlayed && (
                <div className="bg-white rounded-3xl shadow-[0px_8px_24px_rgba(74,55,40,0.08)] p-7">
                  <p className="font-black text-[#6b5a48] text-xs tracking-wider">
                    TREN {data!.recentSessions.length} PETUALANGAN TERAKHIR
                  </p>
                  <TrendRow emoji="🔤" label="Baca-tulis"
                    levels={data!.recentSessions.map((s) => s.domains.dyslexia)} />
                  <TrendRow emoji="🔢" label="Berhitung"
                    levels={data!.recentSessions.map((s) => s.domains.dyscalculia)} />
                </div>
              )}

              {/* dua pintu akses */}
              <div className="grid grid-cols-2 gap-4">
                <AccessCard emoji="📖" title="Cerita terakhir" sub="baca hasil sesi terbaru"
                  disabled={neverPlayed}
                  onClick={() => data?.latestSessionId && onOpenLatestStory?.(data.latestSessionId)} />
                <AccessCard emoji="🗂" title="Riwayat & laporan" sub="semua sesi & unduh PDF"
                  onClick={onOpenHistory} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Strip disclaimer — hardcode */}
      <footer className="bg-[#f3e9d7] py-3.5 px-6 shrink-0">
        <p className="font-bold text-[#6b5a48] text-[13px] text-center max-w-4xl mx-auto">
          ReadiKids adalah skrining awal, bukan alat diagnosis — kepastian hanya dari profesional.
        </p>
      </footer>

    </main>
  );
};

// ── Baris tren: N bulatan status per domain (terlama→terbaru) ──
const TrendRow = ({ emoji, label, levels }: { emoji: string; label: string; levels: RiskLevel[] }) => (
  <div className="flex items-center justify-between mt-4">
    <div className="flex items-center gap-2">
      <span className="text-lg">{emoji}</span>
      <span className="font-black text-[#4a3728] text-base">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {levels.map((lv, i) => (
        <span key={i} className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
          style={{ background: LEVEL_LABEL[lv].dot }} title={LEVEL_LABEL[lv].text} />
      ))}
      <span className="font-bold text-sm ml-1" style={{ color: LEVEL_LABEL[levels[levels.length - 1]].color }}>
        {LEVEL_LABEL[levels[levels.length - 1]].text}
      </span>
    </div>
  </div>
);

// ── Kartu akses ──
const AccessCard = ({ emoji, title, sub, onClick, disabled }: {
  emoji: string; title: string; sub: string; onClick?: () => void; disabled?: boolean;
}) => (
  <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled}
    className={`bg-white rounded-3xl shadow-[0px_8px_24px_rgba(74,55,40,0.08)] p-6 text-left flex flex-col gap-2 transition-transform ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:scale-[1.02] active:scale-95"}`}>
    <span className="text-3xl">{emoji}</span>
    <span className="font-black text-[#4a3728] text-lg mt-1">{title}</span>
    <span className="font-bold text-[#6b5a48] text-sm leading-snug">{sub}</span>
    {!disabled && <span className="font-black text-[#3e8e5a] text-sm mt-1">buka ›</span>}
  </button>
);

export default BerandaPendamping;