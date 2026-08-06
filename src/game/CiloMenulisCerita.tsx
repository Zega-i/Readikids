import { useState, useEffect, useRef, useCallback } from "react";

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
  const [showCursor, setShowCursor] = useState(true);

  const [stageScale, setStageScale] = useState(1);

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

  // ── Panggung berskala (layar ini boleh center, tidak ada telemetri) ──
  const updateScale = useCallback(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    setStageScale(Math.min(vw / 1280, vh / 800, 1));
  }, []);
  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [updateScale]);

  // ── Kursor berkedip ──
  useEffect(() => {
    const t = setInterval(() => setShowCursor((s) => !s), 500);
    return () => clearInterval(t);
  }, []);

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

  // Progres bar isi mengikuti tahap (0→33→66→100)
  const progressPct = stageIndex === 0 ? 25 : stageIndex === 1 ? 60 : 92;

  // Kalimat "cerita" yang diketik huruf demi huruf (efek Cilo menulis).
  // Nama anak dibuat dinamis berdasarkan prop childName.
  const previewText = `“${childName} lincah sekali di Bukit Angka!\nTapi di Hutan Huruf dia sering berhenti…`;

  // ── Efek ketik: huruf demi huruf ──
  useEffect(() => {
    if (typedChars >= previewText.length) return;
    const t = setTimeout(() => setTypedChars((c) => c + 1), 45); // 45ms/huruf
    return () => clearTimeout(t);
  }, [typedChars, previewText.length]);

  const typed = previewText.slice(0, typedChars);

  return (
    <main className="w-screen h-screen h-[100dvh] bg-[linear-gradient(180deg,rgba(255,235,208,1)_0%,rgba(255,246,233,1)_100%)] relative overflow-hidden select-none font-nunito flex items-center justify-center text-[#4a3728]">
      <div
        style={{ width: 1280, height: 800, transform: `scale(${stageScale})`, transformOrigin: "center center" }}
        className="relative shrink-0 overflow-hidden"
      >
        {/* Judul */}
        <div className="absolute left-0 w-full text-center px-8" style={{ top: 64 }}>
          <h1 className="font-black text-[32px] leading-tight">
            Cilo sedang menulis cerita {childName}…
          </h1>
          <p className="font-bold text-[#8a7a66] text-[15px] mt-2">
            sebentar ya — setiap petualangan jadi satu cerita utuh untuk Anda
          </p>
        </div>

        {/* Cilo + pena yang bergoyang (animasi menulis) */}
        <div className="absolute" style={{ left: 180, top: 270 }}>
          <div style={{ transform: "scale(0.71)", transformOrigin: "top left" }}>
            <Cilo />
          </div>
          {/* Pena ✏ bergoyang naik-turun seperti sedang menulis */}
          <span
            className="absolute text-4xl animate-[cilo-write_0.6s_ease-in-out_infinite]"
            style={{ left: 172, top: 160 }}
          >
            ✏️
          </span>
        </div>

        {/* Kertas cerita */}
        <div className="absolute bg-white rounded-3xl shadow-[0px_8px_24px_rgba(74,55,40,0.1)]"
          style={{
            left: 560, top: 190, width: 520, height: 380,
            transform: "rotate(4deg)",
            transformOrigin: "center center",
          }}>
          {/* garis-garis kertas (5 penuh + 1 terisi tinta cokelat) */}
          {[224, 277, 331, 384, 437].map((y, i) => (
            <div key={i} className="absolute rounded-full bg-[#e8dfce]"
              style={{ left: 28, top: y - 190, width: 420, height: 9 }} />
          ))}
          {/* baris terakhir sedang ditulis — lebar mengikuti progres ketik */}
          <div className="absolute rounded-full bg-[#c98a4b] transition-all duration-100"
            style={{ left: 28, top: 491 - 190, width: 60 + typedChars * 3, height: 9, maxWidth: 336 }} />

          {/* teks cerita yang diketik huruf demi huruf */}
          <p className="absolute font-bold text-[#6b5a48] text-[18px] leading-relaxed whitespace-pre-line"
            style={{ left: 46, top: 372 - 190, width: 380 }}>
            {typed}
            <span className={showCursor ? "opacity-100" : "opacity-0"}>▌</span>
          </p>

          {/* pena kecil ✍ di ujung baris */}
          <span className="absolute text-2xl animate-[nib-bob_0.5s_ease-in-out_infinite] transition-all duration-100"
            style={{
              left: 28 + Math.min(60 + typedChars * 3, 336) - 10,
              top: 477 - 190
            }}>✍️</span>

          {/* sparkle */}
          <span className="absolute text-2xl animate-[twinkle_1.4s_ease-in-out_infinite]" style={{ left: -26, top: -20 }}>✨</span>
          <span className="absolute text-base animate-[twinkle_1.8s_ease-in-out_infinite]" style={{ left: 544, top: 230 }}>✨</span>
        </div>

        {/* Jejak langkah Cilo (dots) — terisi mengikuti progres */}
        <div className="absolute flex items-center gap-12" style={{ left: 400, top: 656 }}>
          {Array.from({ length: 8 }).map((_, i) => {
            const filled = i < Math.round((progressPct / 100) * 8);
            return (
              <span key={i}
                className="rounded-[50%] transition-colors duration-300"
                style={{ width: 16, height: 10, background: filled ? "#c98a4b" : "#e8dfce" }} />
            );
          })}
        </div>

        {/* Tiga kartu status tahap */}
        <div className="absolute flex gap-6" style={{ left: 166, top: 696 }}>
          {STAGES.map((s, i) => {
            const state = i < stageIndex ? "done" : i === stageIndex ? "active" : "pending";
            const label = state === "done" ? s.done : state === "active" ? s.active : s.pending;
            const color = state === "done" ? "#6dbb57" : state === "active" ? "#c98a4b" : "#8a7a66";
            return (
              <div key={s.key}
                className="bg-white rounded-2xl shadow-sm flex items-center justify-center px-5"
                style={{ width: 300, height: 50 }}>
                <span className="font-bold text-sm" style={{ color }}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Footer privasi */}
        <div className="absolute left-0 w-full text-center" style={{ top: 768 }}>
          <p className="font-bold text-[#a98f6f] text-xs">
            hanya untuk pendamping · anak tidak melihat layar ini
          </p>
        </div>
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