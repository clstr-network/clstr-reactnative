import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "./ui/input";
import BlobButton from "./BlobButton";
const Footer = () => {
  const features = [
    { label: "Networking", href: "/features/networking" },
    { label: "Career Opportunities", href: "/features/career-opportunities" },
    { label: "Mentorship", href: "/features/mentorship" },
    { label: "Events", href: "/features/events" },
    { label: "Clubs & Communities", href: "/features/clubs" },
  ];
  const resources = [
    { label: "Help Center", href: "https://forms.cloud.microsoft/r/7HPbPj3Rq8", external: true },
    { label: "Campus Ambassadors", href: "/campus-ambassadors" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Contact Us", href: "/contact" },
  ];
  return <footer className="relative bg-card overflow-hidden">
      {/* Decorative Shapes */}
      
      <div className="absolute top-24 left-32 w-6 h-6 md:w-10 md:h-10 bg-solana-yellow rotate-45" />
      <div className="absolute top-12 right-12 w-8 h-8 md:w-14 md:h-14 rounded-full bg-solana-green opacity-80" />
      <div className="absolute bottom-32 right-24 w-10 h-10 md:w-16 md:h-16 bg-solana-purple rotate-12 rounded-lg opacity-80" />
      <div className="absolute bottom-48 left-16 w-4 h-4 md:w-8 md:h-8 bg-solana-cyan rotate-45" />
      <div className="absolute top-1/2 right-1/3 w-6 h-6 md:w-10 md:h-10 rounded-full bg-solana-yellow opacity-60" />

      {/* Main Footer Content */}
      <div className="relative z-10 container mx-auto px-6 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-solana-purple flex items-center justify-center">
                
              </div>
              <span className="text-xl font-bold text-foreground">Clstr</span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              Bridging the gap between students and alumni through secure, purpose-driven interactions.
            </p>
            <a
              href="mailto:clstr.network@gmail.com"
              className="text-white/60 text-sm hover:text-primary transition-colors"
            >
              clstr.network@gmail.com
            </a>
            <div className="flex items-center gap-4 pt-2">
              <a
                href="https://www.instagram.com/clstr.network/"
                target="_blank"
                rel="noreferrer"
                className="text-white/60 hover:text-secondary transition-colors"
              >
                <Instagram size={20} />
              </a>
              <a
                href="https://www.linkedin.com/in/clstr-network/"
                target="_blank"
                rel="noreferrer"
                className="text-white/60 hover:text-accent transition-colors"
              >
                <Linkedin size={20} />
              </a>
              <a
                href="https://x.com/clstrnetwork"
                target="_blank"
                rel="noreferrer"
                className="text-white/60 hover:text-primary transition-colors"
              >
                <Twitter size={20} />
              </a>
            </div>
          </div>

          {/* Features Column */}
          <div>
            <h3 className="text-foreground font-semibold mb-4">Features</h3>
            <ul className="space-y-3">
              {features.map(feature => <li key={feature.label}>
                  <Link to={feature.href} className="text-white/60 hover:text-primary transition-colors text-sm">
                    {feature.label}
                  </Link>
                </li>)}
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h3 className="text-foreground font-semibold mb-4">Resources</h3>
            <ul className="space-y-3">
              {resources.map((resource) => (
                <li key={resource.label}>
                  {resource.external ? (
                    <a
                      href={resource.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-white/60 hover:text-primary transition-colors text-sm"
                    >
                      {resource.label}
                    </a>
                  ) : (
                    <Link to={resource.href} className="text-white/60 hover:text-primary transition-colors text-sm">
                      {resource.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Stay Connected */}
          <div>
            <h3 className="text-foreground font-semibold mb-4">Stay Connected</h3>
            <p className="text-white/60 text-sm mb-4">
              Subscribe to our newsletter for updates on events, opportunities, and more.
            </p>
            <div className="flex gap-2">
              <Input type="email" placeholder="Enter your email" className="bg-background border-border text-foreground placeholder:text-white/60" />
              <BlobButton className="w-[9em] h-[2.3em] text-sm shrink-0">
                Subscribe
              </BlobButton>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border mt-12 pt-8">
          <p className="text-center text-white/60 text-sm">
            © 2026 Clstr. All rights reserved.
          </p>
        </div>
      </div>
    </footer>;
};
export default Footer;