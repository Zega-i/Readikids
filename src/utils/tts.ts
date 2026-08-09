/**
 * ReadiKids AI — Utilitas Text-to-Speech (Web Speech API).
 *
 * Narasi suara instruksi untuk anak yang belum lancar membaca.
 * Menggunakan Capacitor TTS jika berjalan di perangkat Native,
 * fallback ke Web Speech API jika di browser.
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

export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Bacakan teks; utterance sebelumnya dihentikan agar tidak menumpuk.
 * Mengembalikan Promise yang selesai saat suara beres atau gagal, agar game
 * bisa sinkronisasi waktu telemetrinya.
 */
export async function speak(text: string, options: SpeakOptions = {}): Promise<void> {
  // Jika berjalan di perangkat Native (Android/iOS) via Capacitor
  if (Capacitor.isNativePlatform()) {
    try {
      await TextToSpeech.speak({
        text: text,
        lang: options.lang ?? 'id-ID',
        rate: options.rate ?? 0.9,
        pitch: options.pitch ?? 1.05,
        volume: options.volume ?? 1.0,
      });
      return;
    } catch (e) {
      console.warn("Native TTS error, mencoba fallback:", e);
      // Jika native gagal, biarkan turun ke Web Speech API di bawah
    }
  }

  // Fallback ke Web Speech API
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

    // Resolve saat suara selesai atau error
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

export async function stopSpeaking(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
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
