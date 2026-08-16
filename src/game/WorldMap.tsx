import { useState, useEffect } from "react";
import { WORLDS } from "./trialBank";
import { CiloKancil } from "../components/CiloKancil";
import type { PhaseId } from "../types/telemetry";

/**
 * Peta petualangan — desain lama (dunia bulat + jalur zig-zag garis putus-putus
 * + penanda "KAMU DI SINI"), kini 5 dunia mengikuti 5 fase membaca. Tombol MASUK
 * membuka HUB dunia (pemilihan game), bukan langsung game.
 */

// Dunia dibuka BERURUTAN: hanya bisa masuk dunia berikutnya setelah dunia
// sebelumnya diselesaikan. World pertama (fase 0) selalu terbuka.
interface Pos { x: number; y: number; }
interface Node { phase: PhaseId; name: string; emoji: string; accent: string; subtext: string; web: Pos; hp: Pos; }

// Posisi 5 dunia: web = zig-zag horizontal; hp = zig-zag vertikal.
const POS: { web: Pos; hp: Pos }[] = [
  { web: { x: 10, y: 70 }, hp: { x: 30, y: 22 } },
  { web: { x: 30, y: 30 }, hp: { x: 68, y: 34 } },
  { web: { x: 50, y: 70 }, hp: { x: 30, y: 52 } },
  { web: { x: 70, y: 30 }, hp: { x: 68, y: 70 } },
  { web: { x: 90, y: 70 }, hp: { x: 30, y: 86 } },
];

const NODES: Node[] = WORLDS.map((w, i) => ({
  phase: w.phase,
  name: w.name,
  emoji: w.emoji,
  accent: w.accent,
  subtext: `dunia ${i + 1} dari ${WORLDS.length}`,
  web: POS[i].web,
  hp: POS[i].hp,
}));

export default function WorldMap({
  currentWorldIndex = 0,
  onEnterWorld,
  onBackToDashboard,
}: {
  currentWorldIndex?: number;
  onEnterWorld: (phase: PhaseId) => void;
  onBackToDashboard: () => void;
}): JSX.Element {
  const [toast, setToast] = useState<string | null>(null);
  const [selected, setSelected] = useState(currentWorldIndex);

  useEffect(() => setSelected(currentWorldIndex), [currentWorldIndex]);

  const active = NODES[selected] || NODES[0];

  const clickWorld = (index: number) => {
    if (index > currentWorldIndex) {
      setToast(`Selesaikan ${NODES[currentWorldIndex].name} dulu untuk membuka ${NODES[index].name}! 🔒`);
      setTimeout(() => setToast(null), 3000);
    } else {
      setSelected(index);
    }
  };

  const start = () => onEnterWorld(active.phase);

  const renderPathDots = (posKey: "web" | "hp") => {
    const dots: JSX.Element[] = [];
    const per = 5;
    for (let i = 0; i < NODES.length - 1; i++) {
      const a = NODES[i][posKey];
      const b = NODES[i + 1][posKey];
      for (let j = 1; j <= per; j++) {
        const r = j / (per + 1);
        dots.push(
          <div key={`dot-${posKey}-${i}-${j}`}
            className="absolute w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-[#e8c48f] border-2 border-solid border-white shadow-sm -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"
            style={{ left: `${a.x + (b.x - a.x) * r}%`, top: `${a.y + (b.y - a.y) * r}%` }} />,
        );
      }
    }
    return dots;
  };

  const renderNode = (world: Node, index: number, sizeActive: string, sizeIdle: string, bubbleTop: string) => {
    const isActive = index === selected;
    const isPassed = index < currentWorldIndex;
    const isLocked = index > currentWorldIndex;
    const posKey = sizeActive.includes("24") ? "hp" : "web"; // hp memakai node lebih besar
    const pos = world[posKey === "hp" ? "hp" : "web"];
    return (
      <div key={world.phase} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
        {isActive && (
          <div className={`absolute ${bubbleTop} flex flex-col items-center animate-bounce z-20`}>
            <div className="bg-[#c98a4b] border-[2.5px] border-solid border-[#8a5a2b] px-3 py-1 rounded-xl shadow-md">
              <span className="font-black text-[#fff6e9] text-[10px] sm:text-xs whitespace-nowrap">📍 KAMU DI SINI</span>
            </div>
            <div className="w-1.5 h-3 bg-[#8a5a2b]" />
          </div>
        )}
        <button type="button" onClick={() => clickWorld(index)}
          className={`relative rounded-full border-4 sm:border-[5px] border-solid border-white shadow-[0px_6px_14px_rgba(74,55,40,0.25)] transition-all duration-200 cursor-pointer flex items-center justify-center ${isActive ? sizeActive : sizeIdle} ${isLocked ? "opacity-60 grayscale-[30%]" : "opacity-100"}`}
          style={{ backgroundColor: world.accent, boxShadow: isActive ? `0 0 0 4px ${world.accent}66, 0px 6px 14px rgba(74,55,40,0.25)` : undefined }}
          aria-label={`${world.name} ${isActive ? "(Saat ini)" : isLocked ? "(Terkunci)" : "(Selesai)"}`}>
          <span className={`select-none ${isActive ? "text-3xl sm:text-5xl" : "text-2xl sm:text-3xl"}`}>{world.emoji}</span>
          {isLocked && <div className="absolute -top-1 -right-1 bg-[#4a3728] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md border-2 border-white">🔒</div>}
          {isPassed && <div className="absolute -top-1 -right-1 bg-[#3e8e5a] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md border-2 border-white font-black">✓</div>}
        </button>
        <div className="mt-2 sm:mt-3 bg-[#fff6e9] px-2.5 py-1 rounded-full border-2 border-solid border-white shadow-sm max-w-[110px] sm:max-w-[140px] text-center">
          <span className="font-black text-[#4a3728] text-[10px] sm:text-xs block truncate">{world.name}</span>
        </div>
      </div>
    );
  };

  return (
    <main className="h-[100dvh] max-h-screen w-full relative overflow-hidden font-nunito flex flex-col bg-[linear-gradient(180deg,rgba(191,229,245,1)_0%,rgba(143,207,116,1)_100%)] text-[#4a3728]">

      {/* ═══ WEB (horizontal) ═══ */}
      <div className="hidden lg:flex flex-col flex-1 justify-between">
        <header className="w-full max-w-7xl mx-auto px-4 py-2 sm:py-3 flex items-start justify-between z-20 shrink-0">
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 relative flex items-center justify-center shrink-0">
                <div className="w-full h-full transform scale-[0.12] origin-top-left -ml-1 -mt-1"><CiloKancil /></div>
              </div>
              <span className="font-black text-sm sm:text-base tracking-tight text-[#4a3728]">ReadiKids</span>
            </div>
            <div className="flex flex-col items-start mt-2 sm:mt-4">
              <div className="bg-[#c98a4b] px-4 py-1.5 sm:px-6 sm:py-2 rounded-2xl border-[3.5px] border-solid border-[#8a5a2b] shadow-[0px_4px_10px_rgba(74,55,40,0.2)] ml-[38px] sm:ml-[46px]">
                <h1 className="font-black text-[#fff6e9] text-base sm:text-xl tracking-wide uppercase whitespace-nowrap">PETA PETUALANGAN</h1>
              </div>
              <p className="font-bold text-[#4a3728] text-[10px] sm:text-xs mt-1 ml-[40px] sm:ml-[48px]">ikuti jalan setapaknya 👣 — satu dunia demi satu dunia</p>
            </div>
          </div>
          <button type="button" onClick={onBackToDashboard} className="px-4 py-2 rounded-full font-black text-xs sm:text-sm text-[#6b5a48] hover:text-[#4a3728] cursor-pointer mt-1">← Kembali</button>
        </header>

        <div className="w-full max-w-5xl mx-auto my-auto z-10 flex flex-col justify-between items-center gap-4 py-2">
          <div className="w-full max-w-4xl relative h-[250px] sm:h-[300px] my-2 sm:my-4 px-4">
            {renderPathDots("web")}
            {NODES.map((w, i) => renderNode(w, i, "w-20 h-20 sm:w-28 sm:h-28 scale-110", "w-16 h-16 sm:w-[88px] sm:h-[88px]", "-top-14 sm:-top-16"))}
          </div>

          <div className="w-full max-w-lg -mt-4 sm:-mt-6 mb-12 sm:mb-20 bg-[#c98a4b] rounded-[24px] border-[3.5px] border-solid border-[#8a5a2b] p-4 sm:p-5 shadow-[0px_6px_14px_rgba(74,55,40,0.3)] flex flex-col items-center gap-2 text-center">
            <h2 className="font-black text-[#fff6e9] text-lg sm:text-xl tracking-wide uppercase">TUJUAN: {active.name}</h2>
            <p className="font-bold text-[#f5dfc0] text-xs sm:text-sm">{active.subtext}</p>
            <button type="button" onClick={start}
              className="w-full mt-2 py-3 sm:py-3.5 bg-[#6dbb57] hover:bg-[#5ea74a] rounded-full border-4 border-solid border-white font-black text-white text-base sm:text-lg tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer uppercase flex items-center justify-center gap-2">
              <span>MASUK {active.name.split(" ")[0]}!</span><span>{active.emoji}</span>
            </button>
          </div>
        </div>

        <footer className="w-full py-2 bg-[#f3e9d7]/80 backdrop-blur-sm text-center px-4 shrink-0 z-10">
          <p className="font-bold text-[#6b5a48] text-[11px] sm:text-xs max-w-4xl mx-auto leading-relaxed">Rekaman anak tetap di perangkat · nama samaran · ReadiKids</p>
        </footer>
      </div>

      {/* ═══ HP (zigzag vertikal) ═══ */}
      <div className="flex lg:hidden flex-col flex-1">
        <header className="w-full max-w-md mx-auto px-4 pt-4 flex items-start justify-between z-20 shrink-0">
          <div className="flex flex-col items-start gap-1.5">
            <div className="bg-[#c98a4b] px-5 py-2 rounded-2xl border-[3px] border-[#8a5a2b] shadow-[0px_5px_0px_#8a5a2b,0px_10px_14px_rgba(74,55,40,0.2)]">
              <h1 className="font-black text-[#fff6e9] text-lg tracking-wide uppercase whitespace-nowrap">PETA PETUALANGAN</h1>
            </div>
            <p className="font-bold text-[#4a3728] text-xs mt-1">ikuti jalan setapaknya 👣</p>
          </div>
          <button type="button" onClick={onBackToDashboard} className="rk-sticker bg-white rounded-full px-4 py-2 font-black text-[#4a3728] text-sm active:scale-95 transition-transform cursor-pointer flex items-center gap-1 shrink-0">
            <span className="text-base leading-none">←</span> Beranda
          </button>
        </header>

        <div className="relative flex-1 w-full max-w-md mx-auto px-6 pt-6 pb-2 z-10">
          {renderPathDots("hp")}
          {NODES.map((w, i) => renderNode(w, i, "w-24 h-24", "w-[76px] h-[76px]", "-top-12"))}
        </div>

        <div className="w-full max-w-md mx-auto px-4 pb-6 shrink-0 z-10">
          <div className="bg-[#c98a4b] rounded-3xl border-[3px] border-[#8a5a2b] p-4 shadow-[0px_5px_0px_#8a5a2b,0px_11px_16px_rgba(74,55,40,0.25)] flex flex-col items-center gap-1.5 text-center">
            <h2 className="font-black text-[#fff6e9] text-lg tracking-wide uppercase">TUJUAN: {active.name}</h2>
            <p className="font-bold text-[#f5dfc0] text-xs">{active.subtext}</p>
            <button type="button" onClick={start}
              className="w-full mt-2 py-3.5 rk-sticker-btn bg-[#3e8e5a] rounded-full font-black text-white text-lg tracking-wider active:scale-95 transition-transform cursor-pointer uppercase flex items-center justify-center gap-2">
              <span>MASUK {active.name.split(" ")[0]}!</span><span>{active.emoji}</span>
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#4a3728] text-[#fff6e9] px-5 py-2.5 rounded-full shadow-2xl font-bold text-xs sm:text-sm z-50 border-2 border-white">{toast}</div>
      )}
    </main>
  );
}
