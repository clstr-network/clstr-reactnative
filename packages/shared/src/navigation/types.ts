/**
 * CLSTR Navigation — Type Definitions
 *
 * Typed route param lists for all navigation stacks/tabs.
 */

// ─── Auth Stack ──────────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  VerifyEmail: { email?: string };
  MagicLinkSent: { email?: string };
  UpdatePassword: undefined;
  AuthCallback: { url?: string } | undefined;
  AcademicEmailRequired: undefined;
  VerifyPersonalEmail: undefined;
  ClubAuth: undefined;
  ClubOnboarding: undefined;
  AlumniInvite: undefined;
};

// ─── Onboarding Stack ────────────────────────────────────────
export type OnboardingStackParamList = {
  Onboarding: undefined;
};

// ─── Home Stack ──────────────────────────────────────────────
export type HomeStackParamList = {
  HomeScreen: undefined;
  PostDetail: { id: string };
  EventDetail: { id: string };
  Profile: { id?: string };
  ProfileConnections: { id: string };
};

// ─── Network Stack ───────────────────────────────────────────
export type NetworkStackParamList = {
  NetworkScreen: undefined;
  Profile: { id?: string };
  ProfileConnections: { id: string };
  AlumniDirectory: undefined;
};

// ─── Events Stack ────────────────────────────────────────────
export type EventsStackParamList = {
  EventsScreen: undefined;
  EventDetail: { id: string };
};

// ─── Messaging Stack ─────────────────────────────────────────
export type MessagingStackParamList = {
  MessagingScreen: undefined;
  ConversationDetail: { conversationId: string };
};

// ─── Profile Stack ───────────────────────────────────────────
export type ProfileStackParamList = {
  ProfileScreen: { id?: string };
  ProfileConnections: { id: string };
  Settings: undefined;
  Notifications: undefined;
  HelpCenter: undefined;
  SavedItems: undefined;
  SkillAnalysis: undefined;
};

// ─── Main Tabs ───────────────────────────────────────────────
export type MainTabParamList = {
  HomeTab: undefined;
  NetworkTab: undefined;
  EventsTab: undefined;
  MessagingTab: undefined;
  ProfileTab: undefined;
};

// ─── Root Navigator ──────────────────────────────────────────
export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
  // Additional top-level screens
  Mentorship: undefined;
  Clubs: undefined;
  Projects: undefined;
  Search: undefined;
  EcoCampus: undefined;
  Jobs: undefined;
};

// ─── Deep Linking Param mapping ──────────────────────────────
/* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-empty-object-type */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
/* eslint-enable @typescript-eslint/no-namespace, @typescript-eslint/no-empty-object-type */
