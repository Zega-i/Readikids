/**
 * Uji koneksi ke Google Gemini — meniru persis panggilan api/companion-plan.ts.
 *
 * Jalankan dari root proyek:
 *   node --env-file=.env scripts/test-gemini.mjs
 *
 * Membaca GEMINI_API_KEY & GEMINI_MODEL dari .env.
 * Berhasil = HTTP 200 + ada teks jawaban model.
 */
const key = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

if (!key) {
  console.error('❌ GEMINI_API_KEY tidak ditemukan. Jalankan: node --env-file=.env scripts/test-gemini.mjs');
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
console.log(`→ Menguji model: ${model}`);

try {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Balas dengan satu kata singkat: OK' }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });

  console.log(`→ HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();

  if (!res.ok) {
    console.error('❌ Gagal. Respons:');
    console.error(JSON.stringify(data, null, 2).slice(0, 800));
    console.error('\nPetunjuk: 404 = slug model salah (ganti GEMINI_MODEL) · 400/403 = key salah/tak berizin · 429 = kuota habis.');
    process.exit(2);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log('\n✅ TERSAMBUNG. Jawaban model:', JSON.stringify(text));
} catch (err) {
  console.error('❌ Error jaringan/lainnya:', err?.message ?? err);
  process.exit(3);
}
