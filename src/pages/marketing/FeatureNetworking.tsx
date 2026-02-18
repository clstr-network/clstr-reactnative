import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Users, Shield, Sparkles } from "lucide-react";
import BlobButton from "@/components/BlobButton";
import Sparkle from "@/components/Sparkle";import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
const FeatureNetworking = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Campus Networking",
    description: "Verified campus networking that connects students, alumni, and mentors with purpose.",
    url: "https://clstr.network/features/networking",
    isPartOf: {
      "@type": "CollectionPage",
      name: "Clstr Features",
      url: "https://clstr.network/features",
    },
    about: {
      "@type": "Service",
      name: "Campus networking and collaboration",
    },
    publisher: {
      "@type": "Organization",
      name: "Clstr",
      url: "https://clstr.network",
    },
  };

  return (
    <div className="landing-theme">
      <SEO
        title="Networking"
        description="Turn introductions into collaboration with verified campus networking on Clstr."
        jsonLd={jsonLd}
      />
      <Navbar />

      <div className="relative bg-black min-h-screen overflow-hidden">
        {/* Decorative shapes */}
        <Sparkle className="top-24 left-[15%]" size={32} delay={0} />
        <Sparkle className="top-32 right-[20%]" size={24} delay={0.5} />
        <div className="absolute top-[15%] left-[20%] w-3 h-3 bg-solana-cyan rotate-45" />
        <div className="absolute top-[20%] right-[25%] w-4 h-4 bg-solana-green rounded-full" />
        <div className="absolute top-[35%] left-[10%] w-2 h-6 bg-solana-yellow rotate-12" />
        <div className="absolute top-[40%] right-[15%] w-3 h-3 bg-solana-purple rotate-45" />
        <div className="absolute bottom-[20%] left-[10%] w-4 h-4 bg-solana-pink rounded-full" />

        <div className="relative z-10 container mx-auto px-6 py-16 md:py-24">
          {/* Hero Header */}
          <header className="text-center max-w-4xl mx-auto mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-solana-cyan mb-4">Feature</p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="text-white">Networking that turns</span>
              <br />
              <span className="text-[#c8ff00]">classmates into collaborators</span>
            </h1>
            <p className="text-white/40 text-lg md:text-xl mb-10">
              Discover peers and alumni with verified academic context, then start conversations that move projects forward.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/signup">
                <BlobButton>Join the network</BlobButton>
              </Link>
              <Link
                to="/features"
                className="text-white font-medium text-sm tracking-wider px-6 py-3 rounded-full border border-white/30 hover:bg-white/10 transition-colors"
              >
                Explore all features
              </Link>
            </div>
          </header>

          {/* Key Benefits */}
          <section className="max-w-5xl mx-auto mb-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-cyan rounded-xl flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Verified campus identity</h3>
                <p className="text-white/40 text-sm">
                  Reduces noise and boosts trust across all connections.
                </p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-green rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Smart discovery</h3>
                <p className="text-white/40 text-sm">
                  Surfaces shared classes, clubs, and project interests automatically.
                </p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-yellow rounded-xl flex items-center justify-center mb-6">
                  <Sparkles className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Actionable intros</h3>
                <p className="text-white/40 text-sm">
                  Clear intent prompts make outreach natural, not awkward.
                </p>
              </div>
            </div>
          </section>

          {/* Detailed Features */}
          <section className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2 mb-16">
            <div className="bg-[#1a1a1a] rounded-3xl p-10 hover:bg-[#222222] transition-colors">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Built for entity clarity
              </h2>
              <p className="text-white/40 leading-relaxed">
                Profiles are structured around role, school, and interests so both humans and AI search engines
                understand who you are and how you contribute.
              </p>
            </div>
            <div className="bg-[#1a1a1a] rounded-3xl p-10 hover:bg-[#222222] transition-colors">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Shared goals spotlight
              </h2>
              <p className="text-white/40 leading-relaxed">
                Clstr highlights shared goals (startup ideas, research areas, or community impact) to make every
                message relevant and easy to respond to.
              </p>
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center bg-[#1a1a1a] rounded-3xl p-12 max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Start building <span className="text-solana-cyan">meaningful connections</span>
            </h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto mb-8">
              Join Clstr to connect with verified peers, alumni, and mentors in one trusted network.
            </p>
            <Link to="/signup">
              <BlobButton>Get started now</BlobButton>
            </Link>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default FeatureNetworking;
