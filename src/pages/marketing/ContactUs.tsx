import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";
import { Mail, Handshake, Newspaper } from "lucide-react";
import BlobButton from "@/components/BlobButton";
import Sparkle from "@/components/Sparkle";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ContactUs = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Clstr",
    url: "https://clstr.network/contact",
    mainEntity: {
      "@type": "Organization",
      name: "Clstr",
      url: "https://clstr.network",
      email: "clstr.network@gmail.com",
      sameAs: [
        "https://www.instagram.com/clstr.network/",
        "https://www.linkedin.com/in/clstr-network/",
        "https://x.com/clstrnetwork",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "clstr.network@gmail.com",
      },
    },
  };

  return (
    <div className="landing-theme">
      <SEO title="Contact Us" description="Reach the Clstr team for partnerships, support, and campus collaboration opportunities." jsonLd={jsonLd} />
      <Navbar />

      <div className="relative bg-black min-h-screen overflow-hidden">
        <Sparkle className="top-24 left-[15%]" size={32} delay={0} />
        <Sparkle className="top-32 right-[20%]" size={24} delay={0.5} />
        <div className="absolute top-[15%] left-[20%] w-3 h-3 bg-solana-cyan rotate-45" />
        <div className="absolute top-[20%] right-[25%] w-4 h-4 bg-solana-pink rounded-full" />

        <div className="relative z-10 container mx-auto px-6 py-16 md:py-24">
          <header className="text-center max-w-4xl mx-auto mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-solana-cyan mb-4">Resources</p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="text-white">Contact</span> <span className="text-[#c8ff00]">Clstr</span>
            </h1>
            <p className="text-white/40 text-lg md:text-xl mb-10">
              We respond quickly to campus partnership requests, mentorship programs, and student success stories.
            </p>
          </header>

          <section className="max-w-5xl mx-auto mb-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#1a1a1a] rounded-2xl p-8 text-center">
                <div className="w-12 h-12 bg-solana-cyan rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <Handshake className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Partnerships</h3>
                <p className="text-white/40 text-sm">Campus organizations, alumni networks, event hosts.</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-8 text-center">
                <div className="w-12 h-12 bg-solana-pink rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <Mail className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Support</h3>
                <p className="text-white/40 text-sm">Account access, verification, platform questions.</p>
                <a
                  href="https://forms.cloud.microsoft/r/7HPbPj3Rq8"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-sm font-semibold text-solana-pink hover:text-solana-purple transition-colors"
                >
                  Submit a support request â†’
                </a>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-8 text-center">
                <div className="w-12 h-12 bg-solana-yellow rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <Newspaper className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Media</h3>
                <p className="text-white/40 text-sm">Research, data insights, collaboration trends.</p>
              </div>
            </div>
          </section>

          <section className="max-w-4xl mx-auto mb-16">
            <div className="bg-[#1a1a1a] rounded-3xl p-10 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Direct contact</h2>
              <p className="text-white/40 mb-6">Reach the Clstr team directly for partnerships, press, or support.</p>
              <a
                href="mailto:clstr.network@gmail.com"
                className="text-solana-cyan font-semibold hover:text-solana-green transition-colors"
              >
                clstr.network@gmail.com
              </a>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                <a
                  href="https://www.instagram.com/clstr.network/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-white/80 hover:text-white transition-colors"
                >
                  Instagram
                </a>
                <a
                  href="https://www.linkedin.com/in/clstr-network/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-white/80 hover:text-white transition-colors"
                >
                  LinkedIn
                </a>
                <a
                  href="https://x.com/clstrnetwork"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-white/80 hover:text-white transition-colors"
                >
                  X (Twitter)
                </a>
              </div>
            </div>
          </section>

          <section className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2 mb-16">
            <div className="bg-[#1a1a1a] rounded-3xl p-10">
              <h2 className="text-2xl font-bold text-white mb-4">Fastest way to get help</h2>
              <p className="text-white/40 mb-6">Submit a support request and we will follow up with next steps.</p>
              <a
                href="https://forms.cloud.microsoft/r/7HPbPj3Rq8"
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm font-semibold text-solana-cyan hover:text-solana-green transition-colors"
              >
                Go to Help Center â†’
              </a>
            </div>
            <div className="bg-[#1a1a1a] rounded-3xl p-10">
              <h2 className="text-2xl font-bold text-white mb-4">Partnership inquiries</h2>
              <p className="text-white/40 mb-6">Interested in becoming a Campus Ambassador or starting an official partnership? Apply to join our campus leadership program.</p>
              <a
                href="https://forms.cloud.microsoft/r/p3SpiyHh7k"
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm font-semibold text-solana-pink hover:text-solana-purple transition-colors"
              >
                Apply for Campus Ambassador â†’
              </a>
            </div>
          </section>

          <section className="text-center bg-[#1a1a1a] rounded-3xl p-12 max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Tell us how Clstr can <span className="text-solana-cyan">help your campus</span></h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto mb-8">We prioritize verified communities, student-led initiatives, and mentorship programs that deliver measurable impact.</p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/signup"><BlobButton>Join Clstr</BlobButton></Link>
              <a
                href="https://forms.cloud.microsoft/r/7HPbPj3Rq8"
                target="_blank"
                rel="noreferrer"
                className="text-white font-medium text-sm tracking-wider px-6 py-3 rounded-full border border-white/30 hover:bg-white/10 transition-colors"
              >
                Submit your request
              </a>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ContactUs;
