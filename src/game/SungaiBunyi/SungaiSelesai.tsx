
// ─── Maskot Cilo (sama persis dengan game & layar lain) ───────────────────────
export const Cilo = (): JSX.Element => (
  <div className="relative w-[294px] h-[353px] shrink-0" role="img" aria-label="Maskot Cilo si Kancil">
    <div className="absolute top-0 left-1 w-[97px] h-[97px] bg-[#a9714b] rounded-[48.3px] border-[8.4px] border-solid border-white shadow-[0px_4px_10px_#4a37282e]" />
    <div className="absolute top-0 left-[193px] w-[97px] h-[97px] bg-[#a9714b] rounded-[48.3px] border-[8.4px] border-solid border-white shadow-[0px_4px_10px_#4a37282e]" />
    <div className="absolute top-[29px] left-[34px] w-[38px] h-[38px] bg-[#fbd3b8] rounded-[18.9px]" />
    <div className="absolute top-[29px] left-[223px] w-[38px] h-[38px] bg-[#fbd3b8] rounded-[18.9px]" />
    <div className="absolute top-[239px] left-[61px] w-[172px] h-[126px] bg-[#c98a63] rounded-[86.1px/63px] border-[8.4px] border-solid border-white shadow-[0px_4px_10px_#4a37282e]" />
    <div className="absolute top-10 left-2.5 w-[273px] h-[248px] bg-[#b67b4f] rounded-[136.5px/123.9px] border-[10.5px] border-solid border-white shadow-[0px_4px_10px_#4a37282e]" />
    <div className="absolute top-[130px] left-[97px] w-[27px] h-9 bg-[#3b2a1d] rounded-[13.65px/17.85px]" />
    <div className="absolute top-[130px] left-[168px] w-[27px] h-9 bg-[#3b2a1d] rounded-[13.65px/17.85px]" />
    <div className="absolute top-[185px] left-[67px] w-9 h-[21px] bg-[#f2a08d] rounded-[17.85px/10.5px] opacity-85" />
    <div className="absolute top-[185px] left-[189px] w-9 h-[21px] bg-[#f2a08d] rounded-[17.85px/10.5px] opacity-85" />
    <div className="absolute top-[193px] left-[130px] w-[34px] h-[23px] bg-[#3b2a1d] rounded-[16.8px/11.55px]" />
  </div>
);

interface SungaiSelesaiProps {
  onNext?: () => void;
}

// Layar selebrasi = layout FLUID (bukan panggung berskala).
// Tidak ada telemetri, jadi flexbox menata dan otomatis menyesuaikan layar.
export const SungaiSelesai = ({ onNext }: SungaiSelesaiProps): JSX.Element => {
  const progress = 1; // Sungai = dunia ke-2 dari 3 → 2 titik terisi (index 0 & 1)

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden select-none font-nunito bg-[linear-gradient(180deg,rgba(26,107,138,1)_0%,rgba(88,183,232,1)_100%)]">
      {/* Partikel latar — gelembung air */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <span className="absolute top-[14%] left-[12%] w-2.5 h-2.5 rounded-full bg-[#d6f0fb]/50" />
        <span className="absolute top-[10%] left-[25%] w-1.5 h-1.5 rounded-full bg-[#d6f0fb]/50" />
        <span className="absolute top-[16%] right-[22%] w-2 h-2 rounded-full bg-[#d6f0fb]/40" />
        <span className="absolute top-[11%] right-[8%] w-1.5 h-1.5 rounded-full bg-[#d6f0fb]/50" />
        <span className="absolute top-[42%] left-[15%] w-2 h-2 rounded-full bg-[#d6f0fb]/40" />
        <span className="absolute top-[38%] right-[10%] w-1.5 h-1.5 rounded-full bg-[#d6f0fb]/50" />
      </div>

      {/* Konten utama — terpusat, mengalir alami */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 gap-4 sm:gap-6">

        {/* Maskot Cilo dengan spotlight & panggung */}
        <div className="relative flex items-center justify-center shrink-0">
          <div className="absolute w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] rounded-full bg-white/10" />
          <div className="absolute bottom-4 w-[200px] h-[46px] sm:w-[240px] sm:h-[56px] rounded-[50%] bg-[#0f4a5e]" />
          <div className="relative scale-[0.62] sm:scale-75 lg:scale-90 origin-center">
            <Cilo />
            {/* Gestur: tetesan air di dekat telinga */}
            <span className="absolute top-[70px] right-[-10px] text-5xl sm:text-6xl leading-none">
              💧
            </span>
          </div>
        </div>

        {/* Teks */}
        <div className="flex flex-col items-center gap-1.5 text-center -mt-2">
          <h1 className="font-black text-white text-3xl sm:text-4xl lg:text-5xl leading-tight">
            Sungai Bunyi, selesai!
          </h1>
          <p className="font-bold text-[#c5eafa] text-sm sm:text-base lg:text-lg">
            Cilo basah kegirangan main air 🐻
          </p>
        </div>

        {/* Tiga titik jejak — progres tanpa angka */}
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

        {/* CTA lanjut */}
        <button
          type="button"
          onClick={onNext}
          className="mt-2 px-8 py-3.5 sm:px-10 sm:py-4 bg-[#ffd34d] rounded-full border-4 border-solid border-white shadow-[0px_6px_16px_rgba(74,55,40,0.25)] font-black text-[#4a3728] text-base sm:text-lg tracking-wide active:scale-95 transition-transform cursor-pointer flex items-center gap-2"
        >
          KEMBALI KE PETA →
        </button>

        {/* Hint bawah */}
        <p className="font-bold text-[#c5eafa]/90 text-xs sm:text-sm mt-1">
          kemajuan tersimpan otomatis
        </p>
      </div>
    </main>
  );
};

export default SungaiSelesai;
