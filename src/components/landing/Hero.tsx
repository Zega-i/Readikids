import { RobotIllustration } from './RobotIllustration';

interface HeroProps {
  onLaunch: () => void;
}

export function Hero({ onLaunch }: HeroProps) {
  return (
    <section className="relative z-10 w-full max-w-[1280px] mx-auto flex-1 flex flex-col lg:flex-row items-center justify-between px-6 lg:px-[88px] pt-[60px] pb-10">
      {/* Left Content */}
      <div className="w-full lg:w-auto text-center lg:text-left flex flex-col items-center lg:items-start lg:mt-[-40px]">
        <p className="text-[#4dd8ff] font-nunito-black text-[15px] tracking-[3.00px] leading-[normal] mb-[15px] uppercase">
          Misi: Kenali Cara Belajarmu
        </p>

        <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-nunito-black text-white leading-[1.1] [text-shadow:0_0_16px_#4dd8ffa6] mb-[50px] lg:whitespace-nowrap">
          Jelajahi galaksi,
          <br />
          temukan cara
          <br />
          belajarmu.
        </h1>

        <p className="text-[17px] text-[#9aa4c7] font-nunito-bold mb-[50px] max-w-[460px] leading-[normal]">
          15 menit bertualang bersama robot BIP. Bukan tes, bukan diagnosis —
          <br className="hidden lg:block" />
          hanya cara seru memahami si kecil. Gratis, tanpa akun.
        </p>

        <button
          type="button"
          onClick={onLaunch}
          className="w-full sm:w-[320px] h-[72px] bg-[#ffd84d] rounded-[999px] shadow-[0_0_32px_#ffd84da6] font-nunito-black text-[#4a3800] text-[22px] tracking-[0] leading-[normal] hover:scale-105 active:scale-95 transition-transform cursor-pointer flex items-center justify-center"
          aria-label="Luncurkan Misi"
        >
          🚀&nbsp;&nbsp;LUNCURKAN MISI
        </button>

        <p className="text-[13px] text-[#6f7ba6] font-nunito-bold mt-[18px] text-center lg:text-left">
          Untuk pengalaman terbaik, unduh aplikasi Android (lihat tombol pojok kanan atas)
        </p>
      </div>

      {/* Right Content */}
      <div className="w-full lg:w-auto flex justify-center lg:justify-end mt-12 lg:mt-[-80px] lg:pr-[30px]">
        <RobotIllustration />
      </div>
    </section>
  );
}
