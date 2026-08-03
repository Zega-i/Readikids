/**
 * ReadiKids AI — Autentikasi anonim (tanpa login email/password).
 *
 * Saat pertama kali dibuka, perangkat otomatis mendapat akun anonim di
 * Supabase (tanpa form). Identitasnya bertahan di perangkat ini berkat
 * persistSession, sehingga data anak yang tersimpan di server selalu
 * terikat ke pemilik yang sama — dan Row Level Security memastikan tiap
 * perangkat hanya bisa mengakses datanya sendiri.
 *
 * Keterbatasan yang disengaja (Level 2 tahap awal): identitas terikat
 * perangkat. Sync lintas perangkat / pemulihan menyusul lewat "upgrade
 * akun" (menautkan email/Google ke akun anonim yang sama) — belum di sini.
 */
import { supabase } from './supabaseClient';

/**
 * Pastikan ada sesi aktif; buat sesi anonim bila belum ada.
 * @returns user id (uuid) bila berhasil, atau null bila Supabase tak siap.
 */
export async function ensureAnonymousSession(): Promise<string | null> {
  if (!supabase) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) return session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    // Penyebab tersering: provider Anonymous belum diaktifkan di dashboard.
    console.warn('[auth] Sign-in anonim gagal:', error.message);
    return null;
  }
  return data.user?.id ?? null;
}

/** Id pengguna saat ini tanpa membuat sesi baru; null bila belum ada. */
export async function getCurrentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
