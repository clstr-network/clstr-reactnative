import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Building2, Users, Rocket } from "lucide-react";
import BlobButton from "@/components/BlobButton";
import Sparkle from "@/components/Sparkle";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const FeatureClubs = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Clubs & Communities",
    description: "Verified campus organizations and communities on Clstr.",
    url: "https://clstr.network/features/clubs",
    isPartOf: {
      "@type": "CollectionPage",
      name: "Clstr Features",
      url: "https://clstr.network/features",
    },
    about: {
      "@type": "Organization",
      name: "Campus organizations",
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
        title="Clubs & Communities"
        description="Explore verified campus organizations and communities that match your interests."
        jsonLd={jsonLd}
      />      <Navbar />
      <div className="relative bg-black min-h-screen overflow-hidden">
        <Sparkle className="top-24 left-[15%]" size={32} delay={0} />
        <Sparkle className="top-32 right-[20%]" size={24} delay={0.5} />
        <div className="absolute top-[15%] left-[20%] w-3 h-3 bg-solana-purple rotate-45" />
        <div className="absolute top-[20%] right-[25%] w-4 h-4 bg-solana-pink rounded-full" />
        <div className="absolute top-[35%] left-[10%] w-2 h-6 bg-solana-yellow rotate-12" />
        <div className="absolute top-[40%] right-[15%] w-3 h-3 bg-solana-green rotate-45" />

        <div className="relative z-10 container mx-auto px-6 py-16 md:py-24">
          <header className="text-center max-w-4xl mx-auto mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-solana-purple mb-4">Feature</p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="text-white">Clubs & communities</span>
              <br />
              <span className="text-[#c8ff00]">built on trust</span>
            </h1>
            <p className="text-white/40 text-lg md:text-xl mb-10">
              Clstr verifies campus organizations so students can join communities with clear leadership and real impact.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/signup"><BlobButton>Explore clubs</BlobButton></Link>
              <Link to="/features" className="text-white font-medium text-sm tracking-wider px-6 py-3 rounded-full border border-white/30 hover:bg-white/10 transition-colors">Explore all features</Link>
            </div>
          </header>

          <section className="max-w-5xl mx-auto mb-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-purple rounded-xl flex items-center justify-center mb-6">
                  <Building2 className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Verified profiles</h3>
                <p className="text-white/40 text-sm">Build authority and reduce noise.</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-pink rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Member directories</h3>
                <p className="text-white/40 text-sm">Spotlight campus leaders and collaborators.</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-yellow rounded-xl flex items-center justify-center mb-6">
                  <Rocket className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Public discovery</h3>
                <p className="text-white/40 text-sm">Pages optimized for AI citations.</p>
              </div>
            </div>
          </section>

          <section className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2 mb-16">
            <div className="bg-[#1a1a1a] rounded-3xl p-10 hover:bg-[#222222] transition-colors">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Entity-rich club profiles</h2>
              <p className="text-white/40 leading-relaxed">Clubs highlight leadership, mission, and active initiatives so students can quickly find the right community.</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-3xl p-10 hover:bg-[#222222] transition-colors">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Community momentum</h2>
              <p className="text-white/40 leading-relaxed">Members can showcase projects, events, and collaboration needs, turning club pages into living portfolios.</p>
            </div>
          </section>

          <section className="text-center bg-[#1a1a1a] rounded-3xl p-12 max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Join <span className="text-solana-purple">verified campus communities</span></h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto mb-8">Find organizations that match your goals and connect with peers who share your mission.</p>
            <Link to="/signup"><BlobButton>Get started now</BlobButton></Link>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default FeatureClubs;
