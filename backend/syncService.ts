/**
 * ReadiKids AI — syncService: jembatan Dexie (device) -> Supabase (server).
 *
 * LOCAL-FIRST: device tetap sumber utama. Fungsi di sini mendorong (push)
 * salinan agregat ke server; kegagalan apa pun TIDAK boleh menggagalkan alur
 * lokal (semua mengembalikan SyncResult, tak melempar error ke UI).
 *
 * Yang disync (sesuai keputusan scope): profil anak (pseudonym+umur),
 * metadata sesi, dan hasil penilaian. Event mentah 60fps TIDAK disync.
 *
 * Catatan: belum diwire ke alur game. Ini lapisan mandiri yang bisa diuji &
 * dipanggil terpisah; integrasi ke akhir sesi (mis. di W9/finishSession)
 * adalah langkah berikutnya.
 */
import { supabase } from './supabaseClient';
import { ensureAnonymousSession } from './auth';
import type {
  ChildProfile,
  CompanionPlanResult,
  RiskAssessment,
  SessionRecord,
} from '../src/types/telemetry';

export interface SyncResult {
  ok: boolean;
  /** Terisi bila gagal — pesan singkat untuk log/diagnostik. */
  error?: string;
}

const NOT_READY: SyncResult = { ok: false, error: 'Supabase belum dikonfigurasi.' };

/** Pastikan klien ada + sesi anonim aktif sebelum operasi tulis. */
async function ready(): Promise<boolean> {
  if (!supabase) return false;
  const uid = await ensureAnonymousSession();
  return uid !== null;
}

/** Push/replace satu profil anak. owner_id diisi otomatis oleh Postgres. */
export async function pushChildProfile(p: ChildProfile): Promise<SyncResult> {
  if (!supabase) return NOT_READY;
  if (!(await ready())) return { ok: false, error: 'Sesi anonim gagal dibuat.' };

  const { error } = await supabase.from('children').upsert(
    {
      id: p.id,
      pseudonym: p.pseudonym,
      age_years: p.ageYears,
      created_at: p.createdAt,
    },
    { onConflict: 'id' },
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Hapus profil anak dari server (soft/hard delete tergantung setting Supabase). */
export async function deleteChildProfileSync(childId: string): Promise<SyncResult> {
  if (!supabase) return NOT_READY;
  if (!(await ready())) return { ok: false, error: 'Sesi anonim gagal dibuat.' };

  const { error } = await supabase.from('children').delete().eq('id', childId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Push/replace satu metadata sesi. */
export async function pushSession(s: SessionRecord): Promise<SyncResult> {
  if (!supabase) return NOT_READY;
  if (!(await ready())) return { ok: false, error: 'Sesi anonim gagal dibuat.' };

  const { error } = await supabase.from('sessions').upsert(
    {
      id: s.id,
      child_ref: s.childRef,
      age_years: s.ageYears,
      started_at: s.startedAt,
      ended_at: s.endedAt,
      skills: s.skills,
      cooldown_override_reason: s.cooldownOverrideReason ?? null,
    },
    { onConflict: 'id' },
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Push/replace satu hasil penilaian (unik per sesi). Bila `plan` disertakan,
 * kolom rencana (misi/narasi) ikut disimpan agar konsisten lintas perangkat.
 */
export async function pushAssessment(
  a: RiskAssessment,
  plan?: CompanionPlanResult,
): Promise<SyncResult> {
  if (!supabase) return NOT_READY;
  if (!(await ready())) return { ok: false, error: 'Sesi anonim gagal dibuat.' };

  const { error } = await supabase.from('assessments').upsert(
    {
      session_id: a.sessionId,
      child_ref: a.childRef,
      age_years: a.ageYears,
      level: a.level,
      highest_phase_reached: a.highestPhaseReached,
      phase_age_gap: a.phaseAgeGap,
      per_phase: a.perPhase,
      created_at: a.createdAt,
      // Kolom rencana (opsional) — lihat backend/schema.sql.
      ...(plan
        ? {
            plan_source: plan.source,
            summary: plan.summary,
            companion_activities: plan.companionActivities,
            referral_guidance: plan.referralGuidance,
            metric_explanations: plan.metricExplanations,
          }
        : {}),
    },
    { onConflict: 'session_id' },
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Push satu hasil sesi utuh (profil + sesi + penilaian) berurutan.
 * Berhenti di kegagalan pertama dan mengembalikannya.
 */
export async function pushSessionResult(args: {
  child: ChildProfile;
  session: SessionRecord;
  assessment: RiskAssessment;
  /** Rencana pendampingan (opsional) — bila ada, kolom misi/narasi ikut naik. */
  plan?: CompanionPlanResult;
}): Promise<SyncResult> {
  const child = await pushChildProfile(args.child);
  if (!child.ok) return child;
  const session = await pushSession(args.session);
  if (!session.ok) return session;
  return pushAssessment(args.assessment, args.plan);
}

/** Tarik daftar profil anak milik pengguna ini dari server. */
export async function pullChildProfiles(): Promise<ChildProfile[]> {
  if (!supabase) return [];
  if (!(await ready())) return [];

  const { data, error } = await supabase
    .from('children')
    .select('id, pseudonym, age_years, created_at')
    .order('created_at', { ascending: true });

  if (error || !data) {
    if (error) console.warn('[sync] pullChildProfiles gagal:', error.message);
    return [];
  }
  return data.map(
    (row): ChildProfile => ({
      id: row.id as string,
      pseudonym: row.pseudonym as string,
      ageYears: row.age_years as number,
      createdAt: row.created_at as number,
    }),
  );
}
