/**
 * ReadiKids AI — Generator Rencana Pendampingan adaptif (Layer 3).
 *
 * Alur graceful degradation:
 *   1. Ada API key + online  → panggil proxy AI, parse JSON terstruktur.
 *   2. Gagal apa pun sebabnya → generateLocalCompanionPlan() (template offline).
 *
 * PRIVASI: prompt HANYA berisi profil per-fase agregat & level indikasi —
 * tidak pernah mengirim pseudonym anak atau data mentah telemetri.
 *
 * Arsitektur v2 (membaca): input = profil 5 fase; output = rencana
 * pendampingan berbahasa observasi yang HALUS (bukan diagnosis).
 *
 * KONSISTENSI: narasi (summary + metricExplanations + referralGuidance)
 * selalu deterministik dari hasil perhitungan — Gemini hanya memperkaya
 * kegiatan rumah, sehingga indikator ↔ kata-kata ↔ saran tidak pernah
 * bertentangan.
 */
import {
  buildDeterministicNarrative,
  FOLLOW_UP,
  generateLocalCompanionPlan,
  SCREENING_DISCLAIMER,
} from '../utils/fallbackTemplates';
import type {
  ChildProfileForPlan,
  CompanionPlanResult,
  MetricExplanations,
} from '../types/telemetry';

function proxyUrl(): string {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
  return env.VITE_AI_PROXY_URL || '/api/companion-plan';
}

/** Label ramah tiap fase untuk konteks prompt. */
const PHASE_LABEL: Record<number, string> = {
  0: 'fondasi arah & bentuk',
  1: 'mengenal huruf',
  2: 'huruf ke bunyi',
  3: 'kesadaran bunyi kata',
  4: 'merangkai suku kata',
};

/** Ringkasan agregat non-identitas untuk dikirim ke proxy / prompt. */
function assessmentDigest(profile: ChildProfileForPlan) {
  const a = profile.assessment;
  return {
    usiaTahun: profile.ageYears,
    faseTertinggiTercapai: a.highestPhaseReached,
    selisihFaseDenganUsia: a.phaseAgeGap,
    levelKeseluruhan: a.level,
    profilFase: [...a.perPhase]
      .sort((x, y) => x.phase - y.phase)
      .map((p) => ({
        fase: p.phase,
        area: PHASE_LABEL[p.phase],
        keandalan_0_100: p.reliability,
        tercapai: p.reached,
      })),
    catatanPendamping: profile.companionNotes ?? null,
  };
}

/** Prompt terstruktur — meminta output JSON agar mudah diparse. */
export function buildCompanionPlanPrompt(profile: ChildProfileForPlan): string {
  return [
    'Kamu adalah asisten pendampingan membaca anak untuk keluarga di Indonesia.',
    'Pembacamu adalah pendamping anak — orang tua, wali, guru, atau tutor;',
    'JANGAN berasumsi mereka punya latar belakang pendidikan formal.',
    'Berikut hasil SKRINING AWAL (bukan diagnosis) perkembangan membaca seorang anak,',
    'dinyatakan sebagai profil 5 tahap (fase 0 fondasi → fase 4 merangkai kata):',
    JSON.stringify(assessmentDigest(profile), null, 2),
    '',
    'Buat Rencana Pendampingan ringkas dalam Bahasa Indonesia sederhana dan HANGAT.',
    'Jawab HANYA dengan JSON valid berformat persis:',
    '{"summary": string, "companionActivities": string[], "referralGuidance": string[], "metricExplanations": {"fase-0": string, ...}}',
    'Ketentuan: summary maksimal 3 kalimat, bahasa observasi yang suportif',
    '(contoh: "anak tampak paling terbantu bila didampingi saat menghubungkan huruf dengan bunyi"',
    '— DILARANG memvonis seperti "anak Anda disleksia" atau menampilkan kategori rendah/sedang/tinggi);',
    'companionActivities 3-5 kegiatan rumah sederhana tanpa alat mahal & tanpa keahlian khusus,',
    'diutamakan untuk tahap yang paling perlu dukungan;',
    'referralGuidance 2-3 langkah tindak lanjut yang lembut & mudah diterima wali',
    '(mengobrol dengan guru, psikolog anak, atau layanan tumbuh kembang) sesuai level;',
    'jangan menyebut diagnosis, jangan menjanjikan hasil, hindari kata menakutkan.',
    'metricExplanations: objek berisi SATU kalimat observasi lembut per tahap yang dimainkan,',
    'kunci "fase-0" sampai "fase-4" (hanya fase yang ada di profil).',
  ].join('\n');
}

interface GeminiPlanPayload {
  summary: string;
  companionActivities: string[];
  referralGuidance: string[];
  metricExplanations: MetricExplanations;
  /** Opsional — token Gemini terpakai (diteruskan proxy untuk estimasi karbon). */
  aiUsage?: { promptTokens?: number; outputTokens?: number };
}

function isStringRecord(v: unknown): v is MetricExplanations {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.values(v as Record<string, unknown>).every((x) => typeof x === 'string')
  );
}

function isValidPlan(p: Partial<GeminiPlanPayload>): p is GeminiPlanPayload {
  return (
    typeof p.summary === 'string' &&
    Array.isArray(p.companionActivities) &&
    Array.isArray(p.referralGuidance) &&
    isStringRecord(p.metricExplanations)
  );
}

/** Parse respons LLM yang kadang terbungkus ```json ... ```. */
export function parseGeminiPlan(text: string): GeminiPlanPayload {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned) as Partial<GeminiPlanPayload>;
  if (!isValidPlan(parsed)) {
    throw new Error('Struktur JSON Rencana Pendampingan dari LLM tidak sesuai skema');
  }
  return parsed;
}

/**
 * Titik masuk utama pembuatan Rencana Pendampingan. Selalu berhasil
 * mengembalikan CompanionPlanResult (demo-safe): kegagalan apa pun jatuh ke
 * template lokal. PRIVASI: hanya profil fase agregat yang dikirim ke proxy.
 *
 * Konsistensi indikator ↔ narasi: summary, metricExplanations, dan
 * referralGuidance SELALU deterministik dari hasil perhitungan (level &
 * profil fase). Gemini HANYA memperkaya kegiatan rumah (companionActivities);
 * bila kosong, dipakai kegiatan template lokal. Ini menjamin indikator,
 * kata-kata, dan saran tidak pernah bertentangan — mis. level LOW tapi
 * narasi menyuruh didampingi intensif, atau sebaliknya.
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
      body: JSON.stringify(assessmentDigest(profile)),
    });
    if (!res.ok) throw new Error(`Proxy AI error: ${res.status}`);

    const payload = (await res.json()) as Partial<GeminiPlanPayload>;
    if (!isValidPlan(payload)) {
      throw new Error('Struktur JSON rencana dari proxy tidak sesuai skema');
    }

    // Narasi (summary + metricExplanations) SELALU deterministik dari level &
    // profil fase hasil perhitungan — tidak pernah dipercayakan ke LLM, agar
    // indikator ↔ kata-kata tidak pernah bertentangan. Gemini hanya memperkaya
    // kegiatan rumah; bila kosong → fallback kegiatan template lokal.
    const narrative = buildDeterministicNarrative(profile);
    const fallback = generateLocalCompanionPlan(profile);
    const llmActivities = (payload.companionActivities ?? []).filter(
      (x): x is string => typeof x === 'string' && x.trim().length > 0,
    );

    const usage = payload.aiUsage;
    return {
      source: 'gemini',
      generatedAt: Date.now(),
      summary: narrative.summary,
      companionActivities: llmActivities.length > 0 ? llmActivities : fallback.companionActivities,
      referralGuidance: FOLLOW_UP[profile.assessment.level],
      metricExplanations: narrative.metricExplanations,
      disclaimer: SCREENING_DISCLAIMER,
      ...(usage && usage.promptTokens != null
        ? { aiUsage: { promptTokens: usage.promptTokens, outputTokens: usage.outputTokens ?? 0 } }
        : {}),
    };
  } catch (err) {
    console.warn('[CompanionPlan] proxy AI gagal, fallback template lokal:', err);
    return generateLocalCompanionPlan(profile);
  }
}
