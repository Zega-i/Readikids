/**
 * useScreeningSession — MESIN SESI SKRINING TANPA UI (headless).
 *
 * Seluruh logika sesi hidup di sini: urutan trial, state machine layar,
 * pengukuran waktu/keraguan/misclick, telemetri, simulator, analisis.
 * Komponen UI (HTML sekarang, Canvas nanti, atau desain baru total)
 * hanya MERENDER state dari hook ini dan memanggil aksinya — sehingga
 * pergantian desain tidak pernah menyentuh logika dan data.
 *
 * Kontrak untuk UI apa pun:
 * 1. Render sesuai `phase` (trial / cheer / break / end).
 * 2. Teruskan interaksi: answerChoice, placeLine+confirmLine,
 *    markHoverStart/End (keraguan), markMisclick (tap area kosong),
 *    continueAfterBreak, replayInstruction, abort.
 * 3. JANGAN menghitung apa pun sendiri — semua metrik urusan hook ini.
 */
import { useEffect, useRef, useState } from 'react';
import { useTelemetry } from '../telemetry/useTelemetry';
import { computeNLEE } from '../telemetry/MetricCalculator';
import { analyzeSession } from '../analytics/BehavioralEngine';
import { behavioralSimulator } from '../utils/simulation';
import { speak } from '../utils/tts';
import { CHEERS, DEFAULT_TRIALS, GAME_LABEL, LINE_CORRECT_TOLERANCE, type Trial } from './trialBank';
import type { ChildProfile, GameId, RiskAssessment } from '../types/telemetry';

/** State machine layar Kid Mode — eksplisit (catatan EVALUASI.md #2). */
export type ScreeningPhase =
  | { name: 'trial' }
  | { name: 'cheer'; text: string }
  | { name: 'break'; finishedGame: GameId; nextGame: GameId }
  | { name: 'end' };

export interface ScreeningSessionConfig {
  child: ChildProfile;
  cooldownOverrideReason: string | null;
  onComplete: (assessment: RiskAssessment | null) => void;
  onAbort: () => void;
  /** Ganti bank soal tanpa menyentuh mesin/UI (default: DEFAULT_TRIALS). */
  trials?: Trial[];
  /** Durasi umpan balik sentuhan sebelum pindah layar (ms). */
  pickFeedbackMs?: number;
  /** Durasi selingan maskot (ms). */
  cheerMs?: number;
}

export interface ScreeningSession {
  // — state untuk dirender —
  trial: Trial;
  trialIndex: number;
  totalTrials: number;
  /** Progres 0–100 untuk bar TANPA angka. */
  progressPct: number;
  phase: ScreeningPhase;
  /** Indeks opsi yang baru disentuh (umpan balik sentuhan), null bila belum. */
  pickedOption: number | null;
  /** Posisi katak pada garis 0–100, null bila belum ditempatkan. */
  linePct: number | null;
  // — aksi dari UI —
  answerChoice: (option: string, optionIndex: number) => void;
  placeLine: (pct: number) => void;
  confirmLine: () => void;
  markHoverStart: (option: string) => void;
  markHoverEnd: () => void;
  markMisclick: () => void;
  continueAfterBreak: () => void;
  replayInstruction: () => void;
  abort: () => void;
}

export function useScreeningSession(config: ScreeningSessionConfig): ScreeningSession {
  const trials = config.trials ?? DEFAULT_TRIALS;
  const pickFeedbackMs = config.pickFeedbackMs ?? 350;
  const cheerMs = config.cheerMs ?? 1100;

  const logger = useTelemetry();
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const [trialIndex, setTrialIndex] = useState(0);
  const [phase, setPhase] = useState<ScreeningPhase>({ name: 'trial' });
  const [pickedOption, setPickedOption] = useState<number | null>(null);
  const [linePct, setLinePct] = useState<number | null>(null);

  // Pengukuran per-trial — di ref agar aman untuk frekuensi tinggi.
  const stimulusShownAtRef = useRef(0);
  const hesitationAccumRef = useRef(0);
  const hoverStartRef = useRef<number | null>(null);
  const misclickCountRef = useRef(0);
  const answeredRef = useRef(false); // guard double-tap
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const trial = trials[trialIndex];

  useEffect(() => {
    void logger.startSession({
      id: sessionIdRef.current,
      childRef: config.child.id,
      ageYears: config.child.ageYears,
      games: [...new Set(trials.map((t) => t.gameId))],
      cooldownOverrideReason: config.cooldownOverrideReason,
    });
    return () => {
      for (const t of timersRef.current) clearTimeout(t);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Awal setiap trial: reset pengukuran, catat stimulus, bacakan instruksi.
  useEffect(() => {
    if (phase.name !== 'trial') return;
    stimulusShownAtRef.current = performance.now();
    hesitationAccumRef.current = 0;
    hoverStartRef.current = null;
    misclickCountRef.current = 0;
    answeredRef.current = false;
    setPickedOption(null);
    setLinePct(null);
    logger.log(trial.gameId, trialIndex, 'stimulus_shown', {
      stimulus: trial.kind === 'choice' ? trial.target : String(trial.target),
    });
    speak(trial.tts);
  }, [phase.name, trialIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const later = (fn: () => void, ms: number): void => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  const flushOpenHover = (): void => {
    if (hoverStartRef.current !== null) {
      hesitationAccumRef.current += performance.now() - hoverStartRef.current;
      hoverStartRef.current = null;
    }
  };

  const submitTrial = async (args: {
    stimulus: string;
    isReversalTarget: boolean;
    correct: boolean;
    nleePercent: number | null;
  }): Promise<void> => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    flushOpenHover();
    const latencyMs = performance.now() - stimulusShownAtRef.current;
    logger.log(trial.gameId, trialIndex, 'answer', { correct: args.correct });

    const record = behavioralSimulator.injectAnomaly({
      sessionId: sessionIdRef.current,
      gameId: trial.gameId,
      trialIndex,
      stimulus: args.stimulus,
      isReversalTarget: args.isReversalTarget,
      latencyMs,
      hesitationMs: Math.min(latencyMs, hesitationAccumRef.current),
      misclickCount: misclickCountRef.current,
      correct: args.correct,
      nleePercent: args.nleePercent,
      completedAt: Date.now(),
    });
    await logger.logTrial(record);

    const isLast = trialIndex + 1 >= trials.length;
    const nextGame = isLast ? null : trials[trialIndex + 1].gameId;
    later(() => {
      if (isLast) {
        void finishSession();
      } else if (nextGame !== trial.gameId) {
        setPhase({ name: 'break', finishedGame: trial.gameId, nextGame: nextGame as GameId });
        speak(`Hore! ${GAME_LABEL[trial.gameId]} selesai! Kamu hebat!`);
      } else {
        setPhase({ name: 'cheer', text: CHEERS[trialIndex % CHEERS.length] });
        later(() => {
          setTrialIndex((i) => i + 1);
          setPhase({ name: 'trial' });
        }, cheerMs);
      }
    }, pickFeedbackMs);
  };

  const finishSession = async (): Promise<void> => {
    setPhase({ name: 'end' });
    speak('Kamu hebat sudah bermain sampai selesai!');
    await logger.endSession();
    const assessment = await analyzeSession(sessionIdRef.current);
    config.onComplete(assessment);
  };

  return {
    trial,
    trialIndex,
    totalTrials: trials.length,
    progressPct: (trialIndex / trials.length) * 100,
    phase,
    pickedOption,
    linePct,

    answerChoice: (option, optionIndex) => {
      if (trial.kind !== 'choice' || answeredRef.current) return;
      setPickedOption(optionIndex); // umpan balik SENTUHAN, bukan penilaian
      void submitTrial({
        stimulus: trial.target,
        isReversalTarget: trial.isReversal,
        correct: option === trial.target,
        nleePercent: null,
      });
    },

    placeLine: (pct) => {
      if (trial.kind !== 'line' || answeredRef.current) return;
      const clamped = Math.min(100, Math.max(0, pct));
      setLinePct(clamped);
      logger.log(trial.gameId, trialIndex, 'drag_end', { pct: clamped });
    },

    confirmLine: () => {
      if (trial.kind !== 'line' || linePct === null) return;
      const nlee = computeNLEE(linePct, trial.target, 100);
      void submitTrial({
        stimulus: String(trial.target),
        isReversalTarget: false,
        correct: nlee <= LINE_CORRECT_TOLERANCE,
        nleePercent: nlee,
      });
    },

    markHoverStart: (option) => {
      hoverStartRef.current = performance.now();
      logger.log(trial.gameId, trialIndex, 'hover', { option });
    },
    markHoverEnd: flushOpenHover,
    markMisclick: () => {
      if (phase.name !== 'trial') return;
      misclickCountRef.current += 1;
      logger.log(trial.gameId, trialIndex, 'misclick');
    },

    continueAfterBreak: () => {
      if (phase.name !== 'break') return;
      setTrialIndex((i) => i + 1);
      setPhase({ name: 'trial' });
    },

    replayInstruction: () => {
      if (phase.name === 'trial') speak(trial.tts);
    },

    abort: () => {
      void logger.endSession().then(config.onAbort);
    },
  };
}
