import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import PromoSection from "@/components/PromoSection";
import MeetIRLSection from "@/components/MeetIRLSection";
import FeaturedSections from "@/components/FeaturedSections";
import HowItWorksSection from "@/components/HowItWorksSection";
import PrizesSection from "@/components/PrizesSection";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";

const Landing = () => {
  return (
    <div className="landing-theme">
      <SEO
        title="Campus Collaboration, Mentorship & Sustainability"
        description="Clstr is the campus social ecosystem for student collaboration, alumni mentorship, and local sustainability markets."
        image="/og-image.png"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Clstr",
          url: "https://clstr.network",
          description:
            "Campus social ecosystem for student collaboration, alumni mentorship, and local sustainability markets.",
          sameAs: [],
        }}
      />
      <main className="min-h-screen bg-background">
        <Navbar />
        <HeroSection />
        <PromoSection />
        <MeetIRLSection />
        <FeaturedSections />
        <HowItWorksSection />
        <PrizesSection />
        <Footer />
      </main>
    </div>
  );
};

export default Landing;