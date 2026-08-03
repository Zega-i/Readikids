# backend — Integrasi server & database (Supabase)

Kode integrasi Supabase + skema database, terpisah dari `src/` (frontend) dan
dari `api/` (serverless functions). File `.ts` di sini tetap dijalankan di
browser (klien Supabase), tapi dikelompokkan di sini karena semuanya urusan
server/DB — didaftarkan ke build lewat `tsconfig.app.json` (`include`).

> Catatan: `syncService.ts` meng-import tipe dari `../src/types/telemetry`.

## Isi

| File | Peran |
|------|-------|
| `supabaseClient.ts` | Instance klien Supabase. Local-first: `null` bila env kosong (app tetap jalan offline). |
| `auth.ts` | Autentikasi anonim (tanpa login) — `ensureAnonymousSession()`. |
| `syncService.ts` | Push/pull agregat (profil, sesi, hasil) Dexie ↔ server. |
| `schema.sql` | Skema database + Row Level Security. Jalankan di Supabase → SQL Editor. |

## Aktivasi (sekali)

1. Isi `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` di `.env` (lihat `.env.example`).
2. Supabase → SQL Editor → tempel isi `schema.sql` → Run.
3. Supabase → Authentication → Providers → Anonymous → aktifkan.

Prinsip: hanya data agregat yang naik ke server; event mentah 60fps tetap di device.

## Terkait

Proxy AI serverless ada di `api/` (root) — itu backend sungguhan (berjalan di
server Vercel, memegang API key). Folder ini adalah "jembatan" aplikasi ke
Supabase.
