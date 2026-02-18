import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";
import { Shield, Lock, Eye, FileText } from "lucide-react";
import BlobButton from "@/components/BlobButton";
import Sparkle from "@/components/Sparkle";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PrivacyPolicy",
    name: "Clstr Privacy Policy",
    url: "https://clstr.network/privacy",
    description: "Plain-language overview of how Clstr handles data and privacy.",
    publisher: { "@type": "Organization", name: "Clstr", url: "https://clstr.network" },
  };

  return (
    <div className="landing-theme">
      <SEO title="Privacy Policy" description="Understand how Clstr protects your data, privacy, and campus identity." jsonLd={jsonLd} />      <Navbar />
      <div className="relative bg-black min-h-screen overflow-hidden">
        <Sparkle className="top-24 left-[15%]" size={32} delay={0} />
        <Sparkle className="top-32 right-[20%]" size={24} delay={0.5} />
        <div className="absolute top-[15%] left-[20%] w-3 h-3 bg-solana-purple rotate-45" />
        <div className="absolute top-[20%] right-[25%] w-4 h-4 bg-solana-cyan rounded-full" />

        <div className="relative z-10 container mx-auto px-6 py-16 md:py-24">
          <header className="text-center max-w-4xl mx-auto mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-solana-purple mb-4">Resources</p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="text-white">Privacy</span> <span className="text-[#c8ff00]">Policy</span>
            </h1>
            <p className="text-white/40 text-lg md:text-xl mb-10">
              This page provides a plain-language overview of how Clstr handles data. For the most current legal policy, contact the Clstr team.
            </p>
          </header>

          <section className="max-w-5xl mx-auto mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-solana-purple rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Shield className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">What we collect</h3>
                <p className="text-white/40 text-xs">Verified email, profile details, usage signals.</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-solana-cyan rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Eye className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">How we use it</h3>
                <p className="text-white/40 text-xs">Matching, recommendations, safety checks.</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-solana-yellow rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Lock className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Your controls</h3>
                <p className="text-white/40 text-xs">Visibility, preferences, account access.</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-solana-green rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <FileText className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Retention</h3>
                <p className="text-white/40 text-xs">Data kept only as long as necessary.</p>
              </div>
            </div>
          </section>

          <section className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2 mb-16">
            <div className="bg-[#1a1a1a] rounded-3xl p-10">
              <h2 className="text-2xl font-bold text-white mb-4">What we collect</h2>
              <p className="text-white/40">Account information, verified academic email, profile details, and usage signals help Clstr match you with opportunities and keep the network trustworthy.</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-3xl p-10">
              <h2 className="text-2xl font-bold text-white mb-4">Your controls</h2>
              <p className="text-white/40">Update profile visibility, communication preferences, and account access inside your Clstr settings.</p>
            </div>
          </section>

          <section className="text-center bg-[#1a1a1a] rounded-3xl p-12 max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Have <span className="text-solana-purple">privacy questions?</span></h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto mb-8">Reach out to the Clstr team for detailed policy documentation or data requests.</p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/contact"><BlobButton>Contact Clstr</BlobButton></Link>
              <Link to="/terms" className="text-white font-medium text-sm tracking-wider px-6 py-3 rounded-full border border-white/30 hover:bg-white/10 transition-colors">View Terms of Service</Link>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
