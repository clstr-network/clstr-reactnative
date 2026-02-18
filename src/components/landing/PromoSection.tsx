import { Link } from "react-router-dom";
import BlobButton from "../BlobButton";

const PromoSection = () => {
  return (
    <section className="relative bg-black py-16 md:py-24 overflow-hidden">
      {/* Decorative confetti elements */}
      <div className="absolute top-[15%] left-[20%] w-3 h-3 bg-[#00ff88] rotate-45" />
      <div className="absolute top-[20%] right-[25%] w-4 h-4 bg-[#ff1b6b] rounded-full" />
      <div className="absolute top-[35%] left-[10%] w-2 h-6 bg-[#ffeb3b] rotate-12" />
      <div className="absolute top-[40%] right-[15%] w-3 h-3 bg-[#00bcd4] rotate-45" />
      <div className="absolute top-[25%] left-[35%] w-2 h-2 bg-[#bf0fff] rounded-full" />
      <div className="absolute top-[30%] right-[35%] w-4 h-2 bg-[#ff930f]" />
      
      <div className="container mx-auto px-4 text-center relative z-10">
        {/* Main headline */}
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
          <span className="text-[#c8ff00]">Find Your Tribe.</span>
          <br />
          <span className="text-white">Inside Your College Network.</span>
        </h2>

        {/* Description */}
        <p className="text-white/40 text-lg md:text-xl max-w-2xl mx-auto mb-10">
          A private social platform where students and alumni from the same college connect, share, and grow together — verified by college email.
        </p>

        {/* CTA Buttons */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/login">
            <BlobButton>
              Join with College Email
            </BlobButton>
          </Link>
          
          <Link
            to="/login"
            className="text-white font-medium text-sm tracking-wider px-6 py-3 rounded-full border border-white/30 hover:bg-white/10 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PromoSection;
