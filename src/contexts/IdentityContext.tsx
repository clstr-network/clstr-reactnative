/**
 * IdentityProvider — React context wrapper around useIdentity.
 *
 * Provides the canonical identity tuple to the entire component tree.
 * Place this inside QueryClientProvider and above any component that
 * needs to know "who is this user?".
 *
 * Usage:
 *   const { identity, isAlumni, collegeDomain } = useIdentityContext();
 */

import React, { createContext, useContext } from 'react';
import { useIdentity } from '@/hooks/useIdentity';
import type { IdentityContext } from '@clstr/shared/types/identity';

interface IdentityContextValue {
  /** Authoritative identity, null if unauthenticated/no profile */
  identity: IdentityContext | null;
  isLoading: boolean;
  error: Error | null;
  refreshIdentity: () => Promise<void>;

  // Convenience flags
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  collegeDomain: string | null;
  source: string | null;
  role: string | null;
  isAlumni: boolean;
  isStudent: boolean;
  isFaculty: boolean;
  isClub: boolean;
}

const IdentityCtx = createContext<IdentityContextValue | undefined>(undefined);

export const IdentityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hook = useIdentity();

  const value: IdentityContextValue = {
    identity: hook.identity,
    isLoading: hook.isLoading,
    error: hook.error,
    refreshIdentity: hook.refreshIdentity,
    isAuthenticated: hook.isAuthenticated,
    needsOnboarding: hook.needsOnboarding,
    collegeDomain: hook.collegeDomain,
    source: hook.source,
    role: hook.role,
    isAlumni: hook.isAlumni,
    isStudent: hook.isStudent,
    isFaculty: hook.isFaculty,
    isClub: hook.isClub,
  };

  return (
    <IdentityCtx.Provider value={value}>
      {children}
    </IdentityCtx.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useIdentityContext = (): IdentityContextValue => {
  const context = useContext(IdentityCtx);
  if (context === undefined) {
    throw new Error('useIdentityContext must be used within an IdentityProvider');
  }
  return context;
};
