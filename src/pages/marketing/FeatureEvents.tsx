import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Calendar, MapPin, Users } from "lucide-react";
import BlobButton from "@/components/BlobButton";
import Sparkle from "@/components/Sparkle";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const FeatureEvents = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Events",
    description: "Campus events discovery with verified organizers and clear outcomes.",
    url: "https://clstr.network/features/events",
    isPartOf: {
      "@type": "CollectionPage",
      name: "Clstr Features",
      url: "https://clstr.network/features",
    },
    about: {
      "@type": "Event",
      name: "Campus events",
      eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
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
        title="Events"
        description="Find high-signal campus events and connect with verified organizers on Clstr."
        jsonLd={jsonLd}
      />
      <Navbar />

      <div className="relative bg-black min-h-screen overflow-hidden">
        <Sparkle className="top-24 left-[15%]" size={32} delay={0} />
        <Sparkle className="top-32 right-[20%]" size={24} delay={0.5} />
        <div className="absolute top-[15%] left-[20%] w-3 h-3 bg-solana-green rotate-45" />
        <div className="absolute top-[20%] right-[25%] w-4 h-4 bg-solana-yellow rounded-full" />
        <div className="absolute top-[35%] left-[10%] w-2 h-6 bg-solana-cyan rotate-12" />
        <div className="absolute top-[40%] right-[15%] w-3 h-3 bg-solana-pink rotate-45" />

        <div className="relative z-10 container mx-auto px-6 py-16 md:py-24">
          <header className="text-center max-w-4xl mx-auto mb-16">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-solana-green mb-4">Feature</p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              <span className="text-white">Events that prioritize</span>
              <br />
              <span className="text-[#c8ff00]">learning & impact</span>
            </h1>
            <p className="text-white/40 text-lg md:text-xl mb-10">
              From hackathons to sustainability meetups, Clstr surfaces events that match your goals and build your campus reputation.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/signup"><BlobButton>Discover events</BlobButton></Link>
              <Link to="/features" className="text-white font-medium text-sm tracking-wider px-6 py-3 rounded-full border border-white/30 hover:bg-white/10 transition-colors">Explore all features</Link>
            </div>
          </header>

          <section className="max-w-5xl mx-auto mb-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-green rounded-xl flex items-center justify-center mb-6">
                  <Calendar className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Verified hosts</h3>
                <p className="text-white/40 text-sm">Reduce spam and ensure credible event listings.</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-yellow rounded-xl flex items-center justify-center mb-6">
                  <MapPin className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Outcome-led</h3>
                <p className="text-white/40 text-sm">Highlight hiring, mentorship, or project matchups.</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-8">
                <div className="w-12 h-12 bg-solana-cyan rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-solana-dark" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Clean RSVP</h3>
                <p className="text-white/40 text-sm">Keep attendance data clean for organizers.</p>
              </div>
            </div>
          </section>

          <section className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2 mb-16">
            <div className="bg-[#1a1a1a] rounded-3xl p-10 hover:bg-[#222222] transition-colors">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Outcome-led discovery</h2>
              <p className="text-white/40 leading-relaxed">Each event highlights learning goals, expected takeaways, and who should attend so students make confident commitments.</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-3xl p-10 hover:bg-[#222222] transition-colors">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Community visibility</h2>
              <p className="text-white/40 leading-relaxed">Event pages are optimized for public discovery, helping organizers build authority while giving students clear context before joining.</p>
            </div>
          </section>

          <section className="text-center bg-[#1a1a1a] rounded-3xl p-12 max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Never miss the <span className="text-solana-green">campus moments</span> that matter</h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto mb-8">Explore events that help you learn, connect, and lead across your campus ecosystem.</p>
            <Link to="/signup"><BlobButton>Get started now</BlobButton></Link>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default FeatureEvents;
