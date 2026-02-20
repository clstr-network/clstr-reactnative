export { RootNavigator } from './RootNavigator';
export { AuthStack } from './AuthStack';
export { MainTabs } from './MainTabs';
export { HomeStack } from './HomeStack';
export { NetworkStack } from './NetworkStack';
export { EventsStack } from './EventsStack';
export { MessagingStack } from './MessagingStack';
export { ProfileStack } from './ProfileStack';
export { OnboardingProvider, useOnboarding } from './OnboardingContext';
export { linking } from './linking';
export {
  navigationRef,
  onNavigationReady,
  dispatchDeepLink,
} from './navigationRef';

export type {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
  HomeStackParamList,
  NetworkStackParamList,
  EventsStackParamList,
  MessagingStackParamList,
  ProfileStackParamList,
  OnboardingStackParamList,
} from './types';
