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
    setViewportSize({ w: window.innerWidth, h: window.innerHeight });
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
        effectiveScale: typeof window !== "undefined" ? window.devicePixelRatio : 1,
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
    <main className="w-full h-[100dvh] bg-[linear-gradient(180deg,rgba(255,233,201,1)_0%,rgba(242,166,90,1)_100%)] relative overflow-hidden select-none font-nunito flex flex-col text-[#4a3728]"
      style={{ touchAction: "none" }}>

      {/* Header */}
      <header className="shrink-0 px-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={onBack}
            className="w-12 h-12 rounded-full bg-white rk-sticker flex items-center justify-center active:scale-95 transition-transform cursor-pointer shrink-0"
            aria-label="Kembali">
            <span className="font-black text-2xl text-[#4a3728] leading-none -mt-0.5">‹</span>
          </button>
          <div className="bg-[#c98a4b] px-5 py-2 rounded-2xl border-[3px] border-[#8a5a2b] shadow-[0px_4px_0px_#8a5a2b,0px_9px_12px_rgba(74,55,40,0.2)]">
            <h1 className="font-black text-[#fff6e9] text-lg tracking-wider uppercase">BUKIT ANGKA</h1>
          </div>
          <button type="button" onClick={handleAudio}
            className="w-12 h-12 rounded-full bg-[#ffd34d] rk-sticker flex items-center justify-center active:scale-95 transition-transform cursor-pointer shrink-0"
            aria-label="Dengarkan petunjuk">
            <span className="text-2xl">🔊</span>
          </button>
        </div>
        <nav className="flex items-center justify-center gap-2 mt-3">
          {levels.map((lvl, idx) => {
            const isActive = idx === 2;
            return (
              <div key={lvl.label}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border-2 ${
                  isActive ? "bg-[#fff6e9] border-[#ffd34d] shadow-sm" : "bg-[#fff6e9]/50 border-white/70 opacity-55"
                }`} title={lvl.label}>
                <span>{lvl.emoji}</span>
              </div>
            );
          })}
        </nav>
      </header>

      {/* Konten utama */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-5 px-5">

        {/* Cilo + balon */}
        <div className="w-full max-w-md flex items-center gap-3">
          <div className="relative w-[92px] h-[110px] shrink-0">
            <div className="absolute top-0 left-0 scale-[0.31] origin-top-left"><Cilo /></div>
          </div>
          <div className="relative flex-1 bg-white rounded-[24px] rk-sticker px-5 py-4">
            <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[9px] border-t-transparent border-r-[12px] border-r-white border-b-[9px] border-b-transparent" />
            <p className="font-black text-[#4a3728] text-lg leading-snug whitespace-pre-line">{ciloText}</p>
          </div>
        </div>

        {/* Kartu angka target */}
        <div className="w-32 h-32 bg-[#f2704e] rounded-[32px] border-[6px] border-white shadow-[0px_8px_0px_#d85a3c,0px_16px_20px_rgba(74,55,40,0.18)] flex items-center justify-center shrink-0">
          <span className="font-black text-white text-[84px] leading-none">{currentTarget}</span>
        </div>

        {/* Garis bilangan (lebar-penuh & responsif) + tapak geser */}
        <div className="w-full max-w-md px-6">
          <div className="relative w-full h-24">
            {/* garis — POLOS tanpa tick (estimasi kontinu) */}
            <div
              ref={lineRef}
              onPointerDown={handleLineClick}
              className="absolute left-0 right-0 bg-[#fff6e9] rounded-full border-2 border-white cursor-pointer"
              style={{ top: 22, height: 14 }}
            />
            {/* tiang 0 & 10 */}
            <div className="absolute bg-[#8a5a2b] rounded" style={{ left: 0, top: 0, width: 8, height: 58 }} />
            <div className="absolute bg-[#8a5a2b] rounded" style={{ right: 0, top: 0, width: 8, height: 58 }} />
            {/* label 0 & 10 — tepat di bawah tiang, tidak menabrak garis cokelat */}
            <div className="absolute font-black text-2xl text-[#4a3728]" style={{ left: 4, top: 62, transform: "translateX(-50%)" }}>0</div>
            <div className="absolute font-black text-2xl text-[#4a3728]" style={{ left: "calc(100% - 4px)", top: 62, transform: "translateX(-50%)" }}>10</div>

            {/* tapak geser */}
            <div
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              className="absolute rounded-full bg-[#ffd34d] border-[5px] border-white shadow-[0px_6px_14px_rgba(74,55,40,0.25)] flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
              style={{
                left: `calc(${markerPercent}% - 28px)`,
                top: 1,
                width: 56, height: 56,
                transition: isDragging ? "none" : "left 0.15s",
                opacity: isMarkerVisible ? 1 : 0,
                pointerEvents: isMarkerVisible ? "auto" : "none",
              }}
            >
              <span className="text-2xl leading-none pointer-events-none">🐾</span>
            </div>
          </div>
        </div>

        {/* Tombol LOMPAT */}
        <button type="button" onClick={handleLompat} disabled={!hasMoved || isTransitioning}
          className="px-12 py-3.5 bg-[#ffd34d] rounded-full border-[4px] border-white shadow-[0px_5px_0px_#e8b84d,0px_11px_14px_rgba(74,55,40,0.18)] font-black text-[#4a3728] text-2xl active:scale-95 transition-transform cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
          LOMPAT!
        </button>
      </div>

      {/* Hint */}
      <div className="shrink-0 pb-7 px-5 text-center">
        <p className="font-bold text-[#7a4a12] text-sm">
          sentuh garisnya, geser jika perlu, lalu tekan LOMPAT 🌱
        </p>
      </div>
    </main>
  );
};

export default NumberLineGame;