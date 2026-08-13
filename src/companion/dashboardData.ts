/**
 * ReadiKids AI — Pembaca data nyata untuk Companion Mode (dari IndexedDB).
 *
 * Menggantikan data dummy di App.tsx. Semua bacaan bersumber dari Dexie
 * (local-first). Rencana pendampingan (plan) tidak disimpan mentah di DB,
 * jadi saat membuka hasil lama, plan dibangkitkan ulang dari assessment
 * tersimpan (Gemini bila ada key, jika tidak template lokal — deterministik).
 */
import { db } from '../telemetry/TelemetryDB';
import { generateCompanionPlan } from '../ml/llmRecommendation';
import type { CompanionPlanResult, RiskAssessment, SessionRecord } from '../types/telemetry';
import type { ScreeningResult } from './CompanionDashboard';
import type { BerandaData } from './BerandaPendamping';

/** Sesi milik satu anak yang sudah selesai, urut terlama -> terbaru. */
async function endedSessions(profileId: string): Promise<SessionRecord[]> {
  const rows = await db.sessions.where('childRef').equals(profileId).toArray();
  return rows
    .filter((s) => s.endedAt !== null)
    .sort((a, b) => (a.endedAt as number) - (b.endedAt as number));
}

/**
 * Rencana Pendampingan untuk satu sesi — SUMBER TUNGGAL misi & narasi.
 * Baca plan yang sudah tersimpan (dibuat SEKALI di akhir skrining) agar
 * konsisten di semua tampilan & lintas platform, dan indeks misi stabil.
 * Bila belum ada (sesi lama sebelum fitur ini), bangkitkan sekali lalu
 * simpan (backfill) untuk pemanggilan berikutnya.
 */
async function planForSession(
  sessionId: string,
  childRef: string,
  ageYears: number,
  assessment: RiskAssessment,
): Promise<CompanionPlanResult> {
  const stored = await db.companionPlans.get(sessionId);
  if (stored && stored.metricExplanations) {
    return {
      source: stored.source,
      generatedAt: stored.generatedAt,
      summary: stored.summary,
      companionActivities: stored.companionActivities,
      referralGuidance: stored.referralGuidance,
      metricExplanations: stored.metricExplanations,
      disclaimer: stored.disclaimer,
      ...(stored.aiUsage ? { aiUsage: stored.aiUsage } : {}),
    };
  }
  const plan = await generateCompanionPlan({ childRef, ageYears, assessment });
  try {
    await db.companionPlans.put({
      sessionId,
      childRef,
      source: plan.source,
      generatedAt: plan.generatedAt || Date.now(),
      summary: plan.summary,
      companionActivities: plan.companionActivities,
      referralGuidance: plan.referralGuidance,
      metricExplanations: plan.metricExplanations,
      disclaimer: plan.disclaimer,
      ...(plan.aiUsage ? { aiUsage: plan.aiUsage } : {}),
      updatedAt: Date.now(),
    });
  } catch {
    /* best-effort: simpan gagal tidak menggagalkan tampilan */
  }
  return plan;
}

/** Mengambil seluruh riwayat hasil skrining anak dari yang terbaru hingga terlama. */
export async function getAllScreeningResults(profileId: string): Promise<ScreeningResult[]> {
  const profile = await db.childProfiles.get(profileId);
  if (!profile) return [];

  const sessions = await endedSessions(profileId);
  if (sessions.length === 0) return [];

  // Kita balik urutannya agar terbaru di awal
  const reversedSessions = [...sessions].reverse();
  const results: ScreeningResult[] = [];

  for (const s of reversedSessions) {
    const assessment = await latestAssessmentForSession(s.id);
    if (!assessment) continue;

    // Pakai plan tersimpan (sumber tunggal) — konsisten dgn beranda & dashboard.
    const plan = await planForSession(s.id, profileId, profile.ageYears, assessment);

    results.push({
      sessionId: s.id,
      childName: profile.pseudonym,
      childAgeYears: profile.ageYears,
      startedAt: s.startedAt,
      endedAt: s.endedAt as number,
      assessment: {
        highestPhaseReached: assessment.highestPhaseReached,
        phaseAgeGap: assessment.phaseAgeGap,
        level: assessment.level,
        perPhase: assessment.perPhase,
      },
      plan: {
        source: plan.source,
        generatedAt: plan.generatedAt || Date.now(),
        summary: plan.summary,
        companionActivities: plan.companionActivities,
        referralGuidance: plan.referralGuidance,
        metricExplanations: plan.metricExplanations,
        disclaimer: plan.disclaimer,
        ...(plan.aiUsage ? { aiUsage: plan.aiUsage } : {}),
      },
    });
  }

  return results;
}

/** Penilaian terbaru untuk satu sesi (bila ada lebih dari satu). */
async function latestAssessmentForSession(
  sessionId: string,
): Promise<RiskAssessment | undefined> {
  const rows = await db.riskAssessments.where('sessionId').equals(sessionId).toArray();
  if (rows.length === 0) return undefined;
  return rows.sort((a, b) => b.createdAt - a.createdAt)[0];
}

/** Hasil skrining terakhir seorang anak (untuk W10 / CompanionDashboard). */
export async function getLatestScreeningResult(
  profileId: string,
): Promise<ScreeningResult | null> {
  const profile = await db.childProfiles.get(profileId);
  if (!profile) return null;

  const sessions = await endedSessions(profileId);
  const last = sessions[sessions.length - 1];
  if (!last) return null;

  const assessment = await latestAssessmentForSession(last.id);
  if (!assessment) return null;

  const plan = await planForSession(last.id, profileId, profile.ageYears, assessment);

  return {
    sessionId: last.id,
    childName: profile.pseudonym,
    childAgeYears: profile.ageYears,
    startedAt: last.startedAt,
    endedAt: last.endedAt as number,
    assessment: {
      highestPhaseReached: assessment.highestPhaseReached,
      phaseAgeGap: assessment.phaseAgeGap,
      level: assessment.level,
      perPhase: assessment.perPhase,
    },
    plan: {
      source: plan.source,
      generatedAt: plan.generatedAt || Date.now(),
      summary: plan.summary,
      companionActivities: plan.companionActivities,
      referralGuidance: plan.referralGuidance,
      metricExplanations: plan.metricExplanations,
      disclaimer: plan.disclaimer,
      ...(plan.aiUsage ? { aiUsage: plan.aiUsage } : {}),
    },
  };
}

/** Ringkasan Beranda Pendamping (jumlah sesi, cooldown, tren 3 terakhir). */
export async function getBerandaData(profileId: string): Promise<BerandaData> {
  const sessions = await endedSessions(profileId);
  const last = sessions[sessions.length - 1] ?? null;

  const recentSessions = await Promise.all(
    sessions.slice(-3).map(async (s) => {
      const a = await latestAssessmentForSession(s.id);
      return {
        sessionId: s.id,
        endedAt: s.endedAt as number,
        highestPhaseReached: a ? a.highestPhaseReached : 0,
        level: a ? a.level : ('LOW' as const),
      };
    }),
  );

  // Pratinjau cerita + misi rumah untuk Beranda — dari plan TERSIMPAN (sumber
  // tunggal), jadi identik dengan yang tampil di dashboard/riwayat & lintas
  // platform. Untuk sesi baru, plan sudah tersimpan di akhir skrining sehingga
  // tak ada panggilan jaringan di sini; sesi lama di-backfill sekali.
  let latestStorySummary: string | null = null;
  let homeMissions: string[] = [];
  if (last) {
    const a = await latestAssessmentForSession(last.id);
    if (a) {
      const plan = await planForSession(last.id, profileId, last.ageYears, a);
      latestStorySummary = plan.summary;
      homeMissions = plan.companionActivities;
    }
  }

  return {
    totalSessions: sessions.length,
    lastEndedAt: last ? (last.endedAt as number) : null,
    recentSessions,
    latestSessionId: last ? last.id : null,
    latestStorySummary,
    homeMissions,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MISI RUMAH — status selesai per anak per minggu (on-device)
// ═══════════════════════════════════════════════════════════════════════════

/** Kunci minggu ISO-8601, mis. "2026-W32". Senin = awal minggu. */
export function currentWeekKey(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Senin=0 … Minggu=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // ke Kamis minggu ini
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Indeks misi yang sudah ditandai selesai anak untuk minggu berjalan. */
export async function getWeeklyMissionDone(childRef: string): Promise<number[]> {
  const rec = await db.missionProgress.get(`${childRef}:${currentWeekKey()}`);
  return rec?.doneIndices ?? [];
}

/** Toggle satu misi (selesai/belum) untuk minggu berjalan; kembalikan daftar baru. */
export async function toggleWeeklyMission(
  childRef: string,
  index: number,
): Promise<number[]> {
  const weekKey = currentWeekKey();
  const id = `${childRef}:${weekKey}`;
  const rec = await db.missionProgress.get(id);
  const done = new Set<number>(rec?.doneIndices ?? []);
  if (done.has(index)) done.delete(index);
  else done.add(index);
  const doneIndices = [...done].sort((a, b) => a - b);
  await db.missionProgress.put({ id, childRef, weekKey, doneIndices, updatedAt: Date.now() });
  return doneIndices;
}
