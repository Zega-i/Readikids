const STEPS = [
  {
    number: '1',
    circle: 'bg-[#4dd8ff]',
    title: '👨‍👩‍👧 izin orang tua',
    desc: '30 detik, tanpa akun',
  },
  {
    number: '2',
    circle: 'bg-[#ff6bd6]',
    title: '🧒 anak bertualang',
    desc: '3 planet · ±15 menit',
  },
  {
    number: '3',
    circle: 'bg-[#3df0b2]',
    title: '📡 transmisi hasil',
    desc: 'saran pendampingan utk Anda',
  },
];

export function Steps() {
  return (
    <footer className="relative z-10 w-full max-w-[1280px] mx-auto px-6 lg:px-[90px] pb-[50px] lg:pb-[90px]">
      <div className="w-full lg:w-[1100px] bg-[#ffffff0f] rounded-3xl border-[1.5px] border-solid border-[#ffffff26] p-6 lg:px-[40px] lg:py-[36px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 items-center">
          {STEPS.map((step) => (
            <article key={step.number} className="flex items-center gap-4">
              <span
                className={`w-[38px] h-[38px] rounded-[19px] ${step.circle} flex items-center justify-center font-nunito-black text-[#141b3f] text-lg leading-[normal] shrink-0`}
                aria-hidden="true"
              >
                {step.number}
              </span>
              <div>
                <h2 className="font-nunito-black text-white text-base tracking-[0] leading-[normal] mb-1">
                  {step.title}
                </h2>
                <p className="font-nunito-bold text-[#9aa4c7] text-[12.5px] tracking-[0] leading-[normal] m-0">
                  {step.desc}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </footer>
  );
}
