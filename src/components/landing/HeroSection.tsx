import summerCampIllustration from "@/assets/summer-camp-illustration.svg";
import Sparkle from "../Sparkle";

const HeroSection = () => {
  return (
    <section id="hero" className="relative bg-black overflow-hidden pt-4 pb-8">
      {/* Sparkles */}
      <Sparkle className="top-24 left-[15%]" size={32} delay={0} />
      <Sparkle className="top-32 right-[20%]" size={24} delay={0.5} />
      <Sparkle className="top-[35%] left-[8%]" size={20} delay={1} />
      <Sparkle className="top-[40%] right-[12%]" size={28} delay={0.3} />
      <Sparkle className="top-[25%] right-[30%]" size={16} delay={0.8} />

      {/* Illustration - Cropped on mobile, full image on desktop */}
      <div className="relative w-full">
        <img 
          src={summerCampIllustration} 
          alt="Summer Camp Illustration - Developers around a campfire" 
          className="w-full h-[60vh] sm:h-[70vh] md:h-auto object-cover md:object-contain object-center"
        />
      </div>

      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/50 pointer-events-none" />
    </section>
  );
};

export default HeroSection;