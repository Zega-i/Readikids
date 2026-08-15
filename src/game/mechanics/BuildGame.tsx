import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { speak } from "../../utils/tts";
import { getSkillBank, type Item } from "../trialBank";
import { CiloKancil } from "../../components/CiloKancil";
import { SKILL_MECHANIC, SKILL_PHASE, type SkillId, type TrialRecord } from "../../types/telemetry";

/**
 * Mekanik "susun berurutan" — melayani skill dengan `correctOrder`:
 * build (suku kata/kata/pseudo-word/imbuhan) & recall (memori bunyi).
 *
 * Anak mengetuk ubin untuk mengisi slot berurutan; boleh membatalkan (undo) →
 * ditandai self-correction. Saat semua slot terisi, dievaluasi.
 * Kid Mode: ubin seragam, tanpa animasi selama trial.
 */
const PER_SLOT_BASELINE_MS = 800;
const CHEERS = ["Hebat!", "Sip!", "Keren!", "Yeay!", "Mantap!"];

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

export default function BuildGame({ skillId, accent = "#e0993a", onComplete, onBack }: Props): JSX.Element {
  const bank = getSkillBank(skillId);
  const queue = useMemo(
    () =>
      bank
        ? [
            // Demo SELALU pertama (memastikan anak paham tugas sebelum diukur).
            // Urutan item diacak per sesi (anti-hafalan ritme antar sesi).
            ...bank.demo.map((item) => ({ item, isDemo: true })),
            ...shuffle(bank.items).map((item) => ({ item, isDemo: false })),
          ]
        : [],
    [bank],
  );

  const [idx, setIdx] = useState(0);
  const [placed, setPlaced] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const [ciloText, setCiloText] = useState(bank?.intro ?? "");
  const trialsRef = useRef<TrialRecord[]>([]);
  const startRef = useRef(0);
  const correctedRef = useRef(false);

  const cur = queue[idx];
  const order = cur?.item.correctOrder ?? [];
  const tiles = useMemo(() => (cur ? (cur.item.noShuffle ? cur.item.choices : shuffle(cur.item.choices)) : []), [cur]);

  const playStimulus = useCallback(async (item: Item) => {
    try {
      if (item.stimulusAudio) {
        const seq = Array.isArray(item.stimulusAudio) ? item.stimulusAudio : [item.stimulusAudio];
        for (const s of seq) {
          await speak(s, { lang: "id-ID" });
          // Jeda singkat antar suku kata agar anak mendengar bunyi terpisah
          // (penting utk recall/segmenting — menghitung jumlah bunyi).
          if (seq.length > 1) await new Promise((r) => setTimeout(r, 260));
        }
      } else {
        await speak(item.prompt, { lang: "id-ID" });
      }
    } catch {
      /* lanjut walau audio gagal */
    }
    startRef.current = performance.now();
  }, []);

  useEffect(() => {
    if (!cur) return;
    setLocked(false);
    setPlaced([]);
    correctedRef.current = false;
    setCiloText(cur.item.prompt);
    startRef.current = 0;
    const t = setTimeout(() => void playStimulus(cur.item), 350);
    return () => clearTimeout(t);
  }, [idx, cur, playStimulus]);

  if (!bank || !cur) {
    return (
      <main className="w-full h-[100dvh] flex items-center justify-center font-nunito bg-[#fff6e9]">
        <p className="font-black text-[#8a7a66]">Game belum tersedia.</p>
      </main>
    );
  }

  const item = cur.item;

  const evaluate = (finalPlaced: string[]) => {
    setLocked(true);
    const total = Math.round(performance.now() - startRef.current);
    const hesitationMs = Math.max(0, total - PER_SLOT_BASELINE_MS * order.length);
    const correct =
      finalPlaced.length === order.length &&
      (item.anyOrder
        ? finalPlaced.every((v) => order.includes(v))
        : finalPlaced.every((v, i) => v === order[i]));
    let errorType: TrialRecord["errorType"] = null;
    if (!correct) {
      const sameSet = [...finalPlaced].sort().join() === [...order].sort().join();
      errorType = sameSet ? "sequence" : "substitution";
    }
    trialsRef.current.push({
      sessionId: "",
      skillId,
      mechanicId: SKILL_MECHANIC[skillId],
      phase: SKILL_PHASE[skillId],
      trialIndex: idx,
      stimulus: Array.isArray(item.stimulusAudio) ? item.stimulusAudio.join("-") : item.stimulusAudio ?? item.id,
      isDemo: cur.isDemo,
      latencyMs: total,
      hesitationMs,
      misclickCount: 0,
      correct,
      errorType,
      selfCorrected: correctedRef.current,
      completedAt: Date.now(),
    });
    setCiloText(correct ? CHEERS[Math.floor(Math.random() * CHEERS.length)] : "Tidak apa-apa, lanjut ya!");
    setTimeout(() => {
      if (idx + 1 < queue.length) setIdx((p) => p + 1);
      else onComplete(trialsRef.current);
    }, 550);
  };

  const tapTile = (choiceId: string) => {
    if (locked || startRef.current === 0) return;
    if (placed.includes(choiceId)) return; // sudah dipakai
    const next = [...placed, choiceId];
    setPlaced(next);
    if (next.length === order.length) evaluate(next);
  };

  const removeSlot = (slotIdx: number) => {
    if (locked) return;
    correctedRef.current = true;
    setPlaced((p) => p.filter((_, i) => i !== slotIdx));
  };

  const labelOf = (id: string) => item.choices.find((ch) => ch.id === id)?.label ?? id;

  return (
    <main className="w-full h-[100dvh] relative overflow-hidden select-none font-nunito flex flex-col text-[#4a3728]"
      style={{ background: `linear-gradient(180deg, #fff6e9 0%, ${accent}33 100%)` }}>

      {/* Header — tanpa bar navigasi dunia */}
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
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-6 px-5">
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

        {/* Slot berurutan */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {order.map((_, i) => (
            <button key={i} type="button" onClick={() => removeSlot(i)} disabled={!placed[i]}
              className="min-w-[70px] min-h-[70px] px-3 rounded-[20px] border-[4px] border-dashed flex items-center justify-center"
              style={{ borderColor: placed[i] ? accent : "#d8c9ad", background: placed[i] ? "#ffffff" : "#ffffff88" }}>
              <span className="font-black text-[#4a3728] text-2xl leading-none">{placed[i] ? labelOf(placed[i]) : ""}</span>
            </button>
          ))}
        </div>

        {/* Ubin sumber */}
        <div className="w-full max-w-md flex flex-wrap items-center justify-center gap-3">
          {tiles.map((ch) => {
            const used = placed.includes(ch.id);
            return (
              <button key={ch.id} type="button" onPointerDown={() => tapTile(ch.id)} disabled={locked || used}
                aria-label={`Pilih ${ch.label ?? ch.id}`}
                className="min-w-[76px] min-h-[76px] px-4 rounded-[22px] border-[5px] border-white flex items-center justify-center cursor-pointer disabled:opacity-35 disabled:pointer-events-none active:scale-95 transition-transform"
                style={{ background: "#fff6e9", boxShadow: "0px 6px 0px #e2d3bd, 0px 12px 16px rgba(74,55,40,0.12)" }}>
                <span className="font-black text-[#4a3728] text-2xl leading-none">{ch.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hint */}
      <div className="shrink-0 pb-7 px-5 text-center">
        <p className="font-bold text-[#7c6a55] text-sm tracking-wide">ketuk ubin untuk menyusun · ketuk kotak untuk membatalkan 🌱</p>
      </div>
    </main>
  );
}
