
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProfileProvider, useProfile } from "./contexts/ProfileContext";
import { IdentityProvider } from "./contexts/IdentityContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { FloatingChatWidget } from "./components/layout/FloatingChatWidget";
import ScrollToTop from "./components/layout/ScrollToTop";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminProvider } from "./contexts/AdminContext";
import { ReactivationPrompt } from "./components/auth/ReactivationPrompt";
import { InstallPrompt } from "./components/pwa/InstallPrompt";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import MagicLinkSent from "./pages/MagicLinkSent";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";
import Onboarding from "./pages/Onboarding";
import AuthCallback from "./pages/AuthCallback";
import AcademicEmailRequired from "./pages/AcademicEmailRequired";
import ClubAuth from "./pages/ClubAuth";
import ClubOnboarding from "./pages/ClubOnboarding";
import Home from "./pages/Home";
import Network from "./pages/Network";
import Mentorship from "./pages/Mentorship";
import Events from "./pages/Events";
import NotFound from "./pages/NotFound";
import Layout from "./components/layout/Layout";
import PublicLayout from "./components/layout/PublicLayout";
import AuthGate from "./components/layout/AuthGate";
import Profile from "./pages/Profile";
import ProfileConnectionsPage from "./pages/ProfileConnectionsPage";
import Messaging from "./pages/Messaging";
import Clubs from "./pages/Clubs";
import Search from "./pages/Search";
import EcoCampus from "./pages/EcoCampus";
import SavedItems from "./pages/SavedItems";
import Projects from "./pages/Projects";
import Settings from "./pages/Settings";
import HelpCenter from "./pages/HelpCenter";
import AlumniDirectory from "./pages/AlumniDirectory";
import PostDetail from "./pages/PostDetail";
import VerifyPersonalEmail from "./pages/VerifyPersonalEmail";
import EventDetail from "./pages/EventDetail";
import Features from "./pages/marketing/Features";
import FeatureNetworking from "./pages/marketing/FeatureNetworking";
import FeatureCareer from "./pages/marketing/FeatureCareer";
import FeatureMentorship from "./pages/marketing/FeatureMentorship";
import FeatureEvents from "./pages/marketing/FeatureEvents";
import FeatureClubs from "./pages/marketing/FeatureClubs";
import PublicHelpCenter from "./pages/marketing/PublicHelpCenter";
import PrivacyPolicy from "./pages/marketing/PrivacyPolicy";
import TermsOfService from "./pages/marketing/TermsOfService";
import ContactUs from "./pages/marketing/ContactUs";
import CampusAmbassador from "./pages/marketing/CampusAmbassador";
import Partnerships from "./pages/marketing/Partnerships";
import Portfolio from "./pages/Portfolio";
import PortfolioEditor from "./pages/PortfolioEditor";
import PortfolioTemplatePicker from "./pages/PortfolioTemplatePicker";

import AlumniInvite from "./pages/AlumniInvite";

// Admin Pages
import AdminOverview from "./pages/admin/AdminOverview";
import AdminColleges from "./pages/admin/AdminColleges";
import AdminDomains from "./pages/admin/AdminDomains";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminTalentGraph from "./pages/admin/AdminTalentGraph";
import AdminRecruiters from "./pages/admin/AdminRecruiters";
import AdminCollabHub from "./pages/admin/AdminCollabHub";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAlumniInvites from "./pages/admin/AdminAlumniInvites";

const queryClient = new QueryClient();

const FloatingChatWidgetGate = () => {
  const isMobile = useIsMobile();
  const location = useLocation();

  // Mobile: hide all floating bubble buttons to avoid overlap.
  if (isMobile) return null;
  
  // Hide on messaging page to avoid duplication
  if (location.pathname === '/messaging') return null;
  
  return <FloatingChatWidget />;
};

const PageFade = ({ children }: { children: React.ReactNode }) => (
  <div className="relative min-h-screen">
    {/* Black overlay so transitions fade to/from black instead of white */}
    <motion.div
      className="absolute inset-0 bg-black z-10"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      exit={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    />

    <motion.div
      className="relative z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  </div>
);

/**
 * Global auth event listener — handles PASSWORD_RECOVERY across all routes.
 * When a user clicks the password reset link, Supabase fires PASSWORD_RECOVERY.
 * This component ensures the user is always redirected to /update-password,
 * regardless of which page they're currently on.
 */
const GlobalAuthListener = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session && location.pathname !== '/update-password') {
          navigate('/update-password', { replace: true });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  return null;
};

/**
 * Deactivation gate: when a user's account is deactivated, render ONLY
 * the ReactivationPrompt. No feed, messaging, search, or other app
 * features are mounted. Defense in depth — RLS blocks server-side, but
 * this prevents stale UI on the client.
 */
const DeactivationGate = ({ children }: { children: React.ReactNode }) => {
  const { isDeactivated, isLoading } = useProfile();

  // Don't block while loading — wait for profile fetch to complete
  if (isLoading) return <>{children}</>;

  if (isDeactivated) {
    return <ReactivationPrompt />;
  }

  return <>{children}</>;
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Landing page — guarded to prevent authenticated flash */}
        <Route path="/" element={<AuthGate><Landing /></AuthGate>} />

        {/* Public marketing pages */}
        <Route path="/features" element={<Features />} />
        <Route path="/features/networking" element={<FeatureNetworking />} />
        <Route path="/features/career-opportunities" element={<FeatureCareer />} />
        <Route path="/features/mentorship" element={<FeatureMentorship />} />
        <Route path="/features/events" element={<FeatureEvents />} />
        <Route path="/features/clubs" element={<FeatureClubs />} />
        <Route path="/help-center" element={<PublicHelpCenter />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/campus-ambassadors" element={<CampusAmbassador />} />
        <Route path="/partnerships" element={<Partnerships />} />

        {/* Portfolio editor & template picker — auth required */}
        <Route path="/portfolio/editor" element={<Layout><PortfolioEditor /></Layout>} />
        <Route path="/portfolio/templates" element={<Layout><PortfolioTemplatePicker /></Layout>} />

        {/* Public portfolio page — no auth required */}
        <Route path="/portfolio/:slug" element={<Portfolio />} />

        {/* Auth pages — show a subtle fade-in when navigating here */}
        <Route path="/login" element={<PageFade><Login /></PageFade>} />
        <Route path="/signup" element={<PageFade><Signup /></PageFade>} />
        <Route path="/verify-email" element={<PageFade><VerifyEmail /></PageFade>} />
        <Route path="/magic-link-sent" element={<PageFade><MagicLinkSent /></PageFade>} />
        <Route path="/forgot-password" element={<PageFade><ForgotPassword /></PageFade>} />
        <Route path="/update-password" element={<PageFade><UpdatePassword /></PageFade>} />
        <Route path="/auth/callback" element={<PageFade><AuthCallback /></PageFade>} />
        <Route path="/onboarding" element={<PageFade><Onboarding /></PageFade>} />
        <Route path="/academic-email-required" element={<PageFade><AcademicEmailRequired /></PageFade>} />
        <Route path="/verify-personal-email" element={<PageFade><VerifyPersonalEmail /></PageFade>} />
        <Route path="/club-auth" element={<PageFade><ClubAuth /></PageFade>} />
        <Route path="/club-onboarding" element={<PageFade><ClubOnboarding /></PageFade>} />
        <Route path="/alumni-invite" element={<PageFade><AlumniInvite /></PageFade>} />

        {/* App routes (no page-level fade) */}
        <Route path="/home" element={<Layout><Home /></Layout>} />
        <Route path="/feed" element={<Navigate to="/home" replace />} />
        <Route path="/index" element={<Navigate to="/home" replace />} />
        <Route path="/network" element={<Layout><Network /></Layout>} />
        <Route path="/alumni-directory" element={<Layout><AlumniDirectory /></Layout>} />
        <Route path="/mentorship" element={<Layout><Mentorship /></Layout>} />
        <Route path="/events" element={<Layout><Events /></Layout>} />
        <Route path="/profile/:id/connections" element={<Layout><ProfileConnectionsPage /></Layout>} />
        <Route path="/profile/:id?" element={<Layout><Profile /></Layout>} />
        <Route path="/messaging" element={<Layout><Messaging /></Layout>} />
        <Route path="/clubs" element={<Layout><Clubs /></Layout>} />
        <Route path="/search" element={<Layout><Search /></Layout>} />
        <Route path="/ecocampus" element={<Layout><EcoCampus /></Layout>} />
        <Route path="/saved" element={<Layout><SavedItems /></Layout>} />
        <Route path="/projects" element={<Layout><Projects /></Layout>} />
        <Route path="/settings" element={<Layout><Settings /></Layout>} />
        <Route path="/help" element={<Layout><HelpCenter /></Layout>} />
        {/* Post detail uses PublicLayout - allows unauthenticated viewing */}
        <Route path="/post/:id" element={<PublicLayout><PostDetail /></PublicLayout>} />
        {/* Event detail uses PublicLayout - allows unauthenticated viewing */}
        <Route path="/events/:id" element={<PublicLayout><EventDetail /></PublicLayout>} />
        <Route path="/event/:id" element={<PublicLayout><EventDetail /></PublicLayout>} />

        {/* Root-level portfolio slug — clstr.in/<slug> renders the public portfolio */}
        <Route path="/:slug" element={<Portfolio />} />
        
        {/* Admin Dashboard Routes - Internal Only */}
        <Route path="/admin" element={<AdminProvider><AdminOverview /></AdminProvider>} />
        <Route path="/admin/overview" element={<AdminProvider><AdminOverview /></AdminProvider>} />
        <Route path="/admin/colleges" element={<AdminProvider><AdminColleges /></AdminProvider>} />
        <Route path="/admin/domains" element={<AdminProvider><AdminDomains /></AdminProvider>} />
        <Route path="/admin/users" element={<AdminProvider><AdminUsers /></AdminProvider>} />
        <Route path="/admin/talent-graph" element={<AdminProvider><AdminTalentGraph /></AdminProvider>} />
        <Route path="/admin/recruiters" element={<AdminProvider><AdminRecruiters /></AdminProvider>} />
        <Route path="/admin/collabhub" element={<AdminProvider><AdminCollabHub /></AdminProvider>} />
        <Route path="/admin/analytics" element={<AdminProvider><AdminAnalytics /></AdminProvider>} />
        <Route path="/admin/reports" element={<AdminProvider><AdminReports /></AdminProvider>} />
        <Route path="/admin/settings" element={<AdminProvider><AdminSettings /></AdminProvider>} />
        <Route path="/admin/alumni-invites" element={<AdminProvider><AdminAlumniInvites /></AdminProvider>} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ProfileProvider>
          <IdentityProvider>
            <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <GlobalAuthListener />
              <DeactivationGate>
                <AnimatedRoutes />
                <FloatingChatWidgetGate />
                <InstallPrompt />
              </DeactivationGate>
            </BrowserRouter>

            {/* Animated route transitions (fade) */}
            
            
            
            </TooltipProvider>
          </IdentityProvider>
        </ProfileProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
