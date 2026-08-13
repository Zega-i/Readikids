/**
 * ReadiKids AI — Silent Telemetry Logger.
 *
 * Merekam event interaksi frekuensi tinggi (hingga 60 fps) tanpa
 * membebani render React:
 * - Event ditampung di buffer in-memory (bukan state React).
 * - Ditulis batch ke IndexedDB tiap BATCH_SIZE event ATAU tiap
 *   FLUSH_INTERVAL_MS, mana yang lebih dulu.
 * - `flush()` dipanggil paksa saat trial/sesi berakhir agar tidak
 *   ada data hilang.
 *
 * Kelas ini framework-agnostic (tanpa import React) sehingga bisa
 * dipakai dari game engine Canvas maupun diuji di Node.
 */
import type { Table } from 'dexie';
import type {
  SessionRecord,
  TelemetryEvent,
  TelemetryEventType,
  TrialContext,
  TrialRecord,
} from '../types/telemetry';

/** Kontrak minimal penyimpanan — memudahkan mock saat testing. */
export interface TelemetryStore {
  sessions: Pick<Table<SessionRecord, string>, 'put' | 'update'>;
  events: Pick<Table<TelemetryEvent, number>, 'bulkAdd'>;
  trials: Pick<Table<TrialRecord, number>, 'add'>;
}

const BATCH_SIZE = 60; // ~1 detik data pada 60 fps
const FLUSH_INTERVAL_MS = 1000;

export interface TelemetryLoggerOptions {
  /** Sumber waktu — default performance.now (bisa di-mock saat test). */
  now?: () => number;
}

export class TelemetryLogger {
  private buffer: TelemetryEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private sessionId: string | null = null;
  private sessionStartT = 0;
  private readonly now: () => number;

  constructor(
    private readonly store: TelemetryStore,
    options: TelemetryLoggerOptions = {},
  ) {
    this.now =
      options.now ??
      (typeof performance !== 'undefined' ? () => performance.now() : () => Date.now());
  }

  /** Mulai sesi baru; membuat SessionRecord dan menyalakan auto-flush. */
  async startSession(session: Omit<SessionRecord, 'startedAt' | 'endedAt'>): Promise<string> {
    if (this.sessionId) {
      await this.endSession();
    }
    this.sessionId = session.id;
    this.sessionStartT = this.now();
    await this.store.sessions.put({
      ...session,
      startedAt: Date.now(),
      endedAt: null,
    });
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, FLUSH_INTERVAL_MS);
    this.log('session_start', null);
    return session.id;
  }

  /**
   * Catat satu event. Aman dipanggil dari loop 60 fps.
   * `ctx` = konteks skill/mekanik; null untuk event level-sesi.
   */
  log(
    type: TelemetryEventType,
    ctx: TrialContext | null,
    payload?: Record<string, unknown>,
  ): void {
    if (!this.sessionId) return; // sesi belum dimulai — abaikan diam-diam
    this.buffer.push({
      sessionId: this.sessionId,
      skillId: ctx?.skillId ?? null,
      mechanicId: ctx?.mechanicId ?? null,
      phase: ctx?.phase ?? null,
      trialIndex: ctx?.trialIndex ?? -1,
      type,
      t: this.now() - this.sessionStartT,
      payload,
    });
    if (this.buffer.length >= BATCH_SIZE) {
      void this.flush();
    }
  }

  /** Simpan hasil akhir satu trial (dipanggil GameEngine saat soal selesai). */
  async logTrial(trial: Omit<TrialRecord, 'id' | 'sessionId' | 'completedAt'>): Promise<void> {
    if (!this.sessionId) return;
    await this.flush(); // pastikan event mentah trial ini tersimpan dulu
    await this.store.trials.add({
      ...trial,
      sessionId: this.sessionId,
      completedAt: Date.now(),
    });
  }

  /** Tulis isi buffer ke IndexedDB dalam satu transaksi bulk. */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer;
    this.buffer = [];
    try {
      await this.store.events.bulkAdd(batch);
    } catch (err) {
      // Kembalikan ke buffer agar dicoba lagi pada flush berikutnya.
      this.buffer = batch.concat(this.buffer);
      console.error('[TelemetryLogger] flush gagal:', err);
    }
  }

  /** Akhiri sesi: flush terakhir + tutup SessionRecord. */
  async endSession(): Promise<void> {
    if (!this.sessionId) return;
    this.log('session_end', null);
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
    await this.store.sessions.update(this.sessionId, { endedAt: Date.now() });
    this.sessionId = null;
  }

  get activeSessionId(): string | null {
    return this.sessionId;
  }
}
