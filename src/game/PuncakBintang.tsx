
// ─── Maskot Cilo ──────────────────────────────────────────────────────────────
export const Cilo = (): JSX.Element => (
  <div className="relative w-[294px] h-[353px] shrink-0" role="img" aria-label="Maskot Cilo si kancil cokelat">
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

// Bintang latar — posisi & opacity dari Figma (dalam persen agar responsif)
const STARS = [
  { top: "8%", left: "6%", s: 4, o: 0.7 }, { top: "5%", left: "16%", s: 3, o: 0.5 },
  { top: "10%", left: "30%", s: 5, o: 0.8 }, { top: "4%", left: "44%", s: 3, o: 0.6 },
  { top: "8%", left: "57%", s: 4, o: 0.7 }, { top: "6%", left: "72%", s: 5, o: 0.8 },
  { top: "5%", right: "8%", s: 4, o: 0.6 }, { top: "20%", left: "11%", s: 3, o: 0.6 },
  { top: "24%", left: "26%", s: 4, o: 0.7 }, { top: "19%", left: "53%", s: 5, o: 0.8 },
  { top: "22%", right: "14%", s: 4, o: 0.7 }, { top: "34%", left: "8%", s: 4, o: 0.6 },
  { top: "36%", left: "34%", s: 4, o: 0.6 }, { top: "33%", right: "20%", s: 5, o: 0.8 },
  { top: "38%", right: "6%", s: 3, o: 0.5 },
];

interface PuncakBintangProps {
  /** Buka layar hasil (Cerita Cilo / dashboard pendamping) */
  onOpenStory?: () => void;
}

// Layar PENUTUP — layout fluid, tema malam. Berbeda dari layar selesai biasa:
// ada ritual serah layar & CTA ditujukan ke ORANG TUA, bukan anak.
export const PuncakBintang = ({ onOpenStory }: PuncakBintangProps): JSX.Element => {
  return (
    <main className="relative w-full h-[100dvh] overflow-hidden select-none font-nunito bg-[linear-gradient(180deg,rgba(26,15,64,1)_0%,rgba(107,75,168,1)_100%)]">
      {/* Bintang latar */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {STARS.map((st, i) => (
          <span key={i} className="absolute rounded-full bg-white"
            style={{ top: st.top, left: st.left, right: st.right, width: st.s, height: st.s, opacity: st.o }} />
        ))}
        {/* Bulan sabit di kanan atas */}
        <div className="absolute top-[6%] right-[8%]">
          <div className="absolute -inset-5 rounded-full bg-[#ffd34d]/15" />
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#ffd34d] border-4 border-white shadow-[0px_6px_16px_rgba(0,0,0,0.3)]" />
          <div className="absolute top-1 right-1 w-14 h-14 sm:w-[68px] sm:h-[68px] rounded-full bg-[#3a2775]" />
        </div>
      </div>

      {/* Konten utama */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 gap-4 sm:gap-5">

        {/* Cilo di bawah spotlight bintang */}
        <div className="relative flex items-center justify-center shrink-0">
          <div className="absolute w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] rounded-full bg-white/[0.08]" />
          <div className="absolute bottom-4 w-[210px] h-[48px] sm:w-[250px] sm:h-[58px] rounded-[50%] bg-[#120a2e]" />
          <div className="relative scale-[0.6] sm:scale-[0.72] lg:scale-[0.85] origin-center">
            <Cilo />
            {/* Bintang emas di dekat telinga */}
            <span className="absolute top-[64px] right-[-14px] text-5xl sm:text-6xl leading-none">
              ⭐
            </span>
          </div>
        </div>

        {/* Teks penutup */}
        <div className="flex flex-col items-center gap-1.5 text-center -mt-2">
          <h1 className="font-black text-white text-3xl sm:text-4xl lg:text-5xl leading-tight">
            Petualangan selesai! ⭐
          </h1>
          <p className="font-bold text-[#d4c2f0] text-sm sm:text-base lg:text-lg">
            Sudah menjelajah 4 dunia bersama Cilo.
          </p>
        </div>

        {/* Tiga titik jejak — semua emas (selesai total) */}
        <div className="flex items-center gap-3 mt-0.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-4 h-4 rounded-full bg-[#ffd34d]" />
          ))}
        </div>

        {/* Kartu ritual serah layar — khusus penutup */}
        <div className="mt-2 w-full max-w-md bg-white/[0.12] rounded-3xl border-2 border-white/60 px-5 py-4 flex items-center gap-3">
          <span className="text-2xl shrink-0">👋</span>
          <div className="flex flex-col">
            <span className="font-black text-white text-sm sm:text-base leading-snug">
              Kembalikan layar ke orang tua ya
            </span>
            <span className="font-bold text-[#c5b3e8] text-xs sm:text-sm leading-snug">
              Cilo sudah menyiapkan cerita hari ini untuk mereka
            </span>
          </div>
        </div>

        {/* CTA — ditujukan ke ORANG TUA, transisi keluar Kid Mode */}
        <button
          type="button"
          onClick={onOpenStory}
          className="mt-1 px-8 py-3.5 sm:px-10 sm:py-4 bg-[#ffd34d] rounded-full border-4 border-solid border-white shadow-[0px_6px_16px_rgba(0,0,0,0.25)] font-black text-[#4a3728] text-sm sm:text-base tracking-wide active:scale-95 transition-transform cursor-pointer flex items-center gap-2"
        >
          BUKA CERITA UNTUK ORANG TUA →
        </button>

      </div>
    </main>
  );
};

export default PuncakBintang;