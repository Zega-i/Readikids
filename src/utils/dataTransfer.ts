/**
 * ReadiKids AI — Ekspor/Impor data anak (Tier 1.5, tanpa server).
 *
 * Kebutuhan: memindahkan data antar perangkat (mis. dari HP orang tua
 * ke laptop untuk dibawa konsultasi, atau rekap oleh instansi) TANPA
 * backend — lewat file JSON yang diekspor/diimpor manual.
 *
 * Privasi: file hanya berisi pseudonym + data perilaku; event mentah
 * frekuensi tinggi TIDAK diikutkan (tidak diperlukan penerima, dan
 * membuat file membengkak).
 *
 * Saat impor, SEMUA ID dibuat ulang (profil & sesi) agar tidak pernah
 * bertabrakan dengan data yang sudah ada di perangkat tujuan.
 */
import { db } from '../telemetry/TelemetryDB';
import type {
  ChildProfile,
  RiskAssessment,
  SessionRecord,
  TrialRecord,
} from '../types/telemetry';

export const EXPORT_FORMAT = 'readikids-child-export';
export const EXPORT_VERSION = 1;

export interface ChildDataExport {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: number;
  profile: ChildProfile;
  sessions: SessionRecord[];
  trials: TrialRecord[];
  assessments: RiskAssessment[];
}

/** Rakit paket ekspor dari objek-objek data (pure — mudah diuji). */
export function buildChildExport(
  profile: ChildProfile,
  sessions: SessionRecord[],
  trials: TrialRecord[],
  assessments: RiskAssessment[],
): ChildDataExport {
  // Buang primary key auto-increment agar bersih saat diimpor kembali.
  const strip = <T extends { id?: number }>(rows: T[]): T[] =>
    rows.map(({ id: _id, ...rest }) => rest as T);
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    profile,
    sessions,
    trials: strip(trials),
    assessments: strip(assessments),
  };
}

/**
 * Validasi & parse isi file impor. Melempar Error berpesan Bahasa
 * Indonesia bila file bukan ekspor ReadiKids yang valid.
 */
export function parseChildExport(jsonText: string): ChildDataExport {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    throw new Error('File tidak dapat dibaca — bukan berkas JSON yang valid.');
  }
  const data = raw as Partial<ChildDataExport>;
  if (data.format !== EXPORT_FORMAT) {
    throw new Error('File ini bukan berkas ekspor data anak ReadiKids.');
  }
  if (typeof data.version !== 'number' || data.version > EXPORT_VERSION) {
    throw new Error(
      'Berkas dibuat oleh versi aplikasi yang lebih baru. Perbarui aplikasi ini terlebih dahulu.',
    );
  }
  const p = data.profile;
  if (
    !p ||
    typeof p.pseudonym !== 'string' ||
    typeof p.ageYears !== 'number' ||
    typeof p.createdAt !== 'number'
  ) {
    throw new Error('Berkas rusak: profil anak tidak lengkap.');
  }
  if (
    !Array.isArray(data.sessions) ||
    !Array.isArray(data.trials) ||
    !Array.isArray(data.assessments)
  ) {
    throw new Error('Berkas rusak: data sesi/trial/penilaian tidak lengkap.');
  }
  return data as ChildDataExport;
}

/**
 * Buat ulang seluruh ID pada paket impor (pure — mudah diuji).
 * @param makeId pembuat UUID (default crypto.randomUUID)
 */
export function remapExportIds(
  data: ChildDataExport,
  makeId: () => string = () => crypto.randomUUID(),
): ChildDataExport {
  const newChildId = makeId();
  const sessionIdMap = new Map<string, string>();
  for (const s of data.sessions) sessionIdMap.set(s.id, makeId());
  const mapSession = (oldId: string): string => sessionIdMap.get(oldId) ?? oldId;

  return {
    ...data,
    profile: { ...data.profile, id: newChildId },
    sessions: data.sessions.map((s) => ({
      ...s,
      id: mapSession(s.id),
      childRef: newChildId,
    })),
    trials: data.trials.map((t) => ({ ...t, sessionId: mapSession(t.sessionId) })),
    assessments: data.assessments.map((a) => ({
      ...a,
      sessionId: mapSession(a.sessionId),
      childRef: newChildId,
    })),
  };
}

// ——— Operasi database ———

/** Kumpulkan seluruh data satu anak dari DB menjadi paket ekspor. */
export async function exportChildData(childRef: string): Promise<ChildDataExport> {
  const profile = await db.childProfiles.get(childRef);
  if (!profile) throw new Error('Profil anak tidak ditemukan.');
  const sessions = await db.sessions.where('childRef').equals(childRef).toArray();
  const sessionIds = sessions.map((s) => s.id);
  const trials = await db.trials.where('sessionId').anyOf(sessionIds).toArray();
  const assessments = await db.riskAssessments.where('childRef').equals(childRef).toArray();
  return buildChildExport(profile, sessions, trials, assessments);
}

/**
 * Impor paket ke DB perangkat ini sebagai profil BARU (ID di-remap).
 * Mengembalikan profil hasil impor.
 */
export async function importChildData(data: ChildDataExport): Promise<ChildProfile> {
  const remapped = remapExportIds(data);
  await db.transaction(
    'rw',
    [db.childProfiles, db.sessions, db.trials, db.riskAssessments],
    async () => {
      await db.childProfiles.add(remapped.profile);
      if (remapped.sessions.length > 0) await db.sessions.bulkAdd(remapped.sessions);
      if (remapped.trials.length > 0) await db.trials.bulkAdd(remapped.trials);
      if (remapped.assessments.length > 0) await db.riskAssessments.bulkAdd(remapped.assessments);
    },
  );
  return remapped.profile;
}

// ——— Utilitas file di browser ———

/** Unduh paket ekspor sebagai file .json. */
export function downloadChildExport(data: ChildDataExport): void {
  const safeName = data.profile.pseudonym.replace(/[^a-zA-Z0-9-]/g, '_');
  const date = new Date(data.exportedAt).toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `readikids-data-${safeName}-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Baca file pilihan pengguna sebagai teks. */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsText(file);
  });
}
