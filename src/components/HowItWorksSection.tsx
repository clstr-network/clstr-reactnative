const steps = [
  {
    step: "01",
    title: "Sign up with your college email",
    description: "Your college domain defines your network. Only verified students and alumni can join.",
    bgColor: "bg-[#9945FF]",
  },
  {
    step: "02",
    title: "Enter your college space",
    description: "Get placed inside your private college network. Only students & alumni from your college are visible.",
    bgColor: "bg-solana-pink",
  },
  {
    step: "03",
    title: "Connect, share, and interact",
    description: "Posts, reels, clubs, events, discussions — everything happens within your college community.",
    bgColor: "bg-solana-yellow",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="w-full bg-background py-20 md:py-32 px-4 relative overflow-hidden">
      {/* Top decorative elements - smaller on mobile */}
      <div className="absolute top-[5%] left-[10%] w-2 h-2 md:w-4 md:h-4 bg-[#14F195] rotate-45" />
      <div className="absolute top-[8%] right-[15%] w-2.5 h-2.5 md:w-5 md:h-5 bg-[#ff930f] rounded-full" />
      <div className="absolute top-[12%] left-[25%] w-1.5 h-3.5 md:w-3 md:h-7 bg-[#9945FF] rotate-[-15deg]" />
      <div className="absolute top-[18%] right-[8%] w-2 h-2 md:w-4 md:h-4 bg-[#00bcd4]" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight text-center">
          How AlumniConnect Works
        </h2>
        <p className="text-white/40 text-center text-sm md:text-lg mb-16 max-w-2xl mx-auto">
          One platform. Many colleges. Each college has its own private social network.
        </p>

        {/* Cards Grid - 3 cols on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-6">
          {steps.map((step, index) => (
            <div
              key={index}
              className="bg-[#1a1a1a] rounded-xl md:rounded-2xl p-2 md:p-4 hover:bg-[#222222] transition-colors cursor-pointer group"
            >
              {/* Step Number */}
              <div className={`${step.bgColor} rounded-xl md:rounded-2xl h-20 md:h-48 mb-2 md:mb-4 flex items-center justify-center overflow-hidden`}>
                <div className="text-center p-2 md:p-4">
                  <span className="text-white/80 text-[8px] md:text-xs font-bold tracking-wider uppercase">STEP</span>
                  <div className="text-2xl md:text-6xl font-bold text-white mt-0.5 md:mt-1">
                    {step.step}
                  </div>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-white font-bold text-[10px] md:text-lg mb-1 md:mb-2 group-hover:text-solana-green transition-colors leading-tight">
                {step.title}
              </h3>

              {/* Description */}
              <p className="text-white/40 text-[8px] md:text-sm">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Decorative Elements - smaller on mobile */}
      <div className="absolute bottom-0 left-0 w-16 h-16 md:w-32 md:h-32 opacity-60">
        <div className="w-8 h-8 md:w-16 md:h-16 bg-solana-pink rounded-full absolute bottom-4 left-4 md:bottom-8 md:left-8" />
        <div className="w-4 h-4 md:w-8 md:h-8 bg-solana-yellow rounded-full absolute bottom-2 left-10 md:bottom-4 md:left-20" />
      </div>
      <div className="absolute bottom-0 right-0 w-16 h-16 md:w-32 md:h-32 opacity-60">
        <div className="w-10 h-10 md:w-20 md:h-20 bg-solana-cyan rounded-xl md:rounded-2xl rotate-12 absolute bottom-4 right-4 md:bottom-8 md:right-8" />
      </div>
    </section>
  );
};

export default HowItWorksSection;
