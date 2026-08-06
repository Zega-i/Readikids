import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
// Sesuaikan path import ini dengan struktur proyek Anda:
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

// Indikator dunia (sama dengan VisualGame — Sungai aktif di index 1)
const levels = [
  { emoji: "🌳", label: "Hutan" },
  { emoji: "🌊", label: "Laut" },
  { emoji: "⛰️", label: "Gunung" },
  { emoji: "⭐", label: "Bintang" },
];

// ─── Tipe telemetri lokal (dikirim via onComplete) ────────────────────────────
// Field cocok dengan MetricCalculator: HI = hesitationMs / max(1, totalTimeMs)
export interface PhonicsTrialEvent {
  stimulus: string;
  trialType: "phonics";
  trialIndex: number;
  podOptions: string[];
  responseKey: string;
  isCorrect: boolean;
  totalTimeMs: number;
  hesitationMs: number;
  replayCount: number;
  audioSource: "tts" | "file";
  sessionSeed: string;
  deviceInfo: {
    viewportWidth: number;
    viewportHeight: number;
    effectiveScale: number;
    pointerType: string;
  };
}

interface PhonicsTrialConfig {
  stimulus: string;
}

const podMap: Record<string, string[]> = {
  ma: ["ma", "na", "wa"],
  na: ["na", "ma", "la"],
  wa: ["wa", "ma", "va"],
};

const MOTOR_BASELINE_MS = 1000;

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
function generateTrials(seed: string): PhonicsTrialConfig[] {
  const rng = seededRandom(seed);
  // Stratified Randomization: 10 soal dibagi 2 babak yang seimbang
  // Total target: 4 ma, 3 na, 3 wa
  const block1Stimuli = ["ma", "ma", "na", "na", "wa"]; // Babak 1: 2 ma, 2 na, 1 wa
  const block2Stimuli = ["ma", "ma", "na", "wa", "wa"]; // Babak 2: 2 ma, 1 na, 2 wa

  const block1 = shuffle(block1Stimuli, rng).map((s) => ({ stimulus: s }));
  const block2 = shuffle(block2Stimuli, rng).map((s) => ({ stimulus: s }));
  
  const blocks = [block1, block2];
  // Acak urutan babak, lalu acak soal di dalam babaknya
  return shuffle(blocks, rng).flatMap((b) => shuffle(b, rng));
}

const BASE_CANVAS = { w: 1280, h: 800 };

interface PhonicsGameProps {
  onComplete?: (telemetry: PhonicsTrialEvent[]) => void;
  onBack?: () => void;
}

/**
 * Putar bunyi suku kata. UTAMAKAN file rekaman /audio/<suku>.mp3 (jernih &
 * konsisten untuk skrining); bila file belum ada / gagal diputar, fallback
 * otomatis ke TTS. Promise selesai saat audio berakhir agar timing telemetri
 * (Hesitation Index) tetap akurat.
 */
function playSyllable(syllable: string): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    const fallbackToTts = () => {
      if (settled) return;
      settled = true;
      void speak(syllable, { lang: "id-ID" }).then(() => resolve());
    };
    try {
      const audio = new Audio(`/audio/${syllable}.mp3`);
      audio.onended = finish;
      audio.onerror = fallbackToTts; // file belum ada / gagal load
      const played = audio.play();
      if (played && typeof played.then === "function") {
        played.catch(fallbackToTts); // autoplay diblokir / gagal
      }
    } catch {
      fallbackToTts();
    }
  });
}

export const PhonicsGame = ({ onComplete, onBack }: PhonicsGameProps): JSX.Element => {
  const [sessionSeed] = useState(() => Math.random().toString(36).substring(2, 10));
  const [trials] = useState<PhonicsTrialConfig[]>(() => generateTrials(sessionSeed));
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [ciloText, setCiloText] = useState("Dengar bunyinya,\npilih hurufnya!");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [stageScale, setStageScale] = useState(1);
  const [viewportSize, setViewportSize] = useState({ w: 1280, h: 800 });

  const telemetryDataRef = useRef<PhonicsTrialEvent[]>([]);
  const audioEndTimeRef = useRef<number>(0);
  const replayCountRef = useRef<number>(0);

  const currentTrial = trials[currentTrialIndex];

  // Pilihan jawaban dihitung SINKRON dengan bunyi/stimulus (seragam dgn Hutan Huruf).
  const podOptions = useMemo(() => {
    const raw = podMap[currentTrial.stimulus] ?? [currentTrial.stimulus, "?", "?"];
    const rng = seededRandom(`${sessionSeed}-phon-${currentTrialIndex}`);
    return shuffle(raw, rng);
  }, [currentTrialIndex, currentTrial, sessionSeed]);

  const playStimulus = useCallback(async (syllable: string, isReplay: boolean) => {
    if (isReplay) replayCountRef.current += 1;
    setIsPlaying(true);
    try {
      await playSyllable(syllable);
    } catch {
      // lanjut walau gagal
    }
    setIsPlaying(false);
    audioEndTimeRef.current = performance.now();
  }, []);

  useEffect(() => {
    if (!currentTrial) return;
    audioEndTimeRef.current = 0;
    replayCountRef.current = 0;
    setCiloText("Dengar bunyinya,\npilih hurufnya!");
    setIsTransitioning(false);
    const t = setTimeout(() => { void playStimulus(currentTrial.stimulus, false); }, 400);
    return () => clearTimeout(t);
  }, [currentTrialIndex, currentTrial, sessionSeed, playStimulus]);

  // Panggung berskala — IDENTIK dengan VisualGame yang sudah jalan
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

  // Tombol audio pojok atas: bacakan INSTRUKSI (seragam dengan Hutan & Bukit).
  // Untuk mengulang suku kata, ada tombol "Dengar Lagi" terpisah.
  const handleAudioInstruction = () => {
    void speak("Dengar bunyinya, pilih hurufnya!", { lang: "id-ID" });
  };

  const handleAnswer = (letter: string, e: React.PointerEvent<HTMLButtonElement>) => {
    if (isTransitioning || audioEndTimeRef.current === 0) return;
    const totalTimeMs = Math.round(performance.now() - audioEndTimeRef.current);
    const hesitationMs = Math.max(0, totalTimeMs - MOTOR_BASELINE_MS);

    const ev: PhonicsTrialEvent = {
      stimulus: currentTrial.stimulus,
      trialType: "phonics",
      trialIndex: currentTrialIndex,
      podOptions,
      responseKey: letter,
      isCorrect: letter === currentTrial.stimulus,
      totalTimeMs,
      hesitationMs,
      replayCount: replayCountRef.current,
      audioSource: "tts",
      sessionSeed,
      deviceInfo: {
        viewportWidth: viewportSize.w,
        viewportHeight: viewportSize.h,
        effectiveScale: stageScale,
        pointerType: e.pointerType || "mouse",
      },
    };
    telemetryDataRef.current.push(ev);

    setCiloText(["Wah!", "Oke!", "Lanjut!", "Sip!"][Math.floor(Math.random() * 4)]);
    setIsTransitioning(true);
    setTimeout(() => {
      if (currentTrialIndex + 1 < trials.length) {
        setCurrentTrialIndex((p) => p + 1);
      } else {
        onComplete?.(telemetryDataRef.current);
      }
    }, 400);
  };

  return (
    // Kerangka IDENTIK dengan VisualGame: flex center + transformOrigin center
    <main className="w-screen h-screen h-[100dvh] bg-[linear-gradient(180deg,rgba(214,240,251,1)_0%,rgba(88,183,232,1)_100%)] relative overflow-hidden select-none font-nunito flex items-center justify-center text-[#4a3728]">
      <div
        style={{
          width: BASE_CANVAS.w,
          height: BASE_CANVAS.h,
          transform: `scale(${stageScale})`,
          transformOrigin: "center center",
        }}
        className="relative shrink-0 overflow-hidden"
      >
        {/* 1. Header */}
        <header className="absolute top-6 left-0 w-full px-10 flex items-start justify-between z-20">
          {/* Tombol Kembali */}
          <button
            type="button"
            onClick={onBack}
            className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-slate-50 active:scale-95 transition-transform cursor-pointer border-2 border-white mt-1"
            aria-label="Kembali"
          >
            <span className="font-black text-3xl text-[#4a3728] leading-none -mt-1">‹</span>
          </button>

          {/* Plang Judul & Indikator */}
          <div className="flex flex-col items-center gap-2">
            <div className="bg-[#c98a4b] px-9 py-2.5 rounded-2xl border-[3.5px] border-solid border-[#8a5a2b] shadow-md">
              <h1 className="font-black text-[#fff6e9] text-2xl tracking-wider uppercase">
                SUNGAI BUNYI
              </h1>
            </div>
            <nav className="flex items-center gap-2.5 mt-0.5">
              {levels.map((lvl, idx) => {
                const isActive = idx === 1; // 1 = Sungai Bunyi
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

          {/* Tombol Suara pojok atas — bacakan INSTRUKSI (bukan mengulang suku kata) */}
          <button
            type="button"
            onClick={handleAudioInstruction}
            className="w-14 h-14 bg-[#ffd34d] rounded-full border-4 border-solid border-white flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer mt-1"
            aria-label="Dengarkan petunjuk"
          >
            <span className="text-2xl">🔊</span>
          </button>
        </header>

        {/* 2. Area Stimulus (Cilo + Balon + Lonceng + Dengar Lagi) */}
        <section className="absolute top-[230px] left-0 w-full px-16 flex items-center justify-center gap-16 z-10">
          {/* Cilo & Balon */}
          <div className="flex items-center gap-6">
            <div className="relative w-[200px] h-[252px] flex items-center justify-center shrink-0">
              <div className="absolute transform scale-75 origin-center">
                <Cilo />
              </div>
            </div>
            <div className="relative bg-white px-7 py-6 rounded-[30px] shadow-[0px_6px_16px_rgba(74,55,40,0.12)] max-w-[320px]">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[10px] border-t-transparent border-r-[14px] border-r-white border-b-[10px] border-b-transparent" />
              <p className="font-black text-[#4a3728] text-2xl leading-snug whitespace-pre-line">
                {ciloText}
              </p>
            </div>
          </div>

          {/* Lonceng + tombol dengar lagi */}
          <div className="flex flex-col items-center gap-4 shrink-0">
            <div
              className="w-[230px] h-[210px] bg-white rounded-[44px] border-[7px] border-solid border-white shadow-[0px_8px_20px_rgba(74,55,40,0.18)] flex items-center justify-center"
              style={{ transform: isPlaying ? "scale(1.06)" : "scale(1)", transition: "transform 0.2s" }}
            >
              <span className="text-[110px] leading-none">🔔</span>
            </div>
            <button
              type="button"
              onClick={() => { void playStimulus(currentTrial.stimulus, true); }}
              className="px-8 py-3 bg-[#ffd34d] rounded-full border-[5px] border-solid border-white shadow-md font-black text-[#4a3728] text-lg active:scale-95 transition-transform cursor-pointer"
            >
              ▶ dengar lagi
            </button>
          </div>
        </section>

        {/* 3. Pod Jawaban */}
        <section className="absolute top-[525px] left-0 w-full flex items-center justify-center gap-14 z-10">
          {podOptions.map((letter, idx) => (
            <button
              key={`pod-${currentTrialIndex}-${idx}`}
              type="button"
              onPointerDown={(e) => handleAnswer(letter, e)}
              disabled={isTransitioning}
              className="w-[136px] h-[136px] rounded-full border-[6px] border-solid border-white bg-[#fff6e9] shadow-[0px_8px_18px_rgba(74,55,40,0.18)] flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 hover:scale-105 hover:bg-[#fff9f0] disabled:pointer-events-none"
              aria-label={`Pilih ${letter}`}
            >
              <span className="font-black text-[#4a3728] text-5xl leading-none">
                {letter}
              </span>
            </button>
          ))}
        </section>

        {/* 4. Hint Bawah */}
        <div className="absolute top-[715px] left-0 w-full text-center z-10">
          <p className="font-bold text-[#2f5b23] text-lg tracking-wide">
            boleh didengar berulang — semua pilihan boleh 🌱
          </p>
        </div>

        {/* 5. Footer */}
        <footer className="absolute bottom-3 left-0 w-full text-center shrink-0 z-10">
          <p className="font-bold text-[#2f5b23]/70 text-xs">
            ReadiKids · Skrining Dini
          </p>
        </footer>
      </div>
    </main>
  );
};

export default PhonicsGame;