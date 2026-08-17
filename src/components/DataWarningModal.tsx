/**
 * DataWarningModal — Pop-out peringatan penyimpanan data lokal.
 *
 * Muncul setiap kali belum ada profil anak tersimpan di perangkat. Setelah
 * profil pertama tersimpan, komponen panggil (LandingPage) berhenti membuka
 * modal ini lewat prop `hasExistingData`. Modal ini presentasional murni.
 */

interface DataWarningModalProps {
  open: boolean;
  onAccept: () => void;
}

export default function DataWarningModal({ open, onAccept }: DataWarningModalProps): JSX.Element | null {
  if (!open) return null;

  return (
    <>
      {/* Keyframes fadeInUp — dipakai animate-[fadeInUp_0.3s_ease-out] pada kartu. */}
      <style>{`
        @keyframes fadeInUp {
          0%   { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-warning-title"
      >
      {/* Backdrop gelap polos — tanpa backdrop-blur (menghemat GPU & mencegah
          bug rendering WebView di belakangnya; lihat penjelasan modal). */}
      <div
        className="absolute inset-0 bg-black/45"
        aria-hidden="true"
      />

      {/* Card */}
      <div className="relative bg-white rounded-[20px] shadow-2xl max-w-[360px] w-full px-6 py-7 flex flex-col items-center gap-4 animate-[fadeInUp_0.3s_ease-out]">
        {/* Icon */}
        <div className="w-[52px] h-[52px] rounded-full bg-[#fef6e0] flex items-center justify-center">
          <span className="text-2xl" role="img" aria-label="perangkat">📱</span>
        </div>

        {/* Judul */}
        <h2
          id="data-warning-title"
          className="font-black text-lg text-[#2a2a2a] text-center leading-tight"
        >
          Data Tersimpan di Perangkat Ini
        </h2>

        {/* Penjelasan */}
        <p className="text-[13.5px] text-[#555] text-center leading-[20px]">
          Semua data anak (profil, hasil skrining, riwayat) hanya tersimpan
          di perangkat ini.
        </p>
        <p className="text-[13.5px] text-[#555] text-center leading-[20px] -mt-2">
          Jika Anda menghapus aplikasi, membersihkan cache browser, atau
          menggunakan perangkat lain, data tidak dapat dipindahkan dan akan hilang.
        </p>

        {/* Tip box */}
        <div className="w-full bg-[#f0f7ed] rounded-xl px-3.5 py-3 flex items-start gap-2">
          <span className="text-base leading-none mt-0.5" role="img" aria-label="tips">💡</span>
          <span className="text-xs font-semibold text-[#2f5b23] leading-[17px]">
            Gunakan fitur Simpan PDF untuk menyimpan hasil skrining sebelum
            menghapus aplikasi.
          </span>
        </div>

        {/* Tombol */}
        <button
          type="button"
          onClick={onAccept}
          className="w-full py-3.5 rounded-[14px] bg-[#4a903c] text-white font-black text-[15px] tracking-wide transition-transform active:scale-95 shadow-md"
        >
          Saya Mengerti
        </button>
      </div>
      </div>
    </>
  );
}
