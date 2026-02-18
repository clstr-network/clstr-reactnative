import { useState } from "react";
import { SEO } from "@/components/SEO";
import { Building2, Users, Briefcase, Eye, MessageSquare, Shield, Check, ArrowRight } from "lucide-react";
import BlobButton from "@/components/BlobButton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Sparkle from "@/components/Sparkle";
import { Button } from "@/components/ui/button";

const Partnerships = () => {
  const partnershipFormUrl = "https://forms.cloud.microsoft/r/p3SpiyHh7k";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Partnerships - Clstr",
    url: "https://clstr.network/partnerships",
    description: "Partner with Clstr to power real campus connections. Engage verified student and alumni communities through a focused, campus-first network.",
    publisher: {
      "@type": "Organization",
      name: "Clstr",
      url: "https://clstr.network",
    },
  };

  return (
    <div className="landing-theme">
      <SEO
        title="Partnerships"
        description="Partner with Clstr to power real campus connections. Engage verified student and alumni communities through a focused, campus-first network."
        jsonLd={jsonLd}
      />
      <Navbar />

      <div className="relative bg-black min-h-screen overflow-hidden">
        {/* Decorative elements */}
        <Sparkle className="top-24 left-[15%]" size={32} delay={0} />
        <Sparkle className="top-32 right-[20%]" size={24} delay={0.5} />
        <Sparkle className="top-[60%] left-[10%]" size={28} delay={1} />
        <Sparkle className="bottom-[20%] right-[15%]" size={26} delay={1.5} />
        <div className="absolute top-[15%] left-[20%] w-3 h-3 bg-solana-cyan rotate-45" />
        <div className="absolute top-[20%] right-[25%] w-4 h-4 bg-solana-yellow rounded-full" />
        <div className="absolute bottom-[30%] left-[25%] w-4 h-4 bg-solana-pink rounded-full" />
        <div className="absolute bottom-[15%] right-[30%] w-3 h-3 bg-solana-green rotate-45" />

        <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
          {/* Hero Section */}
          <header className="text-center max-w-5xl mx-auto mb-16 md:mb-20">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 md:mb-8 leading-tight">
              Partner with <span className="text-[#c8ff00]">Clstr</span> to power real campus connections
            </h1>
            <p className="text-white/40 text-base md:text-lg lg:text-xl mb-10 max-w-3xl mx-auto leading-relaxed">
              Clstr helps colleges, clubs, and organizations engage verified student and alumni communities through a focused, campus-first network built for real interaction.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a href={partnershipFormUrl} target="_blank" rel="noreferrer">
                <BlobButton className="w-auto min-w-[14em] px-8 md:px-10 whitespace-nowrap">Become a Partner</BlobButton>
              </a>
              <a
                href="#who-we-partner-with"
                className="text-white font-medium text-sm tracking-wider px-6 py-3 rounded-full border border-white/30 hover:bg-white/10 transition-colors"
              >
                Explore Partnership Types
              </a>
            </div>
          </header>

          {/* Who We Partner With */}
          <section id="who-we-partner-with" className="max-w-5xl mx-auto mb-16 md:mb-20">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-8 md:mb-10 text-center">
              Who We <span className="text-solana-cyan">Partner With</span>
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Colleges & Institutions */}
              <div className="bg-[#1a1a1a] rounded-3xl p-8 border border-solana-cyan/20">
                <div className="w-14 h-14 bg-solana-cyan rounded-2xl flex items-center justify-center mb-6">
                  <Building2 className="w-7 h-7 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Colleges & Institutions</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2 text-white/40 text-sm">
                    <Check className="w-4 h-4 text-solana-cyan flex-shrink-0 mt-0.5" />
                    <span>Alumni engagement & mentorship programs</span>
                  </div>
                  <div className="flex items-start gap-2 text-white/40 text-sm">
                    <Check className="w-4 h-4 text-solana-cyan flex-shrink-0 mt-0.5" />
                    <span>Verified club and event visibility</span>
                  </div>
                  <div className="flex items-start gap-2 text-white/40 text-sm">
                    <Check className="w-4 h-4 text-solana-cyan flex-shrink-0 mt-0.5" />
                    <span>Campus-wide communication channels</span>
                  </div>
                </div>
                <a href={partnershipFormUrl} target="_blank" rel="noreferrer">
                  <Button className="w-full bg-solana-cyan text-solana-dark hover:bg-solana-cyan/90 font-semibold">
                    Partner as a College
                  </Button>
                </a>
              </div>

              {/* Clubs & Student Communities */}
              <div className="bg-[#1a1a1a] rounded-3xl p-8 border border-solana-pink/20">
                <div className="w-14 h-14 bg-solana-pink rounded-2xl flex items-center justify-center mb-6">
                  <Users className="w-7 h-7 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Clubs & Student Communities</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2 text-white/40 text-sm">
                    <Check className="w-4 h-4 text-solana-pink flex-shrink-0 mt-0.5" />
                    <span>Promote events to the right audience</span>
                  </div>
                  <div className="flex items-start gap-2 text-white/40 text-sm">
                    <Check className="w-4 h-4 text-solana-pink flex-shrink-0 mt-0.5" />
                    <span>Recruit members consistently</span>
                  </div>
                  <div className="flex items-start gap-2 text-white/40 text-sm">
                    <Check className="w-4 h-4 text-solana-pink flex-shrink-0 mt-0.5" />
                    <span>Build a lasting campus presence</span>
                  </div>
                </div>
                <a href={partnershipFormUrl} target="_blank" rel="noreferrer">
                  <Button className="w-full bg-solana-pink text-solana-dark hover:bg-solana-pink/90 font-semibold">
                    Register Your Club
                  </Button>
                </a>
              </div>

              {/* Brands & Organizations */}
              <div className="bg-[#1a1a1a] rounded-3xl p-8 border border-solana-yellow/20">
                <div className="w-14 h-14 bg-solana-yellow rounded-2xl flex items-center justify-center mb-6">
                  <Briefcase className="w-7 h-7 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Brands & Organizations</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2 text-white/40 text-sm">
                    <Check className="w-4 h-4 text-solana-yellow flex-shrink-0 mt-0.5" />
                    <span>Reach verified, campus-specific audiences</span>
                  </div>
                  <div className="flex items-start gap-2 text-white/40 text-sm">
                    <Check className="w-4 h-4 text-solana-yellow flex-shrink-0 mt-0.5" />
                    <span>Sponsor events or initiatives</span>
                  </div>
                  <div className="flex items-start gap-2 text-white/40 text-sm">
                    <Check className="w-4 h-4 text-solana-yellow flex-shrink-0 mt-0.5" />
                    <span>Share internships, jobs, or opportunities</span>
                  </div>
                </div>
                <a href={partnershipFormUrl} target="_blank" rel="noreferrer">
                  <Button className="w-full bg-solana-yellow text-solana-dark hover:bg-solana-yellow/90 font-semibold">
                    Partner as a Brand
                  </Button>
                </a>
              </div>
            </div>
          </section>

          {/* What Partners Get */}
          <section className="max-w-5xl mx-auto mb-16 md:mb-20">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-8 md:mb-10 text-center">
              What Partners <span className="text-solana-purple">Get</span>
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-cyan rounded-xl flex items-center justify-center mb-6">
                  <Eye className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Visibility</h3>
                <ul className="space-y-3 text-white/40 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-solana-cyan mt-1">â€¢</span>
                    <span>Access to verified campus communities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-solana-cyan mt-1">â€¢</span>
                    <span>Placement inside a focused, high-intent network</span>
                  </li>
                </ul>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-pink rounded-xl flex items-center justify-center mb-6">
                  <MessageSquare className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Engagement</h3>
                <ul className="space-y-3 text-white/40 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-solana-pink mt-1">â€¢</span>
                    <span>Events, posts, mentorship, and opportunities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-solana-pink mt-1">â€¢</span>
                    <span>Two-way interaction â€” not one-way advertising</span>
                  </li>
                </ul>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-yellow rounded-xl flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Trust & Verification</h3>
                <ul className="space-y-3 text-white/40 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-solana-yellow mt-1">â€¢</span>
                    <span>College-domain verification</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-solana-yellow mt-1">â€¢</span>
                    <span>Role-based access (students, alumni, club leads)</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* How Partnerships Work */}
          <section className="max-w-4xl mx-auto mb-16 md:mb-20">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-8 md:mb-10 text-center">
              How Partnerships <span className="text-solana-green">Work</span>
            </h2>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-solana-cyan rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                  1
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Submit Request</h3>
                <p className="text-white/40 text-sm">Submit a partnership request</p>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-solana-pink rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                  2
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Review</h3>
                <p className="text-white/40 text-sm">Clstr reviews and verifies the request</p>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-solana-yellow rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                  3
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Access Granted</h3>
                <p className="text-white/40 text-sm">Access is granted with the right tools</p>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-solana-green rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                  4
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Go Live</h3>
                <p className="text-white/40 text-sm">The partnership goes live inside the campus ecosystem</p>
              </div>
            </div>
            <p className="text-center text-solana-cyan font-semibold mt-8 text-lg">
              No contracts. No noise. Only real engagement.
            </p>
          </section>

          {/* Real Use Cases */}
          <section className="max-w-4xl mx-auto mb-16 md:mb-20">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-8 md:mb-10 text-center">
              Real <span className="text-solana-purple">Use Cases</span>
            </h2>
            <div className="space-y-4">
              <div className="bg-[#1a1a1a] rounded-2xl p-6 flex items-start gap-4">
                <ArrowRight className="w-6 h-6 text-solana-cyan flex-shrink-0 mt-1" />
                <p className="text-white/40 text-base">
                  A college launches an alumni mentorship drive across departments
                </p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-6 flex items-start gap-4">
                <ArrowRight className="w-6 h-6 text-solana-pink flex-shrink-0 mt-1" />
                <p className="text-white/40 text-base">
                  A student club recruits 200+ members within a week
                </p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-6 flex items-start gap-4">
                <ArrowRight className="w-6 h-6 text-solana-yellow flex-shrink-0 mt-1" />
                <p className="text-white/40 text-base">
                  A brand sponsors a campus event and hires interns directly
                </p>
              </div>
            </div>
          </section>

          {/* Partnership Request CTA */}
          <section id="partnership-form" className="text-center max-w-4xl mx-auto mb-16 md:mb-20">
            <div className="bg-gradient-to-br from-solana-cyan/10 to-solana-purple/10 border border-solana-cyan/30 rounded-3xl p-8 md:p-12">
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
                Ready to <span className="text-[#c8ff00]">Partner?</span>
              </h2>
              <p className="text-white/40 text-base md:text-lg max-w-2xl mx-auto mb-8">
                Submit your partnership request and we'll be in touch.
              </p>
              <div className="flex items-center justify-center mb-4">
                <a href={partnershipFormUrl} target="_blank" rel="noreferrer">
                  <BlobButton className="w-auto min-w-[14em] px-8 md:px-10 whitespace-nowrap">Request Partnership</BlobButton>
                </a>
              </div>
              <p className="text-white/60 text-sm">
                Applications are reviewed on a rolling basis.
              </p>
            </div>
          </section>

          {/* Footer Trust Filter */}
          <section className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-3xl p-8 md:p-10">
              <p className="text-white text-xl md:text-2xl font-bold text-center">
                We partner selectively to protect the quality of campus communities.
              </p>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Partnerships;
