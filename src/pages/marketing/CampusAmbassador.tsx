import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Check, X, Target, Users, MessageSquare, Shield, Award, Zap, TrendingUp } from "lucide-react";
import BlobButton from "@/components/BlobButton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Sparkle from "@/components/Sparkle";

const CampusAmbassador = () => {
  const applicationFormUrl = "https://forms.cloud.microsoft/r/p3SpiyHh7k";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Campus Ambassador Program - Clstr",
    url: "https://clstr.network/campus-ambassadors",
    description: "Lead Clstr at your campus. Become the official execution owner for campus onboarding, partnerships, and community growth.",
    publisher: {
      "@type": "Organization",
      name: "Clstr",
      url: "https://clstr.network",
    },
  };

  return (
    <div className="landing-theme">
      <SEO
        title="Campus Ambassador Program"
        description="Lead Clstr at your campus. Be the official execution owner for community activation, partnerships, and feedback coordination."
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
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-solana-cyan mb-6">Execution Owners at Clstr</p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 md:mb-8 leading-tight">
              Lead <span className="text-[#c8ff00]">Clstr</span> at Your Campus
            </h1>
            <p className="text-white/40 text-lg md:text-xl lg:text-2xl mb-4 max-w-3xl mx-auto leading-relaxed">
              Be the official execution owner for Clstr at your college or community.
            </p>
            <p className="text-white/40 text-base md:text-lg mb-10 max-w-2xl mx-auto">
              This role is about responsibility, coordination, and real impact â€” not certificates.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a href={applicationFormUrl} target="_blank" rel="noreferrer">
                <BlobButton className="w-auto min-w-[14em] px-8 md:px-10 whitespace-nowrap">Apply to Become a Campus Ambassador</BlobButton>
              </a>
              <a
                href="#responsibilities"
                className="text-white font-medium text-sm tracking-wider px-6 py-3 rounded-full border border-white/30 hover:bg-white/10 transition-colors"
              >
                View Responsibilities
              </a>
            </div>
          </header>

          {/* What Is a Campus Ambassador */}
          <section className="max-w-4xl mx-auto mb-16 md:mb-20">
            <div className="bg-[#1a1a1a] rounded-3xl p-8 md:p-10 lg:p-12 border border-solana-cyan/20">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 md:mb-6 text-center">
                What Is a <span className="text-solana-cyan">Campus Ambassador?</span>
              </h2>
              <p className="text-white/40 text-base md:text-lg mb-6 md:mb-8 text-center leading-relaxed">
                A Campus Ambassador is the single point of execution between Clstr and a campus, community, or organization.
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-black/40 rounded-2xl p-6">
                  <div className="w-10 h-10 bg-solana-cyan rounded-lg flex items-center justify-center mb-4">
                    <Users className="w-5 h-5 text-solana-dark" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Local onboarding</h3>
                  <p className="text-white/40 text-sm">Seed initial activity and help users get started.</p>
                </div>
                <div className="bg-black/40 rounded-2xl p-6">
                  <div className="w-10 h-10 bg-solana-pink rounded-lg flex items-center justify-center mb-4">
                    <Zap className="w-5 h-5 text-solana-dark" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Community activation</h3>
                  <p className="text-white/40 text-sm">Drive engagement and real platform usage.</p>
                </div>
                <div className="bg-black/40 rounded-2xl p-6">
                  <div className="w-10 h-10 bg-solana-yellow rounded-lg flex items-center justify-center mb-4">
                    <Target className="w-5 h-5 text-solana-dark" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Partner coordination</h3>
                  <p className="text-white/40 text-sm">Bridge clubs, departments, and Clstr.</p>
                </div>
                <div className="bg-black/40 rounded-2xl p-6">
                  <div className="w-10 h-10 bg-solana-green rounded-lg flex items-center justify-center mb-4">
                    <MessageSquare className="w-5 h-5 text-solana-dark" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Feedback & quality</h3>
                  <p className="text-white/40 text-sm">Act as Clstr's eyes and ears on campus.</p>
                </div>
              </div>
              <p className="text-center text-solana-cyan font-semibold mt-8 text-lg">
                One campus. One owner. Clear accountability.
              </p>
            </div>
          </section>

          {/* Who This Role Is For */}
          <section className="max-w-5xl mx-auto mb-16 md:mb-20">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-8 md:mb-10 text-center">
              Who This Role <span className="text-solana-pink">Is For</span>
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* You Should Apply */}
              <div className="bg-[#1a1a1a] rounded-3xl p-8 border-2 border-solana-green/30">
                <h3 className="text-2xl font-bold text-solana-green mb-6 flex items-center gap-2">
                  <Check className="w-6 h-6" />
                  You should apply if:
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-white/40">
                    <Check className="w-5 h-5 text-solana-green flex-shrink-0 mt-0.5" />
                    <span>You are active in your campus or community</span>
                  </li>
                  <li className="flex items-start gap-3 text-white/40">
                    <Check className="w-5 h-5 text-solana-green flex-shrink-0 mt-0.5" />
                    <span>You've led clubs, events, or initiatives before</span>
                  </li>
                  <li className="flex items-start gap-3 text-white/40">
                    <Check className="w-5 h-5 text-solana-green flex-shrink-0 mt-0.5" />
                    <span>You can onboard people and follow through</span>
                  </li>
                  <li className="flex items-start gap-3 text-white/40">
                    <Check className="w-5 h-5 text-solana-green flex-shrink-0 mt-0.5" />
                    <span>You want ownership, not just a title</span>
                  </li>
                </ul>
              </div>

              {/* You Should NOT Apply */}
              <div className="bg-[#1a1a1a] rounded-3xl p-8 border-2 border-red-500/30">
                <h3 className="text-2xl font-bold text-red-400 mb-6 flex items-center gap-2">
                  <X className="w-6 h-6" />
                  You should NOT apply if:
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3 text-white/40">
                    <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span>You're only looking for a certificate</span>
                  </li>
                  <li className="flex items-start gap-3 text-white/40">
                    <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span>You can't commit time consistently</span>
                  </li>
                  <li className="flex items-start gap-3 text-white/40">
                    <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span>You're uncomfortable coordinating directly with a startup team</span>
                  </li>
                </ul>
                <p className="text-solana-pink font-semibold mt-6 text-center">
                  This role is selective by design.
                </p>
              </div>
            </div>
          </section>

          {/* Core Responsibilities */}
          <section id="responsibilities" className="max-w-5xl mx-auto mb-16 md:mb-20">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 text-center">
              Core <span className="text-solana-yellow">Responsibilities</span>
            </h2>
            <p className="text-white/40 text-center mb-8 md:mb-10">(Non-Negotiable)</p>

            <div className="space-y-6">
              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-solana-cyan rounded-xl flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-6 h-6 text-solana-dark" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">1. Campus Execution & Growth</h3>
                    <ul className="space-y-2 text-white/40">
                      <li className="flex items-start gap-2">
                        <span className="text-solana-cyan mt-1">â€¢</span>
                        <span>Onboard students, alumni, and clubs to Clstr</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-solana-cyan mt-1">â€¢</span>
                        <span>Ensure initial activity (posts, follows, events)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-solana-cyan mt-1">â€¢</span>
                        <span>Help Clstr achieve real usage, not empty signups</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-solana-pink rounded-xl flex items-center justify-center flex-shrink-0">
                    <Target className="w-6 h-6 text-solana-dark" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">2. Partnership Coordination</h3>
                    <ul className="space-y-2 text-white/40">
                      <li className="flex items-start gap-2">
                        <span className="text-solana-pink mt-1">â€¢</span>
                        <span>Act as the local representative for Clstr</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-solana-pink mt-1">â€¢</span>
                        <span>Coordinate with clubs, departments, or communities</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-solana-pink mt-1">â€¢</span>
                        <span>Support onboarding of official partnerships</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-solana-yellow rounded-xl flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-6 h-6 text-solana-dark" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">3. Feedback & Signal Loop</h3>
                    <ul className="space-y-2 text-white/40">
                      <li className="flex items-start gap-2">
                        <span className="text-solana-yellow mt-1">â€¢</span>
                        <span>Share honest feedback from users</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-solana-yellow mt-1">â€¢</span>
                        <span>Report friction, feature gaps, and misuse</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-solana-yellow mt-1">â€¢</span>
                        <span>Act as Clstr's eyes and ears on campus</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-solana-green rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-solana-dark" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-3">4. Community Quality & Trust</h3>
                    <ul className="space-y-2 text-white/40">
                      <li className="flex items-start gap-2">
                        <span className="text-solana-green mt-1">â€¢</span>
                        <span>Help maintain authenticity</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-solana-green mt-1">â€¢</span>
                        <span>Flag spam, fake accounts, or misuse</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-solana-green mt-1">â€¢</span>
                        <span>Protect the credibility of the platform locally</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* What You Get */}
          <section className="max-w-5xl mx-auto mb-16 md:mb-20">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 text-center">
              What You <span className="text-solana-purple">Get</span>
            </h2>
            <p className="text-white/40 text-center mb-8 md:mb-10">This is not a volunteer-only role.</p>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-cyan rounded-xl flex items-center justify-center mb-6">
                  <Award className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Recognition & Authority</h3>
                <ul className="space-y-3 text-white/40 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-solana-cyan mt-1">â€¢</span>
                    <span>Official Campus Ambassador badge on your Clstr profile</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-solana-cyan mt-1">â€¢</span>
                    <span>Public recognition as the campus execution lead</span>
                  </li>
                </ul>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-pink rounded-xl flex items-center justify-center mb-6">
                  <Zap className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Access & Exposure</h3>
                <ul className="space-y-3 text-white/40 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-solana-pink mt-1">â€¢</span>
                    <span>Direct coordination with Clstr founders</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-solana-pink mt-1">â€¢</span>
                    <span>Early access to new features and tools</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-solana-pink mt-1">â€¢</span>
                    <span>Priority consideration for internal roles</span>
                  </li>
                </ul>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-yellow rounded-xl flex items-center justify-center mb-6">
                  <TrendingUp className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Career & Growth</h3>
                <ul className="space-y-3 text-white/40 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-solana-yellow mt-1">â€¢</span>
                    <span>Leadership credibility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-solana-yellow mt-1">â€¢</span>
                    <span>Internship or paid role opportunities (top performers)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-solana-yellow mt-1">â€¢</span>
                    <span>Letters of recommendation based on performance</span>
                  </li>
                </ul>
              </div>
            </div>

            <p className="text-center text-solana-purple font-semibold mt-8 text-lg">
              Rewards scale with execution, not intent.
            </p>
          </section>

          {/* Onboarding Process */}
          <section className="max-w-4xl mx-auto mb-16 md:mb-20">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 text-center">
              Onboarding <span className="text-solana-green">Process</span>
            </h2>
            <p className="text-white/40 text-center mb-8 md:mb-10">(Transparent)</p>

            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-solana-cyan rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                  1
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Apply</h3>
                <p className="text-white/40 text-sm">Submit the application form</p>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-solana-pink rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                  2
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Review</h3>
                <p className="text-white/40 text-sm">Short internal evaluation</p>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-solana-yellow rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                  3
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Onboarding Call</h3>
                <p className="text-white/40 text-sm">Meet with the Clstr team</p>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-solana-green rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                  4
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Activation</h3>
                <p className="text-white/40 text-sm">Campus activation begins</p>
              </div>
            </div>

            <p className="text-center text-solana-cyan font-semibold mt-8">
              Only one lead Campus Ambassador is selected per campus.
            </p>
          </section>

          {/* Expectations & Accountability */}
          <section className="max-w-4xl mx-auto mb-16 md:mb-20">
            <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-3xl p-8 md:p-10">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-6 text-center">
                Expectations & <span className="text-red-400">Accountability</span>
              </h2>
              <p className="text-white/40 text-center mb-6 md:mb-8 text-base md:text-lg">(This Is Important)</p>

              <div className="space-y-4 max-w-2xl mx-auto">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-white/40">Activity is reviewed periodically</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-white/40">Inactive ambassadors are replaced</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-white/40">High-performing ambassadors gain more responsibility</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-white/40">This is a working role, not an honorary title</p>
                </div>
              </div>

              <p className="text-center text-red-400 font-bold mt-8 text-xl">
                Ownership without execution doesn't last here.
              </p>
            </div>
          </section>

          {/* Time Commitment */}
          <section className="max-w-4xl mx-auto mb-16 md:mb-20">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 text-center">
              Time <span className="text-solana-purple">Commitment</span>
            </h2>
            <p className="text-white/40 text-center mb-8 md:mb-10">(Be Honest)</p>

            <div className="bg-[#1a1a1a] rounded-2xl p-8 max-w-2xl mx-auto">
              <ul className="space-y-4 text-white/40">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-solana-purple flex-shrink-0 mt-0.5" />
                  <span>~3â€“5 hours per week during active phases</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-solana-purple flex-shrink-0 mt-0.5" />
                  <span>Flexible, but consistent</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-solana-purple flex-shrink-0 mt-0.5" />
                  <span>Heavier involvement during launches or events</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Final CTA */}
          <section className="text-center bg-gradient-to-br from-solana-cyan/10 to-solana-purple/10 border border-solana-cyan/30 rounded-3xl p-8 md:p-12 max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Lead <span className="text-[#c8ff00]">Your Campus?</span>
            </h2>
            <p className="text-white/40 text-base md:text-lg max-w-2xl mx-auto mb-8">
              If you're serious about building something real inside your campus ecosystem, apply below.
            </p>
            <div className="flex items-center justify-center mb-4">
              <a href={applicationFormUrl} target="_blank" rel="noreferrer">
                <BlobButton className="w-auto min-w-[14em] px-8 md:px-10 whitespace-nowrap">Apply to Become a Campus Ambassador</BlobButton>
              </a>
            </div>
            <p className="text-white/60 text-sm">
              Applications are reviewed on a rolling basis.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CampusAmbassador;
