/**
 * RouteGuard Component
 * 
 * Enforces role-based route access based on the FINAL Feature × Profile Matrix.
 * Redirects users if they don't have permission to access a route.
 * 
 * Usage:
 * ```tsx
 * <Route path="/jobs" element={
 *   <RouteGuard>
 *     <Layout><Jobs /></Layout>
 *   </RouteGuard>
 * } />
 * ```
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RouteGuardProps {
  children: ReactNode;
  /**
   * Optional custom redirect path (defaults to /home)
   */
  redirectTo?: string;
  /**
   * If true, shows an alert message instead of silently redirecting
   */
  showAlert?: boolean;
}

export function RouteGuard({ children, redirectTo = '/home', showAlert = false }: RouteGuardProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { canAccessRoute: checkRoute, isLoading, profileType } = useFeatureAccess();

  // While loading, show nothing to prevent flicker
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/60"></div>
      </div>
    );
  }

  // Not logged in - let Layout handle auth redirect
  if (!profileType) {
    return <Navigate to="/login" replace />;
  }

  // Check if current route is accessible
  const hasAccess = checkRoute(location.pathname);

  if (!hasAccess) {
    if (showAlert) {
      return (
        <div className="container max-w-2xl py-12 px-4">
          <Alert variant="destructive">
            <Shield className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">Access Restricted</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-4">
                This feature is not available for your profile type ({profileType}). 
                Please check the platform features guide to see which features are available to you.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => navigate(-1)} variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
                <Button onClick={() => navigate(redirectTo)} size="sm">
                  Go to Home
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    // Silent redirect
    return <Navigate to={redirectTo} replace />;
  }

  // Access granted
  return <>{children}</>;
}

/**
 * Inline component to conditionally render based on route access
 */
export function CanAccessRoute({ 
  route, 
  children, 
  fallback 
}: { 
  route: string; 
  children: ReactNode; 
  fallback?: ReactNode;
}) {
  const { canAccessRoute } = useFeatureAccess();

  if (!canAccessRoute(route)) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

export default RouteGuard;
