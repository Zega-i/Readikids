# public/audio — Rekaman bunyi Sungai Bunyi (phonics)

Taruh 3 rekaman suku kata di sini agar game **Sungai Bunyi** memutar suara
**rekaman** (jernih & konsisten di semua perangkat), bukan TTS browser yang
sering salah ucap (mis. "na" jadi "nga", "ma" tak terdengar).

## File yang dibutuhkan (nama harus PERSIS)

- `ma.mp3`
- `na.mp3`
- `wa.mp3`

## Cara membuat yang baik

- Suara **native Bahasa Indonesia**, satu suku kata per file.
- **Jelas & tegas** — karena game ini menguji anak membedakan bunyi mirip
  (ma vs na), pengucapan harus tidak ambigu.
- **Volume seragam** di ketiga file, tanpa noise/latar.
- Durasi pendek (~0,5–1 detik). Format **MP3**.

## Catatan penting

- Selama file belum ada, game **otomatis fallback ke TTS** — jadi tetap jalan.
- Setelah menaruh file di sini, lakukan **build ulang / deploy**. File akan
  ikut di-precache PWA sehingga bisa diputar **offline**.
- Boleh juga menambah rekaman untuk pengecoh lain bila kelak dibutuhkan
  (mis. `la.mp3`, `va.mp3`), tapi saat ini hanya `ma/na/wa` yang diputar.
