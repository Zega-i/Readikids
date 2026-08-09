-- ReadiKids AI — Skema database server (Supabase / Postgres).
--
-- Cara pakai: buka dashboard Supabase -> SQL Editor -> tempel isi file ini
-- -> Run. Aman dijalankan ulang (idempoten) berkat IF NOT EXISTS / drop policy.
--
-- Prinsip (sesuai blueprint Tier 2):
--   * Hanya AGREGAT yang naik ke server: profil anak (pseudonym+umur),
--     metadata sesi, dan hasil penilaian. Event mentah 60fps TETAP di device.
--   * Privasi: tanpa nama asli anak (hanya pseudonym).
--   * Isolasi: Row Level Security — tiap pengguna hanya melihat datanya sendiri.
--   * Field waktu epoch aplikasi disimpan sebagai bigint (milidetik) agar
--     cocok 1:1 dengan tipe `number` di TypeScript, tanpa konversi timezone.

-- ── Tabel: children (profil anak) ─────────────────────────────────────────
create table if not exists public.children (
  id          uuid primary key,
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pseudonym   text not null check (char_length(pseudonym) between 1 and 30),
  age_years   int  not null check (age_years between 6 and 9),
  created_at  bigint not null
);
create index if not exists children_owner_idx on public.children (owner_id);

-- ── Tabel: sessions (metadata sesi bermain) ───────────────────────────────
create table if not exists public.sessions (
  id                       uuid primary key,
  owner_id                 uuid not null default auth.uid() references auth.users (id) on delete cascade,
  child_ref                uuid not null references public.children (id) on delete cascade,
  age_years                int  not null,
  started_at               bigint not null,
  ended_at                 bigint,
  games                    text[] not null default '{}',
  cooldown_override_reason text
);
create index if not exists sessions_owner_idx on public.sessions (owner_id);
create index if not exists sessions_child_idx on public.sessions (child_ref);

-- ── Tabel: assessments (hasil penilaian risiko per sesi) ──────────────────
create table if not exists public.assessments (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id      uuid not null unique references public.sessions (id) on delete cascade,
  child_ref       uuid not null references public.children (id) on delete cascade,
  composite_score int  not null,
  level           text not null check (level in ('LOW','MEDIUM','HIGH')),
  breakdown       jsonb not null,   -- { reversalScore, hesitationScore, nleeScore }
  domains         jsonb not null,   -- { dyslexia, dyscalculia }
  metrics         jsonb not null,   -- TelemetryMetrics agregat
  created_at      bigint not null
);
create index if not exists assessments_owner_idx on public.assessments (owner_id);

-- Kolom Rencana Pendampingan (misi rumah & narasi) — disimpan bersama hasil
-- agar konsisten lintas tampilan & perangkat. Ditambah terpisah agar aman
-- dijalankan ulang pada tabel `assessments` yang sudah ada.
alter table public.assessments add column if not exists plan_source          text;
alter table public.assessments add column if not exists summary              text;
alter table public.assessments add column if not exists companion_activities jsonb;
alter table public.assessments add column if not exists referral_guidance    jsonb;
alter table public.assessments add column if not exists metric_explanations  jsonb;

-- ── Row Level Security: tiap pengguna hanya datanya sendiri ───────────────
alter table public.children    enable row level security;
alter table public.sessions    enable row level security;
alter table public.assessments enable row level security;

-- children
drop policy if exists children_rw on public.children;
create policy children_rw on public.children
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- sessions
drop policy if exists sessions_rw on public.sessions;
create policy sessions_rw on public.sessions
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- assessments
drop policy if exists assessments_rw on public.assessments;
create policy assessments_rw on public.assessments
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
