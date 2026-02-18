import { useIdentityContext } from '@/contexts/IdentityContext';
import { hasPermission, canCreateContentType, canAccessFeature, type UserRole } from '@/lib/permissions';
import type { PermissionSet } from '@/lib/permissions';

/**
 * @deprecated Use `useRolePermissions()` from `@/hooks/useRolePermissions` or
 * `useFeatureAccess()` from `@/hooks/useFeatureAccess` instead.
 * These hooks read from the authoritative IdentityContext.
 *
 * This hook previously read from ProfileContext which is NOT the authoritative
 * identity source. It has been rewired to delegate to IdentityContext to prevent
 * stale-role bugs in any remaining consumers. Migrate callsites and remove.
 */
export const usePermissions = () => {
  const { role: rawRole, identity } = useIdentityContext();
  const role = rawRole as UserRole | null;

  return {
    role,
    hasPermission: (permission: keyof PermissionSet) => hasPermission(role, permission),
    canCreateContent: (type: 'post' | 'event' | 'job' | 'mentorship' | 'club') => 
      canCreateContentType(role, type),
    canAccessFeature: (feature: 'mentorship' | 'recruiting' | 'webinars' | 'analytics' | 'courses') => 
      canAccessFeature(role, feature),
    isVerified: identity?.is_verified ?? false,
  };
};

/**
 * @deprecated Use `useIdentityContext()` or `useRolePermissions()` instead.
 * Rewired to delegate to IdentityContext.
 */
export const useRole = () => {
  const { role: rawRole, identity } = useIdentityContext();
  const role = rawRole as UserRole | null;

  return {
    role,
    isStudent: role === 'Student',
    isAlumni: role === 'Alumni',
    isFaculty: role === 'Faculty',
    isClub: role === 'Club',
    isOrganization: role === 'Organization',
    isVerified: identity?.is_verified ?? false,
  };
};

/**
 * @deprecated Use `useRolePermissions()` from `@/hooks/useRolePermissions` instead.
 * Rewired to delegate to IdentityContext.
 */
export const useRoleGuard = () => {
  const { role: rawRole, identity } = useIdentityContext();
  const role = rawRole as UserRole | null;

  const checkPermission = (permission: keyof PermissionSet, showError: boolean = false): boolean => {
    const allowed = hasPermission(role, permission);
    
    if (!allowed && showError) {
      console.warn(`Permission denied: ${permission} requires different role`);
    }
    
    return allowed;
  };

  return {
    checkPermission,
    requiresVerification: !(identity?.is_verified) && 
      (role === 'Faculty' || role === 'Organization'),
  };
};
