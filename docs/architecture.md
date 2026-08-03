# 🏗️ Arsitektur ReadiKids AI (Ringkas)

> Versi ringkas untuk pembaca cepat. Detail lengkap: `docs/Markdown_Readikids_V4.md`.
> Bila dokumen ini dan blueprint berbeda, blueprint yang menang.

## Prinsip Inti

**Web-first PWA · 100% on-device · tanpa backend · privacy by design.**
Data perilaku anak tidak pernah meninggalkan perangkat. Sistem tetap berfungsi
penuh secara offline (heuristic engine + template lokal).

## Diagram Alur Data

```
Anak bermain (Kid Mode, Canvas/React)
      │  tap · hover · drag · waktu reaksi (60 fps)
      ▼
TelemetryLogger ── batch 60 event/1 dtk ──► IndexedDB (Dexie)
      │ logTrial() per soal                    │ sessions · events · trials
      ▼                                        │ childProfiles · riskAssessments
MetricCalculator (murni, teruji)               │
  Reversal Ratio > 2.5 │ HI > 0.35 │ NLEE > 15%
      ▼
Heuristic Risk Engine ──► RiskAssessment (LOW/MEDIUM/HIGH per domain)
      ▼
Generator Rencana Pendampingan
  ├─ online + API key : Gemini (hanya metrik agregat yang dikirim)
  └─ selain itu       : template lokal (fallback otomatis, tak pernah error)
      ▼
Companion Dashboard (bahasa observasi + disclaimer)
      └─► [Fase 3] Laporan Rujukan PDF (dibuat on-device)
```

## Keputusan Arsitektur Penting

| Keputusan | Alasan |
| --- | --- |
| Tanpa backend di MVP | Privasi data anak, nol biaya server, tahan internet mati (demo-safe), sesuai regulasi data anak |
| Dexie/IndexedDB, bukan localStorage | Volume telemetri tinggi (60 fps), query berindeks, transaksi |
| Buffer `useRef` + batch write | State React pada 60 fps membekukan UI |
| Perubahan skema DB via `version(n+1).upgrade()` | Data perangkat lama wajib selamat (sudah terjadi: v1→v2) |
| PWA, bukan folder mobile terpisah | Satu codebase; installable dari browser; APK menyusul via TWA tanpa menulis ulang |
| LLM opsional dengan fallback lokal | Aplikasi tidak boleh punya titik gagal eksternal |

## Evolusi Arsitektur Berjenjang (Tier)

**Tier 1 — Keluarga / Pendamping (SEKARANG, MVP)**
On-device penuh, tanpa akun, tanpa server. Fondasi yang tidak akan dibuang.

**Tier 1.5 — Instansi kecil tanpa infrastruktur (Fase 3)**
Ekspor/impor file hasil (terenkripsi): tiap perangkat mengekspor, satu perangkat
"pusat" milik guru/petugas mengimpor untuk rekap kelompok. Plus Laporan Rujukan
PDF. Tanpa internet pun jalan — cocok untuk sekolah/posyandu daerah.

**Tier 2 — Mode Institusi dengan backend (ROADMAP — dibangun saat ada pemakainya)**
Barulah server masuk: rekap real-time lintas perangkat, akun institusi, proxy
API key LLM. Prinsip yang tidak bisa ditawar bila tier ini dibangun:

1. *Local-first* — perangkat tetap sumber data utama; server hanya cermin.
2. Yang disinkron hanya **metrik agregat + level indikasi** — bukan event mentah.
3. Consent sinkronisasi terpisah per anak (di atas consent skrining).
4. Pseudonym dipertahankan; pemetaan identitas asli dipegang institusi di luar sistem.

## Jalur "Menjadi Aplikasi"

1. **PWA (Fase 2):** manifest + service worker → installable + offline penuh.
2. **Play Store (roadmap):** bungkus PWA dengan TWA (Bubblewrap/PWABuilder) → APK/AAB.
3. **Capacitor (jauh di depan):** hanya bila kelak butuh API native yang tak
   tersedia di browser.

## Peta Modul

```
src/
├── telemetry/   TelemetryDB · TelemetryLogger · MetricCalculator   [inti, dilindungi]
├── ml/          heuristic (risk engine) · llmRecommendation (Gemini+fallback)
├── analytics/   BehavioralEngine (analisis sesi, progress antar sesi)
├── profiles/    childProfileService · profileRules (usia 6–9, cooldown)
├── onboarding/  ConsentFlow · ChildProfileForm
├── game/        PrototypeScreening → (Fase 2: GameEngine + 3 mini-game)
├── companion/   CompanionDashboard → (Fase 2: sesuai design system)
├── utils/       fallbackTemplates · simulation (Shift+D) · tts (id-ID)
└── types/       telemetry.ts — kontrak data tunggal
```
