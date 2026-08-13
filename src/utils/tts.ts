/**
 * ReadiKids AI — Utilitas Text-to-Speech.
 *
 * Narasi suara instruksi untuk anak yang belum lancar membaca.
 *
 * Alur (APK Android khususnya):
 *   1. Native TTS (Capacitor plugin) lebih diutamakan — Web Speech API TIDAK
 *      berfungsi di Android System WebView (fallback-nya senyap).
 *   2. Tunggu inisialisasi native selesai (race condition umum di APK: `speak()`
 *      dipanggil sebelum engine Android TextToSpeech `onInit`).
 *   3. Coba `id-ID` dulu, lalu `id`, dengan retry 1x — karena plugin native
 *      MENOLAK keras bahasa yang tak tersedia di perangkat.
 *   4. Jika native benar-benar tak tersedia, baru pakai Web Speech API.
 */
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';

export interface SpeakOptions {
  /** Kode bahasa BCP-47; default Bahasa Indonesia. */
  lang?: string;
  /** 0.1–10; anak SD nyaman di 0.85–0.95 (sedikit lebih lambat). */
  rate?: number;
  pitch?: number;
  volume?: number;
}

// ── Status inisialisasi native TTS ──
let nativeReady = false;
let nativeWaitPromise: Promise<boolean> | null = null;

/** True jika berjalan di perangkat native (Android/iOS) via Capacitor. */
function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Tunggu sampai native TTS siap dipakai (engine Android sudah `onInit`).
 * Plugin `speak`/`stop` menolak ("Not yet initialized") bila dipanggil
 * sebelum inisialisasi selesai — itu penyebab umum audio mati di APK.
 * Polling `getSupportedLanguages` (reject saat engine belum siap, resolve saat siap).
 */
export function warmUpNativeTTS(timeoutMs = 6000): Promise<boolean> {
  if (!isNative()) return Promise.resolve(false);
  if (nativeReady) return Promise.resolve(true);
  if (nativeWaitPromise) return nativeWaitPromise;

  nativeWaitPromise = (async () => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        await TextToSpeech.getSupportedLanguages();
        nativeReady = true;
        return true;
      } catch {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    return false;
  })();

  return nativeWaitPromise;
}

export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Buka halaman/setting pemasangan TTS Android (sekali ketuk oleh pengguna). */
export async function openTTSInstallGuide(): Promise<void> {
  if (!isNative()) return;
  try {
    await TextToSpeech.openInstall();
  } catch (e) {
    console.warn('[tts] openInstall gagal:', e);
  }
}

/** Bacakan teks lewat native TTS. Mengembalikan false bila gagal. */
async function speakNative(
  text: string,
  options: SpeakOptions,
  retry = true,
): Promise<boolean> {
  const langs = [...new Set([options.lang ?? 'id-ID', 'id-ID', 'id'])];
  for (let attempt = 0; attempt < (retry ? 2 : 1); attempt++) {
    for (const lang of langs) {
      try {
        await TextToSpeech.speak({
          text,
          lang,
          rate: options.rate ?? 0.9,
          pitch: options.pitch ?? 1.05,
          volume: options.volume ?? 1.0,
        });
        return true;
      } catch (e) {
        console.warn(`[tts] native gagal (lang=${lang}, attempt=${attempt + 1}):`, e);
      }
    }
    // Retry 1x setelah jeda singkat — menutup race init yang masih berjalan.
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

/**
 * Bacakan teks; utterance sebelumnya dihentikan agar tidak menumpuk.
 * Mengembalikan Promise yang selesai saat suara beres atau gagal, agar game
 * bisa sinkronisasi waktu telemetrinya.
 */
export async function speak(text: string, options: SpeakOptions = {}): Promise<void> {
  if (isNative()) {
    const ready = await warmUpNativeTTS();
    if (ready && (await speakNative(text, options))) {
      return;
    }
    console.warn('[tts] native tidak tersedia, fallback Web Speech API.');
  }

  // Fallback ke Web Speech API (berfungsi di Chrome desktop/mobile,
  // TIDAK di Android System WebView — di sana fallback ini senyap).
  return new Promise((resolve) => {
    if (!isTTSSupported()) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang ?? 'id-ID';
    utterance.rate = options.rate ?? 0.9;
    utterance.pitch = options.pitch ?? 1.05;
    utterance.volume = options.volume ?? 1;

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

export async function stopSpeaking(): Promise<void> {
  if (isNative()) {
    try {
      await TextToSpeech.stop();
    } catch (e) {
      // Abaikan error saat stop
    }
  }

  if (isTTSSupported()) {
    window.speechSynthesis.cancel();
  }
}
