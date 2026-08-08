import { useState, useEffect } from "react";

// Maskot Cilo Mini untuk Header (Persis dari Landing Page)
export const Cilo = (): JSX.Element => {
  return (
    <div
      className="relative w-[294px] h-[353px] shrink-0 transform scale-90 sm:scale-100 origin-center"
      role="img"
      aria-label="Cute brown bear illustration"
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
};

export interface WorldStage {
  id: string;
  name: string;
  emoji: string;
  color: string;
  subtext: string;
  /** Posisi (%) versi web — scatter horizontal (layout asli). */
  web: { x: number; y: number };
  /** Posisi (%) versi HP — zigzag vertikal (mockup 56-30). */
  hp: { x: number; y: number };
}

const worldsData: WorldStage[] = [
  {
    id: "hutan-huruf",
    name: "HUTAN HURUF",
    emoji: "🌳",
    color: "bg-[#6dbb57]",
    subtext: "petualangan 1 dari 3 · ±5 menit",
    web: { x: 12, y: 68 },
    hp: { x: 32, y: 24 },
  },
  {
    id: "sungai-bunyi",
    name: "SUNGAI BUNYI",
    emoji: "🌊",
    color: "bg-[#58b7e8]",
    subtext: "petualangan 2 dari 3 · ±5 menit",
    web: { x: 37, y: 28 },
    hp: { x: 68, y: 41 },
  },
  {
    id: "bukit-angka",
    name: "BUKIT ANGKA",
    emoji: "⛰️",
    color: "bg-[#f2a65a]",
    subtext: "petualangan 3 dari 3 · ±5 menit",
    web: { x: 62, y: 68 },
    hp: { x: 32, y: 58 },
  },
  {
    id: "puncak-bintang",
    name: "PUNCAK BINTANG",
    emoji: "⭐",
    color: "bg-[#9b7bd8]",
    subtext: "bintang keberhasilan · ±2 menit",
    web: { x: 87, y: 28 },
    hp: { x: 68, y: 75 },
  },
];

interface PetaDuniaAnakProps {
  onEnterWorld?: (worldId: string) => void;
  onBackToDashboard?: () => void;
  /** Index dunia aktif (Default: 0 = Hutan Huruf) */
  currentWorldIndex?: number;
}

export const PetaDuniaAnak = ({
  onEnterWorld,
  onBackToDashboard,
  currentWorldIndex = 0,
}: PetaDuniaAnakProps): JSX.Element => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedWorldIndex, setSelectedWorldIndex] = useState(currentWorldIndex);

  useEffect(() => {
    setSelectedWorldIndex(currentWorldIndex);
  }, [currentWorldIndex]);

  const activeWorld = worldsData[selectedWorldIndex] || worldsData[0];

  const handleWorldClick = (index: number) => {
    if (index > currentWorldIndex) {
      const targetWorld = worldsData[index];
      showToast(`Selesaikan ${worldsData[currentWorldIndex].name} terlebih dahulu untuk membuka ${targetWorld.name}! 🔒`);
    } else {
      setSelectedWorldIndex(index);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStartAdventure = () => {
    if (onEnterWorld) {
      onEnterWorld(activeWorld.id);
    } else {
      alert(`Memulai ${activeWorld.name}!`);
    }
  };

  // Titik-titik setapak antar dunia — memakai set posisi ("web" | "hp").
  const renderPathDots = (posKey: "web" | "hp") => {
    const dots: JSX.Element[] = [];
    const dotsPerSegment = 5;
    for (let i = 0; i < worldsData.length - 1; i++) {
      const startNode = worldsData[i][posKey];
      const endNode = worldsData[i + 1][posKey];
      for (let j = 1; j <= dotsPerSegment; j++) {
        const ratio = j / (dotsPerSegment + 1);
        const posX = startNode.x + (endNode.x - startNode.x) * ratio;
        const posY = startNode.y + (endNode.y - startNode.y) * ratio;
        dots.push(
          <div
            key={`dot-${posKey}-${i}-${j}`}
            className="absolute w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-[#e8c48f] border-2 border-solid border-white shadow-sm -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"
            style={{ left: `${posX}%`, top: `${posY}%` }}
          />
        );
      }
    }
    return dots;
  };

  return (
    <main className="h-[100dvh] max-h-screen w-full relative overflow-hidden font-nunito flex flex-col bg-[linear-gradient(180deg,rgba(191,229,245,1)_0%,rgba(143,207,116,1)_100%)] text-[#4a3728]">

      {/* ═══════════════ WEB (layout asli — horizontal) ═══════════════ */}
      <div className="hidden lg:flex flex-col flex-1 justify-between">
        <header className="w-full max-w-7xl mx-auto px-4 py-2 sm:py-3 flex items-start justify-between z-20 shrink-0">
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 relative flex items-center justify-center shrink-0">
                <div className="w-full h-full transform scale-[0.12] origin-top-left -ml-1 -mt-1">
                  <Cilo />
                </div>
              </div>
              <span className="font-black text-sm sm:text-base tracking-tight text-[#4a3728]">ReadiKids</span>
            </div>
            <div className="flex flex-col items-start mt-2 sm:mt-4 pl-0">
              <div className="bg-[#c98a4b] px-4 py-1.5 sm:px-6 sm:py-2 rounded-2xl border-[3.5px] border-solid border-[#8a5a2b] shadow-[0px_4px_10px_rgba(74,55,40,0.2)] ml-[38px] sm:ml-[46px]">
                <h1 className="font-black text-[#fff6e9] text-base sm:text-xl tracking-wide uppercase">DUNIA CILO</h1>
              </div>
              <p className="font-bold text-[#4a3728] text-[10px] sm:text-xs mt-1 ml-[40px] sm:ml-[48px]">
                ikuti jalan setapaknya 👣 — satu dunia demi satu dunia
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end pr-3 lg:pr-5 mt-1">
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="px-4 py-2 rounded-full font-black text-xs sm:text-sm transition-colors text-[#6b5a48] hover:text-[#4a3728] cursor-pointer"
              >
                ← Kembali
              </button>
            )}
          </div>
        </header>

        <div className="w-full max-w-5xl mx-auto my-auto z-10 flex flex-col justify-between items-center gap-4 py-2">
          <div className="w-full max-w-4xl relative h-[250px] sm:h-[300px] my-2 sm:my-4 px-4">
            {renderPathDots("web")}
            {worldsData.map((world, index) => {
              const isActive = index === selectedWorldIndex;
              const isPassed = index < currentWorldIndex;
              const isLocked = index > currentWorldIndex;
              return (
                <div
                  key={world.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
                  style={{ left: `${world.web.x}%`, top: `${world.web.y}%` }}
                >
                  {isActive && (
                    <div className="absolute -top-14 sm:-top-16 flex flex-col items-center animate-bounce z-20">
                      <div className="bg-[#c98a4b] border-[2.5px] border-solid border-[#8a5a2b] px-3 py-1 rounded-xl shadow-md">
                        <span className="font-black text-[#fff6e9] text-[10px] sm:text-xs whitespace-nowrap">📍 KAMU DI SINI</span>
                      </div>
                      <div className="w-1.5 h-3 bg-[#8a5a2b]" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleWorldClick(index)}
                    className={`relative rounded-full border-4 sm:border-[5px] border-solid border-white shadow-[0px_6px_14px_rgba(74,55,40,0.25)] transition-all duration-200 cursor-pointer flex items-center justify-center ${
                      isActive
                        ? "w-20 h-20 sm:w-28 sm:h-28 scale-110 ring-4 ring-[#ffd34d]/60"
                        : "w-16 h-16 sm:w-22 sm:h-22"
                    } ${world.color} ${isLocked ? "opacity-60 grayscale-[30%]" : "opacity-100"}`}
                    aria-label={`${world.name} ${isActive ? "(Saat ini)" : isLocked ? "(Terkunci)" : "(Selesai)"}`}
                  >
                    <span className={`select-none ${isActive ? "text-3xl sm:text-5xl" : "text-2xl sm:text-3xl"}`}>{world.emoji}</span>
                    {isLocked && (
                      <div className="absolute -top-1 -right-1 bg-[#4a3728] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md border-2 border-white">🔒</div>
                    )}
                    {isPassed && (
                      <div className="absolute -top-1 -right-1 bg-[#3e8e5a] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md border-2 border-white font-black">✓</div>
                    )}
                  </button>
                  <div className="mt-2 sm:mt-3 bg-[#fff6e9] px-2.5 py-1 rounded-full border-2 border-solid border-white shadow-sm max-w-[110px] sm:max-w-[140px] text-center">
                    <span className="font-black text-[#4a3728] text-[10px] sm:text-xs block truncate">{world.name}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="w-full max-w-lg -mt-4 sm:-mt-6 mb-12 sm:mb-20 bg-[#c98a4b] rounded-[24px] border-[3.5px] border-solid border-[#8a5a2b] p-4 sm:p-5 shadow-[0px_6px_14px_rgba(74,55,40,0.3)] flex flex-col items-center gap-2 text-center">
            <h2 className="font-black text-[#fff6e9] text-lg sm:text-xl tracking-wide uppercase">TUJUAN: {activeWorld.name}</h2>
            <p className="font-bold text-[#f5dfc0] text-xs sm:text-sm">{activeWorld.subtext}</p>
            <button
              type="button"
              onClick={handleStartAdventure}
              className="w-full mt-2 py-3 sm:py-3.5 bg-[#6dbb57] hover:bg-[#5ea74a] rounded-full border-4 border-solid border-white font-black text-white text-base sm:text-lg tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer uppercase flex items-center justify-center gap-2"
            >
              <span>MASUK {activeWorld.name.split(" ")[0]}!</span>
              <span>{activeWorld.emoji}</span>
            </button>
          </div>
        </div>

        <footer className="w-full py-2 bg-[#f3e9d7]/80 backdrop-blur-sm text-center px-4 shrink-0 z-10">
          <p className="font-bold text-[#6b5a48] text-[11px] sm:text-xs max-w-4xl mx-auto leading-relaxed">
            Rekaman anak tetap di perangkat · nama samaran · ReadiKids
          </p>
        </footer>
      </div>

      {/* ═══════════════ HP (portrait — zigzag vertikal) ═══════════════ */}
      <div className="flex lg:hidden flex-col flex-1">
        <header className="w-full max-w-md mx-auto px-4 pt-4 flex items-start justify-between z-20 shrink-0">
          <div className="flex flex-col items-start gap-1.5">
            <div className="bg-[#c98a4b] px-5 py-2 rounded-2xl border-[3px] border-[#8a5a2b] shadow-[0px_5px_0px_#8a5a2b,0px_10px_14px_rgba(74,55,40,0.2)]">
              <h1 className="font-black text-[#fff6e9] text-xl tracking-wide uppercase">DUNIA CILO</h1>
            </div>
            <p className="font-bold text-[#4a3728] text-xs mt-1">ikuti jalan setapaknya 👣</p>
          </div>

          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="rk-sticker bg-white rounded-full px-4 py-2 font-black text-[#4a3728] text-sm active:scale-95 transition-transform cursor-pointer flex items-center gap-1 shrink-0"
            >
              <span className="text-base leading-none">←</span> Beranda
            </button>
          )}
        </header>

        <div className="relative flex-1 w-full max-w-md mx-auto px-6 pt-6 pb-2 z-10">
          {renderPathDots("hp")}
          {worldsData.map((world, index) => {
            const isActive = index === selectedWorldIndex;
            const isPassed = index < currentWorldIndex;
            const isLocked = index > currentWorldIndex;
            return (
              <div
                key={world.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
                style={{ left: `${world.hp.x}%`, top: `${world.hp.y}%` }}
              >
                {isActive && (
                  <div className="absolute -top-12 flex flex-col items-center animate-bounce z-20">
                    <div className="bg-[#c98a4b] border-[2.5px] border-solid border-[#8a5a2b] px-3 py-1 rounded-xl shadow-md">
                      <span className="font-black text-[#fff6e9] text-[10px] sm:text-xs whitespace-nowrap">📍 KAMU DI SINI</span>
                    </div>
                    <div className="w-1.5 h-3 bg-[#8a5a2b]" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleWorldClick(index)}
                  className={`relative rounded-full border-[5px] border-solid border-white shadow-[0px_6px_14px_rgba(74,55,40,0.25)] transition-all duration-200 cursor-pointer flex items-center justify-center ${
                    isActive ? "w-24 h-24 ring-4 ring-[#ffd34d]/70" : "w-[76px] h-[76px]"
                  } ${world.color} ${isLocked ? "opacity-60 grayscale-[30%]" : "opacity-100"}`}
                  aria-label={`${world.name} ${isActive ? "(Saat ini)" : isLocked ? "(Terkunci)" : "(Selesai)"}`}
                >
                  <span className={`select-none ${isActive ? "text-4xl" : "text-3xl"}`}>{world.emoji}</span>
                  {isLocked && (
                    <div className="absolute -top-1 -right-1 bg-[#4a3728] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md border-2 border-white">🔒</div>
                  )}
                  {isPassed && (
                    <div className="absolute -top-1 -right-1 bg-[#3e8e5a] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md border-2 border-white font-black">✓</div>
                  )}
                </button>
                <div className="mt-2 sm:mt-3 bg-[#fff6e9] px-2.5 py-1 rounded-full border-2 border-solid border-white shadow-sm max-w-[110px] sm:max-w-[140px] text-center">
                  <span className="font-black text-[#4a3728] text-[10px] sm:text-xs block truncate">{world.name}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="w-full max-w-md mx-auto px-4 pb-6 shrink-0 z-10">
          <div className="bg-[#c98a4b] rounded-3xl border-[3px] border-[#8a5a2b] p-4 shadow-[0px_5px_0px_#8a5a2b,0px_11px_16px_rgba(74,55,40,0.25)] flex flex-col items-center gap-1.5 text-center">
            <h2 className="font-black text-[#fff6e9] text-lg tracking-wide uppercase">TUJUAN: {activeWorld.name}</h2>
            <p className="font-bold text-[#f5dfc0] text-xs">{activeWorld.subtext}</p>
            <button
              type="button"
              onClick={handleStartAdventure}
              className="w-full mt-2 py-3.5 rk-sticker-btn bg-[#3e8e5a] rounded-full font-black text-white text-lg tracking-wider active:scale-95 transition-transform cursor-pointer uppercase flex items-center justify-center gap-2"
            >
              <span>MASUK {activeWorld.name.split(" ")[0]}!</span>
              <span>{activeWorld.emoji}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast peringatan dunia terkunci */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#4a3728] text-[#fff6e9] px-5 py-2.5 rounded-full shadow-2xl font-bold text-xs sm:text-sm z-50 border-2 border-white animate-fade-in">
          {toastMessage}
        </div>
      )}
    </main>
  );
};

export default PetaDuniaAnak;
