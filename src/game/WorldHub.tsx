import { WORLDS, getSkillBank } from "./trialBank";
import { CiloKancil } from "../components/CiloKancil";
import type { PhaseId, SkillId } from "../types/telemetry";

/**
 * Hub pemilihan game dalam satu dunia (fase) — gaya "Papan Misi": tiap game
 * jadi KARTU MISI kertas yang ditempel MIRING dengan penahan (pin/paku/tali/
 * bendera). Game selesai dicap stempel "SELESAI".
 *
 * Reskin per dunia (satu template, ganti panggung):
 *   - MEKANIK & TATA LETAK kartu SELALU SAMA (konsisten & mudah dipakai anak).
 *   - LATAR (panggung) + PERMUKAAN tempel + JENIS PENAHAN berganti per tema
 *     dunia (padang, hutan, sungai, gua, puncak) sehingga tiap dunia terasa
 *     seperti tempatnya sendiri.
 *   - Kartu tetap kertas krem + ada PANEL TENANG semi-transparan di belakang
 *     gugusan kartu → teks selalu kontras di tema terang maupun gelap.
 *   - Stempel "SELESAI" SELALU hijau (status ≠ dekoratif).
 */

type Fastener = "pin" | "tape" | "nail" | "rope" | "flag";

// Konfigurasi hias per kartu — deterministik agar stabil antar-render.
// `slot`: 'a' pakai penahan utama tema, 'b' pakai penahan alternatif tema.
const CARD_STYLE = [
  { rot: -4, slot: "a", dx: -2 },
  { rot: 3.5, slot: "b", dx: 3 },
  { rot: -2.5, slot: "b", dx: -3 },
  { rot: 4.5, slot: "a", dx: 2 },
  { rot: -3, slot: "a", dx: 1 },
  { rot: 2.5, slot: "b", dx: -2 },
] as const;

interface Stage {
  bg: string;
  /** Warna panel tenang di belakang kartu (memastikan kontras). */
  panel: string;
  /** Dua jenis penahan tema: [utama, alternatif]. */
  fasteners: [Fastener, Fastener];
  scene: JSX.Element;
}

// Panggung per fase. Hanya visual di belakang kartu + jenis penahan.
const STAGE: Record<number, Stage> = {
  // 0 — Padang Fondasi: langit cerah + padang rumput. Papan plang kayu → pin & selotip.
  0: {
    bg: "linear-gradient(180deg,#bfe5f5 0%,#dff0c8 50%,#8ec565 100%)",
    panel: "rgba(110,71,38,0.16)",
    fasteners: ["pin", "tape"],
    scene: (
      <>
        <span className="absolute text-4xl opacity-90" style={{ top: "5%", left: "7%" }}>☁️</span>
        <span className="absolute text-3xl opacity-80" style={{ top: "10%", right: "10%" }}>☁️</span>
        <div className="absolute bottom-0 inset-x-0 h-20" style={{ background: "linear-gradient(180deg,transparent,#7bbb4f)" }} />
        <span className="absolute text-3xl" style={{ bottom: "1.5%", left: "5%" }}>🌾</span>
        <span className="absolute text-2xl" style={{ bottom: "1%", left: "46%" }}>🌱</span>
        <span className="absolute text-3xl" style={{ bottom: "2%", right: "7%" }}>🌿</span>
      </>
    ),
  },
  // 1 — Hutan Huruf: rimbun pepohonan. Kertas DIPAKU ke pohon.
  1: {
    bg: "linear-gradient(180deg,#d3edb4 0%,#83c25f 100%)",
    panel: "rgba(60,90,40,0.22)",
    fasteners: ["nail", "nail"],
    scene: (
      <>
        <span className="absolute text-2xl opacity-80" style={{ top: "6%", left: "11%" }}>🍃</span>
        <span className="absolute text-2xl opacity-80" style={{ top: "12%", right: "14%" }}>🍃</span>
        <span className="absolute" style={{ bottom: "-2%", left: "-3%", fontSize: "88px" }}>🌳</span>
        <span className="absolute" style={{ bottom: "-2%", right: "-3%", fontSize: "88px" }}>🌳</span>
      </>
    ),
  },
  // 2 — Sungai Bunyi: air & alang-alang. Kertas di rakit → diikat TALI.
  2: {
    bg: "linear-gradient(180deg,#dbf3fc 0%,#5cb9e6 100%)",
    panel: "rgba(30,90,120,0.20)",
    fasteners: ["rope", "tape"],
    scene: (
      <>
        <span className="absolute text-2xl opacity-80" style={{ top: "7%", left: "12%" }}>☁️</span>
        <div className="absolute bottom-0 inset-x-0 h-16 opacity-50" style={{ background: "repeating-linear-gradient(90deg,#3fa8d6 0 18px,#5cb9e6 18px 36px)" }} />
        <span className="absolute text-3xl" style={{ bottom: "9%", left: "6%" }}>🪷</span>
        <span className="absolute text-3xl" style={{ bottom: "12%", right: "8%" }}>🌾</span>
      </>
    ),
  },
  // 3 — Gua Gema: gua remang + kristal. Kertas seolah TERSELIP/DIPAKU di batu.
  3: {
    bg: "radial-gradient(120% 85% at 50% 0%, #5b4a78 0%, #3a2f52 55%, #241d36 100%)",
    panel: "rgba(20,15,35,0.42)",
    fasteners: ["nail", "pin"],
    scene: (
      <>
        {[15, 38, 62, 84].map((l, k) => (
          <div key={k} className="absolute top-0" style={{ left: `${l}%`, width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: `${28 + (k % 2) * 14}px solid #2c2444` }} />
        ))}
        <span className="absolute text-lg opacity-90" style={{ top: "22%", left: "9%" }}>✨</span>
        <span className="absolute text-base opacity-80" style={{ top: "30%", right: "12%" }}>✨</span>
        <span className="absolute text-2xl" style={{ bottom: "6%", left: "6%" }}>💎</span>
        <span className="absolute text-2xl" style={{ bottom: "9%", right: "7%" }}>💎</span>
      </>
    ),
  },
  // 4 — Puncak Kata: puncak gunung & langit. Kertas berkibar → BENDERA & tali.
  4: {
    bg: "linear-gradient(180deg,#bfe5f5 0%,#eaf2f8 42%,#f4dcb0 100%)",
    panel: "rgba(90,70,40,0.16)",
    fasteners: ["flag", "rope"],
    scene: (
      <>
        <span className="absolute text-4xl opacity-90" style={{ top: "6%", left: "10%" }}>☁️</span>
        <span className="absolute text-3xl opacity-80" style={{ top: "12%", right: "12%" }}>☁️</span>
        <span className="absolute text-2xl" style={{ top: "3%", right: "20%" }}>☀️</span>
        <span className="absolute" style={{ bottom: "-8%", left: "50%", transform: "translateX(-50%)", fontSize: "112px" }}>🏔️</span>
      </>
    ),
  },
};

/** Render penahan kartu sesuai tema. Murni dekoratif (aria-hidden). */
function Fastener({ kind, rot, accent }: { kind: Fastener; rot: number; accent: string }): JSX.Element | null {
  switch (kind) {
    case "pin":
      return (
        <span className="absolute -top-2 left-1/2 z-20 -translate-x-1/2" aria-hidden>
          <span className="block w-5 h-5 rounded-full bg-[#d9433b] border-2 border-[#b32f28] shadow-[0px_2px_3px_rgba(0,0,0,0.35)] relative">
            <span className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-white/70" />
          </span>
        </span>
      );
    case "tape":
      return (
        <span className="absolute -top-3 left-1/2 z-20 h-7 w-16 -translate-x-1/2 rounded-[2px] shadow-[0px_2px_4px_rgba(0,0,0,0.18)]"
          style={{ background: `${accent}bb`, transform: `translateX(-50%) rotate(${rot > 0 ? -8 : 8}deg)`, border: "1px solid rgba(255,255,255,0.35)" }} aria-hidden />
      );
    case "nail":
      // Paku: kepala logam bulat kecil dengan kilau.
      return (
        <span className="absolute -top-1.5 left-1/2 z-20 -translate-x-1/2" aria-hidden>
          <span className="block w-4 h-4 rounded-full bg-[#8a8f99] border-2 border-[#5c616b] shadow-[0px_2px_3px_rgba(0,0,0,0.4)] relative">
            <span className="absolute top-0.5 left-1 w-1 h-1 rounded-full bg-white/80" />
          </span>
        </span>
      );
    case "rope":
      // Tali: simpul di tengah atas dengan dua "ujung" miring.
      return (
        <span className="absolute -top-2.5 left-1/2 z-20 -translate-x-1/2 flex items-center" aria-hidden>
          <span className="block w-4 h-4 rounded-full bg-[#c79a5c] border-2 border-[#9a6f38] shadow-[0px_2px_3px_rgba(0,0,0,0.3)]" />
        </span>
      );
    case "flag":
      // Bendera kecil di sudut atas kartu.
      return (
        <span className="absolute -top-3 left-1/2 z-20 -translate-x-1/2 flex flex-col items-center" aria-hidden>
          <span className="text-lg leading-none" style={{ transform: `rotate(${rot > 0 ? -6 : 6}deg)` }}>🚩</span>
        </span>
      );
    default:
      return null;
  }
}

export default function WorldHub({
  phase,
  completedSkills,
  onSelectGame,
  onFinishWorld,
  onBack,
}: {
  phase: PhaseId;
  completedSkills: Set<SkillId>;
  onSelectGame: (skillId: SkillId) => void;
  onFinishWorld: () => void;
  onBack?: () => void;
}): JSX.Element {
  const world = WORLDS.find((w) => w.phase === phase);
  if (!world) {
    return (
      <main className="w-full h-[100dvh] flex items-center justify-center font-nunito bg-[#fff6e9]">
        <p className="font-black text-[#8a7a66]">Dunia belum tersedia.</p>
      </main>
    );
  }

  const accent = world.accent;
  const total = world.skills.length;
  const doneCount = world.skills.filter((s) => completedSkills.has(s)).length;
  const allDone = doneCount === total;
  const stage = STAGE[phase] ?? STAGE[0];

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden font-nunito flex flex-col text-[#4a3728]"
      style={{ background: stage.bg }}>

      {/* Panggung tema dunia (di belakang kartu) */}
      <div aria-hidden className="absolute inset-0 z-0 overflow-hidden pointer-events-none">{stage.scene}</div>

      {/* Konten di atas panggung */}
      <div className="relative z-10 flex-1 flex flex-col min-h-0">

        {/* Header */}
        <header className="shrink-0 px-4 pt-5">
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={onBack} aria-label="Kembali ke peta"
              className="w-12 h-12 rounded-full bg-[#fdf3e0] rk-sticker flex items-center justify-center active:scale-95 transition-transform cursor-pointer shrink-0">
              <span className="font-black text-2xl text-[#4a3728] leading-none -mt-0.5">‹</span>
            </button>

            {/* Plakat kayu "Papan Misi" + nama dunia (dalam tag agar terbaca di tema apa pun) */}
            <div className="flex flex-col items-center">
              <div className="px-5 py-2 rounded-xl border-[3px] flex items-center gap-2 shadow-[0px_4px_0px_rgba(0,0,0,0.28)]"
                style={{ background: "#6e4726", borderColor: "#3d2612" }}>
                <span className="text-xl">{world.emoji}</span>
                <h1 className="font-black text-[#fff2da] text-lg tracking-wide uppercase whitespace-nowrap">Papan Misi</h1>
              </div>
              <span className="mt-1 px-2.5 py-0.5 rounded-full bg-[#6e4726] font-black text-[10px] text-[#fff2da] tracking-wide uppercase whitespace-nowrap">
                {world.name}
              </span>
            </div>

            {/* Progres */}
            <div className="rounded-full px-3 h-12 flex items-center justify-center shrink-0 border-[3px] border-white shadow-[0px_4px_0px_rgba(0,0,0,0.2)]"
              style={{ background: accent }}>
              <span className="font-black text-sm text-white">{doneCount}/{total}</span>
            </div>
          </div>
        </header>

        {/* Sapaan Cilo */}
        <div className="shrink-0 px-4 pt-3 max-w-md w-full mx-auto">
          <div className="flex items-center gap-2">
            <div className="relative w-[52px] h-[62px] shrink-0">
              <div className="absolute top-0 left-0 scale-[0.17] origin-top-left"><CiloKancil /></div>
            </div>
            <div className="relative flex-1 bg-[#fdf3e0] rounded-[20px] rk-sticker px-4 py-2">
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[7px] border-t-transparent border-r-[10px] border-r-[#fdf3e0] border-b-[7px] border-b-transparent" />
              <p className="font-black text-[#4a3728] text-[13px] leading-snug">
                {allDone ? "Semua misi selesai! Ayo lanjut 🎉" : "Ambil kartu misi mana saja untuk main 📌"}
              </p>
            </div>
          </div>
        </div>

        {/* Papan kartu misi — ada panel tenang di belakang agar kartu selalu kontras */}
        <div className="flex-1 overflow-y-auto w-full max-w-md mx-auto px-3 py-4">
          <div className="rounded-[20px] px-2 pt-3 pb-2 backdrop-blur-[1px]"
            style={{ background: stage.panel, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15)" }}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 pt-2">
              {world.skills.map((skillId, i) => {
                const bank = getSkillBank(skillId);
                const done = completedSkills.has(skillId);
                const st = CARD_STYLE[i % CARD_STYLE.length];
                const fastener = st.slot === "a" ? stage.fasteners[0] : stage.fasteners[1];
                return (
                  <div key={skillId} className="relative flex justify-center" style={{ transform: `translateX(${st.dx}%)` }}>
                    {/* Penahan bertema (pin/selotip/paku/tali/bendera) */}
                    <Fastener kind={fastener} rot={st.rot} accent={accent} />

                    {/* KARTU MISI (kertas krem) — non-aktif bila sudah selesai (tak boleh diulang) */}
                    <button type="button" disabled={done}
                      onClick={() => { if (!done) onSelectGame(skillId); }}
                      aria-label={done ? `Misi ${i + 1} sudah selesai` : `Misi: main ${bank?.name ?? skillId}`}
                      className={`relative w-full min-h-[136px] rounded-[6px] bg-[#fdf3e0] px-3 pt-5 pb-3 flex flex-col items-center justify-center text-center border border-[#e6d3ad] transition-transform ${done ? "cursor-default" : "active:scale-95 cursor-pointer"}`}
                      style={{ transform: `rotate(${st.rot}deg)`, boxShadow: "0px 6px 10px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(255,255,255,0.5)" }}>
                      <span className="absolute top-1.5 left-2 font-black text-[10px] tracking-widest uppercase" style={{ color: accent }}>Misi {i + 1}</span>
                      <span className="text-4xl mt-1 mb-1.5 leading-none">{bank?.emoji ?? "🎮"}</span>
                      <span className="font-black text-[#4a3728] text-[13px] leading-tight">{bank?.name ?? skillId}</span>
                      <span className="mt-2 w-full border-t border-dashed border-[#d8c5a0]" />
                      <span className="mt-1.5 font-black text-[10px] uppercase tracking-wide" style={{ color: done ? "#3e8e5a" : accent }}>{done ? "Beres" : "Main"}</span>
                      {done && (
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
                          <span className="font-black text-[#3e8e5a] text-lg tracking-[0.15em] uppercase px-2 py-0.5 rounded-[3px]"
                            style={{ border: "3px solid #3e8e5a", transform: "rotate(-14deg)", opacity: 0.85, boxShadow: "inset 0 0 0 1px rgba(62,142,90,0.4)" }}>
                            Selesai ✓
                          </span>
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Aksi lanjut */}
        <div className="shrink-0 px-4 pt-2 pb-7 max-w-md w-full mx-auto">
          <button type="button" onClick={onFinishWorld} disabled={!allDone}
            className="w-full py-4 rounded-full font-black text-white text-lg tracking-wide uppercase active:scale-95 transition-transform cursor-pointer disabled:opacity-45 disabled:cursor-default border-4 border-white shadow-[0px_5px_0px_rgba(0,0,0,0.28)]"
            style={{ background: allDone ? "#3e8e5a" : "#6e4726" }}>
            {allDone ? "Lanjut petualangan →" : `Selesaikan ${total - doneCount} misi lagi`}
          </button>
        </div>
      </div>
    </main>
  );
}
