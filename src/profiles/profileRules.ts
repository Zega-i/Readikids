/**
 * ReadiKids AI — Aturan murni profil anak & re-screening cooldown.
 *
 * Dipisah dari service database agar dapat diuji di Node tanpa
 * IndexedDB, dan agar UI dapat memvalidasi tanpa menyentuh DB.
 * (Blueprint v4.0 Bab 11: batas usia 6–9 & cooldown 2–4 minggu.)
 */
import { AGE_MAX, AGE_MIN } from '../types/telemetry';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Interval minimal yang disarankan sebelum skrining ulang (soft-block). */
export const COOLDOWN_MIN_DAYS = 14;
/** Interval ideal skrining ulang. */
export const COOLDOWN_RECOMMENDED_DAYS = 28;

export interface AgeValidation {
  valid: boolean;
  /** Pesan untuk pendamping bila tidak valid (Bahasa Indonesia). */
  reason: string | null;
}

/** Validasi usia anak; aplikasi menolak profil di luar 6–9 tahun. */
export function validateAgeYears(ageYears: number): AgeValidation {
  if (!Number.isInteger(ageYears)) {
    return { valid: false, reason: 'Usia harus berupa bilangan bulat (tahun).' };
  }
  if (ageYears < AGE_MIN) {
    return {
      valid: false,
      reason:
        `ReadiKids dirancang untuk anak ${AGE_MIN}–${AGE_MAX} tahun. Pada usia di bawah ` +
        `${AGE_MIN} tahun, kemampuan pra-baca anak masih sangat bervariasi sehingga hasil ` +
        'skrining berisiko keliru (false positive).',
    };
  }
  if (ageYears > AGE_MAX) {
    return {
      valid: false,
      reason:
        `ReadiKids dirancang untuk anak ${AGE_MIN}–${AGE_MAX} tahun. Untuk anak di atas ` +
        `${AGE_MAX} tahun, sebaiknya langsung berkonsultasi dengan psikolog anak atau ` +
        'profesional tumbuh kembang.',
    };
  }
  return { valid: true, reason: null };
}

export interface PseudonymValidation {
  valid: boolean;
  reason: string | null;
}

/** Validasi ringan pseudonym (nama panggilan) — cukup non-kosong & wajar. */
export function validatePseudonym(pseudonym: string): PseudonymValidation {
  const trimmed = pseudonym.trim();
  if (trimmed.length === 0) {
    return { valid: false, reason: 'Nama panggilan tidak boleh kosong.' };
  }
  if (trimmed.length > 30) {
    return { valid: false, reason: 'Nama panggilan maksimal 30 karakter.' };
  }
  return { valid: true, reason: null };
}

export interface CooldownCheck {
  /** true bila anak masih dalam masa cooldown (perlu soft-block). */
  inCooldown: boolean;
  /** Hari sejak sesi skrining terakhir; null bila belum pernah skrining. */
  daysSinceLast: number | null;
  /** Sisa hari sampai cooldown minimal terlewati (0 bila sudah lewat). */
  daysRemaining: number;
  /** Pesan penjelasan untuk pendamping (selalu terisi bila inCooldown). */
  message: string | null;
}

/**
 * Cek cooldown skrining ulang.
 *
 * Soft-block: bila inCooldown, UI menampilkan peringatan + penjelasan,
 * namun pendamping dapat melanjutkan dengan mengisi alasan (mis. sesi
 * sebelumnya terputus). Alasan disimpan di SessionRecord.cooldownOverrideReason.
 *
 * @param lastSessionStartedAt epoch ms sesi terakhir anak; null bila belum ada
 * @param now                  epoch ms saat ini
 */
export function checkRescreeningCooldown(
  lastSessionStartedAt: number | null,
  now: number,
): CooldownCheck {
  if (lastSessionStartedAt === null) {
    return { inCooldown: false, daysSinceLast: null, daysRemaining: 0, message: null };
  }
  const daysSinceLast = Math.floor((now - lastSessionStartedAt) / DAY_MS);
  if (daysSinceLast >= COOLDOWN_MIN_DAYS) {
    return { inCooldown: false, daysSinceLast, daysRemaining: 0, message: null };
  }
  const daysRemaining = COOLDOWN_MIN_DAYS - daysSinceLast;
  return {
    inCooldown: true,
    daysSinceLast,
    daysRemaining,
    message:
      `Skrining terakhir anak ini baru ${daysSinceLast} hari yang lalu. ` +
      `Kami menyarankan menunggu minimal ${COOLDOWN_MIN_DAYS}–${COOLDOWN_RECOMMENDED_DAYS} hari ` +
      'antar skrining: pengulangan terlalu cepat membuat anak hafal soal (hasil tampak lebih baik ' +
      'dari kenyataan) atau jenuh (hasil tampak lebih buruk dari kenyataan). ' +
      'Lanjutkan hanya bila sesi sebelumnya tidak valid, misalnya terputus di tengah jalan.',
  };
}
