/**
 * ReadiKids AI — Label jejak karbon per sesi (Green Computing).
 *
 * Menampilkan estimasi emisi satu sesi skrining sebagai label ringkas (chip)
 * yang bisa dibuka menjadi pop-out rincian. Seluruh angka dihitung dari DATA
 * NYATA sesi (latency trial, jumlah soal, panjang payload, pemakaian token AI)
 * lewat modul murni `utils/carbonFootprint.ts` (SCI ISO/IEC 21031 × SWDM v4).
 *
 * KESELAMATAN PRODUK: semua nilai adalah "perkiraan berbasis model", bukan
 * pengukuran lab — selalu disertai disclaimer. Tidak pernah dipakai sebagai
 * indikator risiko medis (kelas ringan/sedang/berat = beban karbon, BUKAN
 * level observasi anak). Ikon + label selalu tampil (tidak warna saja).
 */
import { useEffect, useState } from "react";
import { db } from "../telemetry/TelemetryDB";
import {
  buildSessionCarbonInput,
  estimateSessionCarbon,
  type CarbonEstimate,
  type SessionCarbonInput,
} from "../utils/carbonFootprint";
import type { ScreeningResult } from "./CompanionDashboard";

interface Props {
  result: ScreeningResult;
}

/** Meta kelas beban — ikon + label + palet hangat (bukan indikator risiko). */
const LOAD_CLASS_META: Record<
  CarbonEstimate["loadClass"],
  { icon: string; label: string; bg: string; border: string; text: string }
> = {
  ringan: { icon: "🍃", label: "Ringan", bg: "#eaf7e0", border: "#6dbb57", text: "#2f5b23" },
  sedang: { icon: "⚖️", label: "Sedang", bg: "#fdf3dc", border: "#d99a3d", text: "#7a5200" },
  berat: { icon: "🔥", label: "Berat", bg: "#fbe7e0", border: "#d98a6a", text: "#8a3c24" },
};

const BREAKDOWN_ROWS = [
  { key: "deviceGCO2e", label: "Perangkat — bermain", icon: "📱", color: "#3e8e5a" },
  { key: "transferGCO2e", label: "Transfer data", icon: "📡", color: "#6dbb57" },
  { key: "aiGCO2e", label: "AI — Gemini", icon: "🧠", color: "#c98a4b" },
  { key: "syncGCO2e", label: "Sinkronisasi", icon: "☁️", color: "#7db4c9" },
] as const;

function formatGrams(g: number): string {
  const s = g >= 100 ? g.toFixed(0) : g >= 1 ? g.toFixed(1) : g.toFixed(2);
  return s.replace(".", ",");
}

interface CarbonData {
  estimate: CarbonEstimate;
  /** Estimasi ulang seandainya AI tidak dipakai — untuk perbandingan. */
  withoutAi: CarbonEstimate;
}

/**
 * Hitung jejak karbon satu sesi dari data NYATA (trials + plan).
 * Sumber kebenaran tunggal — dipakai chip UI & laporan PDF agar konsisten.
 * Mengembalikan null bila data sesi tidak bisa dibaca.
 */
export async function computeSessionCarbon(result: ScreeningResult): Promise<CarbonData | null> {
  try {
    const trials = await db.trials.where("sessionId").equals(result.sessionId).toArray();
    const plan = result.plan;
    const outputText = [plan.summary, ...plan.companionActivities, ...plan.referralGuidance].join("");
    const input: SessionCarbonInput = buildSessionCarbonInput({
      session: { startedAt: result.startedAt, endedAt: result.endedAt },
      trials,
      dataTransferBytes: JSON.stringify(plan).length,
      syncPayloadBytes:
        JSON.stringify({
          session: { startedAt: result.startedAt, endedAt: result.endedAt },
          assessment: result.assessment,
          plan: { summary: plan.summary },
        }).length,
      ai: plan.aiUsage
        ? {
            source: "gemini",
            promptTokens: plan.aiUsage.promptTokens,
            outputTokens: plan.aiUsage.outputTokens,
          }
        : {
            source: plan.source,
            promptChars: JSON.stringify(result.assessment).length,
            outputChars: outputText.length,
          },
    });
    return {
      estimate: estimateSessionCarbon(input),
      withoutAi: estimateSessionCarbon({ ...input, ai: { source: "local-template" } }),
    };
  } catch {
    return null;
  }
}

export default function CarbonFootprint({ result }: Props): JSX.Element | null {
  const [data, setData] = useState<CarbonData | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    computeSessionCarbon(result).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [result]);

  if (!data) return null;

  const meta = LOAD_CLASS_META[data.estimate.loadClass];
  const aiDeltaPct =
    data.withoutAi.totalGCO2e > 0
      ? Math.round(((data.estimate.totalGCO2e - data.withoutAi.totalGCO2e) / data.withoutAi.totalGCO2e) * 100)
      : 0;

  return (
    <>
      {/* ── Label ringkas (chip) ── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between gap-3 rounded-3xl p-4 border-2 text-left active:scale-[0.99] transition-transform cursor-pointer"
        style={{ background: meta.bg, borderColor: meta.border }}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0" aria-hidden="true">
            🌱
          </span>
          <span className="font-black text-xs tracking-wider" style={{ color: meta.text }}>
            JEJAK KARBON SESI INI
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="font-black text-sm" style={{ color: meta.text }}>
            ≈ {formatGrams(data.estimate.totalGCO2e)} g CO₂e
          </span>
          <span
            className="font-black text-[11px] px-2 py-0.5 rounded-full border bg-white/70"
            style={{ borderColor: meta.border, color: meta.text }}
          >
            {meta.icon} {meta.label}
          </span>
        </span>
      </button>

      {/* ── Pop-out rincian ── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end lg:items-center justify-center lg:p-6"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
          <div
            className="relative w-full lg:max-w-md bg-[#fff6e9] rounded-t-3xl lg:rounded-3xl shadow-2xl p-5 lg:p-6 max-h-[85dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Rincian jejak karbon sesi ini"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-[#6b5a48] text-xs tracking-wider">JEJAK KARBON SESI INI</p>
                <p className="font-black text-[#4a3728] text-3xl mt-1">
                  ≈ {formatGrams(data.estimate.totalGCO2e)} g CO₂e
                </p>
                <p className="font-bold text-[#7c6a55] text-[13px] mt-1">
                  Perkiraan satu kali sesi skrining.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 w-9 h-9 rounded-full bg-[#f3e9d7] flex items-center justify-center font-black text-[#8a7a66] cursor-pointer"
                aria-label="Tutup rincian"
              >
                ✕
              </button>
            </div>

            <div className="h-px bg-[#f3e9d7] my-4" />

            <p className="font-black text-[#6b5a48] text-xs tracking-wider">RINCIAN PER SUMBER</p>
            <div className="flex flex-col gap-3 mt-3">
              {BREAKDOWN_ROWS.map((row) => {
                const value = data.estimate.breakdown[row.key];
                const pct = data.estimate.totalGCO2e > 0 ? (value / data.estimate.totalGCO2e) * 100 : 0;
                return (
                  <div key={row.key}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#4a3728] text-[13px]">
                        {row.icon} {row.label}
                      </span>
                      <span className="font-black text-[#6b5a48] text-[13px]">{formatGrams(value)} g</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#f3e9d7] mt-1 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(2, pct)}%`, background: row.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {data.estimate.aiCalled && (
              <div className="bg-[#eaf7e0] rounded-2xl p-4 mt-4">
                <p className="font-black text-[#2f5b23] text-xs tracking-wider">PENGARUH AI</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-[#4a3728] text-[13px]">Tanpa AI (template lokal)</span>
                  <span className="font-black text-[#6b5a48] text-[13px]">
                    ≈ {formatGrams(data.withoutAi.totalGCO2e)} g
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-bold text-[#4a3728] text-[13px]">Dengan AI (Gemini)</span>
                  <span className="font-black text-[#6b5a48] text-[13px]">
                    ≈ {formatGrams(data.estimate.totalGCO2e)} g
                  </span>
                </div>
                <p className="font-bold text-[#6b5a48] text-[11px] mt-2">
                  {aiDeltaPct >= 0 ? `+${aiDeltaPct}%` : `${aiDeltaPct}%`} emisi dibanding tanpa AI — AI
                  hanya dipanggil sekali per hasil sesi.
                </p>
              </div>
            )}

            <div className="h-px bg-[#f3e9d7] my-4" />
            <p className="font-bold text-[#7c6a55] text-[11px] leading-relaxed">
              Perkiraan dengan metode SCI (ISO/IEC 21031:2024) × SWDM v4 (CO2.js): energi perangkat
              (durasi bermain), transfer data, dan inferensi AI (token Gemini bila tercatat). Intensitas
              grid 494 g CO₂e/kWh (Ember) & model kecil flash-class.
            </p>
            <p className="font-bold text-[#7c6a55] text-[11px] leading-relaxed mt-2">
              ⚠ Ini perkiraan berbasis model, bukan pengukuran laboratorium. Angka bervariasi menurut
              perangkat, jaringan, dan sumber listrik. Tidak berkaitan dengan hasil skrining anak.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
