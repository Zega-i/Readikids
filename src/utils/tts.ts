/**
 * ReadiKids AI — Utilitas Text-to-Speech (Web Speech API).
 *
 * Narasi suara instruksi untuk anak yang belum lancar membaca.
 * Framework-agnostic; komponen Accessibility.tsx tinggal memanggil ini.
 */

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
export function speak(text: string, options: SpeakOptions = {}): Promise<void> {
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

export function stopSpeaking(): void {
  if (isTTSSupported()) window.speechSynthesis.cancel();
}
