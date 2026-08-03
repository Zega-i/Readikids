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
import ChildProfileManager from "./companion/ChildProfileManager";
import type { ChildProfile } from "./types/telemetry";

// Pipeline nyata (menggantikan data dummy)
import { runScreeningPipeline } from "./game/resultsPipeline";
import { getBerandaData, getLatestScreeningResult } from "./companion/dashboardData";
import { listChildProfiles } from "./profiles/childProfileService";

export default function App() {
  // Tambahkan "sungai-bunyi" ke tipe currentScreen
  const [currentScreen, setCurrentScreen] = useState<"landing" | "consent" | "map" | "hutan-huruf" | "hutan-selesai" | "sungai-bunyi" | "sungai-selesai" | "bukit-angka" | "bukit-selesai" | "penutup" | "cilo-menulis" | "dashboard-pendamping" | "beranda-pendamping" | "kelola">("landing");
  const [activeProfile, setActiveProfile] = useState<ChildProfile | null>(null);
  const [currentWorldIndex, setCurrentWorldIndex] = useState(0);

  // Data mentah tiap game dalam satu rangkaian petualangan + hasil akhirnya.
  const [hutanData, setHutanData] = useState<HutanTrialEvent[] | null>(null);
  const [sungaiData, setSungaiData] = useState<PhonicsTrialEvent[] | null>(null);
  const [bukitData, setBukitData] = useState<NumberLineTrialEvent[] | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [latestResult, setLatestResult] = useState<ScreeningResult | null>(null);

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

  const refreshProfiles = async (): Promise<ChildProfile[]> => {
    const ps = await listChildProfiles();
    setAllProfiles(ps);
    return ps;
  };

  // Mulai satu rangkaian skrining baru: catat waktu mulai, kosongkan data lama.
  const beginNewRun = () => {
    setRunStartedAt(Date.now());
    setHutanData(null);
    setSungaiData(null);
    setBukitData(null);
    setCurrentWorldIndex(0);
  };

  const handleStartFromLanding = () => {
    // Jika sudah ada profil tersimpan di perangkat -> langsung ke Beranda.
    // Jika belum ada sama sekali -> buat profil pertama lewat consent.
    if (allProfiles.length > 0) {
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
          onCancel={() => setCurrentScreen("landing")}
        />
      )}

      {currentScreen === "map" && (
        <PetaDuniaAnak
          currentWorldIndex={currentWorldIndex}
          onEnterWorld={handleEnterWorld}
          onBackToConsent={() => setCurrentScreen("beranda-pendamping")}
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
            // Hasil dari sesi yang baru saja dimainkan (di memori) bila ada,
            // jika tidak baca hasil terakhir dari IndexedDB.
            if (latestResult) return latestResult;
            return getLatestScreeningResult(profileId);
          }}
          onStartNext={() => setCurrentScreen("beranda-pendamping")}
        />
      )}

      {currentScreen === "beranda-pendamping" && activeProfile && (
        <BerandaPendamping
          activeProfile={activeProfile}
          allProfiles={allProfiles}
          fetchBerandaData={async (profileId) => getBerandaData(profileId)}
          onSwitchProfile={(profileId) => {
            const p = allProfiles.find((x) => x.id === profileId);
            if (p) setActiveProfile(p);
          }}
          onStartAdventure={(override) => {
            if (override) console.log("Override reason:", override.reason);
            beginNewRun();
            setCurrentScreen("map");
          }}
          onOpenLatestStory={() => setCurrentScreen("dashboard-pendamping")}
          onOpenHistory={() => alert("Fitur Riwayat Segera Hadir")}
          onOpenManage={() => setCurrentScreen("kelola")}
          onAddChild={() => setCurrentScreen("consent")}
          onToLanding={() => setCurrentScreen("landing")}
        />
      )}

      {currentScreen === "kelola" && (
        <ChildProfileManager
          refreshKey={refreshKey}
          onSelect={(p) => {
            setActiveProfile(p);
            void refreshProfiles();
            setCurrentScreen("beranda-pendamping");
          }}
          onAddChild={() => setCurrentScreen("consent")}
        />
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