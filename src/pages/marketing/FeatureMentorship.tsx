import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { MessageCircle, Target, CheckCircle } from "lucide-react";
import BlobButton from "@/components/BlobButton";
import Sparkle from "@/components/Sparkle";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const FeatureMentorship = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Mentorship",
    description: "Structured mentorship programs connecting students and alumni on Clstr.",
    url: "https://clstr.network/features/mentorship",
    isPartOf: {
      "@type": "CollectionPage",
      name: "Clstr Features",
      url: "https://clstr.network/features",
    },
    about: {
      "@type": "EducationalOccupationalProgram",
      name: "Campus mentorship programs",
      provider: {
        "@type": "Organization",
        name: "Clstr",
        url: "https://clstr.network",
      },
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
        title="Mentorship"
        description="Find structured mentorship from alumni and peer leaders inside the Clstr ecosystem."
        jsonLd={jsonLd}
      />      <Navbar />
      <div className="relative bg-black min-h-screen overflow-hidden">
        <Sparkle className="top-24 left-[15%]" size={32} delay={0} />
        <Sparkle className="top-32 right-[20%]" size={24} delay={0.5} />
        <div className="absolute top-[15%] left-[20%] w-3 h-3 bg-solana-pink rotate-45" />
        <div className="absolute top-[20%] right-[25%] w-4 h-4 bg-solana-purple rounded-full" />
        <div className="absolute top-[35%] left-[10%] w-2 h-6 bg-solana-cyan rotate-12" />
        <div className="absolute top-[40%] right-[15%] w-3 h-3 bg-solana-yellow rotate-45" />

        <div className="relative z-10 container mx-auto px-6 py-16 md:py-24">
          <header className="text-center max-w-4xl mx-auto mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-solana-pink mb-4">Feature</p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="text-white">Mentorship with</span>
              <br />
              <span className="text-[#c8ff00]">clear goals & progress</span>
            </h1>
            <p className="text-white/40 text-lg md:text-xl mb-10">
              Clstr pairs students with mentors who understand their campus context and can guide next steps with measurable outcomes.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/signup"><BlobButton>Start mentorship</BlobButton></Link>
              <Link to="/features" className="text-white font-medium text-sm tracking-wider px-6 py-3 rounded-full border border-white/30 hover:bg-white/10 transition-colors">Explore all features</Link>
            </div>
          </header>

          <section className="max-w-5xl mx-auto mb-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-pink rounded-xl flex items-center justify-center mb-6">
                  <MessageCircle className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Verified guidance</h3>
                <p className="text-white/40 text-sm">Alumni and peer mentors create trusted relationships.</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-purple rounded-xl flex items-center justify-center mb-6">
                  <Target className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Goal-based matching</h3>
                <p className="text-white/40 text-sm">Sessions stay focused and actionable.</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-cyan rounded-xl flex items-center justify-center mb-6">
                  <CheckCircle className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Progress milestones</h3>
                <p className="text-white/40 text-sm">Build momentum for internships and projects.</p>
              </div>
            </div>
          </section>

          <section className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2 mb-16">
            <div className="bg-[#1a1a1a] rounded-3xl p-10 hover:bg-[#222222] transition-colors">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Structured programs</h2>
              <p className="text-white/40 leading-relaxed">Mentorship tracks include onboarding, goal-setting, and recurring check-ins so every match drives a specific outcome.</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-3xl p-10 hover:bg-[#222222] transition-colors">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Community-backed support</h2>
              <p className="text-white/40 leading-relaxed">Mentors are connected to campus clubs and alumni networks, giving students access to broader opportunities and referrals.</p>
            </div>
          </section>

          <section className="text-center bg-[#1a1a1a] rounded-3xl p-12 max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Find the mentor who <span className="text-solana-pink">accelerates your next step</span></h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto mb-8">Build a focused mentorship plan and connect with leaders who understand your campus journey.</p>
            <Link to="/signup"><BlobButton>Get started now</BlobButton></Link>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default FeatureMentorship;
