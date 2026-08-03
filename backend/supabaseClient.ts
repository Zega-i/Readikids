/**
 * ReadiKids AI — Klien Supabase (backend online, opsional).
 *
 * Filosofi tetap LOCAL-FIRST: IndexedDB adalah sumber data utama; Supabase
 * hanya "cermin" untuk cadangan & akses lintas perangkat. Bila env Supabase
 * belum diisi, `supabase` bernilai null dan seluruh lapisan sync jadi no-op —
 * aplikasi tetap berfungsi penuh offline (sama seperti fallback Gemini).
 *
 * Kunci yang dipakai di sini WAJIB publishable/anon key (aman di browser).
 * Secret key TIDAK PERNAH diimpor di frontend.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env =
  (import.meta as unknown as { env?: Record<string, string> }).env ?? {};

const url = env.VITE_SUPABASE_URL ?? '';
const anonKey = env.VITE_SUPABASE_ANON_KEY ?? '';

/** true bila kredensial Supabase tersedia — dipakai UI untuk fitur bersyarat. */
export const isSupabaseConfigured: boolean = Boolean(url && anonKey);

/**
 * Instance tunggal klien. null bila belum dikonfigurasi (mode offline murni).
 * Sesi disimpan agar identitas anonim bertahan antar kunjungan di perangkat ini.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
