import { useEffect, useState } from "react";
import LandingPage from "./pages/LandingPage";
import ParentConsentCilo from "./onboarding/ParentConsentCilo";
import PetaDuniaAnak from "./game/MapAdventureCilo";
import HutanHurufGame from "./game/HutanHuruf";
import HutanSelesai from "./game/HutanHuruf/HutanSelesai";
import { TrialEvent as HutanTrialEvent } from "./game/HutanHuruf";

// Import Bukit Angka
import BukitAngkaGame from "./game/BukitAngka";
import BukitSelesai from "./game/BukitAngka/BukitSelesai";
import PuncakBintang from "./game/PuncakBintang";
import CiloMenulisCerita from "./game/CiloMenulisCerita";
import { NumberLineTrialEvent } from "./game/BukitAngka";

// Import Sungai Bunyi (PhonicsGame) yang baru dibuat
import SungaiBunyiGame from "./game/SungaiBunyi";
import SungaiSelesai from "./game/SungaiBunyi/SungaiSelesai";
import { PhonicsTrialEvent } from "./game/SungaiBunyi";

import BerandaPendamping from "./companion/BerandaPendamping";
import CompanionDashboard from "./companion/CompanionDashboard";
import type { ScreeningResult } from "./companion/CompanionDashboard";
import { buildReferralReportPdf } from "./referral/reportPdf";

import ChildProfileManager from "./companion/ChildProfileManager";
import RiwayatLaporan from "./companion/RiwayatLaporan";
import TentangPrivasi from "./companion/TentangPrivasi";
import type { ChildProfile } from "./types/telemetry";

// Pipeline nyata (menggantikan data dummy)
import { runScreeningPipeline } from "./game/resultsPipeline";
import { getBerandaData, getLatestScreeningResult, getWeeklyMissionDone, toggleWeeklyMission } from "./companion/dashboardData";
import { listChildProfiles } from "./profiles/childProfileService";

export default function App() {
  // Tambahkan "sungai-bunyi" ke tipe currentScreen
  const [currentScreen, setCurrentScreen] = useState<"landing" | "consent" | "map" | "hutan-huruf" | "hutan-selesai" | "sungai-bunyi" | "sungai-selesai" | "bukit-angka" | "bukit-selesai" | "penutup" | "cilo-menulis" | "dashboard-pendamping" | "beranda-pendamping" | "kelola" | "riwayat" | "tentang">("landing");
  const [activeProfile, setActiveProfile] = useState<ChildProfile | null>(null);
  const [currentWorldIndex, setCurrentWorldIndex] = useState(0);

  // Data mentah tiap game dalam satu rangkaian petualangan + hasil akhirnya.
  const [hutanData, setHutanData] = useState<HutanTrialEvent[] | null>(null);
  const [sungaiData, setSungaiData] = useState<PhonicsTrialEvent[] | null>(null);
  const [bukitData, setBukitData] = useState<NumberLineTrialEvent[] | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [latestResult, setLatestResult] = useState<ScreeningResult | null>(null);
  // Tambahkan state untuk mengingat sesi mana yang sedang dibuka di dashboard-pendamping
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);
  const [cooldownOverrideReason, setCooldownOverrideReason] = useState<string | null>(null);

  // Daftar profil anak nyata dari IndexedDB (menggantikan data hardcoded).
  const [allProfiles, setAllProfiles] = useState<ChildProfile[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Muat profil saat aplikasi dibuka; pilih profil pertama sebagai aktif.
  useEffect(() => {
    listChildProfiles()
      .then((ps) => {
        setAllProfiles(ps);
        setActiveProfile((cur) => cur ?? ps[0] ?? null);
      })
      .catch((err) => console.error("[App] gagal memuat profil:", err));
  }, []);

  // Minta penyimpanan permanen agar data on-device tak mudah dihapus browser
  // (mengurangi risiko eviksi otomatis, mis. Safari 7 hari bila belum dipasang).
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

  const refreshProfiles = async (): Promise<ChildProfile[]> => {
    const ps = await listChildProfiles();
    setAllProfiles(ps);
    return ps;
  };

  // Mulai satu rangkaian skrining baru: catat waktu mulai, kosongkan data lama.
  const beginNewRun = (overrideReason: string | null = null) => {
    setRunStartedAt(Date.now());
    setHutanData(null);
    setSungaiData(null);
    setBukitData(null);
    setLatestResult(null);
    setCurrentWorldIndex(0);
    setCooldownOverrideReason(overrideReason);
  };

  const handleStartFromLanding = async () => {
    // Baca profil SEGAR dari DB saat diklik (hindari race: bila profil belum
    // sempat termuat saat mount, cek langsung agar tak salah arah ke consent).
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

  const handleEnterWorld = (worldId: string) => {
    if (worldId === "hutan-huruf") {
      setCurrentScreen("hutan-huruf");
    } else if (worldId === "sungai-bunyi") {
      setCurrentScreen("sungai-bunyi");
    } else if (worldId === "bukit-angka") {
      setCurrentScreen("bukit-angka");
    } else if (worldId === "puncak-bintang") {
      // Puncak Bintang bukan game — ini tujuan akhir / layar penutup selebrasi.
      setCurrentScreen("penutup");
    } else {
      alert(`Fitur ${worldId} belum tersedia.`);
    }
  };

  const handleHutanHurufComplete = (telemetry: HutanTrialEvent[]) => {
    setHutanData(telemetry);
    setCurrentWorldIndex(1); // Buka dunia berikutnya
    setCurrentScreen("hutan-selesai");
  };

  const handleSungaiBunyiComplete = (telemetry: PhonicsTrialEvent[]) => {
    setSungaiData(telemetry);
    setCurrentWorldIndex(2); // Buka dunia berikutnya (Bukit Angka)
    setCurrentScreen("sungai-selesai");
  };

  const handleBukitAngkaComplete = (telemetry: NumberLineTrialEvent[]) => {
    setBukitData(telemetry);
    setCurrentWorldIndex(3); // Buka dunia terakhir (Puncak Bintang)
    setCurrentScreen("bukit-selesai");
  };

  return (
    <>
      {currentScreen === "landing" && (
        <LandingPage
          onStart={handleStartFromLanding}
        />
      )}

      {currentScreen === "consent" && (
        <ParentConsentCilo
          onCreated={handleProfileCreated}
          onCancel={() => {
            if (allProfiles.length > 0) {
              setCurrentScreen("beranda-pendamping");
            } else {
              setCurrentScreen("landing");
            }
          }}
        />
      )}

      {currentScreen === "map" && (
        <PetaDuniaAnak
          currentWorldIndex={currentWorldIndex}
          onEnterWorld={handleEnterWorld}
          onBackToDashboard={() => setCurrentScreen("beranda-pendamping")}
        />
      )}

      {currentScreen === "hutan-huruf" && (
        <HutanHurufGame
          onComplete={handleHutanHurufComplete}
          onBack={() => setCurrentScreen("map")}
        />
      )}

      {currentScreen === "hutan-selesai" && (
        // Tombol "LANJUT KE SUNGAI BUNYI ->" akan memanggil ini
        <HutanSelesai onNext={() => setCurrentScreen("map")} />
      )}

      {currentScreen === "sungai-selesai" && (
        <SungaiSelesai onNext={() => setCurrentScreen("map")} />
      )}

      {currentScreen === "bukit-angka" && (
        <BukitAngkaGame
          onComplete={handleBukitAngkaComplete}
          onBack={() => setCurrentScreen("map")}
        />
      )}

      {currentScreen === "bukit-selesai" && (
        <BukitSelesai onNext={() => setCurrentScreen("penutup")} />
      )}

      {currentScreen === "penutup" && (
        <PuncakBintang
          onOpenStory={() => setCurrentScreen("cilo-menulis")}
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
              hutan: hutanData ?? [],
              sungai: sungaiData ?? [],
              bukit: bukitData ?? [],
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
            // Jika ada sessionId yang spesifik sedang dibuka (dari riwayat)
            if (viewingSessionId) {
              const { getAllScreeningResults } = await import("./companion/dashboardData");
              const results = await getAllScreeningResults(profileId);
              return results.find(r => r.sessionId === viewingSessionId) || null;
            }

            // Hasil dari sesi yang baru saja dimainkan (di memori) bila ada,
            // dan pastikan hasil in-memory tersebut milik profil yang sedang aktif.
            if (latestResult && latestResult.childName === activeProfile.pseudonym) {
              return latestResult;
            }
            return getLatestScreeningResult(profileId);
          }}
          onStartNext={() => {
            if (viewingSessionId) {
              setCurrentScreen("riwayat");
            } else {
              setCurrentScreen("beranda-pendamping");
            }
            setViewingSessionId(null);
          }}
          nextButtonText={viewingSessionId ? "← Kembali ke Riwayat" : undefined}
          onSavePDF={async (result) => {
            try {
              const pdfBytes = await buildReferralReportPdf({
                child: activeProfile,
                assessment: {
                  sessionId: result.sessionId,
                  childRef: activeProfile.id,
                  createdAt: Date.now(),
                  compositeScore: result.assessment.compositeScore,
                  level: result.assessment.level,
                  breakdown: result.assessment.breakdown,
                  domains: result.assessment.domains,
                  metrics: result.assessment.metrics,
                },
                history: [],
                plan: result.plan
              });
              // Cast pdfBytes to any or ArrayBuffer to satisfy Blob constructor
              const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
              const url = URL.createObjectURL(blob);

              const link = document.createElement("a");
              link.href = url;
              link.download = `Laporan_ReadiKids_${activeProfile.pseudonym}_${new Date().toISOString().split("T")[0]}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
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
            void refreshProfiles().then(profiles => {
              setActiveProfile(prevActive => {
                if (profiles.length === 0) return null;
                if (prevActive && !profiles.find(p => p.id === prevActive.id)) {
                  return profiles[0];
                }
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

      {currentScreen === "sungai-bunyi" && (
        <SungaiBunyiGame
          onComplete={handleSungaiBunyiComplete}
          onBack={() => setCurrentScreen("map")}
        />
      )}
    </>
  );
}