/**
 * useFeatureAccess — Mobile port of the web's useFeatureAccess hook.
 *
 * Provides role-based feature access control based on the FINAL Feature × Profile Matrix.
 * Uses the 4 canonical profile types: Student, Alumni, Faculty, Club.
 *
 * Reads role from the mobile IdentityProvider (lib/contexts/IdentityProvider.tsx),
 * delegates all permission logic to @clstr/core/api/feature-permissions (100% pure).
 *
 * Usage:
 * ```tsx
 * const { canCreatePost, canCreateEvents, isStudent, profileType } = useFeatureAccess();
 *
 * {canCreatePost && <CreatePostButton />}
 * ```
 *
 * Phase 4.1 — Role System & Permissions
 */

import { useMemo } from 'react';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import {
  getFeaturePermissions,
  normalizeProfileType,
  canAccessRoute as checkRouteAccess,
  getHiddenNavItems,
  type ProfileType,
  type FeaturePermissions,
} from '@clstr/core/api/feature-permissions';

export interface UseFeatureAccessReturn extends FeaturePermissions {
  // Profile type helpers
  profileType: ProfileType | null;
  isStudent: boolean;
  isAlumni: boolean;
  isFaculty: boolean;
  isClub: boolean;

  // Loading state
  isLoading: boolean;

  // Route checking (Expo Router path)
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
      // Alias for convenience — canViewEcoCampus = canBrowseEcoCampus
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
      canAccessRoute: (routePath: string) => checkRouteAccess(role, routePath),
      hiddenNavItems,
    };
  }, [role, isLoading]);

  return permissions;
}

export default useFeatureAccess;
