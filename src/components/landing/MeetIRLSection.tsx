import { Link } from "react-router-dom";
import meetIrlIllustration from "@/assets/meet-irl-illustration.svg";
import BlobButton from "../BlobButton";

const features = [
  { name: "Mentorship", color: "bg-solana-pink" },
  { name: "Networking", color: "bg-solana-cyan" },
  { name: "Career Guidance", color: "bg-solana-yellow" },
  { name: "Job Referrals", color: "bg-solana-green" },
];

const MeetIRLSection = () => {
  return (
    <section id="community" className="relative w-full bg-black overflow-hidden">
      {/* Background Illustration */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src={meetIrlIllustration}
          alt="Alumni Connect Illustration"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center pt-72 md:pt-96 pb-32 md:pb-48 px-4">
        {/* Title */}
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight text-center">
          Connect with your
          <br />
          <span className="bg-gradient-to-r from-solana-pink via-solana-cyan to-solana-green bg-clip-text text-transparent">
            college community
          </span>
          <br />
          past, present, and future!
        </h2>

        {/* Description */}
        <p className="text-white/40 text-center max-w-2xl mb-10 text-base md:text-lg leading-relaxed">
          AlumniConnect bridges the gap between students and alumni through
          secure, purpose-driven interactions and AI-powered career guidance.
        </p>

        {/* Feature Chips */}
        <div className="flex flex-wrap justify-center gap-3 mb-10 max-w-2xl">
          {features.map((feature) => (
            <div
              key={feature.name}
              className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] transition-colors rounded-full px-4 py-2 cursor-pointer"
            >
              <span className={`w-2 h-2 rounded-full ${feature.color}`} />
              <span className="text-white text-sm font-medium">
                {feature.name}
              </span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <Link to="/login">
          <BlobButton className="w-[9em] h-[2.3em] text-sm">
            SIGNUP
          </BlobButton>
        </Link>
      </div>
    </section>
  );
};

export default MeetIRLSection;
