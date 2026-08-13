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
type VercelRes = {
  status: (code: number) => { json: (data: unknown) => void };
  setHeader: (name: string, value: string) => void;
};

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

// Arsitektur v2 (membaca): body = profil per-fase agregat (tanpa identitas).
// Cocok dengan assessmentDigest() di src/ml/llmRecommendation.ts.
interface PhaseProfile {
  fase: number;
  area: string;
  keandalan_0_100: number;
  tercapai: boolean;
}

interface PlanRequestBody {
  usiaTahun: number;
  faseTertinggiTercapai: number;
  selisihFaseDenganUsia: number;
  levelKeseluruhan: 'LOW' | 'MEDIUM' | 'HIGH';
  profilFase: PhaseProfile[];
  catatanPendamping?: string | null;
}

/** Bangun prompt terstruktur (Bahasa Indonesia, bahasa observasi, output JSON). */
function buildPrompt(body: PlanRequestBody): string {
  return [
    'Kamu adalah asisten pendampingan membaca anak untuk keluarga di Indonesia.',
    'Pembacamu adalah pendamping anak (orang tua, wali, guru, atau tutor);',
    'JANGAN berasumsi mereka punya latar belakang pendidikan formal.',
    'Berikut hasil SKRINING AWAL (bukan diagnosis) perkembangan membaca seorang anak,',
    'dinyatakan sebagai profil 5 tahap (fase 0 fondasi -> fase 4 merangkai kata):',
    JSON.stringify(body, null, 2),
    '',
    'Buat Rencana Pendampingan ringkas dalam Bahasa Indonesia sederhana dan HANGAT.',
    'Jawab HANYA dengan JSON valid berformat persis:',
    '{"summary": string, "companionActivities": string[], "referralGuidance": string[], "metricExplanations": {"fase-0": string, ...}}',
    'Ketentuan: summary maksimal 3 kalimat, bahasa observasi yang suportif',
    '(contoh: "anak tampak paling terbantu bila didampingi saat menghubungkan huruf dengan bunyi"',
    '- DILARANG memvonis seperti "anak Anda disleksia" atau menampilkan kategori rendah/sedang/tinggi);',
    'companionActivities 3-5 kegiatan rumah sederhana tanpa alat mahal & tanpa keahlian khusus,',
    'diutamakan untuk tahap yang paling perlu dukungan;',
    'referralGuidance 2-3 langkah tindak lanjut yang lembut & mudah diterima wali',
    '(mengobrol dengan guru, psikolog anak, atau layanan tumbuh kembang) sesuai level;',
    'jangan menyebut diagnosis, jangan menjanjikan hasil, hindari kata menakutkan dan angka mentah.',
    'metricExplanations: objek berisi SATU kalimat observasi lembut per tahap yang dimainkan,',
    'kunci "fase-0" sampai "fase-4" (hanya fase yang ada di profilFase).',
  ].join('\n');
}

function isStringRecord(v: unknown): v is Record<string, string> {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.values(v as Record<string, unknown>).every((x) => typeof x === 'string')
  );
}

function isValidPlan(p: unknown): p is {
  summary: string;
  companionActivities: string[];
  referralGuidance: string[];
  metricExplanations: Record<string, string>;
} {
  const x = p as Record<string, unknown>;
  return (
    !!x &&
    typeof x.summary === 'string' &&
    Array.isArray(x.companionActivities) &&
    Array.isArray(x.referralGuidance) &&
    isStringRecord(x.metricExplanations)
  );
}

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  // CORS: izinkan panggilan lintas-origin dari APK (WebView Capacitor memakai
  // origin https://localhost) maupun origin lain. Endpoint hanya menerima
  // metrik agregat tanpa kredensial/cookie, sehingga '*' aman.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).json({});
    return;
  }
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
    if (!Array.isArray(body?.profilFase) || typeof body.usiaTahun !== 'number') {
      res.status(400).json({ error: 'Body tidak valid: butuh usiaTahun & profilFase.' });
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
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
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

    // Teruskan pemakaian token nyata (usageMetadata Gemini) ke frontend —
    // dipakai untuk estimasi jejak karbon sesi (data nyata, bukan tebakan).
    const um = data.usageMetadata;
    res.status(200).json({
      summary: parsed.summary,
      companionActivities: parsed.companionActivities,
      referralGuidance: parsed.referralGuidance,
      metricExplanations: parsed.metricExplanations,
      ...(um?.promptTokenCount != null
        ? { aiUsage: { promptTokens: um.promptTokenCount, outputTokens: um.candidatesTokenCount ?? 0 } }
        : {}),
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
