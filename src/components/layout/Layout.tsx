
import { ReactNode, useEffect, useState, useRef } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';

import BottomNavigation from '../mobile/BottomNavigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { useIdentityContext } from '@/contexts/IdentityContext';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { useNetworkStatus } from '@/hooks/useNetwork';

type LayoutProps = {
  children: ReactNode;
};

// Public routes that don't require authentication
// NOTE: Most public routes are not wrapped in Layout; keep this list minimal and explicit.
const PUBLIC_ROUTES = ['/', '/login', '/signup'];

// Loading skeleton component
const LoadingSkeleton = () => (
  <div className="flex items-center justify-center min-h-screen bg-black text-white home-theme">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/60"></div>
      <p className="text-sm text-white/60">Loading...</p>
    </div>
  </div>
);

/**
 * UX-2 FIX: Shown when an authenticated user has onboarding_complete = true
 * but college_domain is NULL. Community-scoped pages (Network, Events,
 * Mentorship, Team-Ups) all use college_domain for queries and would
 * render empty states without explanation.
 */
const NullDomainGuard = () => (
  <div className="flex items-center justify-center min-h-screen bg-black text-white">
    <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
      <AlertTriangle className="h-12 w-12 text-yellow-400" />
      <h2 className="text-lg font-semibold">College Not Linked</h2>
      <p className="text-sm text-white/60">
        Your account isn't linked to a college community. Community features like
        Network, Events, Mentorship, and Team-Ups require a college affiliation.
      </p>
      <p className="text-sm text-white/60">
        Please sign in with your academic email address, or contact support at{' '}
        <a href="mailto:support@clstr.network" className="underline text-white/80">
          support@clstr.network
        </a>
        {' '}for assistance.
      </p>
    </div>
  </div>
);

// Routes that require a college_domain to render meaningful content
const COMMUNITY_ROUTES = ['/network', '/alumni', '/events', '/mentorship', '/team-ups', '/ecocampus'];

const Layout = ({ children }: LayoutProps) => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated' | 'offline'>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const { isOnline } = useNetworkStatus();
  const hasInitialized = useRef(false);
  const authStateRef = useRef<'loading' | 'authenticated' | 'unauthenticated' | 'offline'>('loading');
  const {
    isLoading: isProfileLoading,
    isOnboardingRequired,
    hasProfile
  } = useProfile();

  // UX-2 FIX: Check college_domain for community route guard
  const { collegeDomain, isLoading: isIdentityLoading, role } = useIdentityContext();

  // Keep ref in sync with state for use in timeout callback
  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  // Single source of truth auth check - runs once on mount
  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('Auth check error:', error);
          setAuthState('offline');
          return;
        }

        setSession(currentSession);
        setAuthState(currentSession ? 'authenticated' : 'unauthenticated');
      } catch (error) {
        console.error('Unexpected auth check error:', error);
        if (mounted) {
          setAuthState('offline');
        }
      }
    };

    // Perform initial auth check
    initializeAuth();

    // Set timeout to prevent infinite loading (3 seconds max)
    // Use ref to get current authState value, not stale closure
    const authCheckTimeout = setTimeout(() => {
      if (mounted && authStateRef.current === 'loading') {
        console.warn('Auth check timed out');
        setAuthState('offline');
      }
    }, 3000);

    // Set up auth state listener for session changes (handles sign in/out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      // Only update if there's an actual change to prevent loops
      setSession((prev) => {
        if (prev?.user?.id === newSession?.user?.id) return prev;
        return newSession;
      });

      if (event === 'SIGNED_OUT') {
        setAuthState('unauthenticated');
      } else if (event === 'PASSWORD_RECOVERY' && newSession) {
        // User clicked the password reset link from email.
        // Redirect to /update-password so they can set a new password.
        setAuthState('authenticated');
        navigate('/update-password', { replace: true });
      } else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && newSession) {
        setAuthState('authenticated');
      } else if (event === 'INITIAL_SESSION' && !newSession) {
        setAuthState('unauthenticated');
      }
    });

    // Cleanup
    return () => {
      mounted = false;
      clearTimeout(authCheckTimeout);
      subscription.unsubscribe();
    };
  }, [navigate]); // navigate is stable — safe to include

  const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname);
  const isOnboardingRoute = location.pathname === '/onboarding';
  const isAuthCallbackRoute = location.pathname === '/auth/callback';

  // Show loading only during initial auth check, NOT during profile loading
  // Profile loading happens in parallel and shouldn't block the UI
  if (authState === 'loading') {
    return <LoadingSkeleton />;
  }

  // Hard auth enforcement: if Layout is mounted and there is no session, redirect.
  if (authState === 'unauthenticated' && !isPublicRoute) {
    return <Navigate to="/login" replace />;
  }

  // RISK 3 MITIGATION: While profile is still loading for authenticated users
  // on non-public routes, show loading skeleton instead of rendering feature content.
  // This prevents the race condition where a user sees feature pages before
  // the profile check completes (e.g. after browser crash during onboarding).
  if (authState === 'authenticated' && isProfileLoading && !isPublicRoute && !isOnboardingRoute && !isAuthCallbackRoute) {
    return <LoadingSkeleton />;
  }

  // Hard onboarding enforcement: if authenticated but onboarding incomplete, force redirect.
  // Wait for profile loading to complete before redirecting to onboarding.
  // OFFLINE FIX: Never redirect when offline — isOnboardingRequired already accounts
  // for error state, but we add an explicit isOnline check as a safety net.
  if (authState === 'authenticated' && !isProfileLoading && isOnboardingRequired && isOnline && !isPublicRoute && !isOnboardingRoute && !isAuthCallbackRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  // UX-2 FIX: Guard community-scoped routes for users with NULL college_domain.
  // These pages use college_domain for all queries and would show empty states
  // without explanation. Show a helpful message instead.
  const isCommunityRoute = COMMUNITY_ROUTES.some(r => location.pathname.startsWith(r));
  const communityRoleTypes = ['Student', 'Alumni', 'Faculty', 'Principal', 'Dean'];
  const needsDomainForRoute = isCommunityRoute
    && authState === 'authenticated'
    && !isProfileLoading
    && !isIdentityLoading
    && hasProfile
    && !collegeDomain
    && role != null
    && communityRoleTypes.includes(role);

  if (needsDomainForRoute) {
    return <NullDomainGuard />;
  }

  return (
    <div className="flex min-h-screen h-[100dvh] flex-col">
      {/* Offline indicator banner */}
      {!isOnline && (
        <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>You're offline. Some features may not work.</span>
        </div>
      )}
      <Navbar />
      <main className={`flex-1 min-h-0 overflow-y-auto ${isMobile ? 'pb-16' : ''}`}>
        {children}
      </main>
      {isMobile && <BottomNavigation />}
      {/* Hide footer on mobile devices */}

    </div>
  );
};

export default Layout;

