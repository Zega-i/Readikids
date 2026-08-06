import { useState } from "react";
import { CiloKancil } from "../components/CiloKancil";
import InstallModal from "../components/InstallModal";

const stepsCilo = [
  {
    icon: "🧑",
    title: "1 · izin orang tua",
    description: "30 detik, tanpa akun",
  },
  {
    icon: "🎒",
    title: "2 · anak bertualang",
    description: "4 dunia · ±15 menit",
  },
  {
    icon: "📖",
    title: "3 · cerita untuk Anda",
    description: "saran pendampingan",
  },
];

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({
  onStart
}: LandingPageProps): JSX.Element {
  const [statusMessage, setStatusMessage] = useState("");
  const [showInstallModal, setShowInstallModal] = useState(false);

  const handleStartAdventure = () => {
    setStatusMessage("Misi petualangan dimulai.");
    onStart();
  };

  return (
    <main
      className="h-[100dvh] max-h-screen w-full relative overflow-hidden font-nunito flex flex-col justify-between bg-[linear-gradient(180deg,rgba(191,229,245,1)_0%,rgba(234,247,224,1)_100%)] text-[#4a3728]"
      aria-label="ReadiKids Landing Page"
    >
      {/* Background Decorator */}
      <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
        {/* Lencana Matahari Kuning Anima */}
        <div className="absolute top-4 right-6 w-16 h-16 sm:w-20 sm:h-20 bg-[#ffd34d] rounded-full border-[3px] border-solid border-white shadow-[0px_2px_8px_#4a37282e] hidden sm:block" />
        {/* Awan-Awan */}
        <div className="absolute top-[60px] left-[150px] w-[80px] h-[22px] bg-white rounded-full opacity-90" />
        <div className="absolute top-[100px] right-[280px] w-[60px] h-[18px] bg-white rounded-full opacity-85" />
      </div>

      {/* Header Navigasi */}
      <header className="w-full max-w-7xl mx-auto px-4 py-2 sm:py-3 flex items-center justify-between z-20">
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          {/* Cilo Mini */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 relative flex items-center justify-center shrink-0">
            <div className="w-full h-full transform scale-[0.12] origin-top-left -ml-1 -mt-1">
              <CiloKancil />
            </div>
          </div>
          <span className="font-black text-sm sm:text-base tracking-tight text-[#4a3728]">
            ReadiKids
          </span>
        </div>

        {/* Action Right */}
        <div className="flex items-center justify-end gap-3 sm:gap-4 pr-3 lg:pr-5">
          <button
            type="button"
            onClick={() => setShowInstallModal(true)}
            className="px-4 sm:px-5 py-2 rounded-full border-2 font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 border-[#3e8e5a] bg-white text-[#3e8e5a] hover:bg-[#f4fbf7] shadow-sm"
          >
            <span>⬇</span> Pasang Aplikasi
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full max-w-7xl mx-auto px-4 py-2 md:py-4 z-10 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-4 items-center my-auto">
        {/* Kolom Kiri: Teks & Button */}
        <div className="lg:col-span-7 flex flex-col items-start gap-2 text-left">
          <span className="px-3 py-1 rounded-full font-black text-[11px] sm:text-xs tracking-wider uppercase text-[#3e8e5a]">
            SKRINING DINI · USIA 6–9
          </span>

          <h1 className="font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-[1.15] mt-1 text-[#4a3728]">
            Petualangan kecil, <br /> cerita besar tentang <br /> cara belajar anak.
          </h1>

          <p className="font-bold text-xs sm:text-sm max-w-xl leading-relaxed mt-1 text-[#6b5a48]">
            ±15 menit main bareng Cilo. Bukan tes, bukan diagnosis — hanya cara seru mengenali cara belajar si kecil. Gratis, tanpa daftar, rekaman anak tetap di perangkat.
          </p>

          <div className="pt-1 flex flex-col items-start gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleStartAdventure}
              className="w-full sm:w-64 h-11 sm:h-12 rounded-full font-black text-sm sm:text-base tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-lg bg-[#3e8e5a] text-white hover:bg-[#34784c] border-4 border-solid border-white"
            >
              <span>MULAI PETUALANGAN 🌳</span>
            </button>

            <span className="font-bold text-[10px] sm:text-xs text-[#486b3e]">
              versi aplikasi Android segera hadir — lihat kanan atas
            </span>
          </div>
        </div>

        {/* Kolom Kanan: Maskot Large */}
        <div className="lg:col-span-5 flex justify-center items-center z-20">
          <CiloKancil />
        </div>
      </section>

      {/* 3 Step Cards Section */}
      <section className="w-full max-w-7xl mx-auto px-6 pb-8 z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {stepsCilo.map((step) => (
            <div
              key={step.title}
              className="bg-[#fff6e9] rounded-[18px] border-4 border-solid border-white p-5 sm:p-6 shadow-[0px_4px_10px_#4a37282e] flex items-center gap-4 transition-transform hover:-translate-y-1"
            >
              <div className="text-3xl sm:text-4xl shrink-0 p-2 bg-white/80 rounded-xl">
                {step.icon}
              </div>
              <div>
                <h2 className="font-black text-[#4a3728] text-base sm:text-[17px]">
                  {step.title}
                </h2>
                <p className="font-bold text-[#6b5a48] text-xs sm:text-[13px] mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Elemen Tanah / Bukit */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none z-0 overflow-hidden h-72 sm:h-96 lg:h-[450px]"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 1440 320"
          fill="none"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Bukit Kiri */}
          <path
            d="M-100,320 C150,80 550,120 850,320 Z"
            fill="#8fcf74"
          />
          {/* Bukit Kanan */}
          <path
            d="M450,320 C800,100 1180,140 1540,320 Z"
            fill="#6dbb57"
          />
        </svg>
      </div>

      <span className="sr-only" aria-live="polite">
        {statusMessage}
      </span>

      {/* W0b · Modal Pasang Aplikasi */}
      <InstallModal open={showInstallModal} onClose={() => setShowInstallModal(false)} />
    </main>
  );
}
