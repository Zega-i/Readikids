# ALUR PENYELESAIAN GAME (KID MODE → COMPANION MODE)
Dokumen ini merangkum kesepakatan arsitektur untuk menangani transisi dari akhir fase permainan anak (Kid Mode) menuju pemrosesan data, dan akhirnya ke tampilan dashboard pendamping (Companion Mode).

## Konteks & Status Saat Ini
Aplikasi memiliki 3 game utama:
1. **Hutan Huruf** (10 soal: 6 mirror, 4 control) → mencatat Reversal Error & Reaction Time
2. **Sungai Bunyi** (10 soal: phonics) → mencatat Hesitation Index
3. **Bukit Angka** (10 soal: number line estimation) → mencatat NLEE

Saat ini, ketiga game sudah mengimplementasikan _Stratified Randomization_ untuk mencegah bias, dan game Bukit Angka menggunakan mekanisme tapak yang tersembunyi di awal. Layar `PuncakBintang.tsx` (W8b) telah dibuat sebagai penutup Kid Mode.

## Arsitektur Telemetri & State (di `App.tsx`)
`App.tsx` bertindak sebagai pengumpul data utama (State Manager). Ia harus menyimpan 3 *state* data mentah dari game:
```tsx
const [hutanData, setHutanData] = useState<HutanTrialEvent[] | null>(null);
const [sungaiData, setSungaiData] = useState<PhonicsTrialEvent[] | null>(null);
const [bukitData, setBukitData] = useState<NumberLineTrialEvent[] | null>(null);
```
Data ini dikumpulkan saat anak menyelesaikan masing-masing game. Ketiga data ini dibawa hingga layar Puncak Bintang (W8b).

## Alur Transisi Mockup Figma (W8b → W9 → W10 → W11)

### 1. W8b: Puncak Bintang (Layar Penutup Anak)
- Layar terakhir dari "Kid Mode".
- Mengandung tombol: **"BUKA CERITA UNTUK ORANG TUA →"**.
- Aksi tombol: Mengarahkan state layar ke **W9**.

### 2. W9: Cilo Menulis Cerita (Gerbang Pemrosesan Kritis)
Layar animasi loading. Ini **BUKAN** dekorasi palsu dengan `setTimeout` statis. Di balik layar, W9 bertanggung jawab mengeksekusi *pipeline* data:
1. **Agregasi Metrik:** Memasukkan `hutanData`, `sungaiData`, dan `bukitData` ke dalam `MetricCalculator.ts` untuk mendapatkan skor mentah.
2. **Klasifikasi Risiko:** Memasukkan hasil kalkulasi ke `heuristic.ts` untuk menentukan status riset (LOW/MEDIUM/HIGH) untuk diskalkulia & disleksia.
3. **Generate Rencana Pendampingan:** Memanggil fungsi generator (Gemini AI API atau *fallback* template lokal).
4. **Penyimpanan Lokal (Database):** Menyimpan *Session Object* utuh ke dalam IndexedDB (`TelemetryDB.ts`). *Ini krusial untuk fitur riwayat dan cooldown profil anak*.
5. **Transisi Otomatis:** Setelah semua komputasi di atas `resolve`, state berpindah secara *otomatis* ke **W10**. (Boleh disisipkan minimum *delay* ~2 detik untuk estetika loading).

### 3. W10: Cerita Cilo (Layar Hasil)
Layar presentasional murni.
- Menampilkan status evaluasi (dengan bahasa observasi, BUKAN diagnosis medis).
- Menampilkan tips pendampingan.
- **Dua aksi utama:**
  1. **"Simpan Laporan (PDF)"**: Menghasilkan PDF dari hasil observasi, *tanpa berpindah layar*.
  2. **"Mulai lagi →"**: Berpindah state layar ke **W11**.

### 4. W11: Beranda Pendamping (Companion Dashboard)
- Beranda utama untuk orang tua.
- Menampilkan profil anak, riwayat skrining dari DexieDB, aturan *cooldown* (14-28 hari), dll.

## Penting Untuk Agen Selanjutnya!
- JANGAN menyederhanakan perhitungan NLEE sebagai benar/salah. NLEE adalah *persentase deviasi spasial*: `|answerValue - target| / RANGE_MAX * 100`.
- JANGAN menyentuh `heuristic.ts` atau ambang batas di `MetricCalculator.ts` (2.5, 0.35, 15%) tanpa arahan eksplisit. Perubahan jumlah soal dari 12 ke 10 bisa membuat satu kesalahan mendistorsi rata-rata. Hal ini wajib dicatat dan diuji sebagai **Field Validation Item**. Ambang batas (*threshold*) mungkin perlu diturunkan berdasarkan pengujian lapangan.
- Selalu patuhi standar penulisan *UI Design System* yang telah ada di `CLAUDE.md`.
