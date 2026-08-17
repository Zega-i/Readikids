import { useEffect, useState } from "react";
import LandingPage from "./pages/LandingPage";
import ParentConsentCilo from "./onboarding/ParentConsentCilo";
import WorldMap from "./game/WorldMap";
import WorldHub from "./game/WorldHub";
import GameHost from "./game/GameHost";
import PuncakBintang from "./game/PuncakBintang";
import CiloMenulisCerita from "./game/CiloMenulisCerita";
import { WORLDS } from "./game/trialBank";

import BerandaPendamping from "./companion/BerandaPendamping";
import CompanionDashboard from "./companion/CompanionDashboard";
import type { ScreeningResult } from "./companion/CompanionDashboard";
// reportPdf (pdf-lib, ~berat) di-lazy-load di call site onSavePDF.
// CarbonFootprint di-import statis: modulnya sudah pasti ikut bundle utama via CompanionDashboard.
import { computeSessionCarbon } from "./companion/CarbonFootprint";

import ChildProfileManager from "./companion/ChildProfileManager";
import RiwayatLaporan from "./companion/RiwayatLaporan";
import TentangPrivasi from "./companion/TentangPrivasi";
import { type ChildProfile, type PhaseId, type SkillId, type TrialRecord } from "./types/telemetry";

import { runScreeningPipeline } from "./game/resultsPipeline";
import { getAllScreeningResults, getBerandaData, getLatestScreeningResult, getWeeklyMissionDone, toggleWeeklyMission } from "./companion/dashboardData";
import { listChildProfiles } from "./profiles/childProfileService";
import { warmUpNativeTTS } from "./utils/tts";
import { savePdf } from "./utils/savePdf";
import { isNativePlatform } from "./utils/platform";
import { decodeHash, encodeHash, type NavContext, type ScreenId } from "./utils/nav";
import type { PluginListenerHandle } from "@capacitor/core";

const LAST_PHASE = WORLDS[WORLDS.length - 1].phase;

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>("landing");
  const [activeProfile, setActiveProfile] = useState<ChildProfile | null>(null);

  // ── Alur petualangan v2: 5 dunia (fase) berurutan; game bebas di dalam dunia ──
  /** Jumlah dunia yang sudah diselesaikan = dunia aktif berikutnya. */
  const [currentWorldIndex, setCurrentWorldIndex] = useState(0);
  const [activePhase, setActivePhase] = useState<PhaseId | null>(null);
  const [activeSkill, setActiveSkill] = useState<SkillId | null>(null);
  /** Semua TrialRecord dari seluruh game dalam satu rangkaian skrining. */
  const [runTrials, setRunTrials] = useState<TrialRecord[]>([]);
  const [completedSkills, setCompletedSkills] = useState<Set<SkillId>>(new Set());
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);

  const [latestResult, setLatestResult] = useState<ScreeningResult | null>(null);
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);
  const [cooldownOverrideReason, setCooldownOverrideReason] = useState<string | null>(null);

  const [allProfiles, setAllProfiles] = useState<ChildProfile[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    listChildProfiles()
      .then((ps) => {
        setAllProfiles(ps);
        setActiveProfile((cur) => cur ?? ps[0] ?? null);
      })
      .catch((err) => console.error("[App] gagal memuat profil:", err));
  }, []);

  useEffect(() => {
    if (navigator.storage?.persist) {
      void navigator.storage
        .persisted()
        .then((already) => {
          if (!already) void navigator.storage.persist();
        })
        .catch(() => {});
    }
  }, []);

  // Warm-up native TTS sejak awal: Android TextToSpeech perlu waktu untuk `onInit`.
  // Tanpa ini, `speak()` pertama di game bisa ditolak "not initialized" → audio mati.
  useEffect(() => {
    void warmUpNativeTTS();
  }, []);

  // ── Sinkronisasi navigasi dengan History API (hash) ──
  // Semua layar di-render dari state, sehingga tombol kembali sistem tidak punya
  // riwayat. Hash URL memberi jejak itu: back/forward sistem → hashchange → state.
  const applyCtx = (ctx: NavContext) => {
    setCurrentScreen(ctx.screen);
    setActivePhase(ctx.phase);
    setActiveSkill(ctx.skill);
    setViewingSessionId(ctx.viewingSessionId);
  };

  /** Navigasi maju — dorong entri riwayat baru. */
  const navigate = (ctx: NavContext) => {
    applyCtx(ctx);
    window.location.hash = encodeHash(ctx);
  };

  /** Ganti entri teratas — untuk langkah linier yang tidak boleh di-back. */
  const replaceNav = (ctx: NavContext) => {
    applyCtx(ctx);
    window.history.replaceState(null, "", encodeHash(ctx));
  };

  /** Kembali satu langkah (dipakai tombol kembali dalam-app maupun sistem). */
  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      applyCtx({ screen: "landing", phase: null, skill: null, viewingSessionId: null });
    }
  };

  useEffect(() => {
    const applyFromHash = () => {
      const ctx = decodeHash(window.location.hash);
      if (ctx) applyCtx(ctx);
    };
    window.addEventListener("hashchange", applyFromHash);
    // Setelah reload: buang hash lama agar selalu mulai bersih dari landing.
    const initial = decodeHash(window.location.hash);
    if (initial && initial.screen !== "landing") {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    return () => window.removeEventListener("hashchange", applyFromHash);
  }, []);

  // Tombol kembali Android (swipe / bar bawah) di dalam APK: ikuti riwayat
  // WebView; di akar (tidak bisa mundur) → keluar dari aplikasi.
  useEffect(() => {
    if (!isNativePlatform()) return;
    let disposed = false;
    let handle: PluginListenerHandle | null = null;
    void import("@capacitor/app").then(({ App }) => {
      if (disposed) return;
      void App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          void App.exitApp();
        }
      }).then((h) => {
        if (disposed) void h.remove();
        else handle = h;
      });
    });
    return () => {
      disposed = true;
      void handle?.remove();
    };
  }, []);

  const refreshProfiles = async (): Promise<ChildProfile[]> => {
    const ps = await listChildProfiles();
    setAllProfiles(ps);
    return ps;
  };

  // Mulai satu rangkaian skrining baru: catat waktu, kosongkan data lama.
  const beginNewRun = (overrideReason: string | null = null) => {
    setRunStartedAt(Date.now());
    setRunTrials([]);
    setCompletedSkills(new Set());
    setCurrentWorldIndex(0);
    setActivePhase(null);
    setActiveSkill(null);
    setLatestResult(null);
    setCooldownOverrideReason(overrideReason);
  };

  const handleStartFromLanding = async () => {
    const profiles = await refreshProfiles();
    if (profiles.length > 0) {
      setActiveProfile((cur) => cur ?? profiles[0]);
      navigate({ screen: "beranda-pendamping", phase: null, skill: null, viewingSessionId: null });
    } else {
      navigate({ screen: "consent", phase: null, skill: null, viewingSessionId: null });
    }
  };

  const handleProfileCreated = (profile: ChildProfile) => {
    setActiveProfile(profile);
    setAllProfiles((prev) => [...prev, profile]);
    setRefreshKey((k) => k + 1);
    beginNewRun();
    replaceNav({ screen: "map", phase: null, skill: null, viewingSessionId: null });
  };

  // ── Navigasi petualangan ──
  const enterWorld = (phase: PhaseId) => {
    navigate({ screen: "world-hub", phase, skill: null, viewingSessionId: null });
  };

  const selectGame = (skillId: SkillId) => {
    // Game yang sudah selesai TIDAK boleh diulang dalam satu sesi
    // (mencegah trial duplikat yang mencemari hasil skrining).
    if (completedSkills.has(skillId)) return;
    navigate({ screen: "game", phase: activePhase, skill: skillId, viewingSessionId: null });
  };

  const handleGameComplete = (trials: TrialRecord[]) => {
    setRunTrials((prev) => [...prev, ...trials]);
    if (activeSkill) {
      setCompletedSkills((prev) => new Set(prev).add(activeSkill));
    }
    replaceNav({ screen: "world-hub", phase: activePhase, skill: null, viewingSessionId: null });
  };

  const finishWorld = () => {
    if (activePhase === null) return;
    // Buka dunia berikutnya.
    setCurrentWorldIndex((i) => Math.max(i, activePhase + 1));
    if (activePhase >= LAST_PHASE) {
      replaceNav({ screen: "penutup", phase: null, skill: null, viewingSessionId: null }); // semua dunia selesai → selebrasi lalu hasil
    } else {
      replaceNav({ screen: "map", phase: null, skill: null, viewingSessionId: null });
    }
  };

  const activeAccent = activePhase !== null ? WORLDS.find((w) => w.phase === activePhase)?.accent : undefined;

  return (
    <>
      {currentScreen === "landing" && (
        <LandingPage
          onStart={handleStartFromLanding}
          hasExistingData={allProfiles.length > 0}
        />
      )}

      {currentScreen === "consent" && (
        <ParentConsentCilo
          onCreated={handleProfileCreated}
          onCancel={() => goBack()}
        />
      )}

      {currentScreen === "map" && (
        <WorldMap
          currentWorldIndex={currentWorldIndex}
          onEnterWorld={enterWorld}
          onBackToDashboard={() => goBack()}
        />
      )}

      {currentScreen === "world-hub" && activePhase !== null && (
        <WorldHub
          phase={activePhase}
          completedSkills={completedSkills}
          onSelectGame={selectGame}
          onFinishWorld={finishWorld}
          onBack={() => goBack()}
        />
      )}

      {currentScreen === "game" && activeSkill && (
        <GameHost
          skillId={activeSkill}
          accent={activeAccent}
          onComplete={handleGameComplete}
          onBack={() => goBack()}
        />
      )}

      {currentScreen === "penutup" && (
        <PuncakBintang
          onOpenStory={() => replaceNav({ screen: "cilo-menulis", phase: null, skill: null, viewingSessionId: null })}
        />
      )}

      {currentScreen === "cilo-menulis" && (
        <CiloMenulisCerita
          childName={activeProfile?.pseudonym}
          processResults={async () => {
            if (!activeProfile) return;
            const result = await runScreeningPipeline({
              profile: activeProfile,
              startedAt: runStartedAt ?? Date.now(),
              trials: runTrials,
              skills: [...completedSkills],
              cooldownOverrideReason,
            });
            setLatestResult(result);
            setRunStartedAt(null);
          }}
          onDone={() => replaceNav({ screen: "dashboard-pendamping", phase: null, skill: null, viewingSessionId: null })}
        />
      )}

      {currentScreen === "dashboard-pendamping" && activeProfile && (
        <CompanionDashboard
          activeProfile={activeProfile}
          fetchLatestResult={async (profileId) => {
            if (viewingSessionId) {
              const results = await getAllScreeningResults(profileId);
              return results.find((r) => r.sessionId === viewingSessionId) || null;
            }
            if (latestResult && latestResult.childName === activeProfile.pseudonym) {
              return latestResult;
            }
            return getLatestScreeningResult(profileId);
          }}
          onStartNext={() => {
            if (viewingSessionId) {
              setViewingSessionId(null);
              goBack();
            } else {
              navigate({ screen: "beranda-pendamping", phase: null, skill: null, viewingSessionId: null });
            }
          }}
          nextButtonText={viewingSessionId ? "← Kembali ke Riwayat" : undefined}
          onSavePDF={async (result) => {
            try {
              const carbon = await computeSessionCarbon(result);
              const { buildReferralReportPdf } = await import("./referral/reportPdf");
              const pdfBytes = await buildReferralReportPdf({
                child: activeProfile,
                assessment: {
                  sessionId: result.sessionId,
                  childRef: activeProfile.id,
                  ageYears: activeProfile.ageYears,
                  createdAt: result.endedAt,
                  highestPhaseReached: result.assessment.highestPhaseReached as PhaseId,
                  phaseAgeGap: result.assessment.phaseAgeGap,
                  level: result.assessment.level,
                  perPhase: result.assessment.perPhase.map((p) => ({ ...p, phase: p.phase as PhaseId, skills: [] })),
                },
                history: (await getAllScreeningResults(activeProfile.id))
                  .filter((r) => r.sessionId !== result.sessionId)
                  .map((r) => ({
                    sessionId: r.sessionId,
                    createdAt: r.startedAt,
                    highestPhaseReached: r.assessment.highestPhaseReached as PhaseId,
                    phaseAgeGap: r.assessment.phaseAgeGap,
                    level: r.assessment.level,
                  })),
                plan: result.plan,
                carbon: carbon?.estimate ?? null,
              });
              const filename = `Laporan_ReadiKids_${activeProfile.pseudonym}_${new Date().toISOString().split("T")[0]}.pdf`;
              await savePdf(pdfBytes, filename);
            } catch (err) {
              console.error("Gagal membuat PDF:", err);
              alert("Gagal membuat laporan PDF.");
            }
          }}
        />
      )}

      {currentScreen === "beranda-pendamping" && (
        <BerandaPendamping
          activeProfile={activeProfile}
          allProfiles={allProfiles}
          fetchBerandaData={async (profileId) => getBerandaData(profileId)}
          fetchMissionDone={async (childRef) => getWeeklyMissionDone(childRef)}
          onToggleMission={async (childRef, index) => toggleWeeklyMission(childRef, index)}
          onSwitchProfile={(profileId) => {
            const p = allProfiles.find((x) => x.id === profileId);
            if (p) {
              setActiveProfile(p);
              setLatestResult(null);
            }
          }}
          onStartAdventure={(override) => {
            beginNewRun(override?.reason ?? null);
            navigate({ screen: "map", phase: null, skill: null, viewingSessionId: null });
          }}
          onOpenLatestStory={() => {
            setViewingSessionId(null);
            navigate({ screen: "dashboard-pendamping", phase: null, skill: null, viewingSessionId: null });
          }}
          onOpenHistory={() => navigate({ screen: "riwayat", phase: null, skill: null, viewingSessionId: null })}
          onOpenManage={() => navigate({ screen: "kelola", phase: null, skill: null, viewingSessionId: null })}
          onOpenTentang={() => navigate({ screen: "tentang", phase: null, skill: null, viewingSessionId: null })}
          onAddChild={() => navigate({ screen: "consent", phase: null, skill: null, viewingSessionId: null })}
          onToLanding={() => navigate({ screen: "landing", phase: null, skill: null, viewingSessionId: null })}
        />
      )}

      {currentScreen === "riwayat" && activeProfile && (
        <RiwayatLaporan
          activeProfile={activeProfile}
          onBack={() => goBack()}
          onOpenResult={(sessionId) => {
            navigate({ screen: "dashboard-pendamping", phase: null, skill: null, viewingSessionId: sessionId });
          }}
        />
      )}

      {currentScreen === "kelola" && (
        <ChildProfileManager
          refreshKey={refreshKey}
          activeProfileId={activeProfile?.id ?? null}
          onSwitchProfile={(profileId) => {
            const p = allProfiles.find((x) => x.id === profileId);
            if (p) {
              setActiveProfile(p);
              setLatestResult(null);
            }
          }}
          onAddChild={() => navigate({ screen: "consent", phase: null, skill: null, viewingSessionId: null })}
          onProfileDeleted={() => {
            void refreshProfiles().then((profiles) => {
              setActiveProfile((prevActive) => {
                if (profiles.length === 0) return null;
                if (prevActive && !profiles.find((p) => p.id === prevActive.id)) return profiles[0];
                return prevActive;
              });
            });
          }}
          onBack={() => goBack()}
        />
      )}

      {currentScreen === "tentang" && (
        <TentangPrivasi onBack={() => goBack()} />
      )}

    </>
  );
}
