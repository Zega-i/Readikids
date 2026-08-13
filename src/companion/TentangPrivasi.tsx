/**
 * ReadiKids AI — Halaman "Tentang & Privasi" (untuk Pendamping).
 *
 * Info dewasa (bukan Kid Mode). Menjelaskan sifat produk (skrining, bukan
 * diagnosis) dan cara data anak dijaga. Klaim privasi menyesuaikan kondisi
 * build: bila Supabase TIDAK dikonfigurasi, halaman menyatakan data 100% di
 * perangkat; bila aktif (hybrid), halaman jujur menyebut sinkronisasi agregat.
 */
import { CiloKancil } from "../components/CiloKancil";
import { isSupabaseConfigured } from "../../backend/supabaseClient";

interface TentangPrivasiProps {
  onBack: () => void;
}

/** Satu baris poin dengan ikon emoji + teks. */
const Poin = ({ icon, children }: { icon: string; children: React.ReactNode }): JSX.Element => (
  <li className="flex gap-3">
    <span className="text-lg leading-6 shrink-0" aria-hidden>
      {icon}
    </span>
    <span className="font-bold text-[#6b5a48] text-sm sm:text-[15px] leading-relaxed">{children}</span>
  </li>
);

export const TentangPrivasi = ({ onBack }: TentangPrivasiProps): JSX.Element => {
  return (
    <main className="relative w-full min-h-[100dvh] font-nunito flex flex-col bg-[#fff6e9] lg:bg-[linear-gradient(180deg,#bfe5f5_0%,#eaf7e0_100%)]">
      {/* Navbar — hanya desktop (HP pakai back button melayang, lihat bawah) */}
      <header className="hidden lg:flex bg-white h-14 items-center px-4 lg:px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
            <div className="w-full h-full transform scale-[0.12] origin-top-left -ml-1 -mt-1">
              <CiloKancil />
            </div>
          </div>
          <span className="font-black text-[#4a3728] text-lg tracking-tight">ReadiKids · Tentang</span>
        </div>
        <div className="ml-auto">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-full font-black text-xs sm:text-sm transition-colors text-[#6b5a48] hover:text-[#4a3728] cursor-pointer bg-[#f3e9d7] hover:bg-[#e8dfce]"
          >
            ← Kembali
          </button>
        </div>
      </header>

      {/* Konten */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-7">
        <div className="max-w-2xl mx-auto flex flex-col gap-5">
          {/* Back button melayang — hanya HP (desktop pakai navbar atas) */}
          <button
            type="button"
            onClick={onBack}
            aria-label="Kembali"
            className="lg:hidden w-11 h-11 rounded-full bg-white shadow-[0px_2px_8px_rgba(74,55,40,0.12)] flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
          >
            <span className="font-black text-2xl text-[#4a3728] leading-none -mt-0.5">←</span>
          </button>

          <div>
            <h1 className="font-black text-[#4a3728] text-3xl sm:text-4xl">Tentang &amp; Privasi 🌿</h1>
            <p className="font-bold text-[#6b5a48] text-base sm:text-lg mt-2">
              Bagaimana ReadiKids bekerja dan bagaimana data anak dijaga.
            </p>
          </div>

          {/* Kartu 1 — Apa itu ReadiKids */}
          <section className="bg-white rounded-3xl shadow-[0px_8px_24px_rgba(74,55,40,0.08)] p-6 sm:p-7">
            <h2 className="font-black text-[#4a3728] text-lg sm:text-xl mb-2">Apa itu ReadiKids</h2>
            <p className="font-bold text-[#6b5a48] text-sm sm:text-[15px] leading-relaxed">
              ReadiKids adalah alat <strong className="text-[#4a3728]">skrining awal</strong> perkembangan
              membaca untuk anak usia 6–9 tahun.{" "}
              <strong className="text-[#4a3728]">Bukan alat diagnosis medis dan bukan aplikasi edukasi.</strong>{" "}
              Hasilnya berupa pengamatan pola membaca untuk membantu pendamping menentukan langkah —
              kepastian hanya bisa diberikan oleh profesional.
            </p>
          </section>

          {/* Kartu 2 — Bagaimana data anak dijaga */}
          <section className="bg-white rounded-3xl shadow-[0px_8px_24px_rgba(74,55,40,0.08)] p-6 sm:p-7">
            <h2 className="font-black text-[#4a3728] text-lg sm:text-xl mb-3">Bagaimana data anak dijaga</h2>
            <ul className="flex flex-col gap-3">
              <Poin icon="🔒">
                Rekaman perilaku mentah anak (cara ia bermain, waktu reaksi) <strong className="text-[#4a3728]">tidak pernah meninggalkan perangkat ini</strong>.
              </Poin>
              <Poin icon="🧸">
                Tanpa nama asli anak — hanya <strong className="text-[#4a3728]">nama samaran</strong> pilihanmu.
              </Poin>

              {isSupabaseConfigured ? (
                <>
                  <Poin icon="☁️">
                    Yang tersimpan ke server hanya <strong className="text-[#4a3728]">ringkasan angka</strong> (skor
                    indikasi &amp; metrik agregat) sebagai cadangan — tanpa nama asli, tanpa rekaman mentah.
                  </Poin>
                  <Poin icon="👤">
                    Akun bersifat <strong className="text-[#4a3728]">anonim otomatis</strong> — tanpa email, tanpa
                    kata sandi. Tiap perangkat hanya bisa mengakses datanya sendiri.
                  </Poin>
                  <Poin icon="💡">
                    Saran pendampingan AI dibuat dari <strong className="text-[#4a3728]">angka agregat saja</strong> —
                    nama anak tidak pernah dikirim ke layanan AI.
                  </Poin>
                </>
              ) : (
                <Poin icon="📴">
                  Pada perangkat ini sinkronisasi tidak diaktifkan, sehingga{" "}
                  <strong className="text-[#4a3728]">seluruh data tetap 100% di perangkat</strong> dan tidak ada yang
                  dikirim ke internet.
                </Poin>
              )}

              <Poin icon="🗑️">
                Kamu bisa <strong className="text-[#4a3728]">menghapus seluruh data seorang anak</strong> kapan saja
                lewat menu Kelola.
              </Poin>
            </ul>

            <p className="font-bold text-[#8a7a66] text-[13px] leading-relaxed mt-4 pt-4 border-t border-[#f3e9d7]">
              ReadiKids berjalan penuh bahkan tanpa internet; sinkronisasi &amp; saran AI adalah lapisan
              opsional. Dirancang selaras dengan prinsip COPPA &amp; GDPR untuk data anak.
            </p>
          </section>
        </div>
      </div>

      {/* Strip disclaimer — sama persis dengan Beranda (menempel di bawah) */}
      <footer className="bg-[#f3e9d7] py-3 px-4 lg:py-3.5 lg:px-6 shrink-0">
        <p className="font-bold text-[#6b5a48] text-center max-w-4xl mx-auto text-xs lg:text-[13px]">
          <span className="lg:hidden">Skrining awal · bukan alat diagnosis</span>
          <span className="hidden lg:inline">ReadiKids adalah skrining awal, bukan alat diagnosis — kepastian hanya dari profesional.</span>
        </p>
      </footer>
    </main>
  );
};

export default TentangPrivasi;
