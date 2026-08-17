import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fonts/*.otf'],
      manifest: {
        id: '/',
        name: 'ReadiKids AI — Skrining Dini Hambatan Membaca',
        short_name: 'ReadiKids',
        description:
          'Skrining awal indikasi risiko kesulitan membaca untuk anak 6–9 tahun lewat permainan. Bukan alat diagnosis.',
        lang: 'id',
        start_url: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f1f5f9',
        theme_color: '#4f46e5',
        icons: [
          { src: 'pwa-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache seluruh aset build → aplikasi 100% berfungsi offline.
        globPatterns: ['**/*.{js,css,html,png,svg,otf,woff2,mp3,wav,ogg}'],
        // SPA fallback: navigasi halaman dilayani index.html...
        navigateFallback: 'index.html',
        // ...KECUALI /api/* — itu serverless function (proxy AI), harus tembus
        // ke server, jangan dilayani cache. Tidak memengaruhi panggilan fetch.
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  server: {
    port: 5173,
  },
  build: {
    sourcemap: true,
  },
});
