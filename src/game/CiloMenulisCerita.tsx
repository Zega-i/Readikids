import { useState, useEffect, useRef } from "react";

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

// Tiga tahap proses — dipetakan ke pekerjaan nyata
type Stage = "reading" | "writing" | "missions";

const STAGES: { key: Stage; done: string; active: string; pending: string }[] = [
  { key: "reading",  done: "✓ jejak petualangan terbaca", active: "● membaca jejak petualangan…", pending: "○ membaca jejak petualangan" },
  { key: "writing",  done: "✓ kata-kata dirangkai",        active: "● merangkai kata-kata…",        pending: "○ merangkai kata-kata" },
  { key: "missions", done: "✓ misi rumah siap",            active: "● menyiapkan misi rumah…",      pending: "○ menyiapkan misi rumah" },
];

interface CiloMenulisCeritaProps {
  childName?: string;
  /**
   * Fungsi async yang menjalankan pemrosesan NYATA:
   * MetricCalculator → risk classification → rekomendasi (LLM/template) → simpan Dexie.
   * Layar menunggu promise ini SELESAI sebelum lanjut — bukan timer palsu.
   */
  processResults?: () => Promise<void>;
  /** Dipanggil setelah proses selesai DAN durasi minimum terpenuhi */
  onDone?: () => void;
  /** Durasi minimum tampil (ms) agar transisi tidak menyentak. Default 2500. */
  minDurationMs?: number;
}

export const CiloMenulisCerita = ({
  childName = "si kecil",
  processResults,
  onDone,
  minDurationMs = 2500,
}: CiloMenulisCeritaProps): JSX.Element => {
  const [stageIndex, setStageIndex] = useState(0); // tahap aktif 0..2
  const [typedChars, setTypedChars] = useState(0);  // jumlah huruf yang sudah "ditulis"

  const startTimeRef = useRef<number>(performance.now());
  const doneCalledRef = useRef(false);

  // Simpan versi TERBARU dari prop/callback di ref, agar effect pemroses bisa
  // berjalan SEKALI di awal tanpa ikut ter-restart saat App render ulang.
  const processResultsRef = useRef(processResults);
  const onDoneRef = useRef(onDone);
  const minDurationRef = useRef(minDurationMs);
  useEffect(() => {
    processResultsRef.current = processResults;
    onDoneRef.current = onDone;
    minDurationRef.current = minDurationMs;
  });

  // ── Progres tahap: jalankan proses NYATA SEKALI saat layar muncul ──
  // Dipicu sekali (deps []) — perubahan referensi callback dari App TIDAK
  // membuatnya ter-restart. Jadi pipeline (metrik → heuristic → AI/llm) jalan
  // tepat sekali, lalu pindah ke W10. Callback dibaca dari ref (selalu terbaru).
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setStageIndex(0);
      const processResults = processResultsRef.current;
      const minDurationMs = minDurationRef.current;

      if (processResults) {
        // Jalankan pemrosesan NYATA (metrik → heuristic → AI/llm → simpan).
        // SYARAT pindah layar: promise ini selesai.
        const proc = processResults();

        // gerakkan indikator tahap secara halus selama menunggu
        const s1 = setTimeout(() => !cancelled && setStageIndex(1), 800);
        const s2 = setTimeout(() => !cancelled && setStageIndex(2), 1600);

        await proc;                    // ← tunggu proses benar-benar selesai
        clearTimeout(s1);
        clearTimeout(s2);
        if (cancelled) return;
        setStageIndex(2);              // pastikan semua tahap tampak selesai
      } else {
        // Mode tanpa proses (mis. demo): tempo animasi saja
        await new Promise((r) => setTimeout(r, 900)); if (cancelled) return; setStageIndex(1);
        await new Promise((r) => setTimeout(r, 900)); if (cancelled) return; setStageIndex(2);
        await new Promise((r) => setTimeout(r, 700)); if (cancelled) return;
      }

      // Hormati durasi minimum agar tidak menyentak
      const elapsed = performance.now() - startTimeRef.current;
      const remaining = Math.max(0, minDurationMs - elapsed);
      await new Promise((r) => setTimeout(r, remaining));

      if (!cancelled && !doneCalledRef.current) {
        doneCalledRef.current = true;
        onDoneRef.current?.();
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kalimat "cerita" yang diketik huruf demi huruf (efek Cilo menulis).
  // Nama anak dibuat dinamis berdasarkan prop childName.
  const previewText = `“${childName} lincah sekali di Bukit Angka!\nTapi di Hutan Huruf dia sering berhenti…`;

  // ── Efek ketik: huruf demi huruf ──
  useEffect(() => {
    if (typedChars >= previewText.length) return;
    const t = setTimeout(() => setTypedChars((c) => c + 1), 45); // 45ms/huruf
    return () => clearTimeout(t);
  }, [typedChars, previewText.length]);

  return (
    <main className="w-full h-[100dvh] bg-[linear-gradient(180deg,rgba(255,235,208,1)_0%,rgba(255,246,233,1)_100%)] relative overflow-hidden select-none font-nunito flex flex-col items-center text-[#4a3728]">

      {/* Judul (beberapa baris) */}
      <div className="shrink-0 text-center px-6 pt-9">
        <h1 className="font-black text-2xl leading-tight">Cilo sedang menulis<br />ceritamu…</h1>
        <p className="font-bold text-[#8a7a66] text-sm mt-2">untuk orangtua/wali 📖</p>
      </div>

      {/* Kertas cerita + Cilo di pojok kanan bawah */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center px-6">
        <div className="relative">
          {/* Kilau ✨ — di LUAR kertas agar tidak terpotong */}
          <span className="absolute z-10 text-xl animate-[twinkle_1.4s_ease-in-out_infinite]" style={{ left: -14, top: -12 }}>✨</span>
          <span className="absolute z-10 text-base animate-[twinkle_1.8s_ease-in-out_infinite]" style={{ right: -8, top: 30 }}>✨</span>

          {/* Kertas — kecil & memanjang ke bawah */}
          <div className="relative bg-white rounded-[28px] shadow-[0px_10px_30px_rgba(74,55,40,0.12)] w-[236px] h-[320px] rotate-2 px-6 py-8">
            {/* garis-garis kertas + baris cokelat yang sedang ditulis (diperpendek) */}
            <div className="flex flex-col gap-[18px]">
              {[86, 94, 78, 90, 72].map((w, i) => (
                <div key={i} className="h-2.5 rounded-full bg-[#e8dfce]" style={{ width: `${w}%` }} />
              ))}
              <div className="relative h-2.5">
                <div className="h-2.5 rounded-full bg-[#c98a4b] transition-all duration-100"
                  style={{ width: Math.min(20 + typedChars * 2, 130) }} />
                <span className="absolute -top-2 text-xl animate-[nib-bob_0.5s_ease-in-out_infinite]"
                  style={{ left: Math.min(20 + typedChars * 2, 130) - 8 }}>✍️</span>
              </div>
            </div>
          </div>

          {/* Cilo mengintip dari pojok kanan bawah */}
          <div className="absolute -bottom-3 -right-9 w-[118px] h-[142px] pointer-events-none">
            <div className="absolute top-0 left-0 scale-[0.4] origin-top-left"><Cilo /></div>
            <span className="absolute left-[68px] top-[90px] text-2xl rotate-[35deg]">✏️</span>
          </div>
        </div>
      </div>

      {/* Checklist status — bertumpuk */}
      <div className="shrink-0 w-full max-w-sm px-6">
        <div className="bg-white rounded-3xl rk-sticker p-4 flex flex-col gap-2.5">
          {STAGES.map((s, i) => {
            const state = i < stageIndex ? "done" : i === stageIndex ? "active" : "pending";
            const label = state === "done" ? s.done : state === "active" ? s.active : s.pending;
            const color = state === "done" ? "#6dbb57" : state === "active" ? "#c98a4b" : "#8a7a66";
            return (
              <span key={s.key} className="font-bold text-[15px]" style={{ color }}>{label}</span>
            );
          })}
        </div>
      </div>

      {/* Spacer bawah agar checklist di tengah (jarak atas = bawah) */}
      <div className="flex-1 min-h-0" />

      {/* Footer */}
      <div className="shrink-0 pt-3 pb-6 text-center px-6">
        <p className="font-bold text-[#a98f6f] text-xs">
          hanya untuk pendamping · anak tidak melihat layar ini
        </p>
      </div>

      {/* Keyframes animasi */}
      <style>{`
        @keyframes cilo-write {
          0%, 100% { transform: rotate(-8deg) translateY(0); }
          50%      { transform: rotate(6deg) translateY(-4px); }
        }
        @keyframes nib-bob {
          0%, 100% { transform: translateX(0); }
          50%      { transform: translateX(3px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.9); }
          50%      { opacity: 1;   transform: scale(1.15); }
        }
      `}</style>
    </main>
  );
};

export default CiloMenulisCerita;