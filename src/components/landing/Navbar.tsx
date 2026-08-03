export function Navbar() {
  return (
    <header className="relative z-20 w-full h-[72px] bg-[#ffffff0a]">
      <div className="max-w-[1280px] h-full mx-auto flex items-center justify-between px-6 lg:px-[60px]">
        {/* Logo Section */}
        <div className="flex items-center gap-4">
          <a
            href="#beranda"
            className="w-12 h-10 bg-[#e8ecf7] rounded-xl shadow-[0_0_10.4px_#4dd8ffa6] shrink-0 flex items-center justify-center relative"
            aria-label="Beranda ReadiKids ANGKASA"
          >
            {/* Simple Rocket Logo */}
            <span className="absolute top-[-5px] left-[23px] w-0.5 h-[9px] bg-[#e8ecf7]" aria-hidden="true" />
            <span className="absolute top-[5px] left-[21px] w-1.5 h-1.5 bg-[#ff6bd6] rounded-[2.8px]" aria-hidden="true" />
            <span className="w-[37px] h-[21px] bg-[#141b3f] rounded-[7.2px] mt-[2px]" aria-hidden="true" />
            <span className="absolute top-[15px] left-[13px] w-1.5 h-[9px] bg-[#4dd8ff] rounded-[3.2px/4.4px]" aria-hidden="true" />
            <span className="absolute top-[15px] right-[13px] w-1.5 h-[9px] bg-[#4dd8ff] rounded-[3.2px/4.4px]" aria-hidden="true" />
          </a>
          <a href="#beranda" className="font-nunito-black text-white text-[18px] tracking-[0] leading-[normal] hidden sm:block">
            ReadiKids ANGKASA
          </a>
        </div>

        {/* Action Buttons */}
        <nav className="flex items-center gap-[24px]">
          <button
            type="button"
            onClick={() => {}}
            className="hidden lg:flex items-center justify-center w-[190px] h-11 rounded-[999px] border-2 border-solid border-[#4dd8ff] text-[#4dd8ff] font-nunito-black text-sm tracking-[0] leading-[normal] hover:bg-[#4dd8ff] hover:text-[#141b3f] transition-colors cursor-pointer"
          >
            ⬇&nbsp;&nbsp;Pasang Aplikasi
          </button>
          <a
            href="#pusat-kendali"
            className="font-nunito-black text-[#9aa4c7] text-sm tracking-[0] leading-[normal] hover:text-white transition-colors whitespace-nowrap"
          >
            Pusat Kendali (ortu) →
          </a>
        </nav>
      </div>
    </header>
  );
}
