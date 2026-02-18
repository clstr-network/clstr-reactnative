import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { isValidAcademicEmail, getDomainFromEmail, getCollegeDomainFromEmail, getCollegeDomainFromEmailServer } from '@/lib/validation';
import { isPublicEmailDomain, isPublicEmailDomainServer } from '@/lib/college-utils';
import { FOUNDER_EMAIL } from '@/lib/admin-constants';
import { useToast } from '@/components/ui/use-toast';
import { isClubAccessVerified } from './ClubAuth';
import { validateRedirectUrl, trackSignupCompleted, trackRedirectSuccess } from '@/lib/analytics';
import { mergeTransitionedAccount, findTransitionedProfileForEmail } from '@/lib/email-transition';
import type { Session } from '@supabase/supabase-js';

/**
 * Checks if the given email belongs to an active platform admin (founder / admin / moderator).
 * Platform admins are exempt from the educational-email domain gate because they may
 * use company or personal emails (e.g., company_admin@company.com).
 *
 * Returns the admin record if found, or null.
 */
async function checkPlatformAdminByEmail(
  email: string
): Promise<{ role: 'founder' | 'admin' | 'moderator'; name: string | null } | null> {
  const { data, error } = await supabase
    .from('platform_admins')
    .select('role, name')
    .eq('email', email.toLowerCase())
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.warn('[AuthCallback] Failed to check platform admin status:', error.message);
    return null;
  }

  return data as { role: 'founder' | 'admin' | 'moderator'; name: string | null } | null;
}

/**
 * Checks if the given (possibly non-edu) email belongs to a user who has
 * already transitioned from college → personal email. In that case, they
 * must be allowed past the domain-restriction gate.
 *
 * Returns `true` if the email is already stored as a verified personal_email
 * on a profile whose email_transition_status is 'transitioned'.
 */
async function isTransitionedPersonalEmail(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('personal_email', email.toLowerCase())
    .eq('email_transition_status', 'transitioned')
    .eq('personal_email_verified', true)
    .maybeSingle();

  if (error) {
    console.warn('[AuthCallback] Failed to check transitioned email:', error.message);
    return false;
  }

  return !!data;
}

/**
 * AuthCallback - Handles OAuth and Magic Link authentication callbacks
 * 
 * Flow:
 * 1. Exchange code for session (PKCE) or get session from hash (implicit)
 * 2. Validate email is from educational domain (BLOCKS non-edu emails)
 * 3. Check if profile exists and has domain set
 * 4. Update profile with domain if missing (for OAuth users)
 * 5. Check for `next` parameter for custom redirects (e.g., /club-onboarding)
 * 6. Redirect to onboarding if not complete, otherwise home
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [statusMessage, setStatusMessage] = useState('Completing sign in...');

  useEffect(() => {
    /**
     * Process authenticated user - validate email, check/update profile, redirect
     */
    const processAuthenticatedUser = async (session: Session) => {
      const user = session.user;
      const userEmail = user.email;

      // Check if this is an OAuth user (Google, etc.)
      const isOAuthUser = user.app_metadata?.provider === 'google' || 
             user.app_metadata?.providers?.includes('google');
      const authMethod: "google" | "magic_link" = isOAuthUser ? "google" : "magic_link";

      // CRITICAL: Validate email verification for non-OAuth users
      if (!user.email_confirmed_at && !isOAuthUser) {
        console.error('Unverified email attempted access:', userEmail);
        await supabase.auth.signOut();
        
        toast({
          title: "Email verification required",
          description: "Please verify your email address before continuing.",
          variant: "destructive",
        });
        
        navigate('/signup', { 
          state: { error: 'Please verify your email address. Check your inbox.' },
          replace: true 
        });
        return;
      }

      // CRITICAL: Validate educational email domain
      // Exceptions:
      //   1. Users who have transitioned from college → personal email
      //   2. Platform admins (founder / admin / moderator) — may use any email
      const isFounderEmail = !!userEmail && userEmail.toLowerCase() === FOUNDER_EMAIL.toLowerCase();
      const isAcademic = isValidAcademicEmail(userEmail || '');

      // Check if this user is a platform admin BEFORE the edu-mail gate.
      // Admin-assigned users (company users, staff, etc.) must bypass the edu check.
      let platformAdminRecord: { role: 'founder' | 'admin' | 'moderator'; name: string | null } | null = null;
      if (!isFounderEmail && !isAcademic && !!userEmail) {
        platformAdminRecord = await checkPlatformAdminByEmail(userEmail);
      }
      const isPlatformAdmin = !!platformAdminRecord;

      const isTransitioned = !isAcademic && !isPlatformAdmin && !!userEmail && await isTransitionedPersonalEmail(userEmail);

      if (!userEmail || (!isFounderEmail && !isAcademic && !isTransitioned && !isPlatformAdmin)) {
        console.error('Non-educational email attempted signup:', userEmail);
        await supabase.auth.signOut();

        navigate('/academic-email-required', { replace: true });
        return;
      }

      setStatusMessage('Setting up your profile...');

      // Extract domain from email — use server-side normalization for authoritative assignment
      const emailDomain = getDomainFromEmail(userEmail);
      const collegeDomain = await getCollegeDomainFromEmailServer(userEmail);

      // Check if profile exists
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, college_domain, onboarding_complete, full_name, avatar_url, email_transition_status, personal_email')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.warn('Error checking profile:', profileError);
      }

      // ── MERGE DETECTION (No Profile Case): handle_new_user (migration 081)
      // skips profile creation for transitioned emails. So profileData is null,
      // but the original transitioned profile exists under a different user ID.
      if (!profileData) {
        const originalProfile = await findTransitionedProfileForEmail(userEmail, user.id);
        if (originalProfile) {
          console.log('[AuthCallback] No profile found but transitioned match exists. Merging into:', originalProfile.id);
          setStatusMessage('Reconnecting your existing account...');

          const mergeResult = await mergeTransitionedAccount();

          if (mergeResult.success) {
            console.log('[AuthCallback] Merge successful (no-profile path). Re-login required.');
            await supabase.auth.signOut();

            toast({
              title: "Account reconnected!",
              description: "Sign in again with Google to access your existing profile.",
            });

            navigate('/login', {
              state: { info: 'Your account has been reconnected. Please sign in again with Google.' },
              replace: true,
            });
            return;
          } else {
            console.error('[AuthCallback] Merge failed (no-profile path):', mergeResult.error);
            // CRITICAL: Do NOT fall through to onboarding — that would create a
            // brand new profile and orphan the original data permanently.
            // Sign out and redirect to login with actionable guidance.
            await supabase.auth.signOut();

            // UX-1 FIX: Differentiate message for fully-transitioned users
            const isFullyTransitioned = originalProfile.email_transition_status === 'transitioned';
            let mergeFailureHint: string;
            let loginStateInfo: string;

            if (isFullyTransitioned) {
              // User has already left college login — don't tell them to use college email
              mergeFailureHint = ' Your email transition is complete but auto-reconnect failed. Please contact support for assistance linking your account.';
              loginStateInfo = 'Account auto-reconnect failed. Your email transition was completed previously. Please contact support for help accessing your profile.';
            } else if (originalProfile.college_email) {
              mergeFailureHint = ` Sign in with your college email (${originalProfile.college_email}) instead, then go to Settings to finalize the email change.`;
              loginStateInfo = `Account auto-reconnect failed. Please sign in with your college email to access your profile. You can finalize the login email change in Settings.`;
            } else {
              mergeFailureHint = ' Please sign in with your original college email instead, then finalize the email change in Settings.';
              loginStateInfo = 'Account auto-reconnect failed. Please sign in with your college email to access your profile.';
            }

            toast({
              title: "Account linking issue",
              description: `Auto-reconnect failed.${mergeFailureHint}`,
              variant: "destructive",
              duration: 12000,
            });

            navigate('/login', {
              state: { info: loginStateInfo },
              replace: true,
            });
            return;
          }
        }
      }

      // Profile exists - check if domain needs to be set (for OAuth users)
      if (profileData) {
        // ── MERGE DETECTION: Check if this is a duplicate profile from a
        // transitioned user logging in with their personal email via Google.
        //
        // Scenario: Transitioned alumnus signs in with Google using personal email
        // → Supabase creates NEW auth.users → handle_new_user may or may not
        //   create a new profile (migration 081 skips it, but older deployments
        //   might have created one) → we detect the original profile and merge.
        //
        // Detection: Current profile has onboarding_complete = false (or no profile)
        //   AND an existing transitioned profile has personal_email = userEmail.
        if (!profileData.onboarding_complete) {
          const originalProfile = await findTransitionedProfileForEmail(userEmail, user.id);
          if (originalProfile) {
            console.log('[AuthCallback] Duplicate detected for transitioned user. Merging into:', originalProfile.id);
            setStatusMessage('Reconnecting your existing account...');

            const mergeResult = await mergeTransitionedAccount();

            if (mergeResult.success) {
              console.log('[AuthCallback] Merge successful. Signing out and redirecting to re-login.');
              // Our JWT is now invalid (the duplicate auth user was deleted).
              // Sign out locally and redirect to login — next Google sign-in
              // will authenticate as the OLD user (identity was transferred).
              await supabase.auth.signOut();

              toast({
                title: "Account reconnected!",
                description: "Sign in again with Google to access your existing profile.",
              });

              navigate('/login', {
                state: { info: 'Your account has been reconnected. Please sign in again with Google.' },
                replace: true,
              });
              return;
            } else {
              console.error('[AuthCallback] Merge failed:', mergeResult.error);
              // CRITICAL: Do NOT fall through to onboarding — that would commit
              // the user to a brand new empty profile, orphaning their real data.
              // Sign out and redirect to login with actionable guidance.
              await supabase.auth.signOut();

              // UX-1 FIX: Differentiate message for fully-transitioned users
              const isFullyTransitioned = originalProfile.email_transition_status === 'transitioned';
              let mergeFailureHint: string;
              let loginStateInfo: string;

              if (isFullyTransitioned) {
                mergeFailureHint = ' Your email transition is complete but auto-reconnect failed. Please contact support for assistance linking your account.';
                loginStateInfo = 'Account auto-reconnect failed. Your email transition was completed previously. Please contact support for help accessing your profile.';
              } else if (originalProfile.college_email) {
                mergeFailureHint = ` Sign in with your college email (${originalProfile.college_email}) instead, then go to Settings to finalize the email change.`;
                loginStateInfo = `Account auto-reconnect failed. Please sign in with your college email to access your profile. You can finalize the login email change in Settings.`;
              } else {
                mergeFailureHint = ' Please sign in with your original college email instead, then finalize the email change in Settings.';
                loginStateInfo = 'Account auto-reconnect failed. Please sign in with your college email to access your profile.';
              }

              toast({
                title: "Account linking issue",
                description: `Auto-reconnect failed.${mergeFailureHint}`,
                variant: "destructive",
                duration: 12000,
              });

              navigate('/login', {
                state: { info: loginStateInfo },
                replace: true,
              });
              return;
            }
          }
        }

        // For transitioned users: do NOT overwrite college_domain with the personal email domain.
        // Their identity domain is their original college email domain.
        const isProfileTransitioned = profileData.email_transition_status === 'transitioned';

        // Update profile with domain if missing (happens with OAuth) — only for non-transitioned users
        // LG-4 FIX: Only set college_domain/email if the OAuth email is actually academic.
        // Users who bypassed the edu gate (alumni invites, platform admins) may have a
        // personal Gmail — we must NOT set college_domain to "gmail.com" in that case.
        if (!isProfileTransitioned && !profileData.college_domain) {
          const isOAuthEmailAcademic = isValidAcademicEmail(userEmail || '');
          
          const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
          };

          if (isOAuthEmailAcademic) {
            // SAFETY NET: Double-check the domain is not a public email provider.
            // This prevents gmail.com, yahoo.com etc. from ever being set as college_domain.
            // Uses authoritative server-side check (CB-3 fix).
            const isPublicDomain = await isPublicEmailDomainServer(emailDomain);
            if (isPublicDomain) {
              console.warn('Public email domain blocked from college_domain:', emailDomain);
            } else {
              // Safe to set college domain — email is from an edu domain
              // DIR-3 FIX: Stop writing the deprecated `domain` column.
              // The canonical column is `college_domain`; `domain` is legacy.
              updates.college_domain = collegeDomain;
              updates.email = userEmail;
              console.log('Updating profile with academic domain:', emailDomain);
            }
          } else {
            // Non-edu email (alumni invite user, platform admin) — do NOT overwrite
            // college_domain. Only update metadata fields.
            console.log('Skipping college_domain update for non-academic email:', emailDomain);
          }

          // Also set full_name and avatar_url from OAuth if missing
          if (!profileData.full_name && user.user_metadata?.full_name) {
            updates.full_name = user.user_metadata.full_name;
          }
          if (!profileData.avatar_url && user.user_metadata?.avatar_url) {
            updates.avatar_url = user.user_metadata.avatar_url;
          }

          const { error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

          if (updateError) {
            console.warn('Failed to update profile domain:', updateError);
          }
        }

        // Check onboarding status
        if (profileData.onboarding_complete === true) {
          console.log('Onboarding complete, checking for return URL');
          
          // Track signup completed (this includes returning users via auth flow)
          const storedReturnUrl = sessionStorage.getItem('authReturnUrl');
          const validatedReturnUrl = storedReturnUrl ? validateRedirectUrl(storedReturnUrl) : undefined;
          trackSignupCompleted({
            redirect_target: validatedReturnUrl,
            method: authMethod,
          });
          
          // Check for stored return URL (from public post view redirect)
          const authReturnUrl = sessionStorage.getItem('authReturnUrl');
          if (authReturnUrl) {
            sessionStorage.removeItem('authReturnUrl');
            
            // SECURITY: Validate redirect URL to prevent open-redirect attacks
            const validatedUrl = validateRedirectUrl(authReturnUrl);
            if (validatedUrl) {
              console.log('Redirecting to validated return URL:', validatedUrl);
              trackRedirectSuccess({
                redirect_target: validatedUrl,
                source: "auth_callback",
              });
              navigate(validatedUrl, { replace: true });
              return;
            } else {
              console.warn('Invalid redirect URL blocked:', authReturnUrl);
            }
          }
          
          // PLATFORM ADMIN REDIRECT: If the user is a platform admin, send
          // them to the admin dashboard instead of the regular home page.
          if (isPlatformAdmin || isFounderEmail) {
            console.log('Platform admin detected, redirecting to /admin');
            navigate('/admin', { replace: true });
            return;
          }

          navigate('/home', { replace: true });
          return;
        }
      }

      // PLATFORM ADMIN WITHOUT PROFILE: If a platform admin has no profile
      // (first login with non-edu email), create a minimal profile so they
      // can access the admin dashboard without going through student onboarding.
      if (isPlatformAdmin && !profileData) {
        console.log('[AuthCallback] Platform admin without profile — creating admin profile');
        setStatusMessage('Setting up admin access...');

        const adminName = platformAdminRecord?.name || user.user_metadata?.full_name || userEmail.split('@')[0];
        const { error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: userEmail,
            full_name: adminName,
            avatar_url: user.user_metadata?.avatar_url || null,
            role: 'Organization', // Not 'Alumni' — admin may not be alumnus
            // COMMUNITY ISOLATION: Admin domain must never become a college community.
            // DIR-3 FIX: Stop writing the deprecated `domain` column.
            college_domain: null, // Admins don't belong to a college community by default
            onboarding_complete: true,
            is_verified: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });

        if (createError) {
          console.error('[AuthCallback] Failed to create admin profile:', createError);
        }

        navigate('/admin', { replace: true });
        return;
      }

      // If platform admin has a profile but onboarding is not complete,
      // mark it complete and redirect to admin.
      if (isPlatformAdmin && profileData && !profileData.onboarding_complete) {
        console.log('[AuthCallback] Platform admin with incomplete onboarding — completing and redirecting');
        await supabase
          .from('profiles')
          .update({ onboarding_complete: true, updated_at: new Date().toISOString() })
          .eq('id', user.id);

        navigate('/admin', { replace: true });
        return;
      }

      // No profile OR onboarding not complete - check for custom redirect
      console.log('Onboarding required');
      
      // Check for `next` parameter in URL (used by club auth flow)
      const searchParams = new URLSearchParams(window.location.search);
      const nextPath = searchParams.get('next');
      
      // If redirecting to club-onboarding, verify access is still valid
      if (nextPath === '/club-onboarding') {
        if (isClubAccessVerified()) {
          console.log('Club access verified, redirecting to /club-onboarding');
          toast({
            title: "Welcome!",
            description: "Complete your club registration.",
          });
          navigate('/club-onboarding', { replace: true });
          return;
        }

        toast({
          title: "Club access required",
          description: "Please enter the club access code to continue.",
          variant: "destructive",
        });
        navigate('/club-auth', { replace: true });
        return;
      }
      
      toast({
        title: "Welcome!",
        description: "Let's complete your profile setup.",
      });
      
      navigate('/onboarding', { replace: true });
    };

    const handleAuthCallback = async () => {
      try {
        // Get the hash and search params from URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        
        // Check for errors from OAuth provider
        const error = hashParams.get('error') || searchParams.get('error');
        const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
        const errorCode = hashParams.get('error_code') || searchParams.get('error_code');

        if (error) {
          console.error('OAuth error:', error, errorCode, errorDescription);
          
          // Handle database errors (often from auth hooks)
          if (errorDescription?.includes('Database error saving new user') || 
              errorCode === 'unexpected_failure') {
            console.log('Database error during signup - attempting recovery...');
            setStatusMessage('Setting up your account...');
            
            // Wait for auth operations to complete
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Try to get the session - user might be created despite the error
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
              console.log('Session found after database error, proceeding...');
              await processAuthenticatedUser(session);
              return;
            }
            
            // No session - show helpful error
            toast({
              title: "Account setup error",
              description: "There was an issue setting up your account. Please try again.",
              variant: "destructive",
            });
            
            navigate('/signup', { 
              state: { error: 'Account setup failed. Please try signing up again.' },
              replace: true 
            });
            return;
          }
          
          // Generic OAuth error
          navigate('/login', { 
            state: { error: errorDescription || error || 'Authentication failed' },
            replace: true 
          });
          return;
        }

        // Handle PKCE flow (code in search params)
        const code = searchParams.get('code');
        if (code) {
          setStatusMessage('Verifying credentials...');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('Error exchanging code for session:', exchangeError);
            navigate('/login', { 
              state: { error: 'Failed to complete authentication. Please try again.' },
              replace: true 
            });
            return;
          }

          if (!data.session) {
            console.error('No session after code exchange');
            navigate('/login', { 
              state: { error: 'No session created. Please try again.' },
              replace: true 
            });
            return;
          }
        }

        // Get current session (works for both implicit and PKCE flows)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setStatusMessage('Unable to verify session. Check your connection and retry.');
          return;
        }

        if (!session) {
          navigate('/login', { 
            state: { error: 'Authentication failed. Please try again.' },
            replace: true 
          });
          return;
        }

        await processAuthenticatedUser(session);

      } catch (error) {
        console.error('Unexpected error in auth callback:', error);
        const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
        navigate('/login', { 
          state: { error: errorMsg },
          replace: true 
        });
      }
    };

    handleAuthCallback();
  }, [navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#000000]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-white/60" />
        <p className="text-sm text-white/60">{statusMessage}</p>
      </div>
    </div>
  );
};

export default AuthCallback;
