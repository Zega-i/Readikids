<div align="center">

# 📚 ReadiKids AI

**Skrining dini perkembangan membaca untuk anak usia 6–9 tahun — arsitektur local-first, berjalan penuh bahkan tanpa internet.**

Anak bermain, sistem diam-diam membaca pola belajarnya, lalu menyusun *Rencana Pendampingan* untuk orang tua & guru. Event mentah tetap di perangkat, tanpa nama asli anak, tanpa vonis.

<br>

![Status](https://img.shields.io/badge/status-MVP%20aktif-2dd4bf)
![Platform](https://img.shields.io/badge/platform-PWA%20·%20offline--first-6366f1)
![Privacy](https://img.shields.io/badge/data-local--first%20·%20hybrid-16a34a)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-Android-11998e?logo=capacitor&logoColor=white)

</div>

---

> [!IMPORTANT]
> **Ini bukan alat diagnosis medis dan bukan platform edukasi.** Hasil sistem
> adalah *skrining awal* untuk membantu **Pendamping** (orang tua, wali, guru,
> tutor) mengetahui posisi anak dalam perkembangan membaca. Sistem tidak pernah
> menyatakan seorang anak "disleksia" atau "berisiko tinggi" — hanya observasi
> pola, diframing sebagai posisi dalam perjalanan membaca (fase 0–4).

## 🧠 Tentang

ReadiKids mengukur **5 fase perkembangan membaca** (kerangka *alphabetic phase
theory* — Linnea Ehri) lewat mekanik game yang terasa seperti bermain. Anak
menempuh 5 dunia secara berurutan; setiap dunia mengamati satu fase. Hasilnya
adalah **profil per-skill → agregat per-fase → fase tertinggi yang tercapai
andal + gap fase–usia**, bukan satu skor komposit.

```
Dunia 1 · Padang Fondasi   ─ fase 0 · fondasi arah & bentuk
Dunia 2 · Hutan Huruf      ─ fase 1 · mengenal huruf
Dunia 3 · Sungai Bunyi     ─ fase 2 · menghubungkan huruf dengan bunyi
Dunia 4 · Gua Gema         ─ fase 3 · kesadaran bunyi kata
Dunia 5 · Puncak Kata      ─ fase 4 · merangkai suku kata & kata
```

## ✨ Mengapa Proyek Ini Berbeda

| | |
| --- | --- |
| 🔒 **Privasi kuat** | Event perilaku mentah tidak pernah meninggalkan perangkat — hanya metrik agregat yang (opsional) disinkron. Tanpa nama asli (pseudonym + `childRef`). |
| 📡 **Offline-first** | PWA installable yang tetap 100% fungsional tanpa internet; sinkronisasi & AI hanya lapisan opsional saat online — cocok untuk sekolah & daerah minim sinyal. |
| 🧠 **Multi-sinyal per item** | Skrining dari *cara* anak bermain: akurasi, latency, jenis error, dan pola keraguan (hesitasi) — bukan sekadar benar/salah. |
| 🧒 **Ramah anak** | Kid Mode tak pernah menampilkan skor, timer, atau leaderboard — hanya pujian partisipasi netral. Dunia terkunci berurutan; anak selalu memulai dari dunia pertama. |
| 🤝 **Bahasa observasi** | Hasil untuk Pendamping selalu berupa observasi + disclaimer, tidak pernah vonis. Laporan PDF = narasi deskriptif + diagram radar 5 fase. |
| 🔌 **Tanpa titik gagal** | LLM (Gemini) opsional; bila offline/tanpa key, otomatis pakai template lokal. |

## 🔬 Cara Kerja

Anak bermain **5 dunia berurutan** (tiap dunia = 1 fase). Di dalam dunia ada
papan misi berisi **20 skill** yang dimainkan lewat 2 mekanik (pilih jawaban &
rangkai bunyi) dengan narasi suara Bahasa Indonesia. Di balik layar, sistem
menggabungkan semua trial, menghitung profil per fase **di perangkat**, lalu
menyusun Rencana Pendampingan.

```
Anak bermain (Kid Mode)
      │  tap · latency · jenis error · hesitasi
      ▼
Pipeline hasil (resultsPipeline, on-device) ──►  IndexedDB (Dexie, local-first)
      ▼
MetricCalculator   akurasi per skill (6–8 item skor + 2 demo) → reliability per fase
      ▼
Heuristic          profil fase → fase tertinggi tercapai + gap fase–usia → LOW / MEDIUM / HIGH
      ▼
Generator Rencana Pendampingan
   ├─ online + API key : Gemini (hanya metrik agregat yang dikirim)
   └─ selain itu       : template lokal (fallback otomatis)
      ▼
Companion Dashboard (narasi observasi + disclaimer)  ──►  Laporan PDF (diagram radar)
```

Kalibrasi mengikuti aturan ketat: item per skill ≥ 6, adaptive basal/ceiling
menjaga sesi ±15–20 menit, dan semua ambang bersifat **tentatif** sampai ada
baseline empiris dari uji lapangan.

## 🚀 Menjalankan

**Prasyarat:** Node.js 18+ dan npm.

```bash
git clone <repo-url>
cd readikids
npm install
npm run dev          # http://localhost:5173
```

Konfigurasi Gemini & Supabase **opsional** — salin `.env.example` → `.env` lalu isi
sesuai kebutuhan. Kunci Gemini dipakai **server-side** oleh serverless proxy
`api/companion-plan.ts` (tidak pernah ter-bundle ke browser). Tanpa key atau saat
offline, sistem otomatis memakai template lokal dan semua fitur tetap berfungsi.
Uji koneksi Gemini: `npm run test:ai`.

### Perintah yang Tersedia

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Dev server (Vite, hot reload) |
| `npm run build` | Build produksi (`tsc -b && vite build`) |
| `npm run preview` | Pratinjau hasil build |
| `npm test` | Unit test core engine (34 tes: metrik, heuristic, aturan profil, telemetri, PDF, navigasi hash) |
| `npm run typecheck` | Type-check strict (`tsc -b --force`) |
| `npm run test:ai` | Uji koneksi Gemini ke proxy AI |

### Build APK Android (Capacitor)

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug   # → ReadiKids-*.apk di android/app/build/outputs/apk/
```

## 🧩 Fitur Saat Ini

- ✅ Profil multi-anak (pseudonym + validasi usia 6–9, tanpa identitas asli)
- ✅ Consent orang tua/wali sebagai gerbang wajib pembuatan profil
- ✅ Cooldown skrining ulang 14–28 hari (soft-block, alasan pelanjutan dicatat)
- ✅ 5 dunia berurutan (terkunci hingga dunia sebelumnya selesai) × 20 skill × 2 mekanik game
- ✅ Pipeline hasil end-to-end: trial → profil fase → narasi observasi → dashboard pendamping
- ✅ Laporan PDF on-device (pdf-lib): data skrining, **diagram radar 5 fase + konsistensi**, narasi per tahap, rencana pendampingan, saran tindak lanjut, dan **jejak karbon sesi** (estimasi berbasis model, bahasa mudah)
- ✅ Jejak karbon per sesi (SCI / ISO 21031 + SWDM v4) — terukur dari data nyata, konsisten antara tampilan & PDF
- ✅ Narasi suara TTS Bahasa Indonesia di setiap instruksi (native Android + fallback web)
- ✅ PWA installable + offline penuh (service worker)
- ✅ Data local-first di perangkat (IndexedDB) + sinkron agregat opsional (Supabase)
- 🚧 Ekspor/impor data (file) untuk kebutuhan instansi — modul tersedia, akses dari UI menyusul (lihat Roadmap Tier 1.5)

## 🛠️ Tech Stack

**React 18** · **TypeScript** (strict) · **Vite 5** · **Tailwind CSS 3** ·
**Dexie** (IndexedDB) · **vite-plugin-pwa** · **pdf-lib** (Laporan PDF) ·
**Capacitor** (APK Android: Filesystem · Share · Text-to-Speech) ·
**Supabase** (sinkron agregat opsional, auth anonim) · **Vercel Functions** (proxy AI) ·
**Google Gemini** (opsional, dengan fallback lokal)

## 📁 Struktur Proyek

```
src/
├── telemetry/   TelemetryDB · TelemetryLogger · MetricCalculator   [inti, dilindungi]
├── ml/          heuristic (profil fase + gap) · llmRecommendation (Gemini + fallback)
├── analytics/   BehavioralEngine (analisis sesi — integrasi ke alur menyusul)
├── profiles/    childProfileService · profileRules (usia 6–9, cooldown)
├── onboarding/  ParentConsentCilo
├── game/        WorldMap (5 dunia) · WorldHub (Papan Misi) · mechanics/ (ChoiceGame · BuildGame) · trialBank · resultsPipeline
├── companion/   Beranda · CompanionDashboard · RiwayatLaporan · ChildProfileManager · TentangPrivasi
├── referral/    reportPdf (radar + narasi) · referralGuide
├── pages/       LandingPage
├── utils/       fallbackTemplates · dataTransfer (ekspor/impor) · savePdf · tts (id-ID) · carbonFootprint
└── types/       telemetry.ts — kontrak data tunggal

backend/         Supabase: klien · auth anonim · syncService · schema.sql   [sinkron agregat opsional]
api/             companion-plan.ts — serverless proxy AI Gemini (Vercel Functions)
android/         Proyek Capacitor Android (APK)
```

## 📖 Dokumentasi

- **Desain sistem & mockup UI**: [`design/`](design/) (spesifikasi warna, komponen, dan mockup Android/Web).
- **Blueprint fase membaca & kontrak data**: `docs/fase-membaca.md` & `docs/refactor-v2.md` (dikelola internal tim).

## 🔐 Privasi & Keamanan

Local-first · event mentah tetap di perangkat · hanya metrik agregat yang disinkron ·
prompt LLM hanya berisi metrik agregat (tanpa pseudonym/`childRef`) ·
disclaimer skrining tampil di setiap hasil dan setiap halaman laporan PDF ·
dirancang selaras dengan prinsip **COPPA** & **GDPR** untuk data anak.

## 🗺️ Roadmap Singkat

- **Tier 1 — Keluarga/Pendamping** — fondasi local-first di perangkat, jalan penuh tanpa internet.
- **Tier 1.5 — Instansi kecil** — ekspor/impor file + Laporan PDF, tanpa internet.
- **Tier 2 — Sinkron hibrida** *(aktif — tahap awal)* — Supabase (auth anonim + RLS) menyinkron **hanya metrik agregat**; event mentah tetap di perangkat. Proxy AI Gemini via Vercel Functions.
- **Kalibrasi lapangan** *(berikutnya)* — mengumpulkan baseline empiris untuk memvalidasi semua ambang tentative.

---

<div align="center">
<sub>Dibuat untuk membantu setiap anak dikenali pola belajarnya lebih dini. 💙</sub>
</div>