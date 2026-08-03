import { Cilo } from "./index";

interface BukitSelesaiProps {
  onNext?: () => void;
}

// Layar selebrasi = layout FLUID (bukan panggung berskala).
// Tidak ada telemetri, jadi flexbox menata dan otomatis menyesuaikan layar.
export const BukitSelesai = ({ onNext }: BukitSelesaiProps): JSX.Element => {
  const progress = 2; // Bukit = dunia ke-3 dari 3 → SEMUA titik terisi (index 0,1,2)

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden select-none font-nunito bg-[linear-gradient(180deg,rgba(168,84,30,1)_0%,rgba(242,166,90,1)_100%)]">
      {/* Partikel latar — debu/serbuk emas puncak */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <span className="absolute top-[14%] left-[12%] w-2.5 h-2.5 rounded-full bg-[#ffe9c9]/50" />
        <span className="absolute top-[10%] left-[25%] w-1.5 h-1.5 rounded-full bg-[#ffe9c9]/50" />
        <span className="absolute top-[16%] right-[22%] w-2 h-2 rounded-full bg-[#ffe9c9]/40" />
        <span className="absolute top-[11%] right-[8%] w-1.5 h-1.5 rounded-full bg-[#ffe9c9]/50" />
        <span className="absolute top-[42%] left-[15%] w-2 h-2 rounded-full bg-[#ffe9c9]/40" />
        <span className="absolute top-[38%] right-[10%] w-1.5 h-1.5 rounded-full bg-[#ffe9c9]/50" />
      </div>

      {/* Konten utama — terpusat, mengalir alami */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 gap-4 sm:gap-6">

        {/* Maskot Cilo dengan spotlight & panggung */}
        <div className="relative flex items-center justify-center shrink-0">
          <div className="absolute w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] rounded-full bg-white/10" />
          <div className="absolute bottom-4 w-[200px] h-[46px] sm:w-[240px] sm:h-[56px] rounded-[50%] bg-[#6b3410]" />
          <div className="relative scale-[0.62] sm:scale-75 lg:scale-90 origin-center">
            <Cilo />
            {/* Gestur: puncak gunung di dekat telinga */}
            <span className="absolute top-[70px] right-[-10px] text-5xl sm:text-6xl leading-none">
              ⛰️
            </span>
          </div>
        </div>

        {/* Teks */}
        <div className="flex flex-col items-center gap-1.5 text-center -mt-2">
          <h1 className="font-black text-white text-3xl sm:text-4xl lg:text-5xl leading-tight">
            Bukit Angka, selesai!
          </h1>
          <p className="font-bold text-[#ffe4c4] text-sm sm:text-base lg:text-lg">
            Cilo memandang jauh dari puncak 🐻
          </p>
        </div>

        {/* Tiga titik jejak — SEMUA terisi (dunia terakhir) */}
        <div className="flex items-center gap-3 mt-1">
          {[0, 1, 2].map((i) => {
            const active = i <= progress;
            return (
              <span
                key={`jejak-${i}`}
                className={`rounded-full bg-white transition-all ${
                  active ? "w-4 h-4 opacity-100" : "w-3 h-3 opacity-30"
                }`}
              />
            );
          })}
        </div>

        {/* CTA lanjut ke penutup */}
        <button
          type="button"
          onClick={onNext}
          className="mt-2 px-8 py-3.5 sm:px-10 sm:py-4 bg-[#ffd34d] rounded-full border-4 border-solid border-white shadow-[0px_6px_16px_rgba(74,55,40,0.25)] font-black text-[#4a3728] text-base sm:text-lg tracking-wide active:scale-95 transition-transform cursor-pointer flex items-center gap-2"
        >
          LIHAT PENUTUP →
        </button>

        {/* Hint bawah */}
        <p className="font-bold text-[#ffe4c4]/90 text-xs sm:text-sm mt-1">
          tinggal satu langkah lagi
        </p>
      </div>
    </main>
  );
};

export default BukitSelesai;