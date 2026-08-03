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

interface ChildProfileManagerProps {
  onSelect: (profile: ChildProfile) => void;
  onAddChild: () => void;
  /** Bertambah setiap kali profil baru dibuat — memicu reload daftar. */
  refreshKey: number;
}

export default function ChildProfileManager({
  onSelect,
  onAddChild,
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

  useEffect(() => {
    setLoading(true);
    void listChildProfiles()
      .then(setProfiles)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const handleDelete = async (id: string) => {
    await deleteChildProfile(id);
    setProfiles((ps) => ps.filter((p) => p.id !== id));
    setConfirmDeleteId(null);
  };

  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow p-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Pilih anak</h2>
        <p className="text-sm text-slate-500">
          Data setiap anak tersimpan terpisah di perangkat ini.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Memuat profil…</p>
      ) : profiles.length === 0 ? (
        <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3">
          Belum ada profil anak. Tambahkan profil untuk memulai skrining pertama.
        </p>
      ) : (
        <ul className="space-y-2">
          {profiles.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <button
                className="flex-1 text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50"
                onClick={() => onSelect(p)}
              >
                <span className="font-semibold text-slate-800">{p.pseudonym}</span>
                <span className="text-sm text-slate-500"> · {p.ageYears} tahun</span>
              </button>
              {confirmDeleteId === p.id ? (
                <span className="flex gap-1">
                  <button
                    className="px-2 py-1 text-xs rounded bg-red-600 text-white"
                    onClick={() => void handleDelete(p.id)}
                  >
                    Hapus semua data
                  </button>
                  <button
                    className="px-2 py-1 text-xs rounded bg-slate-100 text-slate-600"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Batal
                  </button>
                </span>
              ) : (
                <button
                  className="px-2 py-1 text-xs rounded text-slate-400 hover:text-red-600"
                  title="Hapus profil & seluruh datanya"
                  onClick={() => setConfirmDeleteId(p.id)}
                >
                  Hapus
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        className="w-full px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white"
        onClick={onAddChild}
      >
        + Tambah profil anak
      </button>

      <div className="pt-1 border-t border-slate-100">
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
          className="w-full px-4 py-2 rounded-lg text-sm border border-slate-300 text-slate-600 hover:bg-slate-50"
          onClick={() => fileInputRef.current?.click()}
        >
          ⬆ Impor data anak dari file (.json)
        </button>
        {importError && (
          <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
            {importError}
          </p>
        )}
      </div>
    </div>
  );
}
