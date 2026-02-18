import { Shield, MessageCircle, Users, Calendar } from "lucide-react";

const featureCards = [
  {
    icon: MessageCircle,
    title: "Alumni Interaction",
    description: "Connect and interact with alumni from your college through posts and discussions.",
    iconBg: "bg-solana-pink",
  },
  {
    icon: Users,
    title: "Clubs & Communities",
    description: "Join or create clubs inside your college network.",
    iconBg: "bg-solana-green",
  },
  {
    icon: Calendar,
    title: "Events & Activities",
    description: "Participate in events created by students and alumni from your college.",
    iconBg: "bg-solana-yellow",
  },
];

const PrizesSection = () => {
  return (
    <section className="w-full bg-background py-20 md:py-32 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
            What you unlock with clstr
          </h2>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Primary Card - College-Verified Network */}
          <div className="bg-[#1a1a1a] rounded-3xl p-8 md:p-12 flex flex-col items-center justify-center text-center">
            {/* Shield Icon */}
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-solana-cyan rounded-full flex items-center justify-center">
                <Shield className="w-12 h-12 text-solana-dark" />
              </div>
              {/* Decorative dots */}
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-solana-yellow rounded-full" />
              <div className="absolute -bottom-1 -left-3 w-3 h-3 bg-solana-pink rounded-full" />
            </div>

            {/* Title */}
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-wide">
              College-Verified Network
            </h3>

            {/* Highlight */}
            <div className="mb-4">
              <span className="text-3xl md:text-4xl font-bold text-solana-cyan">Private access</span>
            </div>

            {/* Description */}
            <p className="text-white/40 text-base md:text-lg max-w-sm">
              Your account is verified using your college email. You only see students, alumni, and clubs from your own college.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="flex flex-col gap-4">
            {featureCards.map((feature) => (
              <div
                key={feature.title}
                className="bg-[#1a1a1a] rounded-2xl p-6 flex items-center gap-6 hover:bg-[#222222] transition-colors"
              >
                {/* Icon */}
                <div className={`w-16 h-16 ${feature.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <feature.icon className="w-8 h-8 text-solana-dark" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h4 className="text-white font-medium text-lg mb-1">
                    {feature.title}
                  </h4>
                  <p className="text-white/40 text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PrizesSection;
