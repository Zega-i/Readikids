/**
 * ReadiKids AI — Serverless proxy Rencana Pendampingan (Vercel Function).
 *
 * Kenapa ada: menyembunyikan API key AI di server (tidak pernah di browser).
 * Frontend mengirim METRIK AGREGAT saja (tanpa pseudonym / data mentah);
 * fungsi ini membangun prompt, memanggil OpenRouter (OpenAI-compatible),
 * lalu mengembalikan JSON rencana. Bila gagal, frontend jatuh ke template lokal.
 *
 * Provider netral: cukup ganti OPENROUTER_MODEL / endpoint untuk pindah model.
 * Default model: NVIDIA Nemotron 3 Ultra (gratis) di OpenRouter.
 *
 * Env (server-only, TANPA awalan VITE_):
 *   OPENROUTER_API_KEY  (wajib)
 *   OPENROUTER_MODEL    (opsional, default di bawah)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';

interface Assessment {
  compositeScore: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  domains: { dyslexia: string; dyscalculia: string };
  breakdown: { reversalScore: number; hesitationScore: number; nleeScore: number };
  metrics: {
    normalLatencyMs: number;
    reversalLatencyMs: number;
    hesitationMs: number;
    totalTimeMs: number;
    nleePercent: number | null;
    accuracy: number;
  };
}

interface PlanRequestBody {
  ageYears: number;
  assessment: Assessment;
  companionNotes?: string | null;
}

/** Bangun prompt terstruktur (Bahasa Indonesia, bahasa observasi, output JSON). */
function buildPrompt(body: PlanRequestBody): string {
  const { assessment: a, ageYears, companionNotes } = body;
  const hesitationIndex =
    a.metrics.totalTimeMs > 0 ? +(a.metrics.hesitationMs / a.metrics.totalTimeMs).toFixed(3) : 0;
  const reversalRatio =
    a.metrics.normalLatencyMs > 0
      ? +(a.metrics.reversalLatencyMs / a.metrics.normalLatencyMs).toFixed(2)
      : null;

  return [
    'Kamu adalah asisten pendampingan belajar anak untuk keluarga di Indonesia.',
    'Pembacamu adalah pendamping anak (orang tua, wali, guru, atau tutor);',
    'JANGAN berasumsi mereka punya latar belakang pendidikan formal.',
    'Berikut hasil SKRINING AWAL (bukan diagnosis) seorang anak:',
    JSON.stringify(
      {
        usiaTahun: ageYears,
        skorKompositIndikasi_0_100: a.compositeScore,
        levelKeseluruhan: a.level,
        indikasiDisleksia: a.domains.dyslexia,
        indikasiDiskalkulia: a.domains.dyscalculia,
        rincianSkor: a.breakdown,
        metrikAgregat: {
          hesitationIndex,
          reversalRatio,
          nleePercent: a.metrics.nleePercent,
          akurasi: +a.metrics.accuracy.toFixed(2),
        },
        catatanPendamping: companionNotes ?? null,
      },
      null,
      2,
    ),
    '',
    'Buat Rencana Pendampingan ringkas dalam Bahasa Indonesia sederhana.',
    'Jawab HANYA dengan JSON valid berformat persis:',
    '{"summary": string, "companionActivities": string[], "referralGuidance": string[]}',
    'Ketentuan: summary maksimal 3 kalimat, bahasa observasi yang suportif',
    '(contoh: "ditemukan pola yang sebaiknya diamati" — BUKAN vonis seperti "anak Anda disleksia");',
    'companionActivities 3-5 aktivitas pendampingan sederhana tanpa alat mahal;',
    'referralGuidance 2-3 langkah konkret kapan & ke mana mencari bantuan profesional',
    'sesuai level indikasi; gunakan istilah "indikasi", jangan menyebut diagnosis medis,',
    'jangan menjanjikan hasil.',
  ].join('\n');
}

function isValidPlan(p: unknown): p is {
  summary: string;
  companionActivities: string[];
  referralGuidance: string[];
} {
  const x = p as Record<string, unknown>;
  return (
    !!x &&
    typeof x.summary === 'string' &&
    Array.isArray(x.companionActivities) &&
    Array.isArray(x.referralGuidance)
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENROUTER_API_KEY belum diset di server.' });
    return;
  }

  try {
    const body = req.body as PlanRequestBody;
    if (!body?.assessment || typeof body.ageYears !== 'number') {
      res.status(400).json({ error: 'Body tidak valid: butuh ageYears & assessment.' });
      return;
    }

    const upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'ReadiKids',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
        messages: [{ role: 'user', content: buildPrompt(body) }],
        temperature: 0.4,
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      res.status(502).json({ error: `OpenRouter ${upstream.status}: ${detail.slice(0, 200)}` });
      return;
    }

    const data = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      res.status(502).json({ error: 'Respons model kosong.' });
      return;
    }

    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned) as unknown;
    if (!isValidPlan(parsed)) {
      res.status(502).json({ error: 'Struktur JSON rencana dari model tidak sesuai.' });
      return;
    }

    res.status(200).json({
      summary: parsed.summary,
      companionActivities: parsed.companionActivities,
      referralGuidance: parsed.referralGuidance,
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
