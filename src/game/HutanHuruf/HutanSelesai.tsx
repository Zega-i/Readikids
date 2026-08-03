// ─── Maskot Cilo (sama persis dengan VisualGame) ──────────────────────────────
export const Cilo = (): JSX.Element => (
  <div
    className="relative w-[294px] h-[353px] shrink-0"
    role="img"
    aria-label="Maskot Cilo si Kancil"
  >
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

interface HutanSelesaiProps {
  onNext?: () => void;
}

// Layar selebrasi = layout FLUID biasa (bukan panggung berskala).
// Tidak ada telemetri di sini, jadi tidak perlu kanvas kaku — biarkan
// flexbox menata dan semuanya otomatis menyesuaikan ukuran browser.
export const HutanSelesai = ({ onNext }: HutanSelesaiProps): JSX.Element => {
  const progress = 0; // Hutan = dunia ke-1 dari 3

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden select-none font-nunito bg-[linear-gradient(180deg,rgba(45,107,26,1)_0%,rgba(90,160,60,1)_100%)]">
      {/* Partikel latar dekoratif — posisi relatif terhadap layar */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <span className="absolute top-[14%] left-[12%] w-2.5 h-2.5 rounded-full bg-[#a8d88a]/40" />
        <span className="absolute top-[10%] left-[25%] w-1.5 h-1.5 rounded-full bg-[#a8d88a]/50" />
        <span className="absolute top-[16%] right-[22%] w-2 h-2 rounded-full bg-[#a8d88a]/40" />
        <span className="absolute top-[11%] right-[8%] w-1.5 h-1.5 rounded-full bg-[#a8d88a]/50" />
        <span className="absolute top-[42%] left-[15%] w-2 h-2 rounded-full bg-[#a8d88a]/40" />
        <span className="absolute top-[38%] right-[10%] w-1.5 h-1.5 rounded-full bg-[#a8d88a]/50" />
      </div>

      {/* Konten utama — terpusat vertikal & horizontal, mengalir alami */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 gap-4 sm:gap-6">

        {/* Maskot Cilo dengan spotlight & panggung */}
        <div className="relative flex items-center justify-center shrink-0">
          {/* Spotlight lembut */}
          <div className="absolute w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] rounded-full bg-white/10" />
          {/* Panggung bayangan */}
          <div className="absolute bottom-4 w-[200px] h-[46px] sm:w-[240px] sm:h-[56px] rounded-[50%] bg-[#1f5010]" />
          {/* Cilo — diskalakan proporsional terhadap tinggi layar */}
          <div className="relative scale-[0.62] sm:scale-75 lg:scale-90 origin-center">
            <Cilo />
            {/* Ikon gestur menempel di dekat telinga kanan Cilo */}
            <span className="absolute top-[70px] right-[-10px] text-5xl sm:text-6xl leading-none">
              🌿
            </span>
          </div>
        </div>

        {/* Teks */}
        <div className="flex flex-col items-center gap-1.5 text-center -mt-2">
          <h1 className="font-black text-white text-3xl sm:text-4xl lg:text-5xl leading-tight">
            Hutan Huruf, selesai!
          </h1>
          <p className="font-bold text-[#c5e8b0] text-sm sm:text-base lg:text-lg">
            Cilo melambai dari balik pepohonan 🐻
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
                  active
                    ? "w-4 h-4 opacity-100"
                    : "w-3 h-3 opacity-30"
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
        <p className="font-bold text-[#c5e8b0]/90 text-xs sm:text-sm mt-1">
          kemajuan tersimpan otomatis
        </p>
      </div>
    </main>
  );
};

export default HutanSelesai;