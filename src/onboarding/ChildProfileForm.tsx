/**
 * Form pembuatan profil anak (pseudonym + usia 6–9).
 * Validasi memakai profileRules; pesan error ditampilkan apa adanya.
 */
import { useState } from 'react';
import { createChildProfile } from '../profiles/childProfileService';
import { AGE_MAX, AGE_MIN, type ChildProfile } from '../types/telemetry';

interface ChildProfileFormProps {
  onCreated: (profile: ChildProfile) => void;
  onCancel: () => void;
}

export default function ChildProfileForm({ onCreated, onCancel }: ChildProfileFormProps) {
  const [pseudonym, setPseudonym] = useState('');
  const [ageYears, setAgeYears] = useState<number>(7);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      // consentGiven: true — form ini hanya bisa dicapai setelah ConsentFlow.
      const profile = await createChildProfile({ pseudonym, ageYears, consentGiven: true });
      onCreated(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat profil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow p-6 space-y-4">
      <h2 className="text-xl font-bold text-slate-800">Profil anak</h2>
      <p className="text-sm text-slate-500">
        Gunakan nama panggilan saja — jangan nama lengkap.
      </p>

      <div className="space-y-3">
        <label className="block text-sm">
          <span className="text-slate-700">Nama panggilan</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={pseudonym}
            onChange={(e) => setPseudonym(e.target.value)}
            placeholder="mis. Adik, Kiko, A."
            maxLength={30}
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-700">Usia (tahun)</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
            value={ageYears}
            onChange={(e) => setAgeYears(Number(e.target.value))}
          >
            {Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => AGE_MIN + i).map((age) => (
              <option key={age} value={age}>
                {age} tahun
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-slate-400">
          ReadiKids dirancang untuk anak {AGE_MIN}–{AGE_MAX} tahun. Di luar rentang itu hasil
          skrining tidak dapat diandalkan.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
          {error}
        </p>
      )}

      <div className="flex gap-2 justify-end">
        <button
          className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
          onClick={onCancel}
        >
          Batal
        </button>
        <button
          className="px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white disabled:opacity-40"
          disabled={saving || pseudonym.trim().length === 0}
          onClick={() => void submit()}
        >
          Simpan profil
        </button>
      </div>
    </div>
  );
}
