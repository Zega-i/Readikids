import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

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

const BASE_CANVAS = { w: 1280, h: 800 };

interface VisualGameProps {
  onComplete?: (telemetry: TrialEvent[]) => void;
  onBack?: () => void;
}

export const VisualGame = ({ onComplete, onBack }: VisualGameProps): JSX.Element => {
  const [sessionSeed] = useState(() => Math.random().toString(36).substring(2, 10));
  const [trials] = useState<TrialConfig[]>(() => generateSessionTrials(sessionSeed));
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);

  const [stageScale, setStageScale] = useState(1);
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
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / BASE_CANVAS.w, vh / BASE_CANVAS.h);
    
    setViewportSize({ w: vw, h: vh });
    setStageScale(scale);
  }, []);

  useEffect(() => {
    updateStageDimensions();
    window.addEventListener("resize", updateStageDimensions);
    return () => window.removeEventListener("resize", updateStageDimensions);
  }, [updateStageDimensions]);

  const handleAudioInstruction = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("Cari kembaran huruf ini, yuk!");
      utterance.lang = "id-ID";
      window.speechSynthesis.speak(utterance);
    }
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
        effectiveScale: stageScale,
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
    <main className="w-screen h-screen h-[100dvh] bg-[linear-gradient(180deg,rgba(203,235,180,1)_0%,rgba(109,187,87,1)_100%)] relative overflow-hidden select-none font-nunito flex items-center justify-center text-[#4a3728]">
      
      {/* Container Panggung Berskala (Fixed Canvas 1280x800) */}
      <div
        style={{
          width: BASE_CANVAS.w,
          height: BASE_CANVAS.h,
          transform: `scale(${stageScale})`,
          transformOrigin: "center center",
        }}
        className="relative shrink-0 overflow-hidden"
      >
        
        {/* 1. Header (Tombol Kembali, Plang Judul & Indikator Peta, Tombol Suara) */}
        <header className="absolute top-6 left-0 w-full px-10 flex items-start justify-between z-20">
          
          {/* Tombol Kembali (Kiri) */}
          <button
            type="button"
            onClick={onBack}
            className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-slate-50 active:scale-95 transition-transform cursor-pointer border-2 border-white mt-1"
            aria-label="Kembali"
          >
            <span className="font-black text-3xl text-[#4a3728] leading-none -mt-1">‹</span>
          </button>

          {/* Plang Judul & Indikator Level Peta (Tengah) */}
          <div className="flex flex-col items-center gap-2">
            <div className="bg-[#c98a4b] px-9 py-2.5 rounded-2xl border-[3.5px] border-solid border-[#8a5a2b] shadow-md">
              <h1 className="font-black text-[#fff6e9] text-2xl tracking-wider uppercase">
                HUTAN HURUF
              </h1>
            </div>

            {/* Indikator Peta Dunia */}
            <nav className="flex items-center gap-2.5 mt-0.5">
              {levels.map((lvl, idx) => {
                const isActive = idx === 0; // 0 = Hutan Huruf (Aktif)
                return (
                  <div
                    key={lvl.label}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl border-3 shadow-sm transition-all ${
                      isActive
                        ? "bg-[#fff6e9] border-[#ffd34d] scale-105 shadow-md"
                        : "bg-[#fff6e9]/60 border-white/80 opacity-60"
                    }`}
                    title={lvl.label}
                  >
                    <span>{lvl.emoji}</span>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Tombol Audio (Kanan) */}
          <button
            type="button"
            onClick={handleAudioInstruction}
            className="w-14 h-14 bg-[#ffd34d] rounded-full border-4 border-solid border-white flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer mt-1"
            aria-label="Dengarkan petunjuk"
          >
            <span className="text-2xl">🔊</span>
          </button>
        </header>

        {/* 2. Area Stimulus Utama (Cilo + Balon Kata + Kartu Target) */}
        <section className="absolute top-[230px] left-0 w-full px-16 flex items-center justify-center gap-16 z-10">
          
          {/* Cilo & Balon Kata */}
          <div className="flex items-center gap-6">
            
            {/* Maskot Cilo */}
            <div className="relative w-[200px] h-[252px] flex items-center justify-center shrink-0">
              <div className="absolute transform scale-75 origin-center">
                <Cilo />
              </div>
            </div>

            {/* Balon Kata Cilo */}
            <div className="relative bg-white px-7 py-6 rounded-[30px] shadow-[0px_6px_16px_rgba(74,55,40,0.12)] max-w-[320px]">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[10px] border-t-transparent border-r-[14px] border-r-white border-b-[10px] border-b-transparent" />
              <p className="font-black text-[#4a3728] text-2xl leading-snug">
                Cari kembaran
                <br />
                huruf ini, yuk!
              </p>
            </div>
          </div>

          {/* Kartu Stimulus Utama */}
          <div className="w-[230px] h-[260px] bg-[#ffd34d] rounded-[44px] border-[7px] border-solid border-white shadow-[0px_8px_20px_rgba(74,55,40,0.18)] flex items-center justify-center shrink-0">
            <span className="font-black text-[#4a3728] text-[140px] leading-none -mt-3">
              {currentTrial.stimulus}
            </span>
          </div>

        </section>

        {/* 3. Pod Pilihan Jawaban (3 Batu Bulat Spasi Luas) */}
        <section className="absolute top-[525px] left-0 w-full flex items-center justify-center gap-14 z-10">
          {currentPodOptions.map((letter, idx) => (
            <button
              key={`${letter}-${idx}`}
              type="button"
              onPointerDown={(e) => handlePointerDownAnswer(letter, e)}
              className="w-34 h-34 w-[136px] h-[136px] rounded-full border-[6px] border-solid border-white bg-[#fff6e9] shadow-[0px_8px_18px_rgba(74,55,40,0.18)] flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 hover:scale-105 hover:bg-[#fff9f0]"
              aria-label={`Pilih huruf ${letter}`}
            >
              <span className="font-black text-[#4a3728] text-6xl leading-none">
                {letter}
              </span>
            </button>
          ))}
        </section>

        {/* 4. Teks Instruksi Bawah */}
        <div className="absolute top-[715px] left-0 w-full text-center z-10">
          <p className="font-bold text-[#2f5b23] text-lg tracking-wide">
            klik / sentuh batunya — semua pilihan boleh 🌱
          </p>
        </div>

        {/* 5. Footer Layar */}
        <footer className="absolute bottom-3 left-0 w-full text-center shrink-0 z-10">
          <p className="font-bold text-[#2f5b23]/70 text-xs">
            ReadiKids · Skrining Dini
          </p>
        </footer>

      </div>
    </main>
  );
};

export default VisualGame;