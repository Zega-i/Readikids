<div align="center">

# 📚 ReadiKids AI

**Skrining dini kesulitan belajar (disleksia & diskalkulia) untuk anak usia 6–9 tahun — arsitektur local-first, berjalan penuh bahkan tanpa internet.**

Anak bermain, sistem diam-diam membaca pola belajarnya, lalu menyusun *Rencana Pendampingan* untuk orang tua & guru. Event mentah tetap di perangkat, tanpa nama asli anak, tanpa vonis.

<br>

![Status](https://img.shields.io/badge/status-MVP%20aktif-2dd4bf)
![Platform](https://img.shields.io/badge/platform-PWA%20·%20offline--first-6366f1)
![Privacy](https://img.shields.io/badge/data-local--first%20·%20hybrid-16a34a)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss&logoColor=white)

</div>

---

> [!IMPORTANT]
> **Ini bukan alat diagnosis medis dan bukan platform edukasi.** Hasil sistem
> adalah *indikasi skrining awal* untuk membantu **Pendamping** (orang tua, wali,
> guru, tutor, kader kesehatan) menentukan langkah pendampingan dan rujukan ke
> profesional. Sistem tidak pernah menyatakan seorang anak "disleksia" atau
> "berisiko tinggi" — hanya observasi pola belajar.

## ✨ Mengapa Proyek Ini Berbeda

| | |
| --- | --- |
| 🔒 **Privasi kuat** | Event perilaku mentah (60 fps) tidak pernah meninggalkan perangkat — hanya metrik agregat yang (opsional) disinkron. Tanpa nama asli (pseudonym + `childRef`). |
| 📡 **Offline-first** | PWA installable yang tetap 100% fungsional tanpa internet; sinkronisasi & AI hanya lapisan opsional saat online — cocok untuk sekolah & posyandu daerah. |
| 🧠 **Telemetri diam** | Skrining dari *cara* anak bermain (waktu reaksi, keraguan, akurasi estimasi angka) pada 60 fps — bukan sekadar benar/salah. |
| 🧒 **Ramah anak** | Kid Mode tak pernah menampilkan skor, timer, atau leaderboard — hanya pujian partisipasi netral. |
| 🤝 **Bahasa observasi** | Hasil untuk Pendamping selalu berupa observasi + disclaimer, tidak pernah vonis. |
| 🔌 **Tanpa titik gagal** | LLM (Gemini) opsional; bila offline/tanpa key, otomatis pakai template lokal. |

## 🔬 Cara Kerja

Anak bermain **3 mini-game** (huruf cermin, tebak bunyi, garis bilangan) didampingi
orang dewasa. Di balik layar, sistem merekam pola interaksi, menghitung indikasi
risiko **di perangkat**, lalu menyusun Rencana Pendampingan (aktivitas rumah +
panduan rujukan).

```
Anak bermain (Kid Mode)
      │  tap · hover · drag · waktu reaksi (60 fps)
      ▼
TelemetryLogger ── batch 60 event/1 dtk ──►  IndexedDB (Dexie)
      ▼
MetricCalculator   Reversal Ratio > 2.5 │ HI > 0.35 │ NLEE > 15%
      ▼
Heuristic Risk Engine ──► RiskAssessment (LOW / MEDIUM / HIGH per domain)
      ▼
Generator Rencana Pendampingan
   ├─ online + API key : Gemini (hanya metrik agregat yang dikirim)
   └─ selain itu       : template lokal (fallback otomatis)
      ▼
Companion Dashboard (bahasa observasi + disclaimer)  ──►  Laporan Rujukan PDF
```

## 🚀 Menjalankan

**Prasyarat:** Node.js 18+ dan npm.

```bash
git clone <repo-url>
cd readikids
npm install
npm run dev          # http://localhost:5173
```

Konfigurasi Gemini **opsional** — salin `.env.example` → `.env` lalu isi
`GEMINI_API_KEY` & `GEMINI_MODEL` ([dapatkan gratis di Google AI Studio](https://aistudio.google.com)).
Kunci ini dipakai **server-side** oleh serverless proxy `api/companion-plan.ts`
(tidak pernah ter-bundle ke browser). Tanpa key atau saat offline, sistem otomatis
memakai template lokal dan semua fitur tetap berfungsi. Uji koneksi: `npm run test:ai`.

### Perintah yang Tersedia

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Dev server (Vite, hot reload) |
| `npm run build` | Build produksi (`tsc -b && vite build`) |
| `npm run preview` | Pratinjau hasil build |
| `npm test` | Unit test core engine (27 tes) |
| `npm run typecheck` | Type-check strict (`tsc -b --force`) |

## 🧩 Fitur Saat Ini

- ✅ Profil multi-anak (pseudonym + validasi usia 6–9, tanpa identitas asli)
- ✅ Consent orang tua/wali sebagai gerbang wajib pembuatan profil
- ✅ Cooldown skrining ulang 14–28 hari (soft-block, alasan pelanjutan dicatat)
- ✅ Skrining 3 mini-game end-to-end + Companion Dashboard (beranda, riwayat, laporan PDF)
- ✅ Narasi suara TTS Bahasa Indonesia di setiap instruksi
- ✅ PWA installable + offline penuh (service worker)
- ✅ Data local-first di perangkat (IndexedDB) + sinkron agregat opsional (Supabase) + hak hapus per anak (`deleteChildData`)

## 🛠️ Tech Stack

**React 18** · **TypeScript** (strict) · **Vite 5** · **Tailwind CSS 3** ·
**Dexie** (IndexedDB) · **vite-plugin-pwa** · **pdf-lib** + **html2canvas** (Laporan PDF) ·
**Supabase** (sinkron agregat opsional, auth anonim) · **Vercel Functions** (proxy AI) ·
**Google Gemini** (opsional, dengan fallback lokal)

## 📁 Struktur Proyek

```
src/
├── telemetry/   TelemetryDB · TelemetryLogger · MetricCalculator   [inti, dilindungi]
├── ml/          heuristic (risk engine) · llmRecommendation (Gemini + fallback)
├── analytics/   BehavioralEngine (analisis sesi & progres antar sesi)
├── profiles/    childProfileService · profileRules (usia 6–9, cooldown)
├── onboarding/  ParentConsentCilo · ChildProfileForm
├── game/        3 mini-game ber-seed (HutanHuruf · SungaiBunyi · BukitAngka) · resultsPipeline
├── companion/   Beranda · CompanionDashboard · RiwayatLaporan · ChildProfileManager · TentangPrivasi
├── referral/    reportPdf · referralGuide (Laporan Rujukan)
├── utils/       fallbackTemplates · simulation · tts (id-ID)
└── types/       telemetry.ts — kontrak data tunggal

backend/         Supabase: klien · auth anonim · syncService · schema.sql   [sinkron agregat opsional]
api/             companion-plan.ts — serverless proxy AI Gemini (Vercel Functions)
```

## 📖 Dokumentasi

Design system & mockup UI ada di [`design/`](design/). Dokumen blueprint,
arsitektur, dan catatan kerja internal (perencanaan) sengaja **tidak
dipublikasikan** ke repo ini — dikelola terpisah oleh tim.

## 🔐 Privasi & Keamanan

Local-first · event mentah tetap di perangkat · hanya metrik agregat yang disinkron ·
prompt LLM hanya berisi metrik agregat (tanpa pseudonym/`childRef`) ·
disclaimer skrining tampil di setiap hasil dan setiap halaman laporan PDF ·
dirancang selaras dengan prinsip **COPPA** & **GDPR** untuk data anak.

## 🗺️ Roadmap Singkat

- **Tier 1 — Keluarga/Pendamping** — fondasi local-first di perangkat, jalan penuh tanpa internet.
- **Tier 1.5 — Instansi kecil** — ekspor/impor file terenkripsi + Laporan Rujukan PDF, tanpa internet.
- **Tier 2 — Sinkron hibrida** *(aktif — tahap awal)* — Supabase (auth anonim + RLS) menyinkron **hanya metrik agregat**; event mentah tetap di perangkat, local-first tetap sumber kebenaran. Proxy AI Gemini via Vercel Functions.

---

<div align="center">
<sub>Dibuat untuk membantu setiap anak dikenali pola belajarnya lebih dini. 💙</sub>
</div>
