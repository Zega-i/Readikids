import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { speak } from "../../utils/tts";
import { getSkillBank, type Item } from "../trialBank";
import { CiloKancil } from "../../components/CiloKancil";
import { SKILL_MECHANIC, SKILL_PHASE, type SkillId, type TrialRecord } from "../../types/telemetry";

/**
 * Mekanik "pilih ubin benar" — melayani skill dengan `correctId`:
 * pick, match, path, blend, split, swap (15 dari 20 skill).
 *
 * Variasi datang dari data item (trialBank): stimulus teks / bunyi / urutan
 * bunyi (blending), dan label ubin (huruf/bunyi/angka/gambar).
 *
 * Kid Mode: ubin seragam, target sentuh besar, tanpa animasi selama trial;
 * umpan balik hanya pujian netral antar-trial. Telemetri per trial (akurasi +
 * latency + hesitation + jenis error) via onComplete(TrialRecord[]).
 */
const MOTOR_BASELINE_MS = 900;
const CHEERS = ["Hebat!", "Sip!", "Bagus!", "Yeay!", "Mantap!"];

/** Fisher–Yates: hasil acak stabil per pemanggilan (dipakai saat mount game). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Props {
  skillId: SkillId;
  accent?: string;
  onComplete: (trials: TrialRecord[]) => void;
  onBack?: () => void;
}

export default function ChoiceGame({ skillId, accent = "#6dbb57", onComplete, onBack }: Props): JSX.Element {
  const bank = getSkillBank(skillId);
  const queue = useMemo(
    () =>
      bank
        ? [
            // Demo SELALU pertama (memastikan anak paham tugas sebelum diukur).
            // Urutan item diacak per sesi (anti-hafalan ritme antar sesi 2 minggu),
            // lalu posisi ubin tiap soal juga diacak agar tak bisa tebak "paling kiri".
            // `noShuffle` dihormati (jawaban bergantung posisi).
            ...bank.demo.map((item) => ({ item: { ...item, choices: item.noShuffle ? item.choices : shuffle(item.choices) }, isDemo: true })),
            ...shuffle(bank.items).map((item) => ({ item: { ...item, choices: item.noShuffle ? item.choices : shuffle(item.choices) }, isDemo: false })),
          ]
        : [],
    [bank],
  );

  const [idx, setIdx] = useState(0);
  const [locked, setLocked] = useState(false);
  const [ciloText, setCiloText] = useState(bank?.intro ?? "");
  const [playing, setPlaying] = useState(false);
  /** Id ubin yang audionya sudah didengar anak (tap pertama = dengar, tap kedua = pilih). */
  const [heard, setHeard] = useState<Set<string>>(new Set());
  const trialsRef = useRef<TrialRecord[]>([]);
  const startRef = useRef(0);

  const cur = queue[idx];

  const playStimulus = useCallback(async (item: Item) => {
    setPlaying(true);
    try {
      if (item.stimulusAudio) {
        const seq = Array.isArray(item.stimulusAudio) ? item.stimulusAudio : [item.stimulusAudio];
        for (const s of seq) {
          await speak(s, { lang: "id-ID" });
          // Jeda singkat antar suku kata agar anak mendengar bunyi terpisah
          // (penting utk segmenting/recall — menghitung jumlah bunyi).
          if (seq.length > 1) await new Promise((r) => setTimeout(r, 260));
        }
      } else {
        await speak(item.prompt, { lang: "id-ID" });
      }
    } catch {
      /* lanjut walau audio gagal */
    }
    setPlaying(false);
    startRef.current = performance.now();
  }, []);

  const NO_AUTOPLAY: SkillId[] = [
    "orient", "shape", "track", "print",
    "letter_vs_symbol", "letter_discrim", "letter_case",
  ];
  const shouldAutoplay = !NO_AUTOPLAY.includes(skillId);

  useEffect(() => {
    if (!cur) return;
    setLocked(false);
    setCiloText(cur.item.prompt);
    setHeard(new Set());
    startRef.current = 0;
    if (shouldAutoplay) {
      const t = setTimeout(() => void playStimulus(cur.item), 350);
      return () => clearTimeout(t);
    }
    return;
  }, [idx, cur, playStimulus, shouldAutoplay]);

  if (!bank || !cur) {
    return (
      <main className="w-full h-[100dvh] flex items-center justify-center font-nunito bg-[#fff6e9]">
        <p className="font-black text-[#8a7a66]">Game belum tersedia.</p>
      </main>
    );
  }

  const item = cur.item;

  /**
   * Opsi A — ubin pilihan bersuara:
   * tap pertama pada ubin ber-audio → putar bunyinya (tidak menjawab),
   * tap berikutnya pada ubin yang sama → dianggap jawaban.
   * Ubin tanpa audio → jawab langsung (perilaku lama).
   */
  const tapChoice = (choiceId: string) => {
    if (locked || startRef.current === 0) return;
    const ch = item.choices.find((x) => x.id === choiceId);
    if (ch?.audio && !heard.has(choiceId)) {
      setHeard((prev) => new Set(prev).add(choiceId));
      void speak(ch.audio, { lang: "id-ID" });
      return;
    }
    answer(choiceId);
  };

  const answer = (choiceId: string) => {
    if (locked || startRef.current === 0) return;
    setLocked(true);
    const total = Math.round(performance.now() - startRef.current);
    const hesitationMs = Math.max(0, total - MOTOR_BASELINE_MS);
    const correct = choiceId === item.correctId;
    const errorType = correct ? null : ((item.errorTags?.[choiceId] as TrialRecord["errorType"]) ?? "random");

    trialsRef.current.push({
      sessionId: "",
      skillId,
      mechanicId: SKILL_MECHANIC[skillId],
      phase: SKILL_PHASE[skillId],
      trialIndex: idx,
      stimulus:
        item.stimulusText ??
        (Array.isArray(item.stimulusAudio) ? item.stimulusAudio.join("-") : item.stimulusAudio ?? item.id),
      isDemo: cur.isDemo,
      latencyMs: total,
      hesitationMs,
      misclickCount: 0,
      correct,
      errorType,
      selfCorrected: false,
      completedAt: Date.now(),
    });

    setCiloText(correct ? CHEERS[Math.floor(Math.random() * CHEERS.length)] : "Tidak apa-apa, lanjut ya!");
    setTimeout(() => {
      if (idx + 1 < queue.length) setIdx((p) => p + 1);
      else onComplete(trialsRef.current);
    }, 450);
  };

  const hasAudioStimulus = !!item.stimulusAudio;
  const showText = item.stimulusText && item.stimulusText.length > 0;

  return (
    <main className="w-full h-[100dvh] relative overflow-hidden select-none font-nunito flex flex-col text-[#4a3728]"
      style={{ background: `linear-gradient(180deg, #fff6e9 0%, ${accent}33 100%)` }}>

      {/* Header — TANPA bar navigasi dunia (sesuai permintaan: layar game bersih) */}
      <header className="shrink-0 px-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={onBack} aria-label="Kembali"
            className="w-12 h-12 rounded-full bg-white rk-sticker flex items-center justify-center active:scale-95 transition-transform cursor-pointer shrink-0">
            <span className="font-black text-2xl text-[#4a3728] leading-none -mt-0.5">‹</span>
          </button>
          <div className="px-5 py-2 rounded-2xl border-[3px]" style={{ background: accent, borderColor: "#00000022" }}>
            <h1 className="font-black text-white text-lg tracking-wider uppercase">{bank.name}</h1>
          </div>
          <button type="button" onClick={() => void playStimulus(item)} aria-label="Dengarkan lagi"
            className="w-12 h-12 rounded-full bg-[#ffd34d] rk-sticker flex items-center justify-center active:scale-95 transition-transform cursor-pointer shrink-0">
            <span className="text-2xl">🔊</span>
          </button>
        </div>
      </header>

      {/* Konten */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-5 px-5">
        {/* Cilo + balon */}
        <div className="w-full max-w-md flex items-center gap-3">
          <div className="relative w-[80px] h-[96px] shrink-0">
            <div className="absolute top-0 left-0 scale-[0.27] origin-top-left"><CiloKancil /></div>
          </div>
          <div className="relative flex-1 bg-white rounded-[24px] rk-sticker px-5 py-4">
            <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[9px] border-t-transparent border-r-[12px] border-r-white border-b-[9px] border-b-transparent" />
            <p className="font-black text-[#4a3728] text-lg leading-snug">{ciloText}</p>
          </div>
        </div>

        {/* Stimulus */}
        {showText ? (
          <div className="w-40 h-32 bg-white rounded-[36px] border-[6px] border-white shadow-[0px_8px_0px_#eadfc9,0px_16px_20px_rgba(74,55,40,0.15)] flex items-center justify-center px-3">
            <span className="font-black text-[#4a3728] text-6xl leading-none text-center">{item.stimulusText}</span>
          </div>
        ) : hasAudioStimulus ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-36 h-32 bg-white rounded-[36px] border-[6px] border-white shadow-[0px_8px_0px_#eadfc9,0px_16px_20px_rgba(74,55,40,0.15)] flex items-center justify-center"
              style={{ transform: playing ? "scale(1.05)" : "scale(1)", transition: "transform 0.2s" }}>
              <span className="text-[88px] leading-none">🔔</span>
            </div>
            <button type="button" onClick={() => void playStimulus(item)}
              className="px-6 py-2.5 bg-[#ffd34d] rounded-full border-[4px] border-white shadow-[0px_4px_0px_#e8b84d] font-black text-[#4a3728] text-base active:scale-95 transition-transform cursor-pointer">
              ▶ dengar lagi
            </button>
          </div>
        ) : null}

        {/* Ubin pilihan — seragam, statis selama trial */}
        <div className="w-full max-w-md flex flex-wrap items-center justify-center gap-3">
          {item.choices.map((ch) => {
            const hasSound = !!ch.audio;
            const played = heard.has(ch.id);
            return (
              <button key={ch.id} type="button" onPointerDown={() => tapChoice(ch.id)} disabled={locked}
                aria-label={`Pilih ${ch.label ?? ch.image ?? ch.id}${hasSound ? " (dengar lalu pilih)" : ""}`}
                className="relative min-w-[84px] min-h-[84px] px-4 rounded-[26px] border-[5px] border-white bg-[#fff6e9] shadow-[0px_6px_0px_#e2d3bd,0px_12px_16px_rgba(74,55,40,0.12)] flex items-center justify-center cursor-pointer disabled:pointer-events-none active:scale-95 transition-transform">
                {ch.image && <span className="text-4xl leading-none">{ch.image}</span>}
                {ch.label && <span className="font-black text-[#4a3728] text-3xl leading-none">{ch.label}</span>}
                {hasSound && (
                  <span className={`absolute top-1.5 right-2 text-base leading-none ${played ? "opacity-40" : "opacity-100"}`}>
                    {played ? "👂" : "🔊"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hint */}
      <div className="shrink-0 pb-7 px-5 text-center">
        <p className="font-bold text-[#7c6a55] text-sm tracking-wide">
          {item.choices.some((c) => c.audio)
            ? "ketuk untuk mendengar bunyi · ketuk lagi untuk memilih 🌱"
            : "boleh didengar berulang — semua pilihan boleh 🌱"}
        </p>
      </div>
    </main>
  );
}
