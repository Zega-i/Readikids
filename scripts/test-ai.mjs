/**
 * Uji koneksi ke OpenRouter (model Nemotron) — TERPISAH dari aplikasi.
 *
 * Jalankan:
 *   node --env-file=.env scripts/test-ai.mjs
 *
 * Membaca OPENROUTER_API_KEY & OPENROUTER_MODEL dari .env.
 * Berhasil = HTTP 200 + ada teks jawaban model.
 */
const key = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free';

if (!key) {
  console.error('❌ OPENROUTER_API_KEY tidak ditemukan. Jalankan dengan: node --env-file=.env scripts/test-ai.mjs');
  process.exit(1);
}

console.log(`→ Menguji model: ${model}`);

try {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'X-Title': 'ReadiKids Test',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Balas dengan satu kata singkat: OK' }],
    }),
  });

  console.log(`→ HTTP ${res.status} ${res.statusText}`);
  const data = await res.json();

  if (!res.ok) {
    console.error('❌ Gagal. Respons:');
    console.error(JSON.stringify(data, null, 2).slice(0, 800));
    console.error('\nPetunjuk: 401 = key salah · 404 = slug model salah · 402 = butuh kredit/aktifkan model di OpenRouter.');
    process.exit(1);
  }

  const text = data?.choices?.[0]?.message?.content;
  console.log('\n✅ TERSAMBUNG. Jawaban model:', JSON.stringify(text));
  console.log('   Model dipakai:', data?.model ?? '(tidak dilaporkan)');
} catch (err) {
  console.error('❌ Error jaringan/lainnya:', err?.message ?? err);
  process.exit(1);
}
