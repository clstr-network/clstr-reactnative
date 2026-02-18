import { Users, Network, Calendar, Building2, Rocket } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Mentorship Programs",
    description: "Find mentors in your field of interest or become a mentor to help others grow professionally.",
    color: "bg-solana-pink",
  },
  {
    icon: Network,
    title: "Alumni Network",
    description: "Connect with verified alumni and students from your institution in a trusted environment.",
    color: "bg-solana-cyan",
  },
  {
    icon: Calendar,
    title: "Events & Meetups",
    description: "Access college-specific networking events, workshops, and career fairs.",
    color: "bg-solana-yellow",
  },
  {
    icon: Building2,
    title: "Clubs & Communities",
    description: "Join and participate in student organizations and alumni networks with shared interests.",
    color: "bg-solana-green",
  },
  {
    icon: Rocket,
    title: "CollabHub",
    description: "Discover projects, find teammates, and build something together within your college community.",
    color: "bg-solana-pink",
  },
];

const FeaturedSections = () => {
  return (
    <section id="features" className="w-full bg-black py-20 md:py-32 px-4 relative overflow-hidden -mt-16 md:-mt-24">
      {/* Decorative shapes - smaller on mobile */}
      <div className="absolute top-[10%] left-[5%] w-2 h-2 md:w-4 md:h-4 bg-[#00ff88] rotate-45" />
      <div className="absolute top-[15%] right-[8%] w-2.5 h-2.5 md:w-5 md:h-5 bg-[#ff1b6b] rounded-full" />
      <div className="absolute top-[25%] left-[12%] w-1.5 h-4 md:w-3 md:h-8 bg-[#ffeb3b] rotate-12" />
      <div className="absolute top-[40%] right-[6%] w-2 h-2 md:w-4 md:h-4 bg-[#00bcd4] rotate-45" />
      <div className="absolute top-[60%] left-[8%] w-1.5 h-1.5 md:w-3 md:h-3 bg-[#bf0fff] rounded-full" />
      <div className="absolute top-[70%] right-[10%] w-3 h-1.5 md:w-6 md:h-3 bg-[#ff930f]" />
      <div className="absolute bottom-[15%] left-[15%] w-2.5 h-2.5 md:w-5 md:h-5 bg-[#9945FF] rounded-full" />
      <div className="absolute bottom-[20%] right-[12%] w-2 h-2 md:w-4 md:h-4 bg-[#14F195] rotate-12" />
      
      {/* Bottom decorative elements - between sections */}
      <div className="absolute bottom-0 left-[20%] w-4 h-4 md:w-8 md:h-8 bg-[#ff1b6b] rounded-full translate-y-1/2" />
      <div className="absolute bottom-0 right-[25%] w-3 h-3 md:w-6 md:h-6 bg-[#ffeb3b] rotate-45 translate-y-1/2" />
      <div className="absolute bottom-0 left-[50%] w-2 h-5 md:w-4 md:h-10 bg-[#00bcd4] rotate-[-20deg] translate-y-1/2" />
      <div className="absolute bottom-0 right-[40%] w-2.5 h-2.5 md:w-5 md:h-5 bg-[#bf0fff] rounded-lg translate-y-1/2" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
            Featured Sections
          </h2>
          <p className="text-white/40 text-base md:text-lg max-w-2xl mx-auto">
            Everything you need to foster meaningful connections and advance your career
          </p>
        </div>

        {/* Features Grid - 3x2 on mobile, 2 cols on tablet, 3 cols on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-[#1a1a1a] rounded-xl md:rounded-2xl p-3 md:p-8 hover:bg-[#222222] transition-colors cursor-pointer group"
            >
              {/* Icon */}
              <div className={`w-8 h-8 md:w-12 md:h-12 ${feature.color} rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-6`}>
                <feature.icon className="w-4 h-4 md:w-6 md:h-6 text-solana-dark" />
              </div>

              {/* Title */}
              <h3 className="text-xs md:text-xl font-bold text-white mb-1 md:mb-3 group-hover:text-solana-green transition-colors">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-white/40 text-[10px] md:text-sm leading-relaxed hidden md:block">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedSections;
