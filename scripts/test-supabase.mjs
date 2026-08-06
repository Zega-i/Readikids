/**
 * Uji kesiapan Supabase — memverifikasi dua hal yang sering gagal diam-diam:
 *   1. Provider Anonymous auth AKTIF (default mati di dashboard).
 *   2. Skema (backend/schema.sql) sudah dijalankan → tabel children/sessions/assessments ada.
 *
 * Jalankan dari root proyek:
 *   node --env-file=.env scripts/test-supabase.mjs
 *
 * Membaca VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY dari .env.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('❌ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diisi di .env');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
let ok = true;

// ── 1) Anonymous auth ──────────────────────────────────────────────────────
console.log('→ Menguji Anonymous auth…');
const { data: authData, error: authErr } = await supabase.auth.signInAnonymously();
if (authErr) {
  ok = false;
  console.error('❌ Anonymous auth GAGAL:', authErr.message);
  console.error('   → Aktifkan: Supabase → Authentication → Providers → Anonymous → enable.');
} else {
  console.log('✅ Anonymous auth AKTIF. user id:', authData.user?.id);
}

// ── 2) Skema tabel ─────────────────────────────────────────────────────────
console.log('\n→ Menguji skema tabel…');
for (const t of ['children', 'sessions', 'assessments']) {
  const { error } = await supabase.from(t).select('id').limit(1);
  if (error) {
    ok = false;
    console.error(`❌ Tabel '${t}': ${error.message}`);
  } else {
    console.log(`✅ Tabel '${t}' ada & bisa di-query.`);
  }
}

console.log('\n' + (ok
  ? '🎉 Supabase SIAP: auth anonim aktif + skema lengkap.'
  : '⚠️  Ada yang belum siap — lihat pesan ❌ di atas. Jalankan backend/schema.sql di SQL Editor dan/atau aktifkan Anonymous auth, lalu ulangi.'));
process.exit(ok ? 0 : 2);
