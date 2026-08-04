import { useEffect, useState } from "react";
import { CiloKancil } from "./CiloKancil";

/**
 * W0b · Modal "Pasang Aplikasi" (PWA install).
 *
 * Berdiri sendiri agar mudah ditemukan/diperbaiki/ditambah: seluruh UI +
 * logika `beforeinstallprompt` ada di sini. LandingPage cukup mengatur
 * buka/tutup dan memanggil <InstallModal />.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// Langkah pemasangan manual per platform (kalau prompt bawaan tak tersedia).
const installSteps = [
  { icon: "🖥️", title: "Chrome / Edge", desc: "klik ikon pasang ⊕ di kolom alamat" },
  { icon: "📱", title: "Android", desc: "menu ⋮ → “Tambahkan ke layar utama”" },
];

interface InstallModalProps {
  open: boolean;
  onClose: () => void;
}

export default function InstallModal({ open, onClose }: InstallModalProps): JSX.Element | null {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Tangkap event install bawaan browser (Chrome/Edge/Android).
  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Tutup dengan tombol Escape saat modal terbuka.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // CTA: pakai prompt pasang bawaan bila ada (satu-ketuk); jika tidak,
  // cukup tutup — pengguna mengikuti langkah manual di atas.
  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#fff6e9] rounded-[24px] border-4 border-solid border-white shadow-[0px_12px_40px_rgba(74,55,40,0.28)] p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tombol tutup */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full text-[#6b5a48] hover:bg-black/5 text-2xl leading-none cursor-pointer"
        >
          ×
        </button>

        {/* Header: maskot Cilo + judul */}
        <div className="flex items-start gap-4 pr-8">
          <div className="w-[72px] h-[86px] shrink-0 relative" aria-hidden="true">
            <div className="absolute top-0 left-0 origin-top-left scale-[0.245]">
              <CiloKancil />
            </div>
          </div>
          <div className="pt-1">
            <h2
              id="install-title"
              className="font-black text-2xl sm:text-[26px] leading-tight text-[#4a3728]"
            >
              Pasang Cilo di perangkat
            </h2>
            <p className="font-bold text-sm text-[#8a7a66] mt-1">
              Sekali pasang, bisa dibuka tanpa internet.
            </p>
          </div>
        </div>

        {/* Langkah pemasangan */}
        <div className="mt-6 flex flex-col gap-3">
          {installSteps.map((step) => (
            <div
              key={step.title}
              className="flex items-center gap-4 bg-white rounded-2xl border border-[#efe6d6] p-4 shadow-[0px_2px_6px_rgba(74,55,40,0.06)]"
            >
              <div className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-[#fff6e9] text-2xl">
                {step.icon}
              </div>
              <div>
                <h3 className="font-black text-[#4a3728] text-[15px]">{step.title}</h3>
                <p className="font-bold text-[#8a7a66] text-[13px] mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleInstall}
          className="mt-6 w-full h-14 rounded-full font-black text-base tracking-wide text-white bg-[#3e8e5a] hover:bg-[#34784c] active:scale-[0.98] transition-all shadow-lg cursor-pointer"
        >
          MENGERTI
        </button>
      </div>
    </div>
  );
}
