import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";
import { FileCheck, Users, Shield, RefreshCw } from "lucide-react";
import BlobButton from "@/components/BlobButton";
import Sparkle from "@/components/Sparkle";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const TermsOfService = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TermsOfService",
    name: "Clstr Terms of Service",
    url: "https://clstr.network/terms",
    description: "Plain-language overview of the terms for using Clstr.",
    publisher: { "@type": "Organization", name: "Clstr", url: "https://clstr.network" },
  };

  return (
    <div className="landing-theme">
      <SEO title="Terms of Service" description="Review the expectations and responsibilities for using Clstr." jsonLd={jsonLd} />      <Navbar />
      <div className="relative bg-black min-h-screen overflow-hidden">
        <Sparkle className="top-24 left-[15%]" size={32} delay={0} />
        <Sparkle className="top-32 right-[20%]" size={24} delay={0.5} />
        <div className="absolute top-[15%] left-[20%] w-3 h-3 bg-solana-green rotate-45" />
        <div className="absolute top-[20%] right-[25%] w-4 h-4 bg-solana-pink rounded-full" />

        <div className="relative z-10 container mx-auto px-6 py-16 md:py-24">
          <header className="text-center max-w-4xl mx-auto mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-solana-green mb-4">Resources</p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="text-white">Terms of</span> <span className="text-[#c8ff00]">Service</span>
            </h1>
            <p className="text-white/40 text-lg md:text-xl mb-10">
              This summary highlights key expectations for using Clstr. For the full legal terms, contact the Clstr team.
            </p>
          </header>

          <section className="max-w-5xl mx-auto mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-solana-green rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <FileCheck className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Account duties</h3>
                <p className="text-white/40 text-xs">Keep profile accurate, protect credentials.</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-solana-pink rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Users className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Community standards</h3>
                <p className="text-white/40 text-xs">Verified ecosystem, respectful interactions.</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-solana-cyan rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Shield className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Content ownership</h3>
                <p className="text-white/40 text-xs">You own your content, grant display permission.</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-solana-yellow rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <RefreshCw className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Service updates</h3>
                <p className="text-white/40 text-xs">Features may evolve with transparency.</p>
              </div>
            </div>
          </section>

          <section className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2 mb-16">
            <div className="bg-[#1a1a1a] rounded-3xl p-10">
              <h2 className="text-2xl font-bold text-white mb-4">Account responsibilities</h2>
              <p className="text-white/40">Keep your profile accurate, protect your credentials, and maintain respectful communication across the network.</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-3xl p-10">
              <h2 className="text-2xl font-bold text-white mb-4">Community standards</h2>
              <p className="text-white/40">Clstr is a verified campus ecosystem. Harmful, misleading, or abusive activity can result in account restrictions.</p>
            </div>
          </section>

          <section className="text-center bg-[#1a1a1a] rounded-3xl p-12 max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Need a complete copy of <span className="text-solana-green">the terms?</span></h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto mb-8">Contact the Clstr team for the full legal document or additional clarifications.</p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/contact"><BlobButton>Contact Clstr</BlobButton></Link>
              <Link to="/privacy" className="text-white font-medium text-sm tracking-wider px-6 py-3 rounded-full border border-white/30 hover:bg-white/10 transition-colors">Review Privacy Policy</Link>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TermsOfService;
