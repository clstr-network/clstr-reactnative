import { ReactNode, useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNavigation from '../mobile/BottomNavigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetwork';

type PublicLayoutProps = {
  children: ReactNode;
};

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
 * PublicLayout - Layout wrapper for public routes that don't require authentication
 * 
 * Key differences from Layout:
 * - Does NOT redirect to login if unauthenticated
 * - Shows the page content to everyone (logged in or not)
 * - Still shows Navbar for navigation
 * - If user IS authenticated and onboarding incomplete, still redirect to onboarding
 */
const PublicLayout = ({ children }: PublicLayoutProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated' | 'offline'>('loading');
  const { isOnline } = useNetworkStatus();
  const hasInitialized = useRef(false);
  const authStateRef = useRef<'loading' | 'authenticated' | 'unauthenticated' | 'offline'>('loading');
  const {
    isLoading: isProfileLoading,
    isOnboardingRequired,
  } = useProfile();
  const { isOnline: isNetOnline } = useNetworkStatus();

  // Keep ref in sync with state
  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  // Auth check - runs once on mount
  useEffect(() => {
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

        setAuthState(currentSession ? 'authenticated' : 'unauthenticated');
      } catch (error) {
        console.error('Unexpected auth check error:', error);
        if (mounted) {
          setAuthState('offline');
        }
      }
    };

    initializeAuth();

    // Timeout to prevent infinite loading
    const authCheckTimeout = setTimeout(() => {
      if (mounted && authStateRef.current === 'loading') {
        console.warn('Auth check timed out');
        setAuthState('offline');
      }
    }, 3000);

    // Auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setAuthState('unauthenticated');
      } else if (event === 'PASSWORD_RECOVERY' && newSession) {
        // User clicked the password reset link — redirect to update-password.
        setAuthState('authenticated');
        navigate('/update-password', { replace: true });
      } else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && newSession) {
        setAuthState('authenticated');
      } else if (event === 'INITIAL_SESSION' && !newSession) {
        setAuthState('unauthenticated');
      }
    });

    return () => {
      mounted = false;
      clearTimeout(authCheckTimeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Show brief loading during initial auth check
  if (authState === 'loading') {
    return <LoadingSkeleton />;
  }

  // RISK 3 MITIGATION: Block content while profile state is unresolved for authenticated users.
  // Prevents flash of feature content before onboarding redirect kicks in.
  if (
    authState === 'authenticated' &&
    isProfileLoading &&
    location.pathname !== '/onboarding' &&
    location.pathname !== '/auth/callback'
  ) {
    return <LoadingSkeleton />;
  }

  // If authenticated user needs onboarding, redirect
  // But only if we've finished checking profile
  // OFFLINE FIX: Never redirect when offline or on network error
  if (
    authState === 'authenticated' &&
    !isProfileLoading &&
    isOnboardingRequired &&
    isNetOnline &&
    location.pathname !== '/onboarding'
  ) {
    // Use navigate instead of Navigate component to avoid render issues
    navigate('/onboarding', { replace: true });
    return null;
  }

  // Hide navbar for unauthenticated users on event detail pages
  const isEventDetailPage = location.pathname.startsWith('/event/');
  const shouldHideNavbar = authState === 'unauthenticated' && isEventDetailPage;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Offline indicator banner */}
      {!isOnline && (
        <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>You're offline. Some features may not work.</span>
        </div>
      )}
      {!shouldHideNavbar && <Navbar />}
      <main className={`flex-1 ${isMobile ? 'pb-16' : ''}`}>
        {children}
      </main>
      {isMobile && !shouldHideNavbar && <BottomNavigation />}
    </div>
  );
};

export default PublicLayout;
