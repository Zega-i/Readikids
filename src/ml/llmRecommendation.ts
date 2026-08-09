/**
 * ReadiKids AI — Generator Rencana Pendampingan adaptif (Layer 3).
 *
 * Alur graceful degradation:
 *   1. Ada API key + online  → panggil Gemini API, parse JSON terstruktur.
 *   2. Gagal apa pun sebabnya → generateLocalCompanionPlan() (template offline).
 *
 * PRIVASI: prompt HANYA berisi metrik agregat & level indikasi —
 * tidak pernah mengirim pseudonym anak atau data mentah telemetri.
 *
 * v4.0: output untuk PENDAMPING GENERIK — saran aktivitas pendampingan
 * + panduan langkah rujukan (bukan lagi rekomendasi guru/IEP).
 */
import {
  generateLocalCompanionPlan,
  SCREENING_DISCLAIMER,
} from '../utils/fallbackTemplates';
import type { ChildProfileForPlan, CompanionPlanResult } from '../types/telemetry';

/**
 * URL proxy AI serverless (menyembunyikan API key di server).
 * Default same-origin '/api/companion-plan'; bisa dioverride via
 * VITE_AI_PROXY_URL bila perlu (mis. saat dev pakai origin lain).
 */
function proxyUrl(): string {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
  return env.VITE_AI_PROXY_URL || '/api/companion-plan';
}

/** Prompt terstruktur — meminta output JSON agar mudah diparse. */
export function buildCompanionPlanPrompt(profile: ChildProfileForPlan): string {
  const { assessment, ageYears, companionNotes } = profile;
  return [
    'Kamu adalah asisten pendampingan belajar anak untuk keluarga di Indonesia.',
    'Pembacamu adalah pendamping anak — bisa orang tua, wali, guru, atau tutor;',
    'JANGAN berasumsi mereka punya latar belakang pendidikan formal.',
    'Berikut hasil SKRINING AWAL (bukan diagnosis) seorang anak:',
    JSON.stringify(
      {
        usiaTahun: ageYears,
        skorKompositIndikasi_0_100: assessment.compositeScore,
        levelKeseluruhan: assessment.level,
        indikasiDisleksia: assessment.domains.dyslexia,
        indikasiDiskalkulia: assessment.domains.dyscalculia,
        rincianSkor: assessment.breakdown,
        metrikAgregat: {
          hesitationIndex:
            assessment.metrics.totalTimeMs > 0
              ? +(assessment.metrics.hesitationMs / assessment.metrics.totalTimeMs).toFixed(3)
              : 0,
          reversalRatio:
            assessment.metrics.normalLatencyMs > 0
              ? +(
                  assessment.metrics.reversalLatencyMs / assessment.metrics.normalLatencyMs
                ).toFixed(2)
              : null,
          nleePercent: assessment.metrics.nleePercent,
          akurasi: +assessment.metrics.accuracy.toFixed(2),
        },
        catatanPendamping: companionNotes ?? null,
      },
      null,
      2,
    ),
    '',
    'Buat Rencana Pendampingan ringkas dalam Bahasa Indonesia sederhana.',
    'Jawab HANYA dengan JSON valid berformat persis:',
    '{"summary": string, "companionActivities": string[], "referralGuidance": string[], "metricExplanations": {"hi": string, "rr": string, "nlee": string}}',
    'Ketentuan: summary maksimal 3 kalimat, bahasa observasi yang suportif',
    '(contoh: "ditemukan pola yang sebaiknya diamati" — BUKAN vonis seperti "anak Anda disleksia");',
    'companionActivities 3-5 aktivitas pendampingan sederhana yang bisa dilakukan',
    'di rumah tanpa alat mahal dan tanpa keahlian khusus;',
    'referralGuidance 2-3 langkah konkret kapan & ke mana mencari bantuan profesional',
    '(psikolog anak, puskesmas, klinik tumbuh kembang) sesuai level indikasi;',
    'jangan menyebut diagnosis medis, jangan menjanjikan hasil, gunakan istilah "indikasi".',
    'Untuk metricExplanations, berikan SATU kalimat analisis singkat per metrik (hi=Jeda ragu, rr=Huruf cermin, nlee=Estimasi angka) ',
    'yang menjelaskan mengapa metrik tersebut rendah/sedang/tinggi, WAJIB menyertakan angka aktual dari metrikAgregat dalam kalimat tersebut.'
  ].join('\n');
}

interface GeminiPlanPayload {
  summary: string;
  companionActivities: string[];
  referralGuidance: string[];
  metricExplanations: {
    hi: string;
    rr: string;
    nlee: string;
  };
}

/** Parse respons Gemini yang kadang terbungkus ```json ... ```. */
export function parseGeminiPlan(text: string): GeminiPlanPayload {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned) as Partial<GeminiPlanPayload>;
  if (
    typeof parsed.summary !== 'string' ||
    !Array.isArray(parsed.companionActivities) ||
    !Array.isArray(parsed.referralGuidance) ||
    typeof parsed.metricExplanations !== 'object' ||
    parsed.metricExplanations === null ||
    typeof (parsed.metricExplanations as any).hi !== 'string' ||
    typeof (parsed.metricExplanations as any).rr !== 'string' ||
    typeof (parsed.metricExplanations as any).nlee !== 'string'
  ) {
    throw new Error('Struktur JSON Rencana Pendampingan dari LLM tidak sesuai skema');
  }
  return parsed as GeminiPlanPayload;
}

/**
 * Titik masuk utama pembuatan Rencana Pendampingan.
 * Selalu berhasil mengembalikan CompanionPlanResult — tidak pernah
 * melempar error ke UI (demo-safe): kegagalan apa pun jatuh ke template lokal.
 *
 * Alur: kirim METRIK AGREGAT ke serverless proxy (key AI aman di server) ->
 * proxy memanggil LLM -> balas JSON rencana. Offline / proxy tak tersedia /
 * error apa pun -> template lokal.
 */
export async function generateCompanionPlan(
  profile: ChildProfileForPlan,
): Promise<CompanionPlanResult> {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (offline) return generateLocalCompanionPlan(profile);

  try {
    const res = await fetch(proxyUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // PRIVASI: hanya metrik agregat + level; tanpa pseudonym / childRef / data mentah.
      body: JSON.stringify({
        ageYears: profile.ageYears,
        assessment: {
          compositeScore: profile.assessment.compositeScore,
          level: profile.assessment.level,
          domains: profile.assessment.domains,
          breakdown: profile.assessment.breakdown,
          metrics: profile.assessment.metrics,
        },
        companionNotes: profile.companionNotes ?? null,
      }),
    });
    if (!res.ok) throw new Error(`Proxy AI error: ${res.status}`);

    const payload = (await res.json()) as Partial<GeminiPlanPayload>;
    if (
      typeof payload.summary !== 'string' ||
      !Array.isArray(payload.companionActivities) ||
      !Array.isArray(payload.referralGuidance) ||
      typeof payload.metricExplanations !== 'object' ||
      payload.metricExplanations === null ||
      typeof (payload.metricExplanations as any).hi !== 'string' ||
      typeof (payload.metricExplanations as any).rr !== 'string' ||
      typeof (payload.metricExplanations as any).nlee !== 'string'
    ) {
      throw new Error('Struktur JSON rencana dari proxy tidak sesuai skema');
    }

    return {
      source: 'gemini',
      generatedAt: Date.now(),
      summary: payload.summary,
      companionActivities: payload.companionActivities,
      referralGuidance: payload.referralGuidance,
      metricExplanations: payload.metricExplanations as { hi: string; rr: string; nlee: string },
      disclaimer: SCREENING_DISCLAIMER,
    };
  } catch (err) {
    console.warn('[CompanionPlan] proxy AI gagal, fallback template lokal:', err);
    return generateLocalCompanionPlan(profile);
  }
}
