import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Briefcase, Target, TrendingUp } from "lucide-react";
import BlobButton from "@/components/BlobButton";
import Sparkle from "@/components/Sparkle";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const FeatureCareer = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Career Opportunities",
    description: "Career discovery with verified campus context and role relevance.",
    url: "https://clstr.network/features/career-opportunities",
    isPartOf: {
      "@type": "CollectionPage",
      name: "Clstr Features",
      url: "https://clstr.network/features",
    },
    about: {
      "@type": "Occupation",
      name: "Early career and campus opportunities",
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
        title="Career Opportunities"
        description="Explore internships, campus roles, and project-based opportunities matched to your goals."
        jsonLd={jsonLd}
      />      <Navbar />
      <div className="relative bg-black min-h-screen overflow-hidden">
        <Sparkle className="top-24 left-[15%]" size={32} delay={0} />
        <Sparkle className="top-32 right-[20%]" size={24} delay={0.5} />
        <div className="absolute top-[15%] left-[20%] w-3 h-3 bg-solana-yellow rotate-45" />
        <div className="absolute top-[20%] right-[25%] w-4 h-4 bg-solana-cyan rounded-full" />
        <div className="absolute top-[35%] left-[10%] w-2 h-6 bg-solana-pink rotate-12" />
        <div className="absolute top-[40%] right-[15%] w-3 h-3 bg-solana-green rotate-45" />

        <div className="relative z-10 container mx-auto px-6 py-16 md:py-24">
          <header className="text-center max-w-4xl mx-auto mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-solana-yellow mb-4">Feature</p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="text-[#c8ff00]">Career opportunities</span>
              <br />
              <span className="text-white">with context, not clutter</span>
            </h1>
            <p className="text-white/40 text-lg md:text-xl mb-10">
              Clstr highlights roles that align with your campus journey, from internships to club leadership and project collaborations.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/signup"><BlobButton>Find opportunities</BlobButton></Link>
              <Link to="/features" className="text-white font-medium text-sm tracking-wider px-6 py-3 rounded-full border border-white/30 hover:bg-white/10 transition-colors">Explore all features</Link>
            </div>
          </header>

          <section className="max-w-5xl mx-auto mb-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-yellow rounded-xl flex items-center justify-center mb-6">
                  <Briefcase className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Verified context</h3>
                <p className="text-white/40 text-sm">Opportunities filtered by school and skills.</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-cyan rounded-xl flex items-center justify-center mb-6">
                  <Target className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Portfolio-ready</h3>
                <p className="text-white/40 text-sm">Roles emphasize tangible project outcomes.</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-green rounded-xl flex items-center justify-center mb-6">
                  <TrendingUp className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">High-intent matches</h3>
                <p className="text-white/40 text-sm">Connect with recruiters and alumni directly.</p>
              </div>
            </div>
          </section>

          <section className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2 mb-16">
            <div className="bg-[#1a1a1a] rounded-3xl p-10 hover:bg-[#222222] transition-colors">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Opportunity signals that matter</h2>
              <p className="text-white/40 leading-relaxed">Listings emphasize collaboration goals, mentorship support, and real outcomes so students can focus on roles that build lasting momentum.</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-3xl p-10 hover:bg-[#222222] transition-colors">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Portfolio-first discovery</h2>
              <p className="text-white/40 leading-relaxed">Clstr surfaces project-based roles and campus initiatives that translate into tangible experience for resumes and graduate applications.</p>
            </div>
          </section>

          <section className="text-center bg-[#1a1a1a] rounded-3xl p-12 max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Turn campus work into <span className="text-solana-yellow">career momentum</span></h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto mb-8">Join Clstr to discover opportunities and connect with alumni who can help you reach your goals.</p>
            <Link to="/signup"><BlobButton>Get started now</BlobButton></Link>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default FeatureCareer;
