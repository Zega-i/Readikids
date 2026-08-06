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
import type { RiskAssessment, SessionRecord } from '../types/telemetry';
import type { ScreeningResult } from './CompanionDashboard';
import type { BerandaData } from './BerandaPendamping';

/** Sesi milik satu anak yang sudah selesai, urut terlama -> terbaru. */
async function endedSessions(profileId: string): Promise<SessionRecord[]> {
  const rows = await db.sessions.where('childRef').equals(profileId).toArray();
  return rows
    .filter((s) => s.endedAt !== null)
    .sort((a, b) => (a.endedAt as number) - (b.endedAt as number));
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

    // Untuk riwayat massal, kita *generate* plan secara deterministik/lokal
    // (fallback) untuk menghemat waktu dan memori jika menggunakan Gemini.
    const plan = await generateCompanionPlan({
      childRef: profileId,
      ageYears: profile.ageYears,
      assessment,
    });

    results.push({
      sessionId: s.id,
      childName: profile.pseudonym,
      childAgeYears: profile.ageYears,
      startedAt: s.startedAt,
      endedAt: s.endedAt as number,
      assessment: {
        compositeScore: assessment.compositeScore,
        level: assessment.level,
        breakdown: assessment.breakdown,
        domains: assessment.domains,
        metrics: assessment.metrics,
      },
      plan: {
        source: plan.source,
        generatedAt: plan.generatedAt || Date.now(),
        summary: plan.summary,
        companionActivities: plan.companionActivities,
        referralGuidance: plan.referralGuidance,
        disclaimer: plan.disclaimer,
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

  const plan = await generateCompanionPlan({
    childRef: profileId,
    ageYears: profile.ageYears,
    assessment,
  });

  return {
    sessionId: last.id,
    childName: profile.pseudonym,
    childAgeYears: profile.ageYears,
    startedAt: last.startedAt,
    endedAt: last.endedAt as number,
    assessment: {
      compositeScore: assessment.compositeScore,
      level: assessment.level,
      breakdown: assessment.breakdown,
      domains: assessment.domains,
      metrics: assessment.metrics,
    },
    plan: {
      source: plan.source,
      generatedAt: plan.generatedAt || Date.now(),
      summary: plan.summary,
      companionActivities: plan.companionActivities,
      referralGuidance: plan.referralGuidance,
      disclaimer: plan.disclaimer,
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
        domains: a ? a.domains : { dyslexia: 'LOW' as const, dyscalculia: 'LOW' as const },
      };
    }),
  );

  return {
    totalSessions: sessions.length,
    lastEndedAt: last ? (last.endedAt as number) : null,
    recentSessions,
    latestSessionId: last ? last.id : null,
  };
}
