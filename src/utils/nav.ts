import type { PhaseId, SkillId } from "../types/telemetry";

/**
 * ReadiKids AI — Sinkronisasi navigasi layar dengan History API (hash).
 *
 * Layar di aplikasi di-render dari state React (`App.tsx`), bukan URL. Tanpa
 * sinkronisasi, tombol kembali sistem (Android swipe / bar bawah / browser)
 * tidak punya riwayat untuk ditelusuri → terasa "mati" atau menutup app.
 *
 * Di sini tiap layar dipetakan ke hash URL, sehingga back/forward sistem
 * berubah menjadi peristiwa `hashchange` yang bisa dipulihkan ke state.
 */

export type ScreenId =
  | "landing"
  | "consent"
  | "map"
  | "world-hub"
  | "game"
  | "penutup"
  | "cilo-menulis"
  | "dashboard-pendamping"
  | "beranda-pendamping"
  | "kelola"
  | "riwayat"
  | "tentang";

/** Konteks navigasi yang cukup untuk memulihkan sebuah layar. */
export interface NavContext {
  screen: ScreenId;
  phase: PhaseId | null;
  skill: SkillId | null;
  viewingSessionId: string | null;
}

export const LANDING_HASH = "#/";

/** Encode konteks layar → hash URL. */
export function encodeHash(ctx: NavContext): string {
  switch (ctx.screen) {
    case "landing":
      return LANDING_HASH;
    case "consent":
      return "#/consent";
    case "map":
      return "#/map";
    case "world-hub":
      return ctx.phase != null ? `#/world-hub/${ctx.phase}` : LANDING_HASH;
    case "game":
      return ctx.phase != null && ctx.skill ? `#/game/${ctx.phase}/${ctx.skill}` : LANDING_HASH;
    case "penutup":
      return "#/penutup";
    case "cilo-menulis":
      return "#/cilo-menulis";
    case "dashboard-pendamping":
      return ctx.viewingSessionId
        ? `#/dashboard?session=${encodeURIComponent(ctx.viewingSessionId)}`
        : "#/dashboard";
    case "beranda-pendamping":
      return "#/beranda";
    case "kelola":
      return "#/kelola";
    case "riwayat":
      return "#/riwayat";
    case "tentang":
      return "#/tentang";
  }
}

/** Decode hash URL → konteks layar. Mengembalikan `null` untuk hash tak dikenal. */
export function decodeHash(hash: string): NavContext | null {
  const raw = hash.replace(/^#/, "");
  const [path, query] = raw.split("?");
  const segs = path.split("/").filter(Boolean);
  const key = segs[0];
  const params = new URLSearchParams(query ?? "");
  const base: NavContext = { screen: "landing", phase: null, skill: null, viewingSessionId: null };

  switch (key) {
    case undefined:
    case "":
    case "/":
      return base;
    case "consent":
      return { ...base, screen: "consent" };
    case "map":
      return { ...base, screen: "map" };
    case "world-hub": {
      const phase = Number(segs[1]);
      if (!Number.isInteger(phase) || phase < 0 || phase > 4) return null;
      return { ...base, screen: "world-hub", phase: phase as PhaseId };
    }
    case "game": {
      const phase = Number(segs[1]);
      const skill = segs[2] as SkillId | undefined;
      if (!Number.isInteger(phase) || phase < 0 || phase > 4 || !skill) return null;
      return { ...base, screen: "game", phase: phase as PhaseId, skill };
    }
    case "penutup":
      return { ...base, screen: "penutup" };
    case "cilo-menulis":
      return { ...base, screen: "cilo-menulis" };
    case "dashboard": {
      const session = params.get("session");
      return { ...base, screen: "dashboard-pendamping", viewingSessionId: session };
    }
    case "beranda":
      return { ...base, screen: "beranda-pendamping" };
    case "kelola":
      return { ...base, screen: "kelola" };
    case "riwayat":
      return { ...base, screen: "riwayat" };
    case "tentang":
      return { ...base, screen: "tentang" };
    default:
      return null;
  }
}