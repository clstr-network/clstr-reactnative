/**
 * CLSTR Navigation — Deep Linking Configuration
 *
 * Maps web URLs to native screen names.
 * Used by NavigationContainer's `linking` prop.
 *
 * Includes getInitialURL / subscribe overrides to handle:
 * - Supabase auth redirects (hash fragments from OAuth)
 * - Expo push notification deep links (cold-start + foreground tap)
 * - Intent queuing when NavigationContainer is not yet ready
 */
import { type LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import type { RootStackParamList } from './types';
import {
  navigationRef,
  setLinkListener,
  clearLinkListener,
  dispatchDeepLink,
} from './navigationRef';

/**
 * Transform Supabase OAuth redirect URLs that put tokens in the hash
 * fragment into query params that React Navigation can parse.
 *
 * e.g. https://clstr.network/auth/callback#access_token=...&refresh_token=...
 * →    https://clstr.network/auth/callback?access_token=...&refresh_token=...
 */
function normalizeAuthUrl(url: string): string {
  if (!url) return url;
  // Convert hash fragment to query params for auth callback URLs
  const hashIdx = url.indexOf('#');
  if (hashIdx !== -1 && url.includes('/auth/callback')) {
    const base = url.substring(0, hashIdx);
    const fragment = url.substring(hashIdx + 1);
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}${fragment}`;
  }
  return url;
}

/**
 * Extract a deep-link URL from a push notification's data payload.
 * Returns null if the notification has no navigable URL.
 */
function getUrlFromNotification(
  response: Notifications.NotificationResponse,
): string | null {
  const data = response.notification.request.content.data;
  if (data?.url && typeof data.url === 'string') {
    return data.url;
  }
  return null;
}

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'clstr://',
    'https://clstr.network',
    'https://www.clstr.network',
  ],

  /**
   * Custom getInitialURL handles:
   * 1. Cold-start from a push notification tap
   * 2. Supabase auth redirect with hash fragments
   * 3. Normal deep links (fallback to expo-linking)
   */
  async getInitialURL(): Promise<string | null> {
    // 1. Check if the app was opened by a push notification tap
    const lastNotification =
      await Notifications.getLastNotificationResponseAsync();
    if (lastNotification) {
      const notifUrl = getUrlFromNotification(lastNotification);
      if (notifUrl) return notifUrl;
    }

    // 2. Check for a standard deep link / universal link
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      return normalizeAuthUrl(initialUrl);
    }

    return null;
  },

  /**
   * Subscribe to incoming links while the app is open (foreground/background).
   * Handles both URL deep links and push notification taps.
   *
   * Uses intent queuing: if NavigationContainer is not ready when a
   * notification/link fires, the URL is queued and flushed once the
   * container mounts (via onNavigationReady in App.tsx).
   */
  subscribe(listener: (url: string) => void) {
    // Register the listener so queued intents can be flushed
    setLinkListener(listener);

    // Listen for URL deep links
    const linkingSub = Linking.addEventListener('url', ({ url }) => {
      const normalized = normalizeAuthUrl(url);
      if (navigationRef.isReady()) {
        listener(normalized);
      } else {
        dispatchDeepLink(normalized);
      }
    });

    // Listen for push notification taps (while app is running)
    const notificationSub =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const url = getUrlFromNotification(response);
        if (url) {
          if (navigationRef.isReady()) {
            listener(url);
          } else {
            dispatchDeepLink(url);
          }
        }
      });

    return () => {
      clearLinkListener();
      linkingSub.remove();
      notificationSub.remove();
    };
  },

  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Signup: 'signup',
          ForgotPassword: 'forgot-password',
          VerifyEmail: 'verify-email',
          MagicLinkSent: 'magic-link-sent',
          UpdatePassword: 'update-password',
          AuthCallback: 'auth/callback',
          AcademicEmailRequired: 'academic-email-required',
          VerifyPersonalEmail: 'verify-personal-email',
          ClubAuth: 'club-auth',
          ClubOnboarding: 'club-onboarding',
          AlumniInvite: 'alumni-invite',
        },
      },
      Onboarding: {
        screens: {
          Onboarding: 'onboarding',
        },
      },
      Main: {
        screens: {
          HomeTab: {
            screens: {
              HomeScreen: 'home',
              PostDetail: 'post/:id',
              EventDetail: 'events/:id',
              Profile: 'profile/:id',
              ProfileConnections: 'profile/:id/connections',
            },
          },
          NetworkTab: {
            screens: {
              NetworkScreen: 'network',
              Profile: 'profile/:id',
              ProfileConnections: 'profile/:id/connections',
              AlumniDirectory: 'alumni-directory',
            },
          },
          EventsTab: {
            screens: {
              EventsScreen: 'events',
              EventDetail: 'events/:id',
            },
          },
          MessagingTab: {
            screens: {
              MessagingScreen: 'messaging',
            },
          },
          ProfileTab: {
            screens: {
              ProfileScreen: 'profile',
              Settings: 'settings',
              HelpCenter: 'help',
              SavedItems: 'saved',
              SkillAnalysis: 'skill-analysis',
            },
          },
        },
      },
      Mentorship: 'mentorship',
      Clubs: 'clubs',
      Projects: 'projects',
      Search: 'search',
      EcoCampus: 'ecocampus',
      Jobs: 'jobs',
    },
  },
};
