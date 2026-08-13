/**
 * ReadiKids AI — Unduh/berbagi file (khususnya PDF laporan) lintas platform.
 *
 * Kenapa tidak sekadar `a[download]` + blob URL: di WebView Android (Capacitor)
 * pola itu TIDAK berfungsi — WebView tidak punya download manager untuk URL
 * blob, jadi klik tidak menghasilkan apa pun. Solusi idiomatik:
 *
 *   1. APK/native  → tulis file ke penyimpanan aplikasi (Directory.Documents)
 *                    lalu buka share sheet Android (simpan ke Files/Drive/
 *                    WhatsApp/email, dst).
 *   2. Web (browser)→ Web Share API (navigator.share dengan File).
 *   3. Web lama     → fallback unduhan blob klasik.
 *
 * Seluruh byte dibuat on-device — tidak ada data yang meninggalkan perangkat.
 */
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

/** Karakter aman untuk nama file lintas-platform. */
const FILENAME_SAFE = /[^a-zA-Z0-9._-]/g;

function sanitizeFilename(name: string): string {
  return name.replace(FILENAME_SAFE, '-');
}

/** Uint8Array → base64 tanpa membludakkan stack (chunked). */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** APK: simpan ke penyimpanan app lalu buka share sheet. */
async function shareViaNative(bytes: Uint8Array, filename: string): Promise<void> {
  const path = sanitizeFilename(filename);
  // Tanpa `encoding` → plugin menulis data base64 sebagai file BINER (binary).
  await Filesystem.writeFile({
    path,
    data: uint8ToBase64(bytes),
    directory: Directory.Documents,
  });
  const uri = await Filesystem.getUri({ path, directory: Directory.Documents });
  await Share.share({
    title: 'Laporan ReadiKids',
    dialogTitle: 'Simpan atau bagikan laporan',
    files: [uri.uri],
  });
}

/** Unduhan blob klasik — fallback web terakhir. */
function downloadBlob(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitizeFilename(filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke tertunda — revoke langsung dapat membatalkan navigasi di beberapa WebView.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Titik masuk simpan/berbagi PDF. Melempar error bila benar-benar gagal
 * (mis. gagal menulis file), agar caller bisa menampilkan pesan.
 */
export async function savePdf(bytes: Uint8Array, filename: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await shareViaNative(bytes, filename);
    return;
  }

  // Web: coba Web Share API dengan file; tangani pembatalan user dengan tenang.
  const file = new File([bytes as BlobPart], sanitizeFilename(filename), { type: 'application/pdf' });
  try {
    if (
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({ files: [file], title: 'Laporan ReadiKids' });
      return;
    }
  } catch (err) {
    // User membatalkan lembar berbagi → bukan error. Selain itu → fallback blob.
    if (err instanceof Error && err.name === 'AbortError') return;
  }

  downloadBlob(bytes, filename);
}
