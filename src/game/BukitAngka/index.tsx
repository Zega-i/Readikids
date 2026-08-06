import React, { useState, useEffect, useRef, useCallback } from "react";
import { speak } from "../../utils/tts";

// ─── Maskot Cilo ──────────────────────────────────────────────────────────────
export const Cilo = (): JSX.Element => (
  <div className="relative w-[294px] h-[353px] shrink-0" role="img" aria-label="Maskot Cilo">
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

const levels = [
  { emoji: "🌳", label: "Hutan" },
  { emoji: "🌊", label: "Laut" },
  { emoji: "⛰️", label: "Gunung" },
  { emoji: "⭐", label: "Bintang" },
];

// ─── Tipe telemetri Bukit Angka ───────────────────────────────────────────────
export interface NumberLineTrialEvent {
  target: number;
  answerValue: number;
  trialType: "numberline";
  trialIndex: number;
  nlee: number;
  rangeMax: number;
  firstTapDelayMs: number;       // waktu estimasi spasial murni (muncul soal -> tap pertama)
  dragTimeMs: number;
  lockDelayMs: number;
  totalTimeMs: number;
  moveCount: number;
  sessionSeed: string;
  deviceInfo: {
    viewportWidth: number;
    viewportHeight: number;
    effectiveScale: number;
    pointerType: string;
  };
}

const MOTOR_BASELINE_MS = 1000;
const RANGE_MAX = 10;

function seededRandom(seedStr: string) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0;
  return function () {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateTargets(seed: string): number[] {
  const rng = seededRandom(seed);
  // Stratified Randomization: 10 target angka (2,3,4,4,5,6,7,7,8,9) dibagi merata
  // agar rentang kecil, menengah, dan besar terbagi adil di tiap babak.
  const block1Targets = [2, 4, 5, 7, 9];
  const block2Targets = [3, 4, 6, 7, 8];

  const babak1 = shuffle(block1Targets, rng);
  const babak2 = shuffle(block2Targets, rng);

  const blocks = [babak1, babak2];
  // Acak urutan babak, lalu gabungkan isinya
  return shuffle(blocks, rng).flat();
}

const BASE_CANVAS = { w: 1280, h: 800 };
const LINE = { x: 240, width: 800 };

export interface NumberLineGameProps {
  onComplete?: (telemetry: NumberLineTrialEvent[]) => void;
  onBack?: () => void;
}

export const NumberLineGame = ({ onComplete, onBack }: NumberLineGameProps): JSX.Element => {
  const [sessionSeed] = useState(() => Math.random().toString(36).substring(2, 10));
  const [targets] = useState<number[]>(() => generateTargets(sessionSeed));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ciloText, setCiloText] = useState("Taruh angka ini\ndi garisnya!");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [markerValue, setMarkerValue] = useState(5);
  const [isMarkerVisible, setIsMarkerVisible] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [stageScale, setStageScale] = useState(1);
  const [viewportSize, setViewportSize] = useState({ w: 1280, h: 800 });

  const telemetryRef = useRef<NumberLineTrialEvent[]>([]);
  const lineRef = useRef<HTMLDivElement>(null);

  const stimulusTimeRef = useRef<number>(0);
  const dragStartTimeRef = useRef<number>(0);
  const dragEndTimeRef = useRef<number>(0);
  const dragTotalMsRef = useRef<number>(0);
  const firstTapTimeRef = useRef<number>(0);
  const moveCountRef = useRef<number>(0);

  const currentTarget = targets[currentIndex];

  useEffect(() => {
    setIsMarkerVisible(false);
    setMarkerValue(5);
    setHasMoved(false);
    dragStartTimeRef.current = 0;
    dragEndTimeRef.current = 0;
    dragTotalMsRef.current = 0;
    firstTapTimeRef.current = 0;
    moveCountRef.current = 0;
    setCiloText("Taruh angka ini\ndi garisnya!");
    setIsTransitioning(false);
    requestAnimationFrame(() => { stimulusTimeRef.current = performance.now(); });
  }, [currentIndex]);

  const updateScale = useCallback(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    setStageScale(Math.min(vw / BASE_CANVAS.w, vh / BASE_CANVAS.h));
    setViewportSize({ w: vw, h: vh });
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [updateScale]);

  const pointerToValue = useCallback((clientX: number): number => {
    if (!lineRef.current) return markerValue;
    const rect = lineRef.current.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, ratio));
    return clamped * RANGE_MAX;
  }, [markerValue]);

  const handleDragStart = (e: React.PointerEvent) => {
    // e.stopPropagation(); dihapus agar anak tetap bisa melakukan tap koreksi mikro di atas area tapak
    if (isTransitioning) return;
    
    // Walau jarang, jika anak somehow berhasil drag sebelum tap (misal drag area garis kosong), catat firstTap
    if (firstTapTimeRef.current === 0) {
      firstTapTimeRef.current = performance.now();
    }
    
    setIsDragging(true);
    if (dragStartTimeRef.current === 0) dragStartTimeRef.current = performance.now();
    moveCountRef.current += 1;
    setHasMoved(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setMarkerValue(pointerToValue(e.clientX));
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    dragEndTimeRef.current = performance.now();
    dragTotalMsRef.current += dragEndTimeRef.current - dragStartTimeRef.current;
    dragStartTimeRef.current = 0;
  };

  const handleLineClick = (e: React.PointerEvent) => {
    if (isTransitioning) return;
    if (firstTapTimeRef.current === 0) {
      firstTapTimeRef.current = performance.now(); // waktu estimasi spasial murni
    }
    moveCountRef.current += 1;
    setHasMoved(true);
    setIsMarkerVisible(true);
    setMarkerValue(pointerToValue(e.clientX));
  };

  const handleLompat = () => {
    if (isTransitioning || !hasMoved) return;

    const now = performance.now();
    const totalTimeMs = Math.round(now - stimulusTimeRef.current);
    const dragTimeMs = Math.round(dragTotalMsRef.current);
    const rawLockDelay = dragEndTimeRef.current > 0
      ? now - dragEndTimeRef.current
      : 0;
    const lockDelayMs = Math.max(0, Math.round(rawLockDelay - MOTOR_BASELINE_MS));

    const firstTapDelayMs = firstTapTimeRef.current > 0 
      ? Math.round(firstTapTimeRef.current - stimulusTimeRef.current) 
      : totalTimeMs;

    const answerValue = markerValue;
    const nlee = (Math.abs(answerValue - currentTarget) / RANGE_MAX) * 100;

    const ev: NumberLineTrialEvent = {
      target: currentTarget,
      answerValue: Math.round(answerValue * 100) / 100,
      trialType: "numberline",
      trialIndex: currentIndex,
      nlee: Math.round(nlee * 100) / 100,
      rangeMax: RANGE_MAX,
      firstTapDelayMs,
      dragTimeMs,
      lockDelayMs,
      totalTimeMs,
      moveCount: moveCountRef.current,
      sessionSeed,
      deviceInfo: {
        viewportWidth: viewportSize.w,
        viewportHeight: viewportSize.h,
        effectiveScale: stageScale,
        pointerType: "mouse",
      },
    };
    telemetryRef.current.push(ev);

    setCiloText(["Hop!", "Mantap!", "Lanjut!", "Sip!"][Math.floor(Math.random() * 4)]);
    setIsTransitioning(true);
    setTimeout(() => {
      if (currentIndex + 1 < targets.length) setCurrentIndex((p) => p + 1);
      else onComplete?.(telemetryRef.current);
    }, 500);
  };

  // Bacakan instruksi lewat util speak() yang sama (suara seragam antar game).
  const handleAudio = () => {
    void speak(`Sentuh di mana letak angka ${currentTarget}`, { lang: "id-ID" });
  };

  const markerPercent = (markerValue / RANGE_MAX) * 100;

  return (
    <main className="w-screen h-screen h-[100dvh] bg-[linear-gradient(180deg,rgba(255,233,201,1)_0%,rgba(242,166,90,1)_100%)] relative overflow-hidden select-none font-nunito flex items-center justify-center text-[#4a3728]"
      style={{ touchAction: "none" }}>
      <div
        style={{
          width: BASE_CANVAS.w, height: BASE_CANVAS.h,
          transform: `scale(${stageScale})`, transformOrigin: "center center",
        }}
        className="relative shrink-0 overflow-hidden"
      >
        {/* Header */}
        <header className="absolute top-6 left-0 w-full px-10 flex items-start justify-between z-20">
          <button type="button" onClick={onBack}
            className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md active:scale-95 border-2 border-white mt-1 cursor-pointer"
            aria-label="Kembali">
            <span className="font-black text-3xl leading-none -mt-1">‹</span>
          </button>

          <div className="flex flex-col items-center gap-2">
            <div className="bg-[#c98a4b] px-9 py-2.5 rounded-2xl border-[3.5px] border-solid border-[#8a5a2b] shadow-md">
              <h1 className="font-black text-[#fff6e9] text-2xl tracking-wider uppercase">BUKIT ANGKA</h1>
            </div>
            <nav className="flex items-center gap-2.5 mt-0.5">
              {levels.map((lvl, idx) => {
                const isActive = idx === 2; // 2 = Bukit Angka
                return (
                  <div key={lvl.label}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl border-3 shadow-sm transition-all ${
                      isActive ? "bg-[#fff6e9] border-[#ffd34d] scale-105 shadow-md" : "bg-[#fff6e9]/60 border-white/80 opacity-60"
                    }`} title={lvl.label}>
                    <span>{lvl.emoji}</span>
                  </div>
                );
              })}
            </nav>
          </div>

          <button type="button" onClick={handleAudio}
            className="w-14 h-14 bg-[#ffd34d] rounded-full border-4 border-solid border-white flex items-center justify-center shadow-md active:scale-95 mt-1 cursor-pointer"
            aria-label="Dengarkan petunjuk">
            <span className="text-2xl">🔊</span>
          </button>
        </header>

        {/* Cilo + Balon + Kartu angka target */}
        <section className="absolute top-[220px] left-0 w-full px-16 flex items-center justify-center gap-16 z-10">
          <div className="flex items-center gap-6">
            <div className="relative w-[200px] h-[252px] flex items-center justify-center shrink-0">
              <div className="absolute transform scale-75 origin-center"><Cilo /></div>
            </div>
            <div className="relative bg-white px-7 py-6 rounded-[30px] shadow-[0px_6px_16px_rgba(74,55,40,0.12)] max-w-[280px]">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[10px] border-t-transparent border-r-[14px] border-r-white border-b-[10px] border-b-transparent" />
              <p className="font-black text-2xl leading-snug whitespace-pre-line">{ciloText}</p>
            </div>
          </div>

          {/* Kartu angka target */}
          <div className="w-[200px] h-[200px] bg-[#f2704e] rounded-[40px] border-[6px] border-solid border-white shadow-[0px_8px_20px_rgba(74,55,40,0.2)] flex items-center justify-center shrink-0">
            <span className="font-black text-[#4a3728] text-[130px] leading-none">{currentTarget}</span>
          </div>
        </section>

        {/* Garis bilangan + tapak geser */}
        <section className="absolute left-0 w-full flex flex-col items-center z-10" style={{ top: 500 }}>
          <div className="relative" style={{ width: LINE.width, height: 90 }}>
            {/* tiang 0 & 10 */}
            <div className="absolute bg-[#8a5a2b] rounded" style={{ left: -4, top: 0, width: 10, height: 68 }} />
            <div className="absolute bg-[#8a5a2b] rounded" style={{ right: -4, top: 0, width: 10, height: 68 }} />

            {/* garis — POLOS tanpa tick, agar tetap estimasi kontinu */}
            <div
              ref={lineRef}
              onPointerDown={handleLineClick}
              className="absolute bg-[#fff6e9] rounded-full border-2 border-white cursor-pointer"
              style={{ left: 0, top: 26, width: LINE.width, height: 16 }}
            />

            {/* label 0 & 10 */}
            <div className="absolute font-black text-[34px]" style={{ left: -34, top: 52 }}>0</div>
            <div className="absolute font-black text-[34px]" style={{ right: -40, top: 52 }}>10</div>

            {/* tapak geser */}
            <div
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              className="absolute rounded-full bg-[#ffd34d] border-[5px] border-white shadow-[0px_6px_14px_rgba(74,55,40,0.25)] flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
              style={{
                left: `calc(${markerPercent}% - 36px)`,
                top: 0,
                width: 72, height: 72,
                transition: isDragging ? "none" : "left 0.15s",
                opacity: isMarkerVisible ? 1 : 0,
                pointerEvents: isMarkerVisible ? "auto" : "none",
              }}
            >
              <span className="text-3xl leading-none pointer-events-none">🐾</span>
            </div>
          </div>

          {/* Tombol LOMPAT */}
          <button type="button" onClick={handleLompat} disabled={!hasMoved || isTransitioning}
            className="mt-16 px-12 py-3.5 bg-[#ffd34d] rounded-full border-[5px] border-white shadow-[0px_6px_14px_rgba(74,55,40,0.2)] font-black text-[#4a3728] text-2xl active:scale-95 transition-transform cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            LOMPAT!
          </button>
        </section>

        {/* Hint */}
        <div className="absolute left-0 w-full text-center z-10" style={{ top: 758 }}>
          <p className="font-bold text-[#7a4a12] text-base">
            sentuh garisnya, geser jika perlu, lalu tekan LOMPAT 🌱
          </p>
        </div>
      </div>
    </main>
  );
};

export default NumberLineGame;