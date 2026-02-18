/**
 * CLSTR Navigation — Deep Linking Configuration
 *
 * Maps web URLs to native screen names.
 * Used by NavigationContainer's `linking` prop.
 */
import { type LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'clstr://',
    'https://clstr.network',
    'https://www.clstr.network',
  ],
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
