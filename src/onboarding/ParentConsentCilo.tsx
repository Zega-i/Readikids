import { FormEvent, useState } from "react";
import { createChildProfile } from "../profiles/childProfileService";
import type { ChildProfile } from "../types/telemetry";
import { CiloKancil } from "../components/CiloKancil";

const permissionItems = [
  {
    icon: "⏱",
    title: "±15 menit",
    description: "sekali jalan, tanpa jeda",
  },
  {
    icon: "🔒",
    title: "data di perangkat ini",
    description: "tanpa akun · bisa dihapus kapan pun",
  },
  {
    icon: "🌱",
    title: "indikasi awal",
    description: "bukan diagnosis — hanya peta pendampingan",
  },
];

const ages = [6, 7, 8, 9];

interface IzinSerahLayarProps {
  onCreated: (profile: ChildProfile) => void;
  onCancel: () => void;
}

export default function ParentConsentCilo({ onCreated, onCancel }: IzinSerahLayarProps): JSX.Element {
  const [name, setName] = useState("");
  const [selectedAge, setSelectedAge] = useState(6);
  const [hasConsent, setHasConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasConsent || !name.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const profile = await createChildProfile({ pseudonym: name, ageYears: selectedAge, consentGiven: true });
      onCreated(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat profil.");
      setSaving(false);
    }
  };

  return (
    <main
      className="h-[100dvh] max-h-screen w-full relative overflow-hidden font-nunito flex flex-col justify-between bg-[linear-gradient(180deg,rgba(191,229,245,1)_0%,rgba(234,247,224,1)_100%)] text-[#4a3728]"
      aria-label="Parent Consent Page"
    >
      {/* Header Navigasi */}
      <header className="w-full max-w-7xl mx-auto px-4 py-2 sm:py-3 flex items-center justify-between z-20">
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          {/* Cilo Bear Mini */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 relative flex items-center justify-center shrink-0">
            <div className="w-full h-full transform scale-[0.12] origin-top-left -ml-1 -mt-1">
              <CiloKancil />
            </div>
          </div>
          <span className="font-black text-sm sm:text-base tracking-tight text-[#4a3728]">
            ReadiKids
          </span>
        </div>

        {/* Action Right */}
        <div className="flex items-center justify-end gap-3 sm:gap-4 pr-3 lg:pr-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-full font-black text-xs sm:text-sm transition-colors text-[#6b5a48] hover:text-[#4a3728] cursor-pointer"
          >
            ← Kembali
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="w-full max-w-6xl mx-auto px-2 my-auto z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center h-full">

        {/* Kolom Kiri: Poin Izin & Maskot Cilo */}
        <div className="lg:col-span-6 flex flex-col gap-2.5">
          <div>
            <span className="font-black text-[#3e8e5a] text-[11px] sm:text-xs tracking-wider uppercase">
              IZIN ORANG TUA · 30 DETIK
            </span>
            <h1 className="font-black text-2xl sm:text-3xl text-[#4a3728] tracking-tight leading-tight mt-0.5">
              Sebentar, Orang Tua 👋
            </h1>
            <p className="font-bold text-[#6b5a48] text-xs sm:text-sm mt-0.5">
              Tiga hal penting. Setelah ini, layar diserahkan ke si kecil.
            </p>
          </div>

          {/* Cards Informasi */}
          <div className="flex flex-col gap-2 mt-0.5">
            {permissionItems.map((item) => (
              <div
                key={item.title}
                className="bg-[#fff6e9] rounded-[16px] border-3 sm:border-4 border-solid border-white p-2.5 sm:p-3 shadow-[0px_3px_8px_#4a37282e] flex items-center gap-3 transition-transform hover:-translate-y-0.5"
              >
                <div className="text-xl sm:text-2xl shrink-0 p-1.5 bg-white/60 rounded-lg">
                  {item.icon}
                </div>
                <div>
                  <h2 className="font-black text-[#4a3728] text-sm sm:text-base leading-tight">
                    {item.title}
                  </h2>
                  <p className="font-bold text-[#6b5a48] text-[11px] sm:text-xs mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Maskot Cilo Besar (Di-scale proporsional agar tidak memakan tinggi halaman) */}
          <div className="hidden lg:flex justify-center mt-2 -mb-10 pointer-events-none transform scale-[0.65] origin-top">
            <CiloKancil />
          </div>
        </div>

        {/* Kolom Kanan: Form Persetujuan */}
        <div className="lg:col-span-6 flex flex-col items-center justify-start -mt-8 sm:-mt-12 lg:-mt-16 relative z-20">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-white rounded-3xl border-4 border-solid border-white px-6 py-5 sm:px-8 sm:py-6 shadow-[0px_6px_16px_#4a37282e] flex flex-col gap-4 sm:gap-5"
          >
            {/* Input Nama */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="child-name"
                className="font-black text-[#4a3728] text-base sm:text-lg"
              >
                siapa yang main?
              </label>
              <div className="bg-[#fff6e9] p-3.5 sm:p-4 rounded-xl flex flex-col justify-center">
                <input
                  id="child-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={30}
                  className="font-black text-[#4a3728] text-lg sm:text-xl bg-transparent border-none outline-none w-full placeholder:text-[#a69888]"
                  placeholder="nama panggilan"
                  required
                />
              </div>
            </div>

            {/* Pilihan Usia */}
            <fieldset className="flex flex-col gap-1">
              <legend className="font-black text-[#6b5a48] text-[11px] sm:text-xs tracking-wider uppercase mb-0.5">
                USIA (6–9)
              </legend>
              <div className="flex justify-center gap-3 sm:gap-4">
                {ages.map((age) => {
                  const isSelected = selectedAge === age;
                  return (
                    <button
                      key={age}
                      type="button"
                      onClick={() => setSelectedAge(age)}
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-3 sm:border-4 border-solid border-white font-black text-xl sm:text-2xl transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-[#ffd34d] text-[#4a3728] shadow-[0px_3px_8px_#4a37282e] scale-110"
                          : "bg-[#fff6e9] text-[#4a3728] hover:bg-[#fcefdc]"
                      }`}
                    >
                      {age}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Checkbox Persetujuan */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none my-0.5">
              <input
                type="checkbox"
                checked={hasConsent}
                onChange={(e) => setHasConsent(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-6 h-6 rounded-md border-2 border-solid flex items-center justify-center shrink-0 transition-colors ${
                  hasConsent
                    ? "bg-[#3e8e5a] border-[#3e8e5a]"
                    : "bg-[#fff6e9] border-[#6b5a48]"
                }`}
              >
                {hasConsent && (
                  <span className="font-black text-white text-sm leading-none">
                    ✓
                  </span>
                )}
              </div>
              <span className="font-bold text-[#4a3728] text-xs sm:text-sm">
                saya orang tua/wali & menyetujui
              </span>
            </label>

            {error && (
              <p className="text-xs font-bold text-red-600 bg-red-50 p-2 rounded border border-red-200 text-center">
                {error}
              </p>
            )}

            {/* Tombol Serahkan Layar */}
            <button
              type="submit"
              disabled={!hasConsent || !name.trim() || saving}
              className="w-full py-3.5 sm:py-4 mt-1 bg-[#3e8e5a] hover:bg-[#34784c] disabled:opacity-50 rounded-full border-3 sm:border-4 border-solid border-white font-black text-white text-base sm:text-lg tracking-wide shadow-md active:scale-95 transition-all cursor-pointer uppercase"
            >
              {saving
                ? "Menyimpan..."
                : name.trim()
                ? `Serahkan Layar ke ${name.trim()} 🎈`
                : "Isi nama panggilan dulu"}
            </button>

            <p className="font-bold text-[#6b5a48] text-[11px] text-center">
              data & hasil bisa dihapus kapan pun di menu Kelola
            </p>
          </form>
        </div>

      </div>
    </main>
  );
}
