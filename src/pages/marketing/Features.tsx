import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Users, Briefcase, Calendar, MessageCircle, Building2 } from "lucide-react";
import BlobButton from "@/components/BlobButton";
import Sparkle from "@/components/Sparkle";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const featureCards = [
  {
    title: "Networking",
    description: "Build verified peer and alumni connections that turn introductions into active collaboration.",
    href: "/features/networking",
    icon: Users,
    color: "bg-solana-cyan",
  },
  {
    title: "Career Opportunities",
    description: "Discover internships, campus roles, and project-based opportunities matched to your goals.",
    href: "/features/career-opportunities",
    icon: Briefcase,
    color: "bg-solana-yellow",
  },
  {
    title: "Mentorship",
    description: "Find structured guidance from alumni and peer mentors with clear goals and outcomes.",
    href: "/features/mentorship",
    icon: MessageCircle,
    color: "bg-solana-pink",
  },
  {
    title: "Events",
    description: "Surface high-signal campus events and RSVP with context, not noise.",
    href: "/features/events",
    icon: Calendar,
    color: "bg-solana-green",
  },
  {
    title: "Clubs & Communities",
    description: "Explore verified organizations and join communities aligned to your interests.",
    href: "/features/clubs",
    icon: Building2,
    color: "bg-solana-purple",
  },
];

const Features = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Clstr Features",
    description: "An overview of Clstr's campus networking, mentorship, events, and community features.",
    url: "https://clstr.network/features",
    hasPart: featureCards.map((feature) => ({
      "@type": "WebPage",
      name: feature.title,
      url: `https://clstr.network${feature.href}`,
    })),
    publisher: {
      "@type": "Organization",
      name: "Clstr",
      url: "https://clstr.network",
    },
  };

  return (
    <div className="landing-theme">
      <SEO
        title="Features"
        description="Explore Clstr features built for campus networking, mentorship, events, and verified communities."
        jsonLd={jsonLd}
      />
      <Navbar />

      <div className="relative bg-black min-h-screen overflow-hidden">
        {/* Decorative shapes */}
        <Sparkle className="top-24 left-[15%]" size={32} delay={0} />
        <Sparkle className="top-32 right-[20%]" size={24} delay={0.5} />
        <Sparkle className="top-[35%] left-[8%]" size={20} delay={1} />
        <div className="absolute top-[15%] left-[20%] w-3 h-3 bg-[#00ff88] rotate-45" />
        <div className="absolute top-[20%] right-[25%] w-4 h-4 bg-[#ff1b6b] rounded-full" />
        <div className="absolute top-[35%] left-[10%] w-2 h-6 bg-[#ffeb3b] rotate-12" />
        <div className="absolute top-[40%] right-[15%] w-3 h-3 bg-[#00bcd4] rotate-45" />
        <div className="absolute top-[60%] left-[8%] w-3 h-3 bg-[#bf0fff] rounded-full" />
        <div className="absolute top-[70%] right-[10%] w-6 h-3 bg-[#ff930f]" />

        <div className="relative z-10 container mx-auto px-6 py-16 md:py-24">
          {/* Hero Header */}
          <header className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-solana-green mb-4">Features</p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="text-[#c8ff00]">Strategic tools</span>
              <br />
              <span className="text-white">for campus discovery</span>
            </h1>
            <p className="text-white/40 text-lg md:text-xl max-w-3xl mx-auto mb-10">
              Clstr pairs verified campus identity with answer-first experiences so students, alumni, and clubs can
              connect quickly and credibly across the entire ecosystem.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/signup">
                <BlobButton>Get started</BlobButton>
              </Link>
            </div>
          </header>

          {/* Features Grid */}
          <section className="max-w-6xl mx-auto mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featureCards.map((feature) => (
                <Link
                  key={feature.title}
                  to={feature.href}
                  className="bg-[#1a1a1a] rounded-2xl p-8 hover:bg-[#222222] transition-all hover:-translate-y-1 group"
                >
                  <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-6`}>
                    <feature.icon className="w-6 h-6 text-solana-dark" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-solana-green transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-white/40 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                  <span className="mt-4 inline-flex text-sm font-semibold text-solana-cyan">Learn more â†’</span>
                </Link>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center bg-[#1a1a1a] rounded-3xl p-12 max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Build your campus network with <span className="text-solana-green">confidence</span>
            </h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto mb-8">
              Join Clstr to connect with peers, alumni, and verified campus organizations in one trusted ecosystem.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/signup">
                <BlobButton>Create an account</BlobButton>
              </Link>
              <Link
                to="/features/networking"
                className="text-white font-medium text-sm tracking-wider px-6 py-3 rounded-full border border-white/30 hover:bg-white/10 transition-colors"
              >
                Start with networking
              </Link>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Features;
