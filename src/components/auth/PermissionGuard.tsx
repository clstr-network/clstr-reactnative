import { ReactNode } from 'react';
import { useIdentityContext } from '@/contexts/IdentityContext';
import { hasPermission, type UserRole, type PermissionSet } from '@/lib/permissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, Lock, AlertCircle } from 'lucide-react';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: keyof PermissionSet;
  allowedRoles?: Array<'Student' | 'Alumni' | 'Faculty' | 'Club' | 'Organization'>;
  requireVerification?: boolean;
  fallback?: ReactNode;
  showMessage?: boolean;
  onRequestAccess?: () => void;
}

/**
 * Guard component that conditionally renders children based on user permissions
 */
export const PermissionGuard = ({
  children,
  permission,
  allowedRoles,
  requireVerification = false,
  fallback,
  showMessage = true,
  onRequestAccess,
}: PermissionGuardProps) => {
  const { role: rawRole, identity } = useIdentityContext();
  const role = rawRole as UserRole | null;
  const isVerified = identity?.is_verified ?? false;
  const checkPermission = (p: keyof PermissionSet) => hasPermission(role, p);

  // Check role-based access
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    if (fallback) return <>{fallback}</>;
    
    if (showMessage) {
      return (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            This feature is only available for {allowedRoles.join(', ')} users.
            {role && ` Your current role: ${role}`}
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  }

  // Check permission-based access
  if (permission && !checkPermission(permission)) {
    if (fallback) return <>{fallback}</>;
    
    if (showMessage) {
      return (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Permission Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access this feature.
            {onRequestAccess && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={onRequestAccess}
              >
                Request Access
              </Button>
            )}
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  }

  // Check verification requirement
  if (requireVerification && !isVerified) {
    if (fallback) return <>{fallback}</>;
    
    if (showMessage) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Verification Required</AlertTitle>
          <AlertDescription>
            This feature requires account verification. Please verify your account to access this feature.
            {onRequestAccess && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={onRequestAccess}
              >
                Request Verification
              </Button>
            )}
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  }

  return <>{children}</>;
};

/**
 * Inline permission check component for conditional rendering
 */
export const Can = ({
  children,
  permission,
}: {
  children: ReactNode;
  permission: keyof PermissionSet;
}) => {
  const { role: rawRole } = useIdentityContext();
  const role = rawRole as UserRole | null;
  
  if (!hasPermission(role, permission)) return null;
  
  return <>{children}</>;
};

/**
 * Inverse permission check - renders when user CANNOT perform action
 */
export const Cannot = ({
  children,
  permission,
}: {
  children: ReactNode;
  permission: keyof PermissionSet;
}) => {
  const { role: rawRole } = useIdentityContext();
  const role = rawRole as UserRole | null;
  
  if (hasPermission(role, permission)) return null;
  
  return <>{children}</>;
};

/**
 * Role-based rendering component
 */
export const ForRole = ({
  children,
  roles,
}: {
  children: ReactNode;
  roles: Array<'Student' | 'Alumni' | 'Faculty' | 'Club' | 'Organization'>;
}) => {
  const { role: rawRole } = useIdentityContext();
  const role = rawRole as UserRole | null;
  
  if (!role || !roles.includes(role)) return null;
  
  return <>{children}</>;
};

/**
 * Verification status check component
 */
export const IfVerified = ({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) => {
  const { identity } = useIdentityContext();
  const isVerified = identity?.is_verified ?? false;
  
  if (!isVerified) return fallback ? <>{fallback}</> : null;
  
  return <>{children}</>;
};

export default {
  PermissionGuard,
  Can,
  Cannot,
  ForRole,
  IfVerified,
};
