# DESIGN-SPEC — Cilo v2 (Dunia Stiker) · versi 3 · Juli 2026

> Buku stiker siang hari. Anak menjelajah 4 tempat bersama maskot **Cilo**
> (kancil cokelat, telinga bundar, pipi merona). Semua elemen penting bergaya
> **stiker**: garis tepi putih tebal + bayangan lembut.
> File Figma `RnC5j1ifviHSKlYnEA8CvK` · Android page `56:2` · Web page `72:2`

---

## 1. Token Warna

| Token           | Hex                      | Pakai untuk                                    |
|-----------------|--------------------------|------------------------------------------------|
| `ink`           | `#4A3728`                | Teks utama                                     |
| `ink.muted`     | `#6B5A48`                | Teks sekunder (gunakan ini, bukan #8A7A66)     |
| `paper`         | `#FFF6E9`                | Kartu, pod jawaban, latar ortu                 |
| `sky1→sky2`     | `#BFE5F5 → #EAF7E0`      | Gradien langit landing                         |
| `grass.light`   | `#8FCF74`                | Bukit dekoratif                                |
| `grass`         | `#6DBB57`                | CTA hijau anak (teks: ink, bukan putih)        |
| `wood`          | `#C98A4B`                | Papan kayu                                     |
| `wood.dark`     | `#8A5A2B`                | Border papan kayu                              |
| `sun`           | `#FFD34D`                | CTA kuning, stimulus huruf                     |
| `berry`         | `#F2704E`                | Dunia angka                                    |
| `water`         | `#58B7E8`                | Dunia bunyi                                    |
| `night`         | `#9B7BD8`                | Puncak Bintang                                 |
| `green.web`     | `#3E8E5A`                | CTA hijau web (kontras aman, teks putih OK)    |
| `strip`         | `#F3E9D7`                | Strip disclaimer web                           |
| `card.cerita`   | `#FDF0C2`                | Kartu kutipan Cilo                             |
| `card.hasil`    | `#EAF7E0`                | Kartu hasil                                    |
| `card.info`     | bg `#EAF3FF`             | Kartu info/edukasi mikro                       |
| `card.info.teks`| `#2B5C8A` / `#4A6B8A`   | Teks kartu info                                |
| `badge.amati`   | `#9A6B00`                | Label "PERLU DIAMATI"                          |

### ⚠ Catatan Kontras (WCAG AA)
- Teks putih di atas `grass` #6DBB57 = 2.4:1 → GAGAL. Pakai teks `ink`
- Teks putih di atas `green.web` #3E8E5A = 4.0:1 → OK untuk teks besar
- `ink` di atas `sun` #FFD34D = 7.9:1 → aman
- `ink.muted` #6B5A48 di atas `paper` = 6.2:1 → aman

### Gradien latar dunia

| Dunia          | Gradien                  |
|----------------|--------------------------|
| Hutan Huruf    | `#CBEBB4 → #6DBB57`      |
| Sungai Bunyi   | `#D6F0FB → #58B7E8`      |
| Bukit Angka    | `#FFE9C9 → #F2A65A`      |
| Puncak Bintang | `#1F193B → #624DA8`      |

---

## 2. Gaya Stiker (identitas visual inti)

- Stroke putih `#FFFFFF` 4–6px **di luar** shape (`strokeAlign: outside`)
- Bayangan: `box-shadow: 0 4px 10px rgba(74,55,40,0.18)`
- Berlaku untuk: maskot, stimulus, pod jawaban, CTA, kartu langkah, slot album
- Font: **Nunito Black** (judul/CTA/stimulus) + **Nunito Bold** (body)
- Teks di atas papan kayu: krem `#FFF6E9`
- TANPA animasi selama trial game berjalan

---

## 3. Maskot Cilo

```
Kepala: elips #B67B4F
Telinga: #A9714B (inner #FBD3B8)
Mata: #3B2A1D
Pipi: #F2A08D
Badan: #C98A63
Semua elemen: stroke stiker putih 4px
Versi kecil (avatar): boleh tanpa badan
```

---

## 4. Anatomi Layar Game (WAJIB konsisten di semua dunia)

```
┌─────────────────────────────────────────────────┐
│  ‹ (bundar putih)   JUDUL DUNIA (papan kayu)  🔊│
│                  ○ ○ ○ ○  ← album stiker        │
│                                                  │
│  [Cilo + balon    ] [  STIMULUS RAKSASA       ]  │
│  [bicara 1 instruksi]  (bergaya stiker)          │
│                                                  │
│         [ pod ] [ pod ] [ pod ]                  │
│      hint lembut 1 baris ("semua boleh 🌱")      │
└─────────────────────────────────────────────────┘
```

- Album stiker: slot terisi = warna dunia, aktif = border kuning, belum = pudar 45%
- Pod: lingkaran krem `#FFF6E9` seragam, teks ink — TIDAK dibedakan warna

---

## 5. Inventaris Layar — ANDROID (page 56:2, frame 412×892)

| #   | Nama Frame                    | Node   | Peran                                              |
|-----|-------------------------------|--------|----------------------------------------------------|
| 01  | Mulai                         | 56:4   | Landing: judul → Cilo → CTA → 3 stiker langkah    |
| 02  | Gerbang Orang Tua             | 63:2   | Consent + profil anak (nama + usia 6–9)            |
| 03  | Serahkan HP                   | 63:57  | Ritual serah HP + tips menemani                    |
| 04  | Peta Dunia                    | 56:30  | Papan penunjuk + jejak setapak + papan tujuan      |
| 05  | Hutan Huruf                   | 57:2   | Game 1 — Letter-Reversal (b/d/p/q vs a/m/o)       |
| 05b | Stiker Baru — Hutan           | 285:2  | Selebrasi: album stiker slot 1 terisi              |
| 06  | Sungai Bunyi                  | 64:2   | Game 2 — Hesitation Index (m/n/w + dengar lagi)   |
| 07  | Bukit Angka                   | 57:35  | Game 3 — NLEE (garis bilangan + LOMPAT)            |
| 08  | Puncak Bintang                | 59:2   | Penutup malam + ritual kembalikan HP               |
| 08b | Cilo Menulis Cerita           | —      | Loading/analisis AI                                |
| 09  | Cerita Cilo (hasil)           | 59:27  | Hasil naratif + chip status + misi rumah           |
| 10  | Beranda (kembali lagi)        | 65:2   | Beranda kunjungan berikutnya                       |
| 10b | Beranda — masa istirahat      | 65:39  | Varian cooldown                                    |
| 11  | Riwayat                       | 66:2   | Jejak petualangan + tren antar sesi                |
| 12  | Laporan PDF                   | 68:3   | Pratinjau dokumen untuk profesional                |
| 13  | Kelola                        | 66:38  | Profil, suara, font disleksia, hapus data          |

---

## 6. Inventaris Layar — WEB (page 72:2, 1280×852)

### Alur lengkap

```
W0 Gerbang Cilo
 ├─ ⬇ Pasang Aplikasi ──────────────→ W0b modal (tutup → W0)
 ├─ Beranda Pendamping ─────────────→ W11
 └─ MULAI PETUALANGAN ──────────────→ W1
                                        └─ SERAHKAN LAYAR → W2
                                                              │
                    ┌─────────────────────────────────────────┘
                    ↓
              W3 Hutan Huruf → W3k Soal Kontrol → W4 Stiker 🌳
                                                    └→ W5 Sungai Bunyi
              W5 Sungai Bunyi → W6 Stiker 🌊 → W7 Bukit Angka
              W7 Bukit Angka → LOMPAT → W8 Stiker ⛰ → W8b Puncak Bintang
              W8b → W9 Loading → W10 Cerita Cilo → W11 Beranda
              W11 → MULAI LAGI → W2 (tanpa izin ulang)
```

### Daftar frame

| #   | Nama Frame                    | Node   | Catatan                                            |
|-----|-------------------------------|--------|----------------------------------------------------|
| W0  | Gerbang Cilo (landing)        | 109:2  | Hero 2 kolom: headline kiri, Cilo kanan            |
| W0b | Pasang Aplikasi (modal)       | 300:2  | Overlay di atas landing, 2 langkah install         |
| W1  | Izin & Serah Layar            | 296:2  | Consent + nama anak (input box) + usia + checkbox  |
| W2  | Peta Dunia                    | 72:49  | Setapak horizontal + papan penunjuk                |
| W3  | Hutan Huruf — soal cermin     | 73:2   | Stimulus b/d/p/q, pod 3 pilihan                    |
| W3k | Hutan Huruf — soal kontrol    | 348:2  | Stimulus a/m/o, IDENTIK visual dengan W3           |
| W4  | Stiker Baru — Hutan Huruf     | 299:2  | Selebrasi, album slot 1 terisi, CTA → W5           |
| W5  | Sungai Bunyi                  | 342:2  | Stimulus lonceng 🔔, pod m/n/w, btn dengar lagi    |
| W6  | Stiker Baru — Sungai Bunyi    | 343:2  | Selebrasi, album slot 2 terisi, CTA → W7           |
| W7  | Bukit Angka                   | 342:54 | Garis bilangan 0–10, tapak geser, btn LOMPAT       |
| W8  | Stiker Baru — Bukit Angka     | 343:40 | Selebrasi, album slot 3 terisi, CTA → W8b          |
| W8b | Puncak Bintang                | 354:10 | Latar malam ungu, album penuh, ritual serah layar  |
| W9  | Cilo Menulis Cerita (loading) | 144:46 | Loading analisis AI, auto → W10                    |
| W10 | Cerita Cilo (hasil)           | 73:36  | Naratif + chip status + bar % + misi + cooldown    |
| W11 | Beranda Pendamping            | 72:4   | Dashboard ortu, cerita terakhir, misi rumah        |

---

## 7. Catatan Penting per Layar

### W3 & W3k — Hutan Huruf
- W3 (cermin) dan W3k (kontrol) HARUS identik secara visual
- Hanya huruf stimulus dan isi pod yang berbeda
- Di kode: keduanya adalah jenis trial berbeda dalam SATU komponen VisualGame
- Prototype Figma menyambungkannya berurutan hanya untuk preview

### W7 — Bukit Angka
- BUKAN pilihan ganda — garis bilangan kontinu
- NLEE = |posisi jawaban − target| ÷ panjang garis × 100%
- Tidak ada tick/penanda di antara 0 dan 10
- Dua event terpisah: posisi geser + tap LOMPAT

### W10 — Cerita Cilo
- Chip status: `PERLU DIAMATI` (#9A6B00) / `TIPIKAL` (#2F5B23)
- Bar persentase per domain (placeholder — angka dari telemetri nyata)
- Kartu cooldown: tanggal skrining berikutnya (2–4 minggu)
- Tombol PDF: simpan laporan
- Disclaimer WAJIB di bagian bawah

---

## 8. Copy Kunci (jangan diubah maknanya)

```
Hasil naratif:
"Kata Cilo… Sari lincah sekali di Bukit Angka! Tapi di Hutan Huruf
dia sering berhenti lama — huruf b dan d suka bertukar di matanya."

Status:
"Baca-tulis · PERLU DIAMATI" / "Berhitung · TIPIKAL"

Edukasi mikro:
"kenapa b & d suka tertukar? wajar di usia dini — jadi perlu
diamati, bukan dicemaskan."

Disclaimer:
"Cerita ini adalah pengamatan perilaku bermain — bukan diagnosis.
Kepastian hanya bisa diberikan oleh profesional."

Cooldown:
"Skrining berikutnya sekitar [tanggal] (2–4 minggu dari sekarang).
Pengulangan terlalu cepat dapat membiaskan hasil."
```
