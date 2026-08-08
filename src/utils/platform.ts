/**
 * ReadiKids AI — Deteksi platform runtime.
 *
 * Dipakai untuk membedakan perilaku APK (native Capacitor) vs web browser.
 * Contoh: checklist "misi rumah" interaktif + tersimpan HANYA di APK; di web
 * hanya ditampilkan (read-only).
 */
import { Capacitor } from '@capacitor/core';

/** True bila berjalan di dalam APK/native Capacitor; false di browser web. */
export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}
