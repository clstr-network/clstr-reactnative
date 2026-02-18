import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import BlobButton from "./BlobButton";

const navLinks = [
  { label: "Home", href: "#hero" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Community", href: "#community" },
];

const Navbar = () => {
  const navigate = useNavigate();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    
    // If we're not on the home page, navigate there first
    if (window.location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const element = document.querySelector(href);
        element?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm">
      <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-foreground font-bold text-xl tracking-wide">Clstr</span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link, index) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className={cn(
                "text-sm transition-colors duration-200",
                index === 0 ? "nav-link-active" : "nav-link"
              )}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA Button */}
        <Link to="/login">
          <BlobButton className="w-[9em] h-[2.3em] text-sm">
            JOIN NOW
          </BlobButton>
        </Link>
      </nav>
    </header>
  );
};

export default Navbar;