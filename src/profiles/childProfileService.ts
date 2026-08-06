/**
 * ReadiKids AI — Service manajemen profil anak (multi-profil, on-device).
 *
 * Satu pendamping dapat mengelola ≥1 profil anak pada satu perangkat.
 * Pembuatan profil MEWAJIBKAN consent eksplisit orang tua/wali dan
 * usia dalam rentang 6–9 tahun (ditolak di luar itu).
 */
import { db, deleteChildData } from '../telemetry/TelemetryDB';
import { validateAgeYears, validatePseudonym, checkRescreeningCooldown } from './profileRules';
import type { CooldownCheck } from './profileRules';
import type { ChildProfile } from '../types/telemetry';
import { deleteChildProfileSync } from '../../backend/syncService';

export interface CreateChildProfileInput {
  pseudonym: string;
  ageYears: number;
  /** Harus true — bukti consent orang tua/wali dari ConsentFlow. */
  consentGiven: boolean;
}

/**
 * Buat profil anak baru. Melempar Error dengan pesan Bahasa Indonesia
 * bila validasi gagal — UI menampilkan pesannya apa adanya.
 */
export async function createChildProfile(input: CreateChildProfileInput): Promise<ChildProfile> {
  if (!input.consentGiven) {
    throw new Error('Persetujuan orang tua/wali diperlukan sebelum membuat profil anak.');
  }
  const age = validateAgeYears(input.ageYears);
  if (!age.valid) throw new Error(age.reason ?? 'Usia tidak valid.');
  const name = validatePseudonym(input.pseudonym);
  if (!name.valid) throw new Error(name.reason ?? 'Nama panggilan tidak valid.');

  const now = Date.now();
  const profile: ChildProfile = {
    id: crypto.randomUUID(),
    pseudonym: input.pseudonym.trim(),
    ageYears: input.ageYears,
    createdAt: now,
  };
  await db.childProfiles.add(profile);
  return profile;
}

/** Seluruh profil anak pada perangkat ini, terlama lebih dulu. */
export async function listChildProfiles(): Promise<ChildProfile[]> {
  return db.childProfiles.orderBy('createdAt').toArray();
}

export async function getChildProfile(id: string): Promise<ChildProfile | undefined> {
  return db.childProfiles.get(id);
}

/** Hapus profil beserta SELURUH data skriningnya (hak penghapusan). */
export async function deleteChildProfile(id: string): Promise<void> {
  // Hapus dari Supabase lebih dulu (best-effort)
  try {
    await deleteChildProfileSync(id);
  } catch (err) {
    console.warn('[sync] Gagal menghapus profil dari server:', err);
  }
  // Tetap hapus dari lokal apa pun yang terjadi di atas
  await deleteChildData(id);
}

/**
 * Cek cooldown skrining ulang untuk satu anak berdasarkan sesi
 * terakhirnya di DB. Soft-block — keputusan akhir tetap di pendamping.
 */
export async function checkChildCooldown(childRef: string): Promise<CooldownCheck> {
  const sessions = await db.sessions.where('childRef').equals(childRef).sortBy('startedAt');
  const last = sessions.length > 0 ? sessions[sessions.length - 1].startedAt : null;
  return checkRescreeningCooldown(last, Date.now());
}
