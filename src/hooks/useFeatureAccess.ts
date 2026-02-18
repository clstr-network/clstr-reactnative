/**
 * useFeatureAccess Hook
 * 
 * Provides role-based feature access control based on the FINAL Feature × Profile Matrix.
 * Uses the 4 canonical profile types: Student, Alumni, Faculty, Club
 * 
 * FINAL Feature × Profile Matrix (February 2026):
 * 
 * 5. Projects / CollabHub
 * | Feature                    | Student | Alumni | Faculty | Club |
 * |----------------------------|---------|--------|---------|------|
 * | View Projects              | ✅      | ✅     | ✅      | ✅   |
 * | Create Projects            | ✅      | ✅     | ✅      | ✅   |
 * | Apply to Projects          | ✅      | ✅     | 🚫      | 🚫   |
 * | Manage Team / Applications | ✅      | ✅     | ✅      | ✅   |
 * 
 * 6. Clubs
 * | Feature       | Student | Alumni | Faculty | Club |
 * |---------------|---------|--------|---------|------|
 * | View Clubs    | ✅      | ✅     | ✅      | ✅   |
 * | Join Club     | ✅      | 🚫     | 🚫      | 🚫   |
 * | Follow Club   | 🚫      | ✅     | 🚫      | 🚫   |
 * | Manage Club   | 🚫      | 🚫     | 🚫      | ✅   |
 * 
 * 7. Events
 * | Feature       | Student | Alumni | Faculty | Club |
 * |---------------|---------|--------|---------|------|
 * | View Events   | ✅      | ✅     | ✅      | ✅   |
 * | Attend / RSVP | ✅      | ✅     | ✅      | ✅   |
 * | Create Events | 🚫      | 🚫     | ✅      | ✅   |
 * | Manage Events | 🚫      | 🚫     | ✅      | ✅   |
 * 
 * 8. Alumni Directory
 * | Feature                | Student | Alumni | Faculty | Club |
 * |------------------------|---------|--------|---------|------|
 * | View Alumni Directory  | ✅      | ✅     | ✅      | 🚫   |
 * | Connect with Alumni    | ✅      | ✅     | ✅      | 🚫   |
 * 
 * 9. EcoCampus (Marketplace)
 * | Feature         | Student | Alumni | Faculty | Club |
 * |-----------------|---------|--------|---------|------|
 * | Browse Listings | ✅      | 🚫     | ✅      | 🚫   |
 * | Create Listing  | ✅      | 🚫     | ✅      | 🚫   |
 * | Manage Listings | ✅      | 🚫     | ✅      | 🚫   |
 * 
 * 10. System & Settings
 * | Feature       | Student | Alumni | Faculty | Club |
 * |---------------|---------|--------|---------|------|
 * | Notifications | ✅      | ✅     | ✅      | ✅   |
 * | Settings      | ✅      | ✅     | ✅      | ✅   |
 * | Onboarding    | ✅      | ✅     | ✅      | ✅   |
 * 
 * Usage:
 * ```tsx
 * const { canBrowseJobs, canPostJobs, isStudent, isAlumni, canCreateEvents } = useFeatureAccess();
 * 
 * if (!canBrowseJobs) {
 *   return <Navigate to="/home" replace />;
 * }
 * ```
 */

import { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdentityContext } from '@/contexts/IdentityContext';
import { useNetworkStatus } from '@/hooks/useNetwork';
import {
  getFeaturePermissions,
  normalizeProfileType,
  canAccessRoute,
  getHiddenNavItems,
  type ProfileType,
  type FeaturePermissions,
} from '@/lib/feature-permissions';

export interface UseFeatureAccessReturn extends FeaturePermissions {
  // Profile type helpers
  profileType: ProfileType | null;
  isStudent: boolean;
  isAlumni: boolean;
  isFaculty: boolean;
  isClub: boolean;
  
  // Loading state
  isLoading: boolean;
  
  // Route checking
  canAccessRoute: (routePath: string) => boolean;
  
  // Nav items to hide
  hiddenNavItems: string[];
  
  // Convenience aliases for EcoCampus
  canViewEcoCampus: boolean;
  canShareItems: boolean;
  canRequestItems: boolean;
  
  // Convenience alias for Events
  canRegisterForEvents: boolean;
}

export function useFeatureAccess(): UseFeatureAccessReturn {
  const { role, isLoading } = useIdentityContext();

  const permissions = useMemo(() => {
    const profileType = normalizeProfileType(role);
    const featurePermissions = getFeaturePermissions(role);
    const hiddenNavItems = getHiddenNavItems(role);

    return {
      ...featurePermissions,
      // Alias for convenience - canViewEcoCampus = canBrowseEcoCampus
      canViewEcoCampus: featurePermissions.canBrowseEcoCampus,
      canShareItems: featurePermissions.canCreateListing,
      canRequestItems: featurePermissions.canBrowseEcoCampus,
      // Registration alias
      canRegisterForEvents: featurePermissions.canAttendEvents,
      profileType,
      isStudent: profileType === 'Student',
      isAlumni: profileType === 'Alumni',
      isFaculty: profileType === 'Faculty',
      isClub: profileType === 'Club',
      isLoading,
      canAccessRoute: (routePath: string) => canAccessRoute(role, routePath),
      hiddenNavItems,
    };
  }, [role, isLoading]);

  return permissions;
}

/**
 * Hook to redirect users who don't have permission to access a feature
 * @param hasPermission - Boolean indicating if user has permission
 * @param redirectTo - Path to redirect to if permission denied
 */
export function useRouteGuard(hasPermission: boolean, redirectTo: string = '/home'): void {
  const { isLoading } = useFeatureAccess();
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  
  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return;

    // Don't redirect while offline (unknown auth/permissions state)
    if (!isOnline) return;
    
    // Redirect if no permission
    if (!hasPermission) {
      navigate(redirectTo, { replace: true });
    }
  }, [hasPermission, isLoading, isOnline, navigate, redirectTo]);
}

export default useFeatureAccess;
