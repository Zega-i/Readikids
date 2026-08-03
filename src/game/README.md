# src/game — Arsitektur Sesi Skrining (siap ganti desain total)

UI dianggap **kulit yang bisa dibuang**. Pemisahan lapisan di folder ini
dibuat agar redesign total (Canvas, alur baru, tambah/kurang fitur) tidak
pernah menyentuh logika dan data:

```
game/
├── trialBank.ts           ← DATA: daftar trial, label game, ambang.
│                            Ubah soal/urutan/jumlah → edit file ini saja.
├── useScreeningSession.ts ← MESIN (headless, tanpa UI): state machine
│                            (trial/cheer/break/end), timing, hesitation,
│                            misclick, telemetri, simulator, analisis.
└── PrototypeScreening.tsx ← KULIT: presentasi sesuai mockup Kid Mode.
                             Boleh diganti/dibuang kapan pun.
```

## Cara mengganti UI tanpa merusak apa pun

1. Buat komponen baru, panggil `useScreeningSession({ child, ... })`.
2. Render berdasarkan `session.phase`:
   - `trial` → tampilkan `session.trial` (union `choice` | `line`).
   - `cheer` → selingan netral (`phase.text`), maju otomatis.
   - `break` → antar-game; panggil `session.continueAfterBreak()`.
   - `end` → layar penutup; hasil dikirim lewat `onComplete`.
3. Teruskan interaksi ke aksi hook — JANGAN menghitung sendiri:
   - `answerChoice(option, index)` · `placeLine(pct)` + `confirmLine()`
   - `markHoverStart/End` (sumber Hesitation Index)
   - `markMisclick()` (tap di luar target)
   - `replayInstruction()` (TTS) · `abort()`
4. Jenis game/trial baru → tambah varian union `Trial` di `trialBank.ts`
   + satu cabang submit di mesin; UI lama tidak akan rusak (TypeScript
   memaksa penanganan varian baru saat kompilasi).

## Aturan yang TIDAK ikut berubah bersama desain (CLAUDE.md)

- Kid Mode tanpa skor/benar-salah/timer terlihat; pujian netral saja.
- Ubin jawaban seragam; tanpa animasi selama trial berjalan.
- Semua instruksi dibacakan TTS; target sentuh ≥56px (`min-h-touch`).
- Telemetri direkam diam-diam pada setiap interaksi — jangan dilewati.
