import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
// Sesuaikan path import ini dengan struktur proyek Anda:
import { speak } from "../../utils/tts";
import { Capacitor } from "@capacitor/core";

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
      // Perbaikan path: menggunakan path relatif saat berjalan di native (Capacitor)
      // agar tidak membentur base path localhost yang salah
      const audioPath = Capacitor.isNativePlatform() ? `audio/${syllable}.mp3` : `/audio/${syllable}.mp3`;
      const audio = new Audio(audioPath);
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

  const updateStageDimensions = useCallback(() => {
    setViewportSize({ w: window.innerWidth, h: window.innerHeight });
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
        effectiveScale: typeof window !== "undefined" ? window.devicePixelRatio : 1,
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
    <main className="w-full h-[100dvh] bg-[linear-gradient(180deg,rgba(214,240,251,1)_0%,rgba(88,183,232,1)_100%)] relative overflow-hidden select-none font-nunito flex flex-col text-[#4a3728]">

      {/* Header */}
      <header className="shrink-0 px-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="w-12 h-12 rounded-full bg-white rk-sticker flex items-center justify-center active:scale-95 transition-transform cursor-pointer shrink-0"
            aria-label="Kembali"
          >
            <span className="font-black text-2xl text-[#4a3728] leading-none -mt-0.5">‹</span>
          </button>
          <div className="bg-[#c98a4b] px-5 py-2 rounded-2xl border-[3px] border-[#8a5a2b] shadow-[0px_4px_0px_#8a5a2b,0px_9px_12px_rgba(74,55,40,0.2)]">
            <h1 className="font-black text-[#fff6e9] text-lg tracking-wider uppercase">SUNGAI BUNYI</h1>
          </div>
          <button
            type="button"
            onClick={handleAudioInstruction}
            className="w-12 h-12 rounded-full bg-[#ffd34d] rk-sticker flex items-center justify-center active:scale-95 transition-transform cursor-pointer shrink-0"
            aria-label="Dengarkan petunjuk"
          >
            <span className="text-2xl">🔊</span>
          </button>
        </div>
        <nav className="flex items-center justify-center gap-2 mt-3">
          {levels.map((lvl, idx) => {
            const isActive = idx === 1;
            return (
              <div
                key={lvl.label}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border-2 ${
                  isActive ? "bg-[#fff6e9] border-[#ffd34d] shadow-sm" : "bg-[#fff6e9]/50 border-white/70 opacity-55"
                }`}
                title={lvl.label}
              >
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

        {/* Lonceng + dengar lagi */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-40 h-36 bg-white rounded-[36px] border-[6px] border-white shadow-[0px_8px_0px_#cfe6f2,0px_16px_20px_rgba(74,55,40,0.15)] flex items-center justify-center"
            style={{ transform: isPlaying ? "scale(1.05)" : "scale(1)", transition: "transform 0.2s" }}
          >
            <span className="text-[92px] leading-none">🔔</span>
          </div>
          <button
            type="button"
            onClick={() => { void playStimulus(currentTrial.stimulus, true); }}
            className="px-6 py-2.5 bg-[#ffd34d] rounded-full border-[4px] border-white shadow-[0px_4px_0px_#e8b84d,0px_9px_12px_rgba(74,55,40,0.15)] font-black text-[#4a3728] text-base active:scale-95 transition-transform cursor-pointer"
          >
            ▶ dengar lagi
          </button>
        </div>

        {/* Pod jawaban — statis selama trial */}
        <div className="w-full max-w-md flex items-center justify-center gap-4">
          {podOptions.map((letter, idx) => (
            <button
              key={`pod-${currentTrialIndex}-${idx}`}
              type="button"
              onPointerDown={(e) => handleAnswer(letter, e)}
              disabled={isTransitioning}
              className="w-[86px] h-[86px] rounded-full border-[5px] border-white bg-[#fff6e9] shadow-[0px_6px_0px_#e2d3bd,0px_12px_16px_rgba(74,55,40,0.15)] flex items-center justify-center cursor-pointer shrink-0 disabled:pointer-events-none"
              aria-label={`Pilih ${letter}`}
            >
              <span className="font-black text-[#4a3728] text-4xl leading-none">{letter}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hint */}
      <div className="shrink-0 pb-7 px-5 text-center">
        <p className="font-bold text-[#2f5b23] text-sm tracking-wide">
          boleh didengar berulang — semua pilihan boleh 🌱
        </p>
      </div>
    </main>
  );
};

export default PhonicsGame;