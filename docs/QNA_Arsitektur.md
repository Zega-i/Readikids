# Q&A Arsitektur PWA ReadiKids AI

Dokumen ini berisi rekaman diskusi arsitektur teknis mengenai keputusan membangun ReadiKids AI sebagai PWA (Progressive Web App) tanpa *backend* terpusat, serta bagaimana menangani kendala hosting, update APK, integrasi API, dan Machine Learning.

---

### Q1: Sebenarnya proyek ini memerlukan *set up backend* atau tidak? Jika tidak, bagaimana agar web selalu menyala terus?

**A:**  
**TIDAK**, proyek ini sama sekali tidak memerlukan setup backend tradisional (seperti Node.js, Express, PHP, Laravel) maupun database online (MySQL, Supabase).

**Bagaimana web selalu menyala (Hosting)?**  
Meskipun tidak punya *backend*, aplikasi ini berupa file statis (HTML, CSS, JavaScript) hasil *build* Vite. Anda bisa menghosting file statis ini secara **GRATIS 24/7** menggunakan layanan Static Hosting seperti **Vercel**, **Netlify**, atau **GitHub Pages**. 
Setiap kali Anda *push* kode ke GitHub, layanan ini akan otomatis mem-build dan memperbarui web Anda yang selalu menyala tanpa perlu mengurus pemeliharaan server.

**Lalu di mana datanya disimpan?**  
Semua data (Profil Anak, Sesi Game, Hasil Skor telemetri) disimpan di **IndexedDB** lokal. Ini adalah database bawaan yang menempel pada browser/HP pengguna (On-Device). Keunggulannya:
- **Privasi Terjamin:** Data sensitif anak tidak pernah dikirim ke server internet (sesuai aturan COPPA/GDPR).
- **Offline-First:** Anak tetap bisa bermain dan mendapat hasil skrining meski tidak ada koneksi internet.

---

### Q2: Saat nanti di-build menjadi APK, apakah APK-nya bisa otomatis up to date seperti saat kita update aplikasi via Play Store?

**A:**  
**SANGAT BISA, bahkan jauh lebih efisien.**

Aplikasi ini menggunakan teknologi **TWA (Trusted Web Activity)** — yang dapat dibuat menggunakan *Bubblewrap* atau *PWABuilder*. APK yang dihasilkan pada dasarnya adalah bungkusan (shell) yang menjalankan web PWA Anda secara *fullscreen*.

Berbeda dengan APK konvensional (Java/Kotlin) yang mewajibkan pengguna mengunduh ulang update puluhan Megabyte dari Play Store, **Update PWA (TWA) terjadi via Over-The-Air (OTA)**. 
Saat Anda memperbarui kode dan mem-push-nya ke Vercel, *Service Worker* di latar belakang aplikasi (di HP pengguna) akan mendeteksi perubahan tersebut dan memperbarui file secara otomatis. Besok harinya saat pengguna membuka APK tersebut, fitur atau *bug fix* terbaru sudah langsung tersedia. Pembaruan via Play Store hanya diperlukan jika Anda mengubah Ikon Aplikasi, Nama Aplikasi, atau meminta *permission* Android baru.

---

### Q3: Bagaimana dengan penerapan AI (Gemini) yang membutuhkan API Provider? 

**A:**  
Saat ini, proyek telah terhubung dengan **Supabase** (sebagai database online) yang juga memfasilitasi integrasi Backend/Edge Function.
API Key Gemini disimpan dengan aman sebagai variabel lingkungan (Environment Variables) di server. 
- PWA (HP Pengguna) mengirim data skor agregat ke API internal (atau Serverless Functions Vercel/Supabase).
- API tersebut meneruskannya ke Google Gemini, menerima jawaban (Rencana Pendampingan), dan mengirimnya kembali ke PWA.
- Dengan cara ini, API Key tetap aman, dan Anda tetap tidak perlu membayar mahal atau mengelola server mandiri.

---

### Q4: Apakah Machine Learning tambahan (Computer Vision) bisa diterapkan di dalam PWA?

**A:**  
**SANGAT BISA.** Tren saat ini mengarah pada *Edge Computing* atau **On-Device AI**, dan ini sudah tercatat dalam roadmap proyek (seperti *XGBoost Classifier* dan *MediaPipe FaceMesh*).

Alih-alih mengirim data ke server Python untuk diproses, pemrosesan ML dilakukan langsung di browser HP pengguna menggunakan RAM mereka sendiri:
1. **Model Statis (TensorFlow.js / ONNX Web):**
   Anda melatih model ML di laptop, lalu mengekspor model tersebut menjadi file `.json` atau `.onnx`. File ini diletakkan di folder `public/` web Anda. PWA hanya perlu mengunduh file statis ini sekali, lalu menjalankan inferensi klasifikasi risiko secara offline di browser.
2. **Vision (MediaPipe / Eye Tracking):**
   Teknologi WebAssembly (Wasm) memungkinkan browser mengakses kamera HP dan menjalankan pendeteksian titik wajah (FaceMesh) secara *real-time*. Gerakan mata atau ekspresi kebingungan direkam dan dianalisis langsung di perangkat, lalu dibuang. Tidak ada satu pun potongan video anak yang diunggah ke internet, menjadikan privasi aplikasi ini sangat ketat (Privacy by Design).

---
*(Catatan Tambahan untuk Presentasi)*
Gunakan keyword ini jika ditanya penguji: 
**"Aplikasi ini mengadopsi arsitektur Edge Computing dan Local-first PWA, di mana inferensi Machine Learning dan Database dijalankan 100% on-device menggunakan IndexedDB dan WebAssembly (Wasm) untuk menjaga privasi ketat data anak."**