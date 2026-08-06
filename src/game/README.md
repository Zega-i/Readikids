# src/game — Mini-game skrining (Kid Mode)

Tiga mini-game mandiri yang merekam telemetri perilaku diam-diam saat anak
bermain, lalu menyerahkan datanya ke pipeline hasil. Tiap game berdiri sendiri
(punya generator trial + layar "selesai" sendiri) dan hanya berkomunikasi
lewat prop `onComplete` / `onBack`.

```
game/
├── HutanHuruf/      Huruf cermin (b/d/p/q vs a/m/o) → Letter-Reversal Latency
├── SungaiBunyi/     Tebak bunyi/fonem (audio ma/na/wa) → Hesitation Index
├── BukitAngka/      Garis bilangan (estimasi posisi angka) → NLEE
├── MapAdventureCilo.tsx  Peta dunia: gerbang urutan game (terkunci berjenjang)
├── PuncakBintang.tsx · CiloMenulisCerita.tsx  Layar penutup + pemrosesan hasil
├── resultsPipeline.ts   Gabungkan telemetri 3 game → TrialRecord[] →
│                        aggregateTrials → assessRisk → rencana → simpan (IndexedDB + sync)
└── trialBank.ts     Konstanta ambang (LINE_CORRECT_TOLERANCE). *Bukan* bank soal —
                     komposisi soal ada di generator ber-seed tiap game.
```

## Randomisasi per sesi (bentuk paralel)

Tiap game membuat **`sessionSeed` baru** setiap dimainkan, lalu menghasilkan trial
dengan **stratifikasi TETAP** (mis. Hutan: 6 cermin + 4 kontrol) namun **urutan
diacak**. Efeknya: tingkat kesulitan & jenis soal sama antar sesi (bisa
dibandingkan ke ambang tetap), tapi item/urutan spesifik berbeda tiap sesi
(anti-hafalan). Seed direkam di telemetri untuk reproduksi. **Bukan adaptif ke
performa** — demi validitas skrining.

## Aturan yang tidak boleh dilanggar (CLAUDE.md)

- Kid Mode tanpa skor/benar-salah/timer terlihat; hanya pujian partisipasi netral.
- Ubin jawaban seragam; **tanpa animasi selama trial berjalan** (menjaga telemetri).
- Instruksi dibacakan TTS; target sentuh besar (ramah motorik anak).
- Telemetri direkam diam-diam pada setiap interaksi — jangan dilewati.
- Jangan menyentuh engine terlindungi: `src/telemetry/*` & `src/ml/heuristic.ts`.
