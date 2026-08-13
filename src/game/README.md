# src/game — Engine skrining (Kid Mode)

Skrining membaca mengikuti **5 fase perkembangan membaca (0–4)** dari
`docs/fase-membaca.md`. Satu dunia (peta) per fase; tiap dunia punya hub "Papan
Misi" berisi kartu game per skill. Semua game memakai **2 mekanik generik** dan
hanya berkomunikasi lewat prop `onComplete` / `onBack`.

```
game/
├── WorldMap.tsx        Peta petualangan: 5 dunia (fase) → masuk ke hub
├── WorldHub.tsx        Papan Misi per dunia: kartu game per skill + stempel SELESAI
├── GameHost.tsx        Pemilih mekanik: build/recall → BuildGame; lainnya → ChoiceGame
├── mechanics/
│   ├── ChoiceGame.tsx  Pilih 1 dari N ubin (semua skill choice)
│   └── BuildGame.tsx   Susun berurutan (build/recall: phon_memory, syllable, dll.)
├── trialBank.ts        Bank soal: WORLDS (5 dunia), 20 skill, 6–8 item + 2 demo per
│                       skill; validasi mekanik vs SKILL_MECHANIC saat init
├── resultsPipeline.ts  TrialRecord[] → profil per-skill → fase → simpan + sync
├── PuncakBintang.tsx · CiloMenulisCerita.tsx  Layar penutup / transisi hasil
└── README.md
```

## Randomisasi per sesi (anti-hafalan)

- **Posisi ubin diacak** (Fisher–Yates) setiap game dimulai — di ChoiceGame dan
  BuildGame. Hasil acak stabil sepanjang satu sesi (acak sekali saat mount,
  tidak berganti antar-trial).
- Item ber-`noShuffle` dihormati untuk soal yang jawabannya **semantik
  bergantung posisi** (mis. track "ketuk yang paling kiri").
- `correctId`/`errorTags` dipetakan ke **id pilihan**, bukan posisi — aman
  terhadap acak-ulang dan telemetri tetap valid.

## Aturan yang tidak boleh dilanggar (CLAUDE.md)

- Kid Mode tanpa skor/benar-salah/timer terlihat; hanya pujian partisipasi netral.
- Ubin jawaban seragam; **tanpa animasi selama trial berjalan** (menjaga telemetri).
- Instruksi dibacakan TTS; target sentuh besar (ramah motorik anak).
- Telemetri direkam diam-diam lewat `TelemetryLogger` — dilarang array telemetri
  pribadi per game.
- Jangan menyentuh engine terlindungi: `src/telemetry/*` & `src/ml/heuristic.ts`
  (ubah dengan disiplin + tes, lihat `docs/refactor-v2.md`).
