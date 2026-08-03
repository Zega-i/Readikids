# 📚 ReadiKids AI — Blueprint Pengembangan Lengkap (v4.0)

**Platform Skrining Dini Kesulitan Belajar (Disleksia & Diskalkulia) untuk Umum — Berbasis Behavioral Learning Analytics dan Gamifikasi AI, untuk Semua Anak Usia Setara SD (6–9 Tahun)**

---

## 🔄 Ringkasan Perubahan dari v2.0

| Aspek | v2.0 (Lama) | v4.0 (Baru) |
| --- | --- | --- |
| **Lingkup pengguna** | Sekolah Dasar (guru sebagai pengawas utama) | **Umum** — siapa pun orang dewasa yang mendampingi anak (orang tua, wali, guru, tutor, kader kesehatan) |
| **Kriteria anak** | Siswa SD kelas 1–3 | **Semua anak usia 6–9 tahun** (setara SD kelas awal), termasuk homeschool & belum bersekolah |
| **Model peran** | Dual-mode: Teacher Dashboard + Parent Portal | **Satu peran generik: Pendamping** (bisa mengelola 1 atau banyak profil anak) |
| **Output rekomendasi** | IEP (Individualized Education Plan) — terminologi sekolah | **Rencana Pendampingan** — saran aktivitas rumah + panduan rujukan |
| **Jalur tindak lanjut** | Guru → orang tua | **Laporan Rujukan (ekspor PDF)** yang dibawa langsung ke psikolog anak / puskesmas / klinik tumbuh kembang |
| **Persetujuan** | Implisit melalui sekolah | **Consent eksplisit orang tua/wali** saat onboarding |
| **Posisi produk** | Alat bantu sekolah | **Alat bantu pendidikan & kesehatan keluarga** — tetap skrining, bukan diagnosis, bukan edukasi |

> **Dampak ke kode Fase 1 yang sudah dibangun:** minimal. Core engine (telemetri, metrik, risk engine, generator rekomendasi, simulator) sudah role-agnostic. Perubahan kode yang diperlukan hanya: (1) field `grade: 1|2|3` → `ageYears: 6–9` pada tipe data, (2) penamaan `IEP*` → `Rencana Pendampingan` di API internal & template, (3) modul baru: manajemen multi-profil anak, consent flow, dan ekspor laporan PDF.

---

## 📋 Daftar Isi

1. Ringkasan Eksekutif
2. Konsep, Filosofi & Batasan Scope
3. Latar Belakang Masalah & Dasar Literatur
4. Arsitektur Sistem
5. Komponen Teknis & Stack
6. Penerapan ML / AI & Kontribusi Utama
7. Fitur & UI/UX (Mode Anak + Mode Pendamping)
8. State Management & Optimasi Performa
9. Mitigasi Risiko Demo & Fault Tolerance
10. Strategi Testing & Simulation Engine
11. Etika, Privasi Data, Consent & Compliance
12. Roadmap & Timeline
13. Struktur Folder & Rencana Perubahan Kode
14. Referensi & Daftar Pustaka

---

## 1. Ringkasan Eksekutif

**ReadiKids AI v4.0** adalah platform skrining dini kesulitan belajar berbasis kecerdasan buatan untuk **semua anak usia 6–9 tahun** (setara SD kelas awal), yang dapat digunakan oleh **siapa pun orang dewasa yang mendampingi anak** — orang tua, wali, guru, tutor, hingga kader kesehatan — tanpa memerlukan institusi sekolah sebagai perantara.

Platform menggunakan **gamifikasi interaktif**, **silent behavioral telemetry** sebagai *core engine* utama, serta **LLM adaptive recommendation** untuk mengidentifikasi indikasi risiko disleksia dan diskalkulia secara cepat, inklusif, dan terjangkau — lalu menjembatani keluarga menuju layanan profesional melalui **Laporan Rujukan** yang dapat diekspor.

> **Penegasan Posisi Sistem (diperkuat di v4.0):**
> ReadiKids AI adalah **instrumen skrining awal / deteksi dini**, dengan tiga batasan tegas:
> 1. **BUKAN alat diagnosis medis** — hasil berupa indikasi untuk observasi lanjutan, bukan vonis.
> 2. **BUKAN platform edukasi** — tidak ada modul belajar/latihan; output hanya pemetaan indikasi, saran pendampingan, dan panduan rujukan. (Pengembangan ke arah edukasi belum diputuskan dan disimpan sebagai opsi roadmap.)
> 3. **Memerlukan pendamping dewasa** — anak tidak menggunakan aplikasi sendirian.

### Nilai Utama Sistem

| Aspek | Keunggulan |
| --- | --- |
| **Terbuka untuk Umum** | Tidak butuh akun sekolah; satu perangkat keluarga cukup |
| **Inklusif & Terjangkau** | Berjalan di browser biasa (touch/mouse/keyboard) tanpa webcam atau perangkat khusus |
| **Jembatan ke Layanan Kesehatan** | Laporan Rujukan PDF siap dibawa ke psikolog anak / puskesmas |
| **Berbasis Literatur** | Metrik telemetri mengacu riset global sebagai landasan ilmiah |
| **Ramah Anak** | Format permainan 2D — anak tidak merasa sedang diuji |
| **Resilien & Demo-Safe** | 100% berfungsi offline dengan *fallback* lokal |
| **Privasi Terjamin** | 100% *on-device storage*; consent eksplisit; tanpa nama asli anak |

---

## 2. Konsep, Filosofi & Batasan Scope

### 2.1 Filosofi Utama

> *"ReadiKids AI tidak menguji anak dengan tes formal yang menakutkan. Anak bermain game interaktif didampingi orang dewasa, sistem merekam pola perilaku belajar secara diam-diam (silent telemetry), dan AI mengolah data tersebut menjadi pemetaan indikasi serta saran pendampingan — di mana pun anak berada: rumah, sekolah, tempat les, atau posyandu."*

### 2.2 Definisi Scope (In / Out)

**✅ DALAM SCOPE v4.0**

* Skrining dini indikasi disleksia & diskalkulia untuk anak usia **6–9 tahun**.
* Pengguna: **Pendamping** — peran tunggal generik untuk semua orang dewasa. Guru = pendamping dengan banyak profil anak.
* Konteks penggunaan: di mana saja (rumah, sekolah, les, layanan kesehatan komunitas).
* Output: skor indikasi + **Rencana Pendampingan** (saran aktivitas, bukan kurikulum) + **Laporan Rujukan** (ekspor PDF untuk profesional).
* Pemantauan perkembangan antar sesi (progress tracking) sebagai data observasi longitudinal.

**🚫 DI LUAR SCOPE v4.0 (batasan tegas)**

* ❌ Diagnosis medis atau psikologis dalam bentuk apa pun.
* ❌ Konten edukasi/terapi (modul belajar, latihan membaca, drill berhitung). *Status roadmap: belum diputuskan.*
* ❌ Anak di luar rentang usia 6–9 tahun (di bawah 6: perkembangan pra-baca belum stabil → risiko false positive tinggi; di atas 9: ambang metrik perlu kalibrasi ulang).
* ❌ Penggunaan mandiri oleh anak tanpa pendamping dewasa.
* ❌ Mode institusi/kelola kelas massal (ringkasan kelompok, akun organisasi). *Status roadmap: opsional.*
* ❌ Penyimpanan data di server / cloud sync.

### 2.3 Arsitektur Pilar Skrining (MVP & Roadmap)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    READIKIDS AI — PILAR SKRINING                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  1. SILENT BEHAVIORAL TELEMETRY (CORE ENGINE — MVP) ✅ jadi  │   │
│  │     • Waktu reaksi (Reaction Time)                          │   │
│  │     • Hesitation Index (HI) — jeda ragu sebelum aksi        │   │
│  │     • Letter-Reversal Latency Ratio (kecepatan b/d, p/q)    │   │
│  │     • Number Line Estimation Error (NLEE) — Diskalkulia     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                               │                                     │
│                               ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  2. LLM ADAPTIVE RECOMMENDATION ENGINE (MVP) ✅ jadi (stub)  │   │
│  │     • Rencana Pendampingan otomatis (Gemini + fallback)     │   │
│  │     • Saran aktivitas pendampingan di rumah                 │   │
│  │     • Panduan rujukan ke layanan profesional                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                               │                                     │
│                               ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  3. REFERRAL BRIDGE (BARU DI v4.0 — MVP)                    │   │
│  │     • Laporan Rujukan PDF (skor, metrik, riwayat sesi)      │   │
│  │     • Direktori jenis layanan (psikolog anak, puskesmas,    │   │
│  │       klinik tumbuh kembang) — informasi statis, non-afiliasi│  │
│  └─────────────────────────────────────────────────────────────┘   │
│                               │                                     │
│                               ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  4. VISION MODULE ENHANCER (FUTURE ROADMAP)                 │   │
│  │     • MediaPipe FaceMesh (Iris tracking 468–477 titik)      │   │
│  │     • Fixation duration & Saccadic regression count         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Latar Belakang Masalah & Dasar Literatur

### 3.1 Data Kuantitatif & Acuan Riset

| Metrik / Temuan | Angka / Temuan | Acuan Literatur |
| --- | --- | --- |
| Populasi anak dengan disleksia global | **5–10%** | WHO |
| Estimasi populasi disleksia di Indonesia | **10–20%** (~3–6 juta anak usia SD) | Estimasi Pendidikan Dasar |
| Akurasi skrining berbasis Eye-Tracking | **93.6%** | IJISAE 2024 |
| Akurasi skrining berbasis Game Telemetry | **91.97%** | Dytective Patent (US Patent) |
| Rasio psikolog sekolah di Indonesia | **1:3.000** (ideal 1:150) | Kemenkes RI |

> **Catatan Validasi Ilmiah:** Angka akurasi dari penelitian terdahulu **digunakan sebagai landasan teori pengembangan, bukan klaim hasil pengujian klinis ReadiKids AI saat ini.**

### 3.2 Problem Statement (diperluas di v4.0)

> Keterbatasan alat skrining dini disleksia dan diskalkulia di Indonesia tidak hanya dialami sekolah, tetapi juga **keluarga di luar sistem sekolah formal**: anak homeschool, anak di daerah tanpa psikolog sekolah, dan keluarga yang tidak mampu mengakses asesmen formal yang mahal. Sementara itu, jendela intervensi paling efektif justru berada di usia 6–9 tahun. Dibutuhkan instrumen deteksi dini yang **dapat dijalankan siapa saja, di mana saja**, dengan jalur rujukan yang jelas menuju layanan pendidikan dan kesehatan profesional — tanpa menggantikan peran profesional tersebut.

### 3.3 Mengapa Perluasan ke Umum Menuntut Batasan Lebih Ketat

Tanpa guru/profesional sebagai perantara hasil, risiko salah tafsir oleh orang awam meningkat. Karena itu v4.0 menetapkan **prinsip komunikasi hasil**:

1. Hasil tidak pernah memakai bahasa vonis ("anak Anda disleksia") — selalu bahasa observasi ("ditemukan pola yang sebaiknya diobservasi lebih lanjut").
2. Setiap tampilan hasil menyertakan disclaimer skrining + ajakan konsultasi profesional (untuk level MEDIUM/HIGH).
3. Skor mentah komposit tidak ditampilkan menonjol ke pendamping awam; yang ditonjolkan adalah **kategori indikasi + langkah berikutnya**.
4. Tidak ada label yang tersimpan pada identitas anak — data tetap pseudonym.

---

## 4. Arsitektur Sistem

### 4.1 Diagram Arsitektur Utama (Behavioral-First)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    READIKIDS AI — ARSITEKTUR v4.0                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  FRONTEND & GAME ENGINE (React 18 + TS + Canvas 2D)         │   │
│  │  • Kid Mode (Visual, Auditory, Number Line Games)           │   │
│  │  • Companion Mode (Dashboard Pendamping, multi-profil anak) │   │
│  │  • Onboarding & Consent Flow (orang tua/wali)               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                 │                                                   │
│                 ├─── (Data Sentuhan, Hover, & Waktu Interaksi)      │
│                 ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  SILENT TELEMETRY LOGGER (Dexie.js / IndexedDB) ✅ jadi     │   │
│  │  • Buffer 60 FPS via useRef (Anti-freeze UI)                │   │
│  │  • Kalkulasi Latency, HI, Reversal Ratio, & NLEE            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                 │                                                   │
│                 ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  AI / ML ANALYTICS LAYER ✅ jadi (Layer 1 & 3)              │   │
│  │  • Layer 1: Client-Side Heuristic Risk Engine               │   │
│  │  • Layer 2: Behavioral ML Classifier (XGBoost/RF) — roadmap │   │
│  │  • Layer 3: Gemini API (Rencana Pendampingan generatif)     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                 │                                                   │
│                 ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  REFERRAL BRIDGE (BARU v4.0)                                │   │
│  │  • Generator Laporan Rujukan (PDF, on-device)               │   │
│  │  • Konten panduan rujukan statis (jenis layanan & kapan)    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                 │                                                   │
│                 ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  FUTURE ROADMAP MODULES                                     │   │
│  │  • Computer Vision Enhancer (MediaPipe FaceMesh WASM)       │   │
│  │  • Mode Institusi (kelola kelompok) — opsional              │   │
│  │  • Modul Edukasi — BELUM DIPUTUSKAN                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Alur Pengguna Utama (v4.0)

```
Pendamping buka aplikasi
   │
   ├─► [Pertama kali] Onboarding + Consent orang tua/wali
   │        • Penjelasan "apa ini & apa bukan ini" (skrining, bukan diagnosis)
   │        • Ekspektasi durasi tegas: "Tes ini memerlukan waktu ±10–15 menit
   │          dan sebaiknya diselesaikan tanpa jeda" (cegah sesi terputus)
   │        • Persetujuan eksplisit penyimpanan data on-device
   │
   ├─► Buat / pilih Profil Anak (pseudonym + usia 6–9 + tanggal mulai)
   │
   ├─► Serahkan perangkat ke anak (Kid Mode) — pendamping tetap di dekat anak
   │        • 3 mini-game 2D · TTS instruksi · silent telemetry berjalan
   │
   ├─► Sesi selesai → analisis otomatis (heuristic → risk assessment)
   │
   └─► Companion Mode menampilkan:
            • Kategori indikasi (bahasa observasi, bukan vonis)
            • Rencana Pendampingan (aktivitas rumah)
            • [MEDIUM/HIGH] Ajakan konsultasi + tombol "Ekspor Laporan Rujukan (PDF)"
            • Grafik perkembangan antar sesi
```

---

## 5. Komponen Teknis & Stack

| Komponen | Teknologi | Alasan Pemilihan Teknis | Status |
| --- | --- | --- | --- |
| **Frontend Framework** | React 18 + TypeScript + Vite | Concurrent rendering, type safety, HMR cepat | ✅ Fase 1 |
| **Styling** | Tailwind CSS | Utility-first untuk UI responsif | ✅ Fase 1 |
| **Game Engine** | React + HTML5 Canvas 2D | Minigame 2D ringan di semua perangkat | ⏳ Fase 2 |
| **Telemetry Storage** | Dexie.js (IndexedDB) | Pencatatan berkecepatan tinggi on-device | ✅ Fase 1 |
| **Rule-Based AI** | Client-Side Heuristic Engine | Skor indikasi instan di browser | ✅ Fase 1 |
| **Machine Learning** | Behavioral ML Classifier (XGBoost) | Klasifikasi pola multidimensi | ⚪ Roadmap |
| **Generative AI** | Gemini API + fallback lokal | Rencana Pendampingan adaptif | ✅ Fase 1 (stub) |
| **Ekspor Laporan** | Generator PDF on-device (mis. pdf-lib / react-pdf) | Laporan Rujukan tanpa server — data tidak keluar perangkat | 🆕 v4.0 |
| **Aksesibilitas** | Web Speech API | Narasi suara instruksi (TTS id-ID) | ✅ Fase 1 |
| **Vision (Roadmap)** | MediaPipe FaceMesh WASM | Pelacakan mata on-device versi lanjutan | ⚪ Roadmap |

---

## 6. Penerapan ML / AI & Kontribusi Utama

### 6.1 Empat Pilar Kontribusi AI (tidak berubah dari v2.0)

```
┌─────────────────────────────────────────────────────────────────────┐
│                       4 PILAR KONTRIBUSI AI                         │
├─────────────────────────────────────────────────────────────────────┤
│  1. Behavioral Pattern Recognition                                  │
│     Mengidentifikasi pola interaksi dari data mentah telemetri.     │
│                                                                     │
│  2. Risk Classification                                             │
│     Mengelompokkan indikasi tingkat risiko (Low, Medium, High).     │
│                                                                     │
│  3. Adaptive Recommendation                                         │
│     Menghasilkan Rencana Pendampingan personal (bukan kurikulum).   │
│                                                                     │
│  4. Progress Tracking                                               │
│     Memantau perkembangan perilaku antar sesi sebagai data          │
│     observasi longitudinal untuk profesional.                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Formulasi Metrik Behavioral Telemetry (tidak berubah — sudah terimplementasi & teruji di Fase 1)

| Metrik Telemetri | Formulasi | Ambang Indikasi |
| --- | --- | --- |
| **Letter-Reversal Latency Ratio** | latency(b/d/p/q) ÷ latency(a/m/o) | Ratio > **2.5** → hambatan orientasi spasial huruf (indikasi disleksia) |
| **Hesitation Index (HI)** | waktu ragu ÷ total waktu menjawab | HI > **0.35** → keraguan kognitif / hambatan pemrosesan fonetik |
| **Number Line Estimation Error (NLEE)** | \|posisi jawaban − posisi target\| ÷ panjang garis × 100% | NLEE > **15%** → defisit representasi mental angka (indikasi diskalkulia) |

Bobot skor komposit: **Reversal 40% · HI 30% · NLEE 30%**, dengan redistribusi bobot otomatis bila suatu metrik absen (mis. game garis bilangan belum dimainkan). Implementasi: `src/telemetry/MetricCalculator.ts` (✅ 16 unit test lulus).

> **Catatan kalibrasi v4.0:** karena populasi meluas (termasuk anak belum bersekolah), ambang per **usia** (bukan per kelas) perlu divalidasi pada fase kalibrasi. Field `ageYears` disiapkan agar ambang dapat dibedakan per kelompok usia (6–7 vs 8–9) di masa depan tanpa mengubah arsitektur.

### 6.3 Perubahan pada Lapisan Rekomendasi (IEP → Rencana Pendampingan)

* Prompt Gemini dan template lokal berganti kerangka: dari "rekomendasi guru + aktivitas orang tua" menjadi **"saran aktivitas pendampingan + panduan langkah rujukan"** — karena pendamping belum tentu guru.
* Struktur output baru: `{ summary, companionActivities[], referralGuidance[], disclaimer }`.
* Aturan bahasa: tanpa istilah diagnosis, tanpa janji hasil, nada suportif, Bahasa Indonesia sederhana.

---

## 7. Fitur & UI/UX (Mode Anak + Mode Pendamping)

### 7.1 Daftar Fitur Utama & Prioritas (v4.0)

| No | Nama Fitur | Deskripsi Teknis | Prioritas |
| --- | --- | --- | --- |
| 1 | **Gamified Screening Engine** | 3 Mini-game 2D (Visual/Huruf Cermin, Auditori/Phonics, Garis Bilangan/NLEE) | 🔴 MVP |
| 2 | **Silent Telemetry Collector** | Waktu reaksi, hesitation index, misclick — otomatis | 🔴 MVP ✅ |
| 3 | **Heuristic Risk Calculator** | Skor indikasi real-time di client-side | 🔴 MVP ✅ |
| 4 | **Onboarding & Consent Flow** 🆕 | Penjelasan posisi produk + persetujuan eksplisit orang tua/wali | 🔴 MVP |
| 5 | **Manajemen Profil Anak (multi-profil)** 🆕 | Satu pendamping mengelola ≥1 anak (pseudonym + usia) | 🔴 MVP |
| 6 | **Companion Dashboard** | Kategori indikasi (bahasa observasi), grafik HI/NLEE, perkembangan antar sesi | 🔴 MVP |
| 7 | **Rencana Pendampingan Generator** | Gemini API + fallback template lokal | 🔴 MVP ✅ (perlu re-frame) |
| 8 | **Laporan Rujukan (PDF)** 🆕 | Ekspor on-device: profil pseudonym, metrik, riwayat — dengan **header/footer disclaimer otomatis di setiap halaman**: *"Dokumen ini adalah Hasil Skrining Awal Risiko Belajar, bukan Surat Diagnosis Medis/Psikologis Resmi."* | 🔴 MVP |
| 9 | **Text-to-Speech (TTS)** | Narasi instruksi id-ID via Web Speech API | 🔴 MVP ✅ |
| 10 | **Panduan Rujukan Statis** 🆕 | Konten "kapan & ke mana mencari bantuan" (psikolog anak, puskesmas, klinik tumbuh kembang) | 🟡 MVP-sekunder |
| 11 | **Vision Module Enhancer** | Pelacakan mata MediaPipe FaceMesh | ⚪ Roadmap |
| 12 | **Mode Institusi** | Ringkasan kelompok untuk sekolah/lembaga | ⚪ Roadmap (opsional) |
| 13 | **Modul Edukasi** | Latihan/intervensi digital | ⚪ Roadmap (belum diputuskan) |

### 7.2 Prinsip UI Hasil untuk Pendamping Awam 🆕

1. **Kategori, bukan angka:** LOW → "Pola belajar tampak tipikal"; MEDIUM → "Ada pola yang sebaiknya diamati"; HIGH → "Disarankan konsultasi dengan profesional". Skor numerik tersedia di tampilan detail/laporan, bukan di layar utama.
2. **Ekspektasi durasi eksplisit:** layar onboarding menampilkan keterangan tegas *"Durasi tes ini sekitar 10–15 menit"* + anjuran menyelesaikan tanpa jeda — agar pendamping tidak menghentikan permainan di tengah jalan (sesi terputus menghasilkan trial parsial yang membiaskan metrik). *Angka durasi dikalibrasi ulang saat desain game final.*
3. **Selalu ada langkah berikutnya:** setiap hasil diikuti maksimal 3 tindakan konkret.
4. **Anti-labeling:** tidak ada kata "disleksia/diskalkulia" sebagai label anak di UI utama — istilah muncul hanya dalam konteks edukasi pendamping ("tentang apa yang diskrining alat ini").
5. **Kid Mode bebas hasil:** anak tidak pernah melihat skor, level, atau istilah risiko — hanya pujian netral atas partisipasi.

---

## 8. State Management & Optimasi Performa

Tidak berubah dari v2.0 dan **sudah terimplementasi di Fase 1**: telemetri 60 fps ditampung buffer in-memory (`useRef`/class field, bukan state React), batch write ke IndexedDB tiap 60 event atau 1 detik, `flush()` paksa di akhir trial/sesi, dan recovery buffer bila write gagal. Implementasi: `src/telemetry/TelemetryLogger.ts`.

Tambahan v4.0: dengan multi-profil pada satu perangkat, seluruh query dashboard difilter per `childRef` (pengganti `studentRef`) dan index Dexie yang ada (`sessionId`, `studentRef→childRef`, `completedAt`) sudah memadai tanpa migrasi skema besar — cukup rename field + tambah tabel `childProfiles`.

---

## 9. Mitigasi Risiko Demo & Fault Tolerance

```
┌─────────────────────────────────────────────────────────────────────┐
│                   GRACEFUL DEGRADATION                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  MODE ONLINE (Ideal)                                                │
│  • Silent Telemetry + Heuristic + Gemini (Rencana Pendampingan)     │
│  • Output: indikasi lengkap + rekomendasi generatif + PDF rujukan   │
│                                                                     │
│  MODE OFFLINE FALLBACK                                              │
│  • Silent Telemetry + Heuristic + Template lokal                    │
│  • Output: indikasi + rekomendasi berbasis aturan + PDF rujukan     │
│    (PDF dibuat on-device sehingga tetap berfungsi offline)          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

Implementasi fallback sudah selesai di Fase 1 (`generateIEP()` → akan di-rename `generateCompanionPlan()`): kegagalan API dalam bentuk apa pun tidak pernah melempar error ke UI.

---

## 10. Strategi Testing & Simulation Engine

* **Unit test core engine:** ✅ 16 tes lulus di Fase 1 (metrik, klasifikasi, simulator, fallback, batching logger).
* **BehavioralSimulator (Shift+D):** ✅ terimplementasi — menyuntikkan pola anomali (hesitasi ×3.5, latency reversal ×3.2, NLEE +28) untuk demo.
* **Tambahan rencana uji v4.0:**
  * Uji keterbacaan hasil oleh pendamping awam (usability testing non-guru).
  * Uji consent flow: tidak ada jalur masuk ke skrining tanpa persetujuan.
  * Uji Laporan Rujukan: PDF valid, lengkap, dan tidak memuat identitas asli.
  * Uji multi-profil: isolasi data antar anak pada satu perangkat.

---

## 11. Etika, Privasi Data, Consent & Compliance

Prinsip **Privacy by Design** dipertahankan dan diperketat:

* **Consent eksplisit orang tua/wali** 🆕 — wajib sebelum profil anak dibuat; teks consent menjelaskan apa yang direkam, di mana disimpan (hanya perangkat ini), dan cara menghapus.
* **Zero Camera Required (MVP):** skrining berjalan 100% tanpa izin webcam.
* **On-Device Storage:** seluruh data telemetri di IndexedDB perangkat pengguna; tidak ada server.
* **Pseudonymization:** profil anak memakai nama panggilan/pseudonym; sistem tidak meminta nama lengkap, NIK, atau sekolah.
* **Data minimization ke LLM:** prompt Gemini hanya berisi metrik agregat & level — tanpa identitas, tanpa data mentah (✅ sudah diuji di Fase 1).
* **Hak penghapusan:** `deleteStudentData()` (→ `deleteChildData()`) menghapus seluruh jejak satu anak (✅ terimplementasi).
* **Anti-misuse** 🆕 — mitigasi risiko khas penggunaan publik:
  * Hasil tidak dapat dibagikan sebagai "sertifikat/vonis" — PDF memuat **header/footer disclaimer otomatis di SETIAP halaman** (bukan hanya halaman pertama, agar tetap terbaca bila halaman dipisah/difoto): *"Dokumen ini adalah Hasil Skrining Awal Risiko Belajar, bukan Surat Diagnosis Medis/Psikologis Resmi."*
  * Batas usia divalidasi di onboarding; di luar 6–9 tahun aplikasi menolak membuat profil dengan penjelasan.
  * **Re-screening cooldown:** sistem menyarankan interval **minimal 2–4 minggu** sebelum skrining ulang pada anak yang sama. Alasannya dua arah: pengulangan terlalu cepat memicu efek hafal (latency turun → *false negative*) sekaligus efek jenuh (hesitasi naik → *false positive*), dan melindungi anak dari tes berulang akibat kecemasan pendamping. Mekanisme: **soft-block** — peringatan dengan penjelasan, namun dapat dilanjutkan bila sesi sebelumnya tidak valid (terputus, anak sakit, gangguan lingkungan); alasan pelanjutannya dicatat bersama sesi.
* **COPPA & GDPR-aligned:** perlindungan data anak sebagai standar desain.

---

## 12. Roadmap & Timeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FASE 1 — CORE SYSTEM ✅ SELESAI                                             │
│ • Setup React 18 + TS + Vite + Tailwind                                     │
│ • TelemetryDB + TelemetryLogger (Dexie/IndexedDB, batch 60fps)              │
│ • MetricCalculator + Heuristic Risk Engine + BehavioralEngine               │
│ • Generator rekomendasi (Gemini stub + fallback lokal) + Simulator + TTS    │
│ • 16 unit test lulus · type-check strict bersih                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ FASE 1.5 — ADAPTASI SCOPE v4.0 (kode)                                       │
│ • Rename: grade→ageYears (6–9), studentRef→childRef, IEP→RencanaPendampingan│
│ • Tabel childProfiles + validasi usia + deleteChildData()                   │
│ • Re-frame prompt Gemini & template lokal (aktivitas + panduan rujukan)     │
├─────────────────────────────────────────────────────────────────────────────┤
│ FASE 2 — GAME ENGINE & UI (menunggu desain)                                 │
│ • Canvas GameEngine + 3 mini-game (Visual, Phonics, NumberLine)             │
│ • Onboarding & Consent Flow · Manajemen multi-profil anak                   │
│ • Companion Dashboard (kategori indikasi + grafik perkembangan)             │
├─────────────────────────────────────────────────────────────────────────────┤
│ FASE 3 — REFERRAL BRIDGE, POLISH & UJI                                      │
│ • Generator Laporan Rujukan PDF on-device                                   │
│ • Konten panduan rujukan statis                                             │
│ • Usability test pendamping awam · uji graceful degradation · demo prep     │
├─────────────────────────────────────────────────────────────────────────────┤
│ ROADMAP (belum dijadwalkan)                                                 │
│ • Behavioral ML Classifier (XGBoost) · Vision Module (FaceMesh)             │
│ • Mode Institusi (opsional) · Modul Edukasi (belum diputuskan)              │
│ • Kalibrasi ambang per kelompok usia dengan data lapangan                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Struktur Folder & Rencana Perubahan Kode

### 13.1 Struktur Folder Proyek (v4.0)

```
readikids/
├── public/
│   └── fonts/
│       └── OpenDyslexic.otf
├── src/
│   ├── components/
│   │   └── Accessibility.tsx      ← Kontrol Text-to-Speech
│   ├── onboarding/                ← 🆕 v4.0
│   │   ├── ConsentFlow.tsx        ← Persetujuan orang tua/wali
│   │   └── ChildProfileForm.tsx   ← Buat profil (pseudonym + usia 6–9)
│   ├── game/
│   │   ├── GameEngine.tsx         ← React + Canvas 2D Wrapper
│   │   └── levels/
│   │       ├── VisualGame.tsx     ← Huruf cermin (b/d/p/q)
│   │       ├── PhonicsGame.tsx    ← Auditori & suara
│   │       └── NumberLineGame.tsx ← Garis bilangan (NLEE)
│   ├── telemetry/                 ← ✅ Fase 1
│   │   ├── TelemetryLogger.ts
│   │   ├── TelemetryDB.ts         ← + tabel childProfiles (v4.0)
│   │   ├── useTelemetry.ts
│   │   └── MetricCalculator.ts
│   ├── analytics/                 ← ✅ Fase 1
│   │   └── BehavioralEngine.ts
│   ├── ml/                        ← ✅ Fase 1 (perlu re-frame istilah)
│   │   ├── heuristic.ts
│   │   └── llmRecommendation.ts   ← generateCompanionPlan()
│   ├── companion/                 ← 🔁 pengganti dashboard/ (v4.0)
│   │   ├── CompanionDashboard.tsx ← Kategori indikasi + grafik + rencana
│   │   ├── ChildProfileManager.tsx← Multi-profil anak
│   │   └── ReferralReport.tsx     ← Pratinjau & ekspor Laporan Rujukan
│   ├── referral/                  ← 🆕 v4.0
│   │   ├── reportPdf.ts           ← Generator PDF on-device
│   │   └── referralGuide.ts       ← Konten panduan rujukan statis
│   ├── utils/                     ← ✅ Fase 1
│   │   ├── fallbackTemplates.ts   ← Re-frame: aktivitas + rujukan
│   │   ├── simulation.ts
│   │   └── tts.ts
│   ├── types/
│   │   └── telemetry.ts           ← grade→ageYears, studentRef→childRef
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   └── core.test.ts               ← ✅ 16 tes (akan bertambah)
├── package.json
└── vite.config.ts
```

### 13.2 Ringkasan Perubahan Kode Fase 1.5 (delta dari kode yang sudah ada)

| File | Perubahan |
| --- | --- |
| `types/telemetry.ts` | `grade: 1\|2\|3` → `ageYears: number` (validasi 6–9); `studentRef` → `childRef`; `StudentProfileForIEP` → `ChildProfileForPlan`; `IEPResult` → `CompanionPlanResult` dengan field `referralGuidance[]` |
| `TelemetryDB.ts` | Skema v2 Dexie: tambah tabel `childProfiles`; rename index `studentRef` → `childRef`; `deleteStudentData()` → `deleteChildData()` |
| `llmRecommendation.ts` | Prompt & parser re-frame: `companionActivities` + `referralGuidance`; hapus asumsi "guru" |
| `fallbackTemplates.ts` | Template ditulis ulang untuk pendamping generik + blok panduan rujukan per level |
| `heuristic.ts`, `MetricCalculator.ts`, `TelemetryLogger.ts`, `simulation.ts`, `tts.ts` | **Tidak berubah** (hanya ikut rename tipe) |
| `tests/core.test.ts` | Update nama + tes baru: validasi usia, isolasi multi-profil, struktur CompanionPlan |

---

## 14. Referensi & Daftar Pustaka

1. **KERIS Research Report (2024).** *Early Diagnostic Metrics for Special Learning Difficulties*. Korea Education and Research Information Service.
2. **Swami, G., & Yogesh, K. M. (2025).** *Multimodal AI Systems for Learning Difficulty Screening*. IEEE/SCITEPRESS.
3. **IJISAE. (2024).** *Special Learning Disability Detection using Eye Tracking and Behavioral Analytics*. International Journal of Intelligent Systems and Applications in Engineering, 12(3), 145–158.
4. **Rello, L., et al.** *Data Processing System for Dyslexia Risk Identification*. US Patent No. 11,334,803 B2 (Dytective).
5. **Rokade, D., et al. (2024).** *Screening Application for Dyslexia and Dysgraphia via Interaction Telemetry*. IEEE ICSCC.
