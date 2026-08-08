import { useState, useEffect } from "react";
import { CiloKancil } from "../components/CiloKancil";
import { isNativePlatform } from "../utils/platform";

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
  /** Ringkasan cerita terakhir (pratinjau, template lokal). Null bila belum main. */
  latestStorySummary: string | null;
  /** Daftar aktivitas pendampingan → "misi rumah minggu ini". */
  homeMissions: string[];
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
/** Tanggal ringkas "26 Jul" untuk label kartu cerita. */
function formatDayMon(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${BULAN[d.getMonth()]}`;
}

// Ikon selang-seling untuk baris misi rumah (dekoratif, mengikuti gaya mockup).
const MISSION_ICONS = ["🪣", "📖", "🌱", "✏️", "🔤"];

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
  activeProfile: import("../types/telemetry").ChildProfile | null;
  allProfiles?: import("../types/telemetry").ChildProfile[];        // untuk dropdown "ganti"
  fetchBerandaData: (profileId: string) => Promise<BerandaData>;
  /** Baca indeks misi yang sudah selesai minggu ini (opsional; HP). */
  fetchMissionDone?: (childRef: string) => Promise<number[]>;
  /** Toggle satu misi selesai/belum; kembalikan daftar baru (opsional; HP). */
  onToggleMission?: (childRef: string, index: number) => Promise<number[]>;
  onSwitchProfile?: (profileId: string) => void;
  onAddChild?: () => void; // Prop baru untuk masuk ke ParentConsent
  onStartAdventure: (override?: { reason: string }) => void; // cooldown override opsional
  onOpenLatestStory?: (sessionId: string) => void;
  onOpenHistory?: () => void;
  onOpenManage?: () => void;
  onOpenTentang?: () => void;
  onToLanding?: () => void;
}

export const BerandaPendamping = ({
  activeProfile,
  allProfiles = [],
  fetchBerandaData,
  fetchMissionDone,
  onToggleMission,
  onSwitchProfile,
  onAddChild,
  onStartAdventure,
  onOpenLatestStory,
  onOpenHistory,
  onOpenManage,
  onOpenTentang,
  onToLanding,
}: BerandaPendampingProps): JSX.Element => {
  const [data, setData] = useState<BerandaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [missionDone, setMissionDone] = useState<number[]>([]);
  // Misi hanya interaktif+tersimpan di APK (native). Di web: read-only.
  const isNative = isNativePlatform();

  useEffect(() => {
    let cancelled = false;
    if (!activeProfile) { setData(null); setLoading(false); return; }
    setLoading(true);
    fetchBerandaData(activeProfile.id)
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) { setData(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [activeProfile?.id, fetchBerandaData]);

  // Muat status misi minggu ini untuk anak aktif — hanya di APK (native).
  useEffect(() => {
    let cancelled = false;
    if (!activeProfile || !isNative || !fetchMissionDone) { setMissionDone([]); return; }
    fetchMissionDone(activeProfile.id)
      .then((idxs) => { if (!cancelled) setMissionDone(idxs); })
      .catch(() => { if (!cancelled) setMissionDone([]); });
    return () => { cancelled = true; };
  }, [activeProfile?.id, fetchMissionDone, isNative]);

  const handleToggleMission = async (index: number) => {
    if (!isNative || !activeProfile) return; // web: read-only; tanpa anak: abaikan
    // Optimistik: perbarui UI dulu, lalu simpan.
    setMissionDone((cur) =>
      cur.includes(index) ? cur.filter((i) => i !== index) : [...cur, index],
    );
    if (onToggleMission) {
      try {
        const next = await onToggleMission(activeProfile.id, index);
        setMissionDone(next);
      } catch {
        // Rollback bila gagal simpan.
        setMissionDone((cur) =>
          cur.includes(index) ? cur.filter((i) => i !== index) : [...cur, index],
        );
      }
    }
  };

  const neverPlayed = !data || data.totalSessions === 0 || data.lastEndedAt === null;
  const locked = !neverPlayed && data!.lastEndedAt !== null
    && daysSince(data!.lastEndedAt) < COOLDOWN_DAYS;

  // Tombol mulai: bila terkunci → HANYA menampikan info, tombol disable (kecuali belum pernah main sama sekali)
  const handleStart = () => {
    if (locked) return; // Do nothing if locked
    onStartAdventure();
  };

  // ── Empty-state: tidak ada anak sama sekali (mis. setelah "hapus semua") ──
  if (!activeProfile) {
    return (
      <main className="relative w-full min-h-[100dvh] font-nunito bg-[linear-gradient(180deg,#bfe5f5_0%,#eaf7e0_100%)] flex flex-col">
        {/* Navbar — desktop */}
        <header className="bg-white h-14 hidden lg:flex items-center px-4 lg:px-6 shrink-0 shadow-sm">
          <button onClick={onToLanding} className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
              <div className="w-full h-full transform scale-[0.12] origin-top-left -ml-1 -mt-1">
                <CiloKancil />
              </div>
            </div>
            <span className="font-black text-[#4a3728] text-lg tracking-tight">ReadiKids · Beranda</span>
          </button>
          <div className="ml-auto flex items-center gap-4">
            <button onClick={onOpenManage} className="font-bold text-[#6b5a48] text-sm cursor-pointer hover:text-[#4a3728]">⚙ Kelola</button>
            {onOpenTentang && (
              <button onClick={onOpenTentang} className="font-bold text-[#6b5a48] text-sm cursor-pointer hover:text-[#4a3728]">ℹ️ Tentang</button>
            )}
          </div>
        </header>

        <div className="flex-1 max-w-[1280px] w-full mx-auto px-4 py-6 lg:px-8 lg:py-8 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-black text-[#4a3728] text-3xl sm:text-4xl">Halo! 🌿</h1>
            <div className="flex items-center gap-2 lg:hidden shrink-0">
              <button type="button" onClick={onOpenManage} aria-label="Kelola"
                className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-lg active:scale-95 transition-transform cursor-pointer">⚙</button>
              {onOpenTentang && (
                <button type="button" onClick={onOpenTentang} aria-label="Tentang"
                  className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-lg active:scale-95 transition-transform cursor-pointer">ℹ️</button>
              )}
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="bg-white rounded-3xl rk-sticker p-6 text-center max-w-sm w-full">
              <span className="text-5xl block mb-2" aria-hidden="true">🌱</span>
              <p className="font-black text-[#4a3728] text-lg">Belum ada anak</p>
              <p className="font-bold text-[#6b5a48] text-sm mt-1.5 leading-snug">
                Tambahkan profil anak untuk memulai petualangan pertama. Kartu-kartu di beranda akan terisi setelah ada anak dan satu petualangan selesai.
              </p>
              {onAddChild && (
                <button type="button" onClick={onAddChild}
                  className="mt-4 w-full rounded-full py-3.5 rk-sticker-btn bg-[#3e8e5a] font-black text-white active:scale-95 transition-transform cursor-pointer">
                  + Tambah anak
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-[#f3e9d7] py-3 px-4 lg:py-3.5 lg:px-6 shrink-0">
          <p className="font-bold text-[#6b5a48] text-center max-w-4xl mx-auto text-xs lg:text-[13px]">
            <span className="lg:hidden">Skrining awal · bukan alat diagnosis</span>
            <span className="hidden lg:inline">ReadiKids adalah skrining awal, bukan alat diagnosis — kepastian hanya dari profesional.</span>
          </p>
        </footer>
      </main>
    );
  }

  return (
    <main className="relative w-full min-h-[100dvh] font-nunito bg-[linear-gradient(180deg,#bfe5f5_0%,#eaf7e0_100%)] flex flex-col">
      {/* Navbar — hanya desktop; di HP diganti sapaan + ikon (lihat bawah) */}
      <header className="bg-white h-14 hidden lg:flex items-center px-4 lg:px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onToLanding} className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
              <div className="w-full h-full transform scale-[0.12] origin-top-left -ml-1 -mt-1">
                <CiloKancil />
              </div>
            </div>
            <span className="font-black text-[#4a3728] text-base lg:text-lg tracking-tight">ReadiKids · Beranda</span>
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2 lg:gap-4">
          <button onClick={onOpenManage} className="font-bold text-[#6b5a48] text-sm cursor-pointer hover:text-[#4a3728]">
            ⚙ Kelola
          </button>
          {onOpenTentang && (
            <button onClick={onOpenTentang} className="font-bold text-[#6b5a48] text-sm cursor-pointer hover:text-[#4a3728]">
              ℹ️ Tentang
            </button>
          )}
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
      <div className="flex-1 max-w-[1280px] w-full mx-auto px-4 py-6 lg:px-8 lg:py-8">
        {/* Sapaan + aksi — di HP: "Halo!" + ikon pengaturan (mengikuti mockup);
            di desktop: app-bar di atas yang menangani menu, sini hanya sapaan. */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-black text-[#4a3728] text-3xl sm:text-4xl">Halo! 🌿</h1>
            <p className="hidden lg:block font-bold text-[#6b5a48] text-base sm:text-lg mt-2">
              Siap menemani {activeProfile.pseudonym} bertualang lagi?
            </p>
          </div>
          {/* Ikon-only — hanya HP (desktop memakai app-bar) */}
          <div className="flex items-center gap-2 lg:hidden shrink-0">
            <button type="button" onClick={onOpenManage} aria-label="Kelola"
              className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-lg active:scale-95 transition-transform cursor-pointer">
              ⚙
            </button>
            {onOpenTentang && (
              <button type="button" onClick={onOpenTentang} aria-label="Tentang"
                className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-lg active:scale-95 transition-transform cursor-pointer">
                ℹ️
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 mt-10">
            <div className="w-8 h-8 rounded-full border-4 border-[#cfe8d6] border-t-[#3e8e5a] animate-spin" />
            <span className="font-bold text-[#6b5a48]">Memuat…</span>
          </div>
        ) : (
          <>

          {/* ═══════════════ ISI — HP (mengikuti mockup 65:2) ═══════════════ */}
          <div className="lg:hidden mt-5 flex flex-col gap-4">

            {/* Kartu profil */}
            <div className="bg-white rounded-3xl rk-sticker p-4 flex items-center gap-3 relative">
              <span className="text-4xl shrink-0" aria-hidden="true">🧒</span>
              <div className="min-w-0 flex-1">
                <p className="font-black text-[#4a3728] text-lg truncate">
                  {activeProfile.pseudonym} · {activeProfile.ageYears} th
                </p>
                <p className="font-bold text-[#6b5a48] text-sm">
                  {neverPlayed ? "belum ada petualangan" : `${data!.totalSessions} petualangan selesai`}
                </p>
              </div>
              <button onClick={() => setShowProfileMenu((s) => !s)}
                className="font-bold text-[#3e8e5a] text-sm cursor-pointer shrink-0 self-start">
                ganti ›
              </button>
              {showProfileMenu && (
                <div className="absolute right-4 top-14 bg-white rounded-2xl shadow-lg border border-[#f3e9d7] py-2 z-20 min-w-[180px]">
                  {allProfiles.map((p) => (
                    <button key={p.id}
                      onClick={() => { onSwitchProfile?.(p.id); setShowProfileMenu(false); }}
                      className={`block w-full text-left px-4 py-2 text-sm font-bold cursor-pointer hover:bg-[#f7f2e8] ${p.id === activeProfile.id ? "text-[#3e8e5a]" : "text-[#4a3728]"}`}>
                      {p.pseudonym} · {p.ageYears} th {p.id === activeProfile.id && "✓"}
                    </button>
                  ))}
                  <p className="px-4 pt-2 mt-1 border-t border-[#f3e9d7] text-[11px] font-bold text-[#a89a86]">
                    tambah anak baru lewat menu Kelola
                  </p>
                </div>
              )}
            </div>

            {/* Kartu cerita terakhir (krem) — selalu tampil; kosong bila belum main */}
            {neverPlayed || !data!.latestStorySummary ? (
              <div className="bg-[#fdf0c2] rounded-3xl rk-sticker-gold p-5 flex items-center gap-4">
                <span className="text-4xl shrink-0" aria-hidden="true">📖</span>
                <div>
                  <p className="font-black text-[#9a6b00] text-xs tracking-wide">cerita terakhir</p>
                  <p className="font-bold text-[#6b5a48] text-sm leading-snug mt-1.5">
                    Belum ada cerita. Setelah petualangan pertama, Cilo menuliskan cerita tentang cara belajar anak di sini.
                  </p>
                </div>
              </div>
            ) : (
              <button type="button"
                onClick={() => data!.latestSessionId && onOpenLatestStory?.(data!.latestSessionId)}
                className="text-left bg-[#fdf0c2] rounded-3xl rk-sticker-gold p-4 active:scale-[0.99] transition-transform cursor-pointer">
                <p className="font-black text-[#9a6b00] text-xs tracking-wide">
                  cerita terakhir · {formatDayMon(data!.lastEndedAt!)}
                </p>
                <p className="font-black text-[#4a3728] text-[15px] leading-snug mt-1.5 line-clamp-3">
                  “{data!.latestStorySummary}”
                </p>
                <span className="inline-block font-black text-[#3e8e5a] text-sm mt-2">
                  baca cerita lengkap ›
                </span>
              </button>
            )}

            {/* Tombol mulai (pill) */}
            <button type="button" onClick={handleStart} disabled={locked}
              className={`w-full rounded-full font-black py-4 text-lg flex items-center justify-center gap-2 transition-transform ${locked ? "bg-[#e8dfce] text-[#a98f6f] cursor-not-allowed border-4 border-white" : "bg-[#3e8e5a] text-white cursor-pointer active:scale-95 rk-sticker-btn"}`}>
              {locked
                ? <><span>🔒</span> Terbuka {formatUnlockDate(data!.lastEndedAt!)}</>
                : <><span>🎒</span> mulai petualangan</>}
            </button>

            {/* Keterangan di bawah tombol */}
            <p className="font-bold text-[#6b5a48] text-sm text-center -mt-1">
              {neverPlayed
                ? "±15 menit · anak main di layar penuh, Anda cukup menemani"
                : locked
                  ? "waktu skrining belum tiba — jeda menjaga hasil jujur"
                  : `terakhir ${relativeLast(data!.lastEndedAt!)} — waktunya pas!`}
            </p>

            {/* Kartu misi rumah minggu ini — interaktif di APK, read-only di web */}
            <MissionCard
              missions={neverPlayed ? [] : data!.homeMissions}
              done={missionDone}
              interactive={isNative}
              onToggle={handleToggleMission}
            />

            {/* Tautan riwayat & laporan (PDF diakses dari dalam tiap hasil) */}
            <div className="flex items-center justify-center pt-1 pb-2">
              <button onClick={onOpenHistory} disabled={neverPlayed}
                className={`font-black text-sm ${neverPlayed ? "text-[#b8a98f] cursor-not-allowed" : "text-[#3e8e5a] cursor-pointer active:scale-95"}`}>
                riwayat &amp; laporan ›
              </button>
            </div>
          </div>

          {/* ═══════════ ISI — DESKTOP (dua kolom, tidak diubah) ═══════════ */}
          <div className="hidden lg:grid lg:grid-cols-[1.1fr_1fr] gap-6 mt-6">

            {/* ══ KIRI — kartu mulai ══ */}
            <div className="bg-white rounded-3xl shadow-[0px_8px_24px_rgba(74,55,40,0.08)] p-5 lg:p-7 flex flex-col">
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

              <div className="h-px bg-[#f3e9d7] my-4 lg:my-6" />

              {/* tombol mulai — disable saat cooldown */}
              <button type="button" onClick={handleStart}
                disabled={locked}
                className={`w-full rounded-3xl border-4 border-white shadow-md font-black py-4 text-xl lg:py-6 lg:text-2xl transition-transform ${locked ? "bg-[#e8dfce] text-[#a98f6f] cursor-not-allowed opacity-80" : "bg-[#6dbb57] text-[#4a3728] cursor-pointer active:scale-95"}`}>
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
                <div className="bg-white rounded-3xl shadow-[0px_8px_24px_rgba(74,55,40,0.08)] p-5 lg:p-7">
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
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                <AccessCard emoji="📖" title="Cerita terakhir" sub="baca hasil sesi terbaru"
                  disabled={neverPlayed}
                  onClick={() => data?.latestSessionId && onOpenLatestStory?.(data.latestSessionId)} />
                <AccessCard emoji="🗂" title="Riwayat & laporan" sub="semua sesi & unduh PDF"
                  onClick={onOpenHistory} />
              </div>
            </div>
          </div>
          </>
        )}
      </div>

      {/* Strip disclaimer — ringkas di HP, lengkap di desktop */}
      <footer className="bg-[#f3e9d7] py-3 px-4 lg:py-3.5 lg:px-6 shrink-0">
        <p className="font-bold text-[#6b5a48] text-center max-w-4xl mx-auto text-xs lg:text-[13px]">
          <span className="lg:hidden">Skrining awal · bukan alat diagnosis</span>
          <span className="hidden lg:inline">ReadiKids adalah skrining awal, bukan alat diagnosis — kepastian hanya dari profesional.</span>
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

// ── Kartu misi rumah (dipakai HP & desktop) ──
// interactive=true → bisa dicentang & disimpan (APK). false → hanya ditampilkan (web).
const MissionCard = ({ missions, done, interactive, onToggle }: {
  missions: string[];
  done: number[];
  interactive: boolean;
  onToggle: (index: number) => void;
}): JSX.Element => (
  <div className="bg-white rounded-3xl rk-sticker p-4">
    <div className="flex items-center justify-between">
      <p className="font-black text-[#4a3728] text-base">misi rumah minggu ini</p>
      {missions.length > 0 && !interactive && (
        <span className="font-bold text-[#8a7a66] text-[11px]">di aplikasi HP bisa dicentang</span>
      )}
    </div>

    {missions.length === 0 ? (
      <>
        <p className="font-bold text-[#6b5a48] text-sm leading-snug mt-1.5">
          Muncul setelah petualangan pertama — kegiatan sederhana untuk menemani anak belajar di rumah.
        </p>
        <ul className="mt-3 flex flex-col gap-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3 min-h-[52px] py-1 opacity-45">
              <span className="text-xl shrink-0 grayscale">{MISSION_ICONS[i]}</span>
              <span className="flex-1 h-3 rounded-full bg-[#efe7d8]" />
              <span className="w-7 h-7 rounded-full border-2 border-dashed border-[#d8cbb6] shrink-0" />
            </li>
          ))}
        </ul>
      </>
    ) : (
      <ul className="mt-3 flex flex-col gap-1">
        {missions.slice(0, 3).map((m, i) => {
          const isDone = done.includes(i);
          const rowInner = (
            <>
              <span className="text-xl shrink-0">{MISSION_ICONS[i % MISSION_ICONS.length]}</span>
              <span className={`flex-1 font-bold text-sm leading-snug line-clamp-2 ${isDone ? "text-[#8a7a66] line-through" : "text-[#4a3728]"}`}>
                {m}
              </span>
              <span className={`w-7 h-7 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${isDone ? "bg-[#6dbb57] border-[#6dbb57] text-white" : "bg-white border-[#d8cbb6]"}`}>
                {isDone && <span className="text-sm font-black leading-none">✓</span>}
              </span>
            </>
          );
          return (
            <li key={i}>
              {interactive ? (
                <button type="button" onClick={() => onToggle(i)} aria-pressed={isDone}
                  className="w-full flex items-center gap-3 text-left min-h-[52px] py-1 active:scale-[0.99] transition-transform cursor-pointer">
                  {rowInner}
                </button>
              ) : (
                <div className="w-full flex items-center gap-3 min-h-[52px] py-1">
                  {rowInner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    )}
  </div>
);

// ── Kartu akses ──
const AccessCard = ({ emoji, title, sub, onClick, disabled }: {
  emoji: string; title: string; sub: string; onClick?: () => void; disabled?: boolean;
}) => (
  <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled}
    className={`bg-white rounded-3xl shadow-[0px_8px_24px_rgba(74,55,40,0.08)] p-4 lg:p-6 text-left flex flex-col gap-2 transition-transform ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:scale-[1.02] active:scale-95"}`}>
    <span className="text-3xl">{emoji}</span>
    <span className="font-black text-[#4a3728] text-lg mt-1">{title}</span>
    <span className="font-bold text-[#6b5a48] text-sm leading-snug">{sub}</span>
    {!disabled && <span className="font-black text-[#3e8e5a] text-sm mt-1">buka ›</span>}
  </button>
);

export default BerandaPendamping;