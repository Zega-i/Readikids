# design/ — Sumber Kebenaran Visual ReadiKids

Ada **2 konsep desain final** hasil eksplorasi (Juli 2026). Keduanya lengkap
(Android + Web), keduanya memenuhi semua guardrail skrining. Pilih SATU untuk
diimplementasikan; yang lain disimpan sebagai alternatif.

| Konsep | Karakter | Folder |
| --- | --- | --- |
| **ANGKASA** | Luar angkasa gelap + neon, robot BIP, anak = astronot, hasil = "transmisi" | `angkasa/` |
| **CILO v2** | Buku stiker siang hari, maskot Cilo, papan kayu, hasil = "cerita", progres = album stiker | `cilo/` |

File Figma (sumber master): `RnC5j1ifviHSKlYnEA8CvK`
- ANGKASA Android → halaman "Konsep ANGKASA — ANDROID" (node 78:2)
- ANGKASA Web → halaman "Konsep ANGKASA WEB" (node 75:2)
- CILO Android → halaman "Konsep FRESH — Dunia Stiker Cilo" (node 56:2)
- CILO Web → halaman "CILO v2 WEB" (node 72:2)

Link cepat: `https://www.figma.com/design/RnC5j1ifviHSKlYnEA8CvK/?node-id=<ID>`
(ganti `:` dengan `-`, mis. node 78:2 → `node-id=78-2`)

## Isi folder

```
design/
├── README.md                  ← file ini
├── angkasa/
│   ├── DESIGN-SPEC.md         ← token, anatomi, inventaris layar + node-id
│   └── mockups/
│       ├── android/           ← PNG ekspor dari Figma (lihat cara di bawah)
│       └── web/
├── cilo/
│   ├── DESIGN-SPEC.md
│   └── mockups/
│       ├── android/
│       └── web/
└── archive/                   ← design system lama (ceria-lembut) — BUKAN acuan
```

## Cara mengisi PNG mockup (sekali, ±5 menit)

1. Buka file Figma di atas.
2. Buka halaman konsep (mis. "Konsep ANGKASA — ANDROID").
3. Seleksi semua frame layar (drag / Ctrl+A), di panel kanan klik **Export**
   → PNG → 1x → **Export N layers**.
4. Pindahkan hasilnya ke folder `mockups/android/` atau `mockups/web/` yang
   sesuai. Nama file dari Figma sudah berurutan (01 · …, WA-01 · …), biarkan.
5. Ulangi untuk 3 halaman lainnya.

> Alternatif tanpa ekspor manual: jika Claude Code tersambung ke **Figma MCP**
> (server resmi Figma), ia bisa membaca frame langsung dari node-id yang
> tercantum di DESIGN-SPEC.md — PNG lokal menjadi opsional.

## Aturan penggunaan untuk Claude Code

1. Baca `DESIGN-SPEC.md` konsep terpilih SEBELUM mengerjakan UI apa pun —
   semua warna/anatomi/copy diambil dari sana, lalu didaftarkan sebagai token
   Tailwind (dilarang hex hardcoded di komponen).
2. Implementasi dianggap selesai bila screenshot hasil ≈ mockup (layout,
   warna, proporsi, hierarki) DAN guardrail di `CLAUDE.md` terpenuhi.
3. Guardrail yang berlaku untuk KEDUA konsep (tidak bisa dinegosiasi):
   - Ubin/pod jawaban anak SERAGAM warnanya — konten adalah satu-satunya pembeda.
   - Tanpa skor, timer terlihat, atau umpan balik benar/salah di layar anak.
   - Progres tanpa angka (peta perjalanan / album stiker).
   - Bahasa hasil = observasi ("Perlu Diamati"), bukan vonis.
   - Disclaimer skrining di setiap tampilan hasil & setiap halaman PDF.
   - Anak tidak pernah melihat hasil (ritual serah-HP memisahkan zona).
   - Cooldown 14–28 hari (soft-block + alasan override dicatat), consent
     menggerbang profil, usia 6–9, tanpa akun, 100% on-device.
4. Layar bergaya dokumen (Laporan PDF) adalah pratinjau dokumen untuk
   profesional — kepadatannya disengaja, jangan "disederhanakan".
