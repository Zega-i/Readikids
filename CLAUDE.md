# CLAUDE.md — ReadiKids AI

Konteks wajib untuk setiap sesi Claude Code di repo ini. Baca dulu, patuhi selalu.

## Apa Proyek Ini

Platform **skrining dini** (BUKAN diagnosis, BUKAN edukasi) kesulitan belajar
(disleksia & diskalkulia) untuk anak usia **6–9 tahun**, dipakai oleh
**Pendamping** (orang tua/wali/guru/tutor). Web-first **PWA**, **Hybrid Data (IndexedDB + Supabase)**.
Blueprint aktif: `docs/Markdown_Readikids_V4.md`
(versi lama di `docs/archive/` — JANGAN dijadikan acuan).

## Perintah Verifikasi (WAJIB lulus sebelum menyatakan selesai)

```bash
npm test              # unit test core engine (21+ tes)
npx tsc -b --force    # type-check strict, harus 0 error
npm run build         # build produksi harus sukses
```

## Batasan Produk — TIDAK BISA DINEGOSIASI

1. **Bahasa hasil = observasi, bukan vonis.** Dilarang menulis "anak Anda
   disleksia/berisiko tinggi". Gunakan kategori resmi: LOW = "Pola belajar
   tampak tipikal", MEDIUM = "Ada pola yang sebaiknya diamati", HIGH =
   "Disarankan konsultasi dengan profesional".
2. **Kid Mode tidak pernah melihat skor/level/benar-salah.** Umpan balik anak
   hanya pujian partisipasi netral. Tanpa timer terlihat, tanpa leaderboard.
3. **Disclaimer skrining** (`SCREENING_DISCLAIMER`) tampil di SETIAP tampilan
   hasil dan setiap halaman laporan PDF.
4. **Privasi:** tanpa nama asli anak (pseudonym + `childRef`), profil & telemetri disinkronkan ke Supabase secara aman, prompt LLM hanya berisi metrik agregat.
5. **Consent orang tua/wali** menggerbang pembuatan profil; usia divalidasi 6–9;
   cooldown skrining ulang 14–28 hari (soft-block + alasan dicatat).

## Kode yang DILINDUNGI (jangan ubah tanpa alasan kuat + persetujuan user)

- `src/telemetry/MetricCalculator.ts` — ambang riset `THRESHOLDS`
  (2.5 / 0.35 / 15%) dan bobot `WEIGHTS` (40/30/30).
- `src/telemetry/TelemetryLogger.ts` — batching 60 event / 1 detik.
- `src/ml/heuristic.ts` — `LEVEL_THRESHOLDS` (40/70) & pembobotan domain.
- Skema Dexie di `TelemetryDB.ts` — perubahan skema WAJIB lewat `version(n+1)`
  baru dengan `upgrade()`, jangan edit versi lama.
- Semua perubahan pada file di atas wajib mempertahankan 21 tes yang ada
  (boleh menambah tes, dilarang menghapus/melemahkan).

## Design System (untuk semua pekerjaan UI)

Sumber kebenaran: `design/readikids-design-system.html` (buka di browser) dan
mockup di `design/mockups/`. Aturan emas:

1. Semua warna dari token Tailwind (`kid.*`, `comp.*`, `status.*`, `chart.*`) —
   dilarang hex hardcoded di komponen.
2. Kid Mode: font `font-kid` (Baloo 2) ≥17px, target sentuh ≥56px (`min-h-touch`),
   radius `rounded-kid`, latar krem `kid-bg`, ubin jawaban SERAGAM warnanya.
3. Companion: font Nunito, radius `rounded-comp`, teal `comp-primary`,
   badge kategori selalu ikon + label (tidak pernah warna saja).
4. Warna status ≠ warna chart ≠ warna dekoratif — tiga kelompok, tidak saling pinjam.
5. **Tanpa animasi selama trial game berjalan** (menjaga validitas telemetri).
   Animasi hanya di transisi antar trial & selingan maskot.
6. Warna baru apa pun wajib diuji kontras (≥4.5:1 teks; ≥3:1 besar/grafis).

## Cara Kerja yang Diharapkan

- Kerjakan per fase sesuai `task.md`; satu layar/fitur per iterasi, jangan borongan.
- Untuk UI: implementasi → screenshot (Playwright MCP bila tersedia) →
  bandingkan dengan mockup → perbaiki → ulangi.
- Arsitektur berjenjang ada di `docs/architecture.md` — Kita menggunakan Supabase sebagai backend untuk sinkronisasi agregat. Kebutuhan institusi ditangani ekspor/impor file (Tier 1.5).
- Selesai bekerja = tes + typecheck + build hijau, `task.md` diperbarui.


## FIELD VALIDATION NOTES - METRIC CALIBRATION

**CRITICAL METRIC CLARIFICATION: NLEE (Number Line Estimation Error)**
NLEE is **NOT** a simple "right/wrong" discrete error count (Non-Linear Execution Error). 
NLEE mathematically represents: `|answer - target| / RANGE_MAX * 100`.
It calculates the exact distance the child's marker deviates from the target integer, expressed as a percentage of the total line length. NLEE is averaged across all trials to assess spatial-numeric mapping deficits.

**CALIBRATION WARNING (Due to Trial Count Reduction)**
The heuristic thresholds (`THRESHOLDS`: 2.5 / 0.35 / 15%) in `src/telemetry/MetricCalculator.ts` were originally calibrated for a larger sample size of 12 trials per game. 
Because the number of trials has been reduced to **10 per game**:
1. Single anomalies (e.g., one huge deviation in NLEE, or one extremely slow hesitation) now exert a mathematically larger pull on the final averages.
2. The stratification of trials has been hardened (Hutan: 6 mirror + 4 control; Sungai: 4 ma, 3 na, 3 wa; Bukit: distributed magnitude targets).

**ACTION REQUIRED DURING FIELD TESTING:**
Do not alter `heuristic.ts` without empirical data. However, monitor the rate of false positives (children flagged as MEDIUM or HIGH risk who are neurotypical). If the reduction to 10 trials artificially inflates the averaged risk scores, the thresholds (e.g., 15% for NLEE or 0.35 for HI) must be adjusted downwards based on the new 10-trial baseline data.

- [Alur Transisi Akhir Game (W8b-W11)](docs/Alur_Transisi_Akhir_Game.md) — Acuan penting implementasi layar pemrosesan hasil, telemetri, dan database.
