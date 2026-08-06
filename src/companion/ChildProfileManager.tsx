/**
 * Manajemen multi-profil anak (Companion Mode).
 * Satu perangkat keluarga dapat menyimpan beberapa profil anak;
 * seluruh data tiap anak terisolasi lewat childRef.
 */
import { useEffect, useRef, useState } from 'react';
import { deleteChildProfile, listChildProfiles } from '../profiles/childProfileService';
import {
  importChildData,
  parseChildExport,
  readFileAsText,
} from '../utils/dataTransfer';
import type { ChildProfile } from '../types/telemetry';
import { CiloKancil } from '../components/CiloKancil';

interface ChildProfileManagerProps {
  onSelect: (profile: ChildProfile) => void;
  onAddChild: () => void;
  /** Fungsi callback untuk tombol kembali ke beranda pendamping */
  onBack?: () => void;
  /** Bertambah setiap kali profil baru dibuat — memicu reload daftar. */
  refreshKey: number;
}

export default function ChildProfileManager({
  onSelect,
  onAddChild,
  onBack,
  refreshKey,
}: ChildProfileManagerProps) {
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportFile = async (file: File): Promise<void> => {
    setImportError(null);
    try {
      const data = parseChildExport(await readFileAsText(file));
      const imported = await importChildData(data);
      setProfiles((ps) => [...ps, imported]);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Gagal mengimpor file.');
    }
  };

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
    await deleteChildProfile(id);
    refreshProfileList();
    setConfirmDeleteId(null);
  };

  return (
    <main className="relative w-full min-h-[100dvh] font-nunito bg-[linear-gradient(180deg,#bfe5f5_0%,#eaf7e0_100%)] flex flex-col">
      {/* Navbar */}
      <header className="bg-white h-14 flex items-center px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
              <div className="w-full h-full transform scale-[0.12] origin-top-left -ml-1 -mt-1">
                <CiloKancil />
              </div>
            </div>
            <span className="font-black text-[#4a3728] text-lg tracking-tight">ReadiKids · Kelola</span>
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
      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-8">
        <div className="bg-white rounded-3xl shadow-[0px_8px_24px_rgba(74,55,40,0.08)] p-8">
          <div className="mb-6">
            <h1 className="font-black text-[#4a3728] text-2xl">Pilih Anak</h1>
            <p className="font-bold text-[#6b5a48] text-sm mt-1">
              Data setiap anak tersimpan terpisah di perangkat ini.
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
            <ul className="space-y-3 mb-6">
              {profiles.map((p) => (
                <li key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white border-2 border-[#f3e9d7] rounded-2xl p-4 transition-colors hover:border-[#cfe8d6] hover:bg-[#fafffb]">
                  <button
                    className="flex-1 text-left flex items-center gap-3 cursor-pointer group"
                    onClick={() => onSelect(p)}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#f3e9d7] flex items-center justify-center text-xl shrink-0 group-hover:bg-[#cfe8d6] transition-colors">
                      🧒
                    </div>
                    <div>
                      <span className="block font-black text-[#4a3728] text-lg">{p.pseudonym}</span>
                      <span className="block font-bold text-[#6b5a48] text-sm">{p.ageYears} tahun</span>
                    </div>
                  </button>

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

          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t-2 border-[#f3e9d7]">
            <button
              className="flex-1 px-6 py-4 rounded-2xl font-black text-white text-base bg-[#6dbb57] hover:bg-[#5da549] transition-transform active:scale-95 cursor-pointer shadow-md"
              onClick={onAddChild}
            >
              + Tambah Profil Anak
            </button>

            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportFile(file);
                  e.target.value = ''; // izinkan memilih file yang sama lagi
                }}
              />
              <button
                className="w-full h-full px-6 py-4 rounded-2xl font-bold text-[#6b5a48] text-base border-2 border-[#e8dfce] bg-white hover:bg-[#f7f2e8] transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                ⬆ Impor Data (.json)
              </button>
            </div>
          </div>

          {importError && (
            <div className="mt-4 bg-[#fff0f0] border-2 border-[#ffcaca] rounded-2xl p-4">
              <p className="text-sm font-bold text-[#d43737]">
                {importError}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
