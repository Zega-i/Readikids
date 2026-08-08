/**
 * ReadiKids AI — Skema database lokal (Dexie.js / IndexedDB).
 *
 * Prinsip Privacy by Design:
 * - Seluruh data perilaku tersimpan on-device (perangkat pendamping).
 * - Tidak ada nama asli anak: profil memakai pseudonym (ChildProfile).
 * - Tidak ada sinkronisasi server (di luar scope v4.0).
 *
 * Riwayat skema:
 * - v1: sessions/events/trials/riskAssessments dengan field `studentRef`
 *   dan `grade` (scope lama: sekolah).
 * - v2 (scope v4.0): rename studentRef→childRef, grade→ageYears,
 *   tambah tabel `childProfiles`. Data lama dimigrasi otomatis.
 */
import Dexie, { type Table } from 'dexie';
import type {
  ChildProfile,
  MissionProgress,
  RiskAssessment,
  SessionRecord,
  StoredCompanionPlan,
  TelemetryEvent,
  TrialRecord,
} from '../types/telemetry';

export class ReadiKidsDB extends Dexie {
  /** Profil anak (pseudonym + usia) yang dikelola pendamping. */
  childProfiles!: Table<ChildProfile, string>;
  /** Metadata sesi bermain. */
  sessions!: Table<SessionRecord, string>;
  /** Event mentah frekuensi tinggi (batch write). */
  events!: Table<TelemetryEvent, number>;
  /** Hasil per-trial — unit analisis MetricCalculator. */
  trials!: Table<TrialRecord, number>;
  /** Hasil penilaian risiko per sesi. */
  riskAssessments!: Table<RiskAssessment, number>;
  /** Status penyelesaian misi rumah per anak per minggu. */
  missionProgress!: Table<MissionProgress, string>;
  /** Rencana Pendampingan tersimpan (1 per sesi) — sumber misi & narasi. */
  companionPlans!: Table<StoredCompanionPlan, string>;

  constructor() {
    super('readikids');
    this.version(1).stores({
      // Hanya kolom yang di-index yang perlu dideklarasikan di sini.
      sessions: 'id, studentRef, startedAt',
      events: '++id, sessionId, [sessionId+gameId], t',
      trials: '++id, sessionId, [sessionId+gameId], completedAt',
      riskAssessments: '++id, sessionId, studentRef, createdAt',
    });

    this.version(2)
      .stores({
        childProfiles: 'id, createdAt',
        sessions: 'id, childRef, startedAt',
        events: '++id, sessionId, [sessionId+gameId], t',
        trials: '++id, sessionId, [sessionId+gameId], completedAt',
        riskAssessments: '++id, sessionId, childRef, createdAt',
      })
      .upgrade(async (tx) => {
        // Data v1 memakai studentRef/grade. Perangkat lama harus tetap
        // bisa membaca riwayatnya, jadi field di-rename in-place.
        // Estimasi usia dari kelas: kelas 1≈6 th, 2≈7 th, 3≈8 th.
        await tx
          .table('sessions')
          .toCollection()
          .modify((s: Record<string, unknown>) => {
            if (s.childRef === undefined) s.childRef = s.studentRef;
            if (s.ageYears === undefined && typeof s.grade === 'number') {
              s.ageYears = 5 + s.grade;
            }
            delete s.studentRef;
            delete s.grade;
          });
        await tx
          .table('riskAssessments')
          .toCollection()
          .modify((a: Record<string, unknown>) => {
            if (a.childRef === undefined) a.childRef = a.studentRef;
            delete a.studentRef;
          });
      });

    // v3: tabel baru `missionProgress` untuk melacak "misi rumah minggu ini".
    // Tabel baru & kosong — tidak perlu upgrade() migrasi data lama.
    this.version(3).stores({
      missionProgress: 'id, childRef, weekKey',
    });

    // v4: tabel baru `companionPlans` — plan disimpan sekali agar misi/narasi
    // konsisten di semua tampilan & lintas platform. Tabel baru → tanpa upgrade().
    this.version(4).stores({
      companionPlans: 'sessionId, childRef',
    });
  }
}

/** Instance tunggal database — impor dari sini di seluruh aplikasi. */
export const db = new ReadiKidsDB();

/**
 * Hapus seluruh jejak data satu anak (hak penghapusan / GDPR-style):
 * sesi, event mentah, trial, penilaian risiko, dan profilnya.
 */
export async function deleteChildData(childRef: string): Promise<void> {
  const sessions = await db.sessions.where('childRef').equals(childRef).toArray();
  const sessionIds = sessions.map((s) => s.id);
  await db.transaction(
    'rw',
    [db.sessions, db.events, db.trials, db.riskAssessments, db.childProfiles, db.missionProgress, db.companionPlans],
    async () => {
      if (sessionIds.length > 0) {
        await db.events.where('sessionId').anyOf(sessionIds).delete();
        await db.trials.where('sessionId').anyOf(sessionIds).delete();
      }
      await db.riskAssessments.where('childRef').equals(childRef).delete();
      await db.companionPlans.where('childRef').equals(childRef).delete();
      await db.missionProgress.where('childRef').equals(childRef).delete();
      await db.sessions.where('childRef').equals(childRef).delete();
      await db.childProfiles.delete(childRef);
    },
  );
}
