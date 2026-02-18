
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container px-4 py-8 md:px-6 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-bold">clstr</span>
            </Link>
            <p className="text-sm text-white/60">
              Bridging the gap between students and alumni through secure, purpose-driven interactions.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-white/60 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
              <a href="#" className="text-white/60 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a href="#" className="text-white/60 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                  <rect x="2" y="9" width="4" height="12"></rect>
                  <circle cx="4" cy="4" r="2"></circle>
                </svg>
              </a>
              <a href="#" className="text-white/60 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                </svg>
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium">Features</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link to="/network" className="text-white/60 hover:text-white transition-colors">Networking</Link>
              </li>
              <li>
                <Link to="/mentorship" className="text-white/60 hover:text-white transition-colors">Mentorship</Link>
              </li>
              <li>
                <Link to="/events" className="text-white/60 hover:text-white transition-colors">Events</Link>
              </li>
              <li>
                <Link to="/resources" className="text-white/60 hover:text-white transition-colors">Resources</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium">Resources</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a
                  href="https://forms.cloud.microsoft/r/7HPbPj3Rq8"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  Help Center
                </a>
              </li>
              <li>
                <Link to="/campus-ambassadors" className="text-white/60 hover:text-white transition-colors">Campus Ambassadors</Link>
              </li>
              <li>
                <Link to="/privacy" className="text-white/60 hover:text-white transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms" className="text-white/60 hover:text-white transition-colors">Terms of Service</Link>
              </li>
              <li>
                <Link to="/contact" className="text-white/60 hover:text-white transition-colors">Contact Us</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium">Stay Connected</h3>
            <p className="mt-4 text-sm text-white/60">
              Subscribe to our newsletter for updates on events, opportunities, and more.
            </p>
            <form className="mt-4">
              <div className="flex">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full min-w-0 flex-1 rounded-l-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
                <button
                  type="submit"
                  className="inline-flex items-center rounded-r-md border border-transparent bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/[0.15]"
                >
                  Subscribe
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-8 text-center">
          <p className="text-xs text-white/60">
            &copy; {new Date().getFullYear()} clstr. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
