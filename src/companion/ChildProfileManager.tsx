/**
 * Manajemen multi-profil anak (Companion Mode) — halaman "Kelola".
 *
 * Web (desktop): daftar profil dengan hapus per-anak (tidak diubah — final).
 * APK (HP): desain mockup 66-38. Beda dari web:
 *   - Menu "suara instruksi" DIHILANGKAN.
 *   - "Font ramah disleksia" ditampilkan tapi belum aktif (segera hadir).
 *   - "Hapus semua data anak ini" (sekaligus) DITAMBAHKAN & aktif.
 */
import { useEffect, useState } from 'react';
import {
  deleteChildProfile,
  deleteAllChildProfiles,
  listChildProfiles,
} from '../profiles/childProfileService';
import type { ChildProfile } from '../types/telemetry';
import { CiloKancil } from '../components/CiloKancil';

interface ChildProfileManagerProps {
  /** Fungsi callback untuk tombol kembali ke beranda pendamping */
  onBack?: () => void;
  /** Bertambah setiap kali profil baru dibuat — memicu reload daftar. */
  refreshKey: number;
  /** Dipanggil setelah berhasil menghapus suatu profil */
  onProfileDeleted?: () => void;
  /** Id anak yang sedang aktif (untuk penanda "aktif" / centang). */
  activeProfileId?: string | null;
  /** Pilih/ganti anak aktif (HP). */
  onSwitchProfile?: (id: string) => void;
  /** Tambah profil anak baru (HP). */
  onAddChild?: () => void;
}

export default function ChildProfileManager({
  onBack,
  refreshKey,
  onProfileDeleted,
  activeProfileId,
  onSwitchProfile,
  onAddChild,
}: ChildProfileManagerProps) {
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const refreshProfileList = () => {
    setLoading(true);
    void listChildProfiles()
      .then(setProfiles)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshProfileList();
  }, [refreshKey]);

  const handleDelete = async (id: string) => {
    try {
      await deleteChildProfile(id);
      refreshProfileList();
      setConfirmDeleteId(null);
      onProfileDeleted?.();
    } catch (err) {
      console.error("Gagal menghapus profil:", err);
      alert("Terjadi kesalahan saat menghapus data anak.");
      setConfirmDeleteId(null);
    }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      await deleteAllChildProfiles();
      refreshProfileList();
      setConfirmDeleteAll(false);
      onProfileDeleted?.();
    } catch (err) {
      console.error("Gagal menghapus semua data:", err);
      alert("Terjadi kesalahan saat menghapus semua data anak.");
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <main className="relative w-full min-h-[100dvh] font-nunito flex flex-col bg-[#fff6e9] lg:bg-[linear-gradient(180deg,#bfe5f5_0%,#eaf7e0_100%)]">
      {/* Navbar — hanya desktop (HP pakai back button melayang, lihat bawah) */}
      <header className="hidden lg:flex bg-white h-14 items-center px-4 lg:px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
              <div className="w-full h-full transform scale-[0.12] origin-top-left -ml-1 -mt-1">
                <CiloKancil />
              </div>
            </div>
            <span className="font-black text-[#4a3728] text-lg tracking-tight">
              ReadiKids · Kelola
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-full font-black text-xs sm:text-sm transition-colors text-[#6b5a48] hover:text-[#4a3728] cursor-pointer bg-[#f3e9d7] hover:bg-[#e8dfce]"
            >
              ← Kembali ke Beranda
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-[1280px] w-full mx-auto px-4 py-6 lg:px-8 lg:py-8">

        {/* ═══════════════ HP (mengikuti mockup 66-38) ═══════════════ */}
        <div className="lg:hidden">
          {/* Back button melayang + judul */}
          <button
            type="button"
            onClick={onBack}
            aria-label="Kembali"
            className="w-11 h-11 rounded-full bg-white shadow-[0px_2px_8px_rgba(74,55,40,0.12)] flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
          >
            <span className="font-black text-2xl text-[#4a3728] leading-none -mt-0.5">←</span>
          </button>
          <h1 className="font-black text-[#4a3728] text-3xl mt-4">Kelola</h1>

          {/* ── ANAK ── */}
          <p className="font-black text-[#8a7a66] text-xs tracking-[0.12em] uppercase mt-6 mb-2">Anak</p>
          {loading ? (
            <div className="flex items-center gap-3 py-4">
              <div className="w-6 h-6 rounded-full border-4 border-[#cfe8d6] border-t-[#3e8e5a] animate-spin" />
              <span className="font-bold text-[#6b5a48]">Memuat…</span>
            </div>
          ) : profiles.length === 0 ? (
            <div className="bg-white rounded-2xl rk-sticker px-4 py-5 text-center">
              <p className="font-bold text-[#6b5a48] text-sm">Belum ada profil anak.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {profiles.map((p) => {
                const isActive = p.id === activeProfileId;
                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-2xl rk-sticker px-4 py-3 flex items-center gap-3 ${isActive ? "ring-2 ring-[#6dbb57]/50" : ""}`}
                  >
                    <span className="w-11 h-11 rounded-full bg-[#f3e2cf] flex items-center justify-center text-xl shrink-0" aria-hidden="true">🧒</span>
                    <p className="flex-1 min-w-0 font-black text-[#4a3728] text-base truncate">
                      {p.pseudonym} · {p.ageYears} th{isActive ? " · aktif" : ""}
                    </p>
                    {isActive ? (
                      <span className="text-[#3e8e5a] text-xl font-black shrink-0" aria-label="aktif">✓</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSwitchProfile?.(p.id)}
                        className="font-black text-[#3e8e5a] text-sm shrink-0 active:scale-95 transition-transform cursor-pointer"
                      >
                        pilih
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {onAddChild && (
            <button
              type="button"
              onClick={onAddChild}
              className="font-black text-[#3e8e5a] text-sm mt-3 active:scale-95 transition-transform cursor-pointer"
            >
              + tambah anak
            </button>
          )}

          {/* ── PREFERENSI ── */}
          <p className="font-black text-[#8a7a66] text-xs tracking-[0.12em] uppercase mt-7 mb-2">Preferensi</p>
          <div className="bg-white rounded-2xl rk-sticker px-4 py-3 flex items-center justify-between gap-3 min-h-[56px]">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-[#eaf3ff] text-[#2b5c8a] flex items-center justify-center text-[10px] font-black shrink-0">abc</span>
              <div>
                <p className="font-black text-[#4a3728] text-sm">font ramah disleksia</p>
                <p className="font-bold text-[#8a7a66] text-xs mt-0.5">segera hadir</p>
              </div>
            </div>
            {/* toggle non-aktif (placeholder — fitur belum dibuat) */}
            <span className="w-12 h-7 rounded-full bg-[#e0d7c6] relative shrink-0 opacity-70" aria-hidden="true">
              <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm" />
            </span>
          </div>

          {/* ── DATA & PRIVASI ── */}
          <p className="font-black text-[#8a7a66] text-xs tracking-[0.12em] uppercase mt-7 mb-2">Data &amp; Privasi</p>
          <button
            type="button"
            onClick={() => setConfirmDeleteAll(true)}
            disabled={profiles.length === 0 || deletingAll}
            className={`w-full text-left bg-[#fdece9] border-2 border-[#f3b5a8] rk-sticker-danger rounded-2xl px-4 py-3 flex items-center gap-3 transition-transform ${
              profiles.length === 0
                ? "opacity-50 cursor-not-allowed"
                : "active:scale-[0.99] hover:bg-[#fce4df] cursor-pointer"
            }`}
          >
            <span className="text-xl shrink-0" aria-hidden="true">🗑️</span>
            <div>
              <p className="font-black text-[#c0392b] text-sm">hapus semua data anak ini</p>
              <p className="font-bold text-[#a9776b] text-xs mt-0.5">permanen · hak penghapusan data</p>
            </div>
          </button>

          {confirmDeleteAll && (
            <div className="mt-2 bg-white rounded-2xl border-2 border-[#f3b5a8] p-4">
              <p className="font-black text-[#c0392b] text-sm">
                Hapus semua {profiles.length} profil beserta seluruh datanya?
              </p>
              <p className="font-bold text-[#6b5a48] text-xs mt-1">
                Tindakan permanen dan tidak dapat dibatalkan.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => void handleDeleteAll()}
                  disabled={deletingAll}
                  className="flex-1 rounded-full font-black py-2.5 text-sm bg-[#e84a4a] text-white active:scale-95 transition-transform cursor-pointer disabled:opacity-70"
                >
                  {deletingAll ? "Menghapus…" : "Ya, hapus semua"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAll(false)}
                  disabled={deletingAll}
                  className="flex-1 rounded-full font-bold py-2.5 text-sm bg-[#f3e9d7] text-[#6b5a48] active:scale-95 transition-transform cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════ DESKTOP/WEB (tidak diubah) ═══════════════ */}
        <div className="hidden lg:block">
          <div className="bg-white rounded-3xl shadow-[0px_8px_24px_rgba(74,55,40,0.08)] p-5 lg:p-8 max-w-2xl">
            <div className="mb-6">
              <h1 className="font-black text-[#4a3728] text-2xl">Hapus Data Anak</h1>
              <p className="font-bold text-[#6b5a48] text-sm mt-1">
                Data yang dihapus dari perangkat ini tidak dapat dikembalikan.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center gap-3 py-6">
                <div className="w-6 h-6 rounded-full border-4 border-[#cfe8d6] border-t-[#3e8e5a] animate-spin" />
                <span className="font-bold text-[#6b5a48]">Memuat profil…</span>
              </div>
            ) : profiles.length === 0 ? (
              <div className="bg-[#fff6e9] rounded-2xl p-6 text-center mb-6 border border-[#f3e9d7]">
                <span className="text-4xl block mb-2">🧒</span>
                <p className="font-bold text-[#6b5a48]">Belum ada profil anak.</p>
                <p className="text-sm text-[#8a7a66] mt-1">Tambahkan profil untuk memulai skrining pertama.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {profiles.map((p) => (
                  <li key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white border-2 border-[#f3e9d7] rounded-2xl p-4 transition-colors hover:border-[#cfe8d6] hover:bg-[#fafffb]">
                    <div className="flex-1 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#f3e9d7] flex items-center justify-center text-xl shrink-0">
                        🧒
                      </div>
                      <div>
                        <span className="block font-black text-[#4a3728] text-lg">{p.pseudonym}</span>
                        <span className="block font-bold text-[#6b5a48] text-sm">{p.ageYears} tahun</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:ml-auto shrink-0 self-end sm:self-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-[#f3e9d7] w-full sm:w-auto">
                      {confirmDeleteId === p.id ? (
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                          <button
                            className="px-4 py-2 text-xs font-black rounded-full bg-[#e84a4a] text-white hover:bg-[#d43737] transition-colors cursor-pointer"
                            onClick={() => void handleDelete(p.id)}
                          >
                            Hapus Data
                          </button>
                          <button
                            className="px-4 py-2 text-xs font-bold rounded-full bg-[#f3e9d7] text-[#6b5a48] hover:bg-[#e8dfce] transition-colors cursor-pointer"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          className="px-4 py-2 text-xs font-bold rounded-full text-[#a98f6f] hover:text-[#e84a4a] hover:bg-[#fff0f0] transition-colors cursor-pointer ml-auto"
                          title="Hapus profil & seluruh datanya"
                          onClick={() => setConfirmDeleteId(p.id)}
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Strip disclaimer — sama persis dengan Beranda (menempel di bawah) */}
      <footer className="bg-[#f3e9d7] py-3 px-4 lg:py-3.5 lg:px-6 shrink-0">
        <p className="font-bold text-[#6b5a48] text-center max-w-4xl mx-auto text-xs lg:text-[13px]">
          <span className="lg:hidden">Skrining awal · bukan alat diagnosis</span>
          <span className="hidden lg:inline">ReadiKids adalah skrining awal, bukan alat diagnosis — kepastian hanya dari profesional.</span>
        </p>
      </footer>
    </main>
  );
}
