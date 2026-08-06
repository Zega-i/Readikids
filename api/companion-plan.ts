/**
 * ReadiKids AI — Serverless proxy Rencana Pendampingan (Vercel Function).
 *
 * Kenapa ada: menyembunyikan API key AI di server (tidak pernah di browser).
 * Frontend mengirim METRIK AGREGAT saja (tanpa pseudonym / data mentah);
 * fungsi ini membangun prompt, memanggil Gemini (Google AI Studio), lalu
 * mengembalikan JSON rencana. Bila gagal, frontend jatuh ke template lokal.
 *
 * Provider: Google Gemini. Ganti model lewat env GEMINI_MODEL (mis. Flash =
 * gratis di free tier, ~1.500 req/hari, tanpa billing).
 *
 * Env (server-only, TANPA awalan VITE_):
 *   GEMINI_API_KEY  (wajib) — key dari aistudio.google.com (format baru "AQ.")
 *   GEMINI_MODEL    (opsional, default di bawah)
 */
// Tipe minimal request/response — didefinisikan LOKAL agar fungsi ini tidak
// bergantung pada paket `@vercel/node` saat build Vercel (menghindari error
// "Cannot find module"). Kompatibel secara struktural dengan yang dikirim Vercel.
type VercelReq = { method?: string; body?: unknown };
type VercelRes = { status: (code: number) => { json: (data: unknown) => void } };

// Akses env lewat globalThis tanpa mendeklarasikan global `process` — agar tak
// bentrok dengan @types/node bila ada, dan tetap jalan tanpa @types/node saat
// build Vercel. `process.env` tetap tersedia di runtime Node.
const ENV: Record<string, string | undefined> =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

// Gemini Flash umumnya cepat, tapi beri ruang aman untuk cold start / trafik.
export const maxDuration = 60;

const DEFAULT_MODEL = 'gemini-3.6-flash';

/** Endpoint Gemini generateContent untuk sebuah model. */
function geminiUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

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

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const apiKey = ENV.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY belum diset di server.' });
    return;
  }

  try {
    const body = req.body as PlanRequestBody;
    if (!body?.assessment || typeof body.ageYears !== 'number') {
      res.status(400).json({ error: 'Body tidak valid: butuh ageYears & assessment.' });
      return;
    }

    const model = ENV.GEMINI_MODEL || DEFAULT_MODEL;
    const upstream = await fetch(geminiUrl(model), {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(body) }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      res.status(502).json({ error: `Gemini ${upstream.status}: ${detail.slice(0, 300)}` });
      return;
    }

    const data = (await upstream.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
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
