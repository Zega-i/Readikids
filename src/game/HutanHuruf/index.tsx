import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { speak } from "../../utils/tts";

// 1. Maskot Cilo Asli
export const Cilo = (): JSX.Element => {
  return (
    <div
      className="relative w-[294px] h-[353px] shrink-0"
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

// Data Level Peta (Indikator Dunia)
const levels = [
  { emoji: "🌳", label: "Hutan" },
  { emoji: "🌊", label: "Laut" },
  { emoji: "⛰️", label: "Gunung" },
  { emoji: "⭐", label: "Bintang" },
];

export interface TrialEvent {
  stimulus: string;
  trialType: "mirror" | "control";
  trialIndex: number;
  podOptions: string[];
  responseKey: string;
  isCorrect: boolean;
  reactionTimeMs: number;
  sessionSeed: string;
  deviceInfo: {
    viewportWidth: number;
    viewportHeight: number;
    effectiveScale: number;
    pointerType: "mouse" | "touch" | "pen" | string;
  };
}

interface TrialConfig {
  stimulus: string;
  trialType: "mirror" | "control";
}

const podMap: Record<string, string[]> = {
  b: ["b", "d", "p"],
  d: ["d", "b", "q"],
  p: ["p", "q", "b"],
  q: ["q", "p", "d"],
  a: ["a", "o", "e"],
  m: ["m", "n", "w"],
  o: ["o", "a", "c"],
};

function seededRandom(seedStr: string) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0;
  }
  return function () {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArray<T>(array: T[], rng: () => number): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateSessionTrials(seedStr: string): TrialConfig[] {
  const rng = seededRandom(seedStr);

  // 6 soal mirror
  const mirrorTrials: TrialConfig[] = [
    { stimulus: "b", trialType: "mirror" },
    { stimulus: "b", trialType: "mirror" },
    { stimulus: "d", trialType: "mirror" },
    { stimulus: "d", trialType: "mirror" },
    { stimulus: "p", trialType: "mirror" },
    { stimulus: "q", trialType: "mirror" },
  ];

  // 4 soal control
  const controlTrials: TrialConfig[] = [
    { stimulus: "a", trialType: "control" },
    { stimulus: "a", trialType: "control" },
    { stimulus: "m", trialType: "control" },
    { stimulus: "o", trialType: "control" },
  ];

  // Acak masing-masing grup terlebih dahulu
  const shuffledMirrors = shuffleArray(mirrorTrials, rng);
  const shuffledControls = shuffleArray(controlTrials, rng);

  // Distribusi PASTI seimbang per babak: 3 mirror + 2 control
  const block1 = shuffleArray([...shuffledMirrors.slice(0, 3), ...shuffledControls.slice(0, 2)], rng);
  const block2 = shuffleArray([...shuffledMirrors.slice(3, 6), ...shuffledControls.slice(2, 4)], rng);

  const blocks: TrialConfig[][] = [block1, block2];

  const shuffledBlocks = shuffleArray(blocks, rng);
  return shuffledBlocks.flatMap((b) => shuffleArray(b, rng));
}

interface VisualGameProps {
  onComplete?: (telemetry: TrialEvent[]) => void;
  onBack?: () => void;
}

export const VisualGame = ({ onComplete, onBack }: VisualGameProps): JSX.Element => {
  const [sessionSeed] = useState(() => Math.random().toString(36).substring(2, 10));
  const [trials] = useState<TrialConfig[]>(() => generateSessionTrials(sessionSeed));
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);

  const [viewportSize, setViewportSize] = useState({ w: 1280, h: 800 });

  const telemetryDataRef = useRef<TrialEvent[]>([]);
  const stimulusRenderTimeRef = useRef<number>(0);

  const currentTrial = trials[currentTrialIndex];

  // Pilihan jawaban dihitung SINKRON dengan huruf yang tampil (dulu lewat
  // useRef+useEffect yang tertinggal 1 render → pilihan tak cocok dgn huruf).
  const currentPodOptions = useMemo(() => {
    const rawOptions = podMap[currentTrial.stimulus] || [currentTrial.stimulus, "x", "y"];
    const rng = seededRandom(`${sessionSeed}-trial-${currentTrialIndex}`);
    return shuffleArray(rawOptions, rng);
  }, [currentTrialIndex, currentTrial, sessionSeed]);

  // Catat waktu stimulus muncul (untuk waktu reaksi), setelah render.
  useEffect(() => {
    stimulusRenderTimeRef.current = performance.now();
  }, [currentTrialIndex]);

  const updateStageDimensions = useCallback(() => {
    setViewportSize({ w: window.innerWidth, h: window.innerHeight });
  }, []);

  useEffect(() => {
    updateStageDimensions();
    window.addEventListener("resize", updateStageDimensions);
    return () => window.removeEventListener("resize", updateStageDimensions);
  }, [updateStageDimensions]);

  // Bacakan instruksi lewat util speak() yang sama dengan game lain (suara seragam).
  const handleAudioInstruction = () => {
    void speak("Cari kembaran huruf ini, yuk!", { lang: "id-ID" });
  };

  const handlePointerDownAnswer = (
    selectedLetter: string,
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    const pointerDownTime = performance.now();
    const reactionTimeMs = Math.round(pointerDownTime - stimulusRenderTimeRef.current);

    const trialEvent: TrialEvent = {
      stimulus: currentTrial.stimulus,
      trialType: currentTrial.trialType,
      trialIndex: currentTrialIndex,
      podOptions: currentPodOptions,
      responseKey: selectedLetter,
      isCorrect: selectedLetter === currentTrial.stimulus,
      reactionTimeMs,
      sessionSeed,
      deviceInfo: {
        viewportWidth: viewportSize.w,
        viewportHeight: viewportSize.h,
        effectiveScale: typeof window !== "undefined" ? window.devicePixelRatio : 1,
        pointerType: event.pointerType || "mouse",
      },
    };

    telemetryDataRef.current.push(trialEvent);

    if (currentTrialIndex + 1 < trials.length) {
      setCurrentTrialIndex((prev) => prev + 1);
    } else {
      if (onComplete) {
        onComplete(telemetryDataRef.current);
      }
    }
  };

  return (
    <main className="w-full h-[100dvh] bg-[linear-gradient(180deg,rgba(203,235,180,1)_0%,rgba(109,187,87,1)_100%)] relative overflow-hidden select-none font-nunito flex flex-col text-[#4a3728]">

      {/* Header */}
      <header className="shrink-0 px-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          {/* Kembali */}
          <button
            type="button"
            onClick={onBack}
            className="w-12 h-12 rounded-full bg-white rk-sticker flex items-center justify-center active:scale-95 transition-transform cursor-pointer shrink-0"
            aria-label="Kembali"
          >
            <span className="font-black text-2xl text-[#4a3728] leading-none -mt-0.5">‹</span>
          </button>

          {/* Plang Judul */}
          <div className="bg-[#c98a4b] px-5 py-2 rounded-2xl border-[3px] border-[#8a5a2b] shadow-[0px_4px_0px_#8a5a2b,0px_9px_12px_rgba(74,55,40,0.2)]">
            <h1 className="font-black text-[#fff6e9] text-lg tracking-wider uppercase">
              HUTAN HURUF
            </h1>
          </div>

          {/* Audio */}
          <button
            type="button"
            onClick={handleAudioInstruction}
            className="w-12 h-12 rounded-full bg-[#ffd34d] rk-sticker flex items-center justify-center active:scale-95 transition-transform cursor-pointer shrink-0"
            aria-label="Dengarkan petunjuk"
          >
            <span className="text-2xl">🔊</span>
          </button>
        </div>

        {/* Indikator dunia (album stiker) */}
        <nav className="flex items-center justify-center gap-2 mt-3">
          {levels.map((lvl, idx) => {
            const isActive = idx === 0; // 0 = Hutan Huruf (Aktif)
            return (
              <div
                key={lvl.label}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border-2 ${
                  isActive
                    ? "bg-[#fff6e9] border-[#ffd34d] shadow-sm"
                    : "bg-[#fff6e9]/50 border-white/70 opacity-55"
                }`}
                title={lvl.label}
              >
                <span>{lvl.emoji}</span>
              </div>
            );
          })}
        </nav>
      </header>

      {/* Konten utama — mengisi ruang & terpusat */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-5 px-5">

        {/* Cilo + balon kata */}
        <div className="w-full max-w-md flex items-center gap-3">
          <div className="relative w-[92px] h-[110px] shrink-0">
            <div className="absolute top-0 left-0 scale-[0.31] origin-top-left">
              <Cilo />
            </div>
          </div>
          <div className="relative flex-1 bg-white rounded-[24px] rk-sticker px-5 py-4">
            <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[9px] border-t-transparent border-r-[12px] border-r-white border-b-[9px] border-b-transparent" />
            <p className="font-black text-[#4a3728] text-lg leading-snug">
              Cari kembaran huruf ini, yuk!
            </p>
          </div>
        </div>

        {/* Kartu stimulus */}
        <div className="w-40 h-44 bg-[#ffd34d] rounded-[36px] border-[6px] border-white shadow-[0px_8px_0px_#e8b84d,0px_16px_20px_rgba(74,55,40,0.18)] flex items-center justify-center shrink-0">
          <span className="font-black text-[#4a3728] text-[100px] leading-none -mt-2">
            {currentTrial.stimulus}
          </span>
        </div>

        {/* Pod pilihan jawaban — statis (tanpa animasi selama trial) */}
        <div className="w-full max-w-md flex items-center justify-center gap-4">
          {currentPodOptions.map((letter, idx) => (
            <button
              key={`${letter}-${idx}`}
              type="button"
              onPointerDown={(e) => handlePointerDownAnswer(letter, e)}
              className="w-[86px] h-[86px] rounded-full border-[5px] border-white bg-[#fff6e9] shadow-[0px_6px_0px_#e2d3bd,0px_12px_16px_rgba(74,55,40,0.15)] flex items-center justify-center cursor-pointer shrink-0"
              aria-label={`Pilih huruf ${letter}`}
            >
              <span className="font-black text-[#4a3728] text-5xl leading-none">
                {letter}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Hint bawah */}
      <div className="shrink-0 pb-7 px-5 text-center">
        <p className="font-bold text-[#2f5b23] text-sm tracking-wide">
          sentuh batunya — semua pilihan boleh 🌱
        </p>
      </div>
    </main>
  );
};

export default VisualGame;