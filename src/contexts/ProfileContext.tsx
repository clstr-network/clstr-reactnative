
import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CHANNELS } from '@clstr/shared/realtime/channels';
import type { BasicUserProfile, UserProfile } from '@clstr/shared/types/profile';
import { useNetworkStatus } from '@/hooks/useNetwork';
import {
  getProfileById,
  updateProfileRecord,
  ProfileError
} from '@/lib/profile';

export type { BasicUserProfile, UserProfile } from '@clstr/shared/types/profile';

/**
 * @deprecated for identity/role/permission checks.
 *
 * ProfileContext reads from the `profiles` table directly. For anything
 * related to identity resolution (role, college_email, college_domain,
 * email_transition_status), use `useIdentityContext()` from
 * `@/contexts/IdentityContext` instead â€” it calls the authoritative
 * `get_identity_context()` RPC.
 *
 * UC-2 AUDIT FIX: Do NOT read `profile.college_domain` from this context.
 * After email transitions the cached value here can diverge from
 * IdentityContext. All community pages (Events, Clubs, Projects, etc.)
 * should use `const { collegeDomain } = useIdentityContext()` instead.
 *
 * ProfileContext remains valid for non-identity display fields:
 *   - avatar_url, full_name, headline, bio, location
 *   - profile_completion, updateProfile()
 *
 * See: useRolePermissions (migrated to IdentityContext in audit fix LG-1)
 */

// Context definition
interface ProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  domainUsers: BasicUserProfile[];
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasProfile: boolean;
  isOnboardingRequired: boolean;
  /** True when the user's account is deactivated (pending deletion). */
  isDeactivated: boolean;
}

type ProfileRow = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  college_domain?: string | null;
  role?: string | null;
  headline?: string | null;
  branch?: string | null;
  year_of_completion?: string | null;
  updated_at?: string | null;
  location?: string | null;
  university?: string | null;
  major?: string | null;
  graduation_year?: string | null;
  enrollment_year?: number | null;
  course_duration_years?: number | null;
  profile_completion?: number | null;
  personal_email?: string | null;
  personal_email_verified?: boolean | null;
  personal_email_verified_at?: string | null;
  email_transition_status?: "none" | "pending" | "verified" | "transitioned" | null;
  personal_email_prompt_dismissed_at?: string | null;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domainUsers, setDomainUsers] = useState<BasicUserProfile[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const [isDeactivated, setIsDeactivated] = useState(false);
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  
  // Refs to prevent race conditions
  const isFetchingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const resetProfileState = useCallback(() => {
    setProfile(null);
    setDomainUsers([]);
    setHasProfile(false);
  }, []);

  const toBasicUserProfile = useCallback((item: ProfileRow): BasicUserProfile => ({
    id: item.id,
    full_name: item.full_name || null,
    avatar_url: item.avatar_url || null,
    email: item.email || null,
    domain: item.college_domain || null,
    college_domain: item.college_domain || null,
    role: item.role || null,
    headline: item.headline || null,
    branch: item.branch || null,
    year_of_completion: item.year_of_completion || null,
    updated_at: item.updated_at || null,
    location: item.location || null,
    university: item.university || null,
    major: item.major || null,
    graduation_year: item.graduation_year || null,
    enrollment_year: item.enrollment_year || null,
    course_duration_years: item.course_duration_years || null,
    profile_completion: item.profile_completion || null,
    personal_email: item.personal_email || null,
    personal_email_verified: item.personal_email_verified || null,
    personal_email_verified_at: item.personal_email_verified_at || null,
    email_transition_status: item.email_transition_status || null,
    personal_email_prompt_dismissed_at: item.personal_email_prompt_dismissed_at || null,
  } as BasicUserProfile), []);

  const invalidateProfileDependentQueries = useCallback(() => {
    const keys = new Set([
      'home-feed',
      'feed-posts',
      'profile-posts',
      'post-detail',
      'post-comments',
      'saved-items',
      'conversations',
      'messages',
      'connectedUsers',
      'network',
      'projects',
      'events',
      'clubs',
      'mentorship',
      'alumni-directory',
      'trending-topics',
      'email-transition-status',
    ]);

    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey.some((key) => typeof key === 'string' && keys.has(key)),
    });
  }, [queryClient]);

  const loadDomainUsers = useCallback(async (collegeDomain: string, excludeId?: string) => {
    if (!collegeDomain) return;

    try {
      const normalizedDomain = collegeDomain.toLowerCase();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, college_domain, role, headline, branch, year_of_completion, updated_at, location, university, major, graduation_year, enrollment_year, course_duration_years, profile_completion')
        .eq('college_domain', normalizedDomain)
        .eq('onboarding_complete', true);

      if (error) throw error;

      if (data) {
        const typedUsers: BasicUserProfile[] = data
          .filter((item) => item.id !== excludeId)
          .map((item) => toBasicUserProfile(item as ProfileRow));

        setDomainUsers(typedUsers);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading domain users';
      console.error('Error loading domain users:', errorMessage);
    }
  }, [toBasicUserProfile]);

  const fetchProfile = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }
    
    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Get current session first
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        resetProfileState();
        setIsLoading(false);
        isFetchingRef.current = false;
        return;
      }

      const user = sessionData.session?.user;

      if (!user) {
        resetProfileState();
        setIsLoading(false);
        isFetchingRef.current = false;
        return;
      }

      // Fetch profile - DO NOT auto-create if missing
      const normalized = await getProfileById(user.id);

      if (!normalized) {
        setHasProfile(false);
        setProfile(null);
        setDomainUsers([]);
        setIsLoading(false);
        isFetchingRef.current = false;
        return;
      }

      setProfile(normalized);
      setHasProfile(true);

      // Account deactivation lifecycle: detect deactivated accounts
      setIsDeactivated(normalized.account_status === 'deactivated');

      // Load same-college users if we have a canonical college_domain
      if (normalized.college_domain) {
        loadDomainUsers(normalized.college_domain, normalized.id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading profile';
      console.error('Error in fetchProfile:', errorMessage);
      setError(errorMessage);
      // OFFLINE FIX: Do NOT reset profile state on network errors.
      // Keep previously loaded / localStorage-cached profile so the user
      // stays on the current page instead of being kicked to onboarding.
      // resetProfileState() is intentionally NOT called here.
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [loadDomainUsers, resetProfileState]);

  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    // Initial profile fetch
    fetchProfile();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          // User signed in or token refreshed - debounce to avoid race conditions
          setTimeout(() => {
            if (!isFetchingRef.current) {
              fetchProfile();
            }
          }, 100);
        } else {
          // User signed out
          resetProfileState();
          setError(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, resetProfileState]);

  // Realtime: keep the current user's profile state in sync with DB.
  // This respects RLS because we only ever read through Supabase client.
  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      channel = supabase
        .channel(CHANNELS.profile.profiles(userId))
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
          async () => {
            if (!mounted) return;
            try {
              const latest = await getProfileById(userId);
              if (!mounted) return;

              setProfile(latest);
              setHasProfile(Boolean(latest));

              if (latest?.college_domain) {
                loadDomainUsers(latest.college_domain, latest.id);
              }

              invalidateProfileDependentQueries();
            } catch (err) {
              console.error('Realtime profile refresh failed:', err);
            }
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [invalidateProfileDependentQueries, loadDomainUsers]);

  // Realtime: keep same-college profile lists + avatar caches in sync.
  useEffect(() => {
    const collegeDomain = profile?.college_domain?.toLowerCase();
    if (!collegeDomain || !profile?.id) return;

    const channel = supabase
      .channel(CHANNELS.profile.profilesDomain(collegeDomain))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `college_domain=eq.${collegeDomain}` },
        (payload) => {
          const change = payload as unknown as { new?: ProfileRow; old?: ProfileRow; eventType?: string };
          const updated = change.new;
          const removed = change.old;
          const eventType = change.eventType;

          setDomainUsers((prev) => {
            const targetId = updated?.id ?? removed?.id;
            if (!targetId || targetId === profile.id) return prev;

            if (eventType === 'DELETE') {
              return prev.filter((user) => user.id !== targetId);
            }

            if (!updated) return prev;
            const mapped = toBasicUserProfile(updated);
            const index = prev.findIndex((user) => user.id === targetId);
            if (index === -1) {
              return [...prev, mapped];
            }
            const next = [...prev];
            next[index] = { ...next[index], ...mapped };
            return next;
          });

          invalidateProfileDependentQueries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [invalidateProfileDependentQueries, profile?.college_domain, profile?.id, toBasicUserProfile]);

  // Update user profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No user logged in');
      }

      // Use the enhanced update function with validation
      // Cast to ProfileUpdatePayload since UserProfile.role is string but ProfileUpdatePayload expects the enum type
      await updateProfileRecord(user.id, updates as Parameters<typeof updateProfileRecord>[1]);

      // ECF-4 FIX: Use college_domain exclusively â€” profile.domain is deprecated
      // and may contain stale/public-domain values.
      const previousDomain = profile?.college_domain ?? null;
      let nextDomain = previousDomain;

      setProfile(prev => {
        if (!prev) return prev;
        // COMMUNITY ISOLATION: domain must always come from college_domain, never derived from email.
        // college_domain is the immutable institutional identity; auth/login email may change.
        // ECF-4 FIX: Never fall back to `domain` â€” it is DEPRECATED and may contain stale values.
        nextDomain = updates.college_domain ?? prev.college_domain ?? null;
        return {
          ...prev,
          ...updates,
          domain: nextDomain
        };
      });

      if (nextDomain && nextDomain !== previousDomain) {
        loadDomainUsers(nextDomain, profile?.id);
      }

      // Ensure local state matches the persisted DB record (audit-safe source of truth).
      await refreshProfile();
      invalidateProfileDependentQueries();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      console.error('Error updating profile:', errorMessage);
      const errorObj = err instanceof ProfileError
        ? err.message
        : 'Failed to update profile. Please try again.';
      setError(errorObj);
      throw err; // Re-throw so caller can handle it
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh profile data
  const refreshProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        resetProfileState();
        return;
      }

      // Use the enhanced getter function
      const profileData = await getProfileById(user.id);

      if (!profileData) {
        setProfile(null);
        setDomainUsers([]);
        setHasProfile(false);
        return;
      }

      setProfile(profileData);
      setHasProfile(true);

      // Update deactivation state so DeactivationGate re-evaluates
      setIsDeactivated(profileData.account_status === 'deactivated');

      if (profileData.college_domain) {
        loadDomainUsers(profileData.college_domain, profileData.id);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error refreshing profile';
      console.error('Error refreshing profile:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // OFFLINE FIX: Only require onboarding when we have a definitive answer.
  // - If profile is null due to a network error, do NOT redirect.
  // - If profile is null because the server confirmed no profile exists (error is null), redirect.
  // - If profile exists but onboarding_complete is false, redirect.
  // - Never redirect when offline or when there's a fetch error.
  const needsOnboarding = error === null && isOnline !== false && (!profile || profile.onboarding_complete !== true);

  const contextValue = {
    profile,
    isLoading,
    error,
    domainUsers,
    updateProfile,
    refreshProfile,
    hasProfile,
    isOnboardingRequired: needsOnboarding,
    isDeactivated,
  };

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
