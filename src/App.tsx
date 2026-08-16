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

import ChildProfileManager from "./companion/ChildProfileManager";
import RiwayatLaporan from "./companion/RiwayatLaporan";
import TentangPrivasi from "./companion/TentangPrivasi";
import { type ChildProfile, type PhaseId, type SkillId, type TrialRecord } from "./types/telemetry";

import { runScreeningPipeline } from "./game/resultsPipeline";
import { getAllScreeningResults, getBerandaData, getLatestScreeningResult, getWeeklyMissionDone, toggleWeeklyMission } from "./companion/dashboardData";
import { listChildProfiles } from "./profiles/childProfileService";
import { warmUpNativeTTS } from "./utils/tts";
import { savePdf } from "./utils/savePdf";

const LAST_PHASE = WORLDS[WORLDS.length - 1].phase;

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<
    | "landing" | "consent" | "map" | "world-hub" | "game" | "penutup" | "cilo-menulis"
    | "dashboard-pendamping" | "beranda-pendamping" | "kelola" | "riwayat" | "tentang"
  >("landing");
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
      setCurrentScreen("beranda-pendamping");
    } else {
      setCurrentScreen("consent");
    }
  };

  const handleProfileCreated = (profile: ChildProfile) => {
    setActiveProfile(profile);
    setAllProfiles((prev) => [...prev, profile]);
    setRefreshKey((k) => k + 1);
    beginNewRun();
    setCurrentScreen("map");
  };

  // ── Navigasi petualangan ──
  const enterWorld = (phase: PhaseId) => {
    setActivePhase(phase);
    setCurrentScreen("world-hub");
  };

  const selectGame = (skillId: SkillId) => {
    // Game yang sudah selesai TIDAK boleh diulang dalam satu sesi
    // (mencegah trial duplikat yang mencemari hasil skrining).
    if (completedSkills.has(skillId)) return;
    setActiveSkill(skillId);
    setCurrentScreen("game");
  };

  const handleGameComplete = (trials: TrialRecord[]) => {
    setRunTrials((prev) => [...prev, ...trials]);
    if (activeSkill) {
      setCompletedSkills((prev) => new Set(prev).add(activeSkill));
    }
    setActiveSkill(null);
    setCurrentScreen("world-hub");
  };

  const finishWorld = () => {
    if (activePhase === null) return;
    // Buka dunia berikutnya.
    setCurrentWorldIndex((i) => Math.max(i, activePhase + 1));
    if (activePhase >= LAST_PHASE) {
      setCurrentScreen("penutup"); // semua dunia selesai → selebrasi lalu hasil
    } else {
      setCurrentScreen("map");
    }
  };

  const activeAccent = activePhase !== null ? WORLDS.find((w) => w.phase === activePhase)?.accent : undefined;

  return (
    <>
      {currentScreen === "landing" && (
        <LandingPage onStart={handleStartFromLanding} />
      )}

      {currentScreen === "consent" && (
        <ParentConsentCilo
          onCreated={handleProfileCreated}
          onCancel={() => {
            if (allProfiles.length > 0) setCurrentScreen("beranda-pendamping");
            else setCurrentScreen("landing");
          }}
        />
      )}

      {currentScreen === "map" && (
        <WorldMap
          currentWorldIndex={currentWorldIndex}
          onEnterWorld={enterWorld}
          onBackToDashboard={() => setCurrentScreen("beranda-pendamping")}
        />
      )}

      {currentScreen === "world-hub" && activePhase !== null && (
        <WorldHub
          phase={activePhase}
          completedSkills={completedSkills}
          onSelectGame={selectGame}
          onFinishWorld={finishWorld}
          onBack={() => setCurrentScreen("map")}
        />
      )}

      {currentScreen === "game" && activeSkill && (
        <GameHost
          skillId={activeSkill}
          accent={activeAccent}
          onComplete={handleGameComplete}
          onBack={() => setCurrentScreen("world-hub")}
        />
      )}

      {currentScreen === "penutup" && (
        <PuncakBintang onOpenStory={() => setCurrentScreen("cilo-menulis")} />
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
          onDone={() => setCurrentScreen("dashboard-pendamping")}
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
            if (viewingSessionId) setCurrentScreen("riwayat");
            else setCurrentScreen("beranda-pendamping");
            setViewingSessionId(null);
          }}
          nextButtonText={viewingSessionId ? "← Kembali ke Riwayat" : undefined}
          onSavePDF={async (result) => {
            try {
              const { computeSessionCarbon } = await import("./companion/CarbonFootprint");
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
            setCurrentScreen("map");
          }}
          onOpenLatestStory={() => {
            setViewingSessionId(null);
            setCurrentScreen("dashboard-pendamping");
          }}
          onOpenHistory={() => setCurrentScreen("riwayat")}
          onOpenManage={() => setCurrentScreen("kelola")}
          onOpenTentang={() => setCurrentScreen("tentang")}
          onAddChild={() => setCurrentScreen("consent")}
          onToLanding={() => setCurrentScreen("landing")}
        />
      )}

      {currentScreen === "riwayat" && activeProfile && (
        <RiwayatLaporan
          activeProfile={activeProfile}
          onBack={() => setCurrentScreen("beranda-pendamping")}
          onOpenResult={(sessionId) => {
            setViewingSessionId(sessionId);
            setCurrentScreen("dashboard-pendamping");
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
          onAddChild={() => setCurrentScreen("consent")}
          onProfileDeleted={() => {
            void refreshProfiles().then((profiles) => {
              setActiveProfile((prevActive) => {
                if (profiles.length === 0) return null;
                if (prevActive && !profiles.find((p) => p.id === prevActive.id)) return profiles[0];
                return prevActive;
              });
            });
          }}
          onBack={() => setCurrentScreen("beranda-pendamping")}
        />
      )}

      {currentScreen === "tentang" && (
        <TentangPrivasi onBack={() => setCurrentScreen("beranda-pendamping")} />
      )}

    </>
  );
}
