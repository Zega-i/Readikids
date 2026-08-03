import { ReactNode } from "react";

export function HutanBackground({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-[#EAF7E0] overflow-hidden">
      {/* Background Decorator / Pohon-Pohon Hutan (Statis) */}
      <div className="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
        {/* Awan Kiri */}
        <div className="absolute top-[8%] left-[10%] w-[100px] h-[30px] bg-white rounded-full opacity-80" />
        {/* Awan Kanan */}
        <div className="absolute top-[12%] right-[15%] w-[80px] h-[24px] bg-white rounded-full opacity-70" />

        {/* Bukit Latar Belakang */}
        <div className="absolute inset-x-0 bottom-0 h-[40%] bg-[#8fcf74] rounded-t-[100px] opacity-30" />
        <div className="absolute inset-x-0 bottom-0 h-[25%] bg-[#6dbb57] rounded-t-[80px] opacity-40" />

        {/* Pohon Sederhana Kiri */}
        <div className="absolute bottom-[20%] left-[5%]">
          <div className="w-[30px] h-[60px] bg-[#8a5a2b] mx-auto rounded-sm" />
          <div className="w-[100px] h-[100px] bg-[#3e8e5a] rounded-full -mt-[80px]" />
        </div>

        {/* Pohon Sederhana Kanan */}
        <div className="absolute bottom-[10%] right-[10%]">
          <div className="w-[40px] h-[80px] bg-[#8a5a2b] mx-auto rounded-sm" />
          <div className="w-[120px] h-[120px] bg-[#5ea74a] rounded-full -mt-[90px]" />
        </div>
      </div>

      {/* Konten Utama Game di atas background */}
      <div className="relative z-10 w-full h-full flex flex-col font-kid text-[#4a3728]">
        {children}
      </div>
    </div>
  );
}