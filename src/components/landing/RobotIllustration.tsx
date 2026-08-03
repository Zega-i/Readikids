export function RobotIllustration() {
  return (
    <figure
      className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] rounded-[170px] bg-[#222b5c] shadow-[0_0_40px_rgba(255,107,214,0.65)] shrink-0 mx-auto lg:mx-0"
      aria-label="Robot BIP"
    >
      <div className="absolute top-[80px] left-[70px] w-[192px] h-[160px] bg-[#e8ecf7] rounded-[48px] shadow-[0_0_41.6px_rgba(77,216,255,0.65)] origin-top-left scale-[0.82] sm:scale-100" />
      <div className="absolute top-[102px] left-[92px] w-[147px] h-[83px] bg-[#141b3f] rounded-[28.8px] origin-top-left scale-[0.82] sm:scale-100" />

      {/* Eyes */}
      <div className="absolute top-[141px] left-[121px] w-[26px] h-[35px] bg-[#4dd8ff] rounded-[12.8px/17.6px] origin-top-left scale-[0.82] sm:scale-100" />
      <div className="absolute top-[141px] left-[182px] w-[26px] h-[35px] bg-[#4dd8ff] rounded-[12.8px/17.6px] origin-top-left scale-[0.82] sm:scale-100" />

      {/* Antenna */}
      <div className="absolute top-[48px] left-[163px] w-1.5 h-[35px] bg-[#e8ecf7] origin-top-left scale-[0.82] sm:scale-100" />
      <div className="absolute top-[29px] left-[155px] w-[22px] h-[22px] bg-[#ff6bd6] rounded-[11.2px] origin-top-left scale-[0.82] sm:scale-100" />
    </figure>
  );
}
