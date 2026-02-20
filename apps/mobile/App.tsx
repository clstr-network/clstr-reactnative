/**
 * CLSTR Mobile — App Entry Point
 *
 * Sets up the complete app shell with:
 * - React Query for data fetching
 * - Cross-platform ThemeProvider
 * - React Navigation with deep linking
 * - Toast notifications
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import { ThemeProvider } from '../../packages/shared/src/design/ThemeProvider';
import { RootNavigator } from '../../packages/shared/src/navigation/RootNavigator';
import { ScreenRegistryProvider } from '../../packages/shared/src/navigation/ScreenRegistryContext';
import { linking } from '../../packages/shared/src/navigation/linking';
import { navigationRef, onNavigationReady } from '../../packages/shared/src/navigation/navigationRef';
import { PushNotificationProvider } from './src/providers/PushNotificationProvider';
import { DevTestOverlay } from './src/components/DevTestOverlay';

// ── Real screen implementations (injected via ScreenRegistryProvider) ──
import { FeedScreen } from './src/screens/feed/FeedScreen';
import { PostDetailScreen } from './src/screens/feed/PostDetailScreen';
import { ProfileScreen } from './src/screens/profile/ProfileScreen';
import { ProfileConnectionsScreen } from './src/screens/profile/ProfileConnectionsScreen';
import { MessagingListScreen } from './src/screens/messaging/MessagingListScreen';
import { ConversationDetailScreen } from './src/screens/messaging/ConversationDetailScreen';
import { EventsScreen } from './src/screens/events/EventsScreen';
import { EventDetailScreen } from './src/screens/events/EventDetailScreen';
import { NetworkScreen } from './src/screens/network/NetworkScreen';
import { SettingsScreen } from './src/screens/settings/SettingsScreen';
import { NotificationsScreen } from './src/screens/notifications/NotificationsScreen';

import type { HomeStackScreens } from '../../packages/shared/src/navigation/HomeStack';
import type { ProfileStackScreens } from '../../packages/shared/src/navigation/ProfileStack';
import type { MessagingStackScreens } from '../../packages/shared/src/navigation/MessagingStack';
import type { EventsStackScreens } from '../../packages/shared/src/navigation/EventsStack';
import type { NetworkStackScreens } from '../../packages/shared/src/navigation/NetworkStack';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

// ── Screen maps (stable references, defined outside component) ──

const homeScreens: HomeStackScreens = {
  HomeScreen: FeedScreen,
  PostDetail: PostDetailScreen,
  Profile: ProfileScreen,
  ProfileConnections: ProfileConnectionsScreen,
  // EventDetail intentionally omitted → falls back to placeholder
};

const profileScreens: ProfileStackScreens = {
  ProfileScreen: ProfileScreen,
  ProfileConnections: ProfileConnectionsScreen,
  Settings: SettingsScreen,
  Notifications: NotificationsScreen,
};

const messagingScreens: MessagingStackScreens = {
  MessagingScreen: MessagingListScreen,
  ConversationDetail: ConversationDetailScreen,
};

const eventsScreens: EventsStackScreens = {
  EventsScreen: EventsScreen,
  EventDetail: EventDetailScreen,
};

const networkScreens: NetworkStackScreens = {
  NetworkScreen: NetworkScreen,
  Profile: ProfileScreen,
  ProfileConnections: ProfileConnectionsScreen,
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider initialMode="dark">
            <ScreenRegistryProvider
              homeScreens={homeScreens}
              profileScreens={profileScreens}
              messagingScreens={messagingScreens}
              eventsScreens={eventsScreens}
              networkScreens={networkScreens}
            >
              <NavigationContainer
                linking={linking}
                ref={navigationRef}
                onReady={onNavigationReady}
              >
                <PushNotificationProvider>
                  <RootNavigator />
                </PushNotificationProvider>
                {__DEV__ && <DevTestOverlay />}
                <StatusBar style="light" />
              </NavigationContainer>
            </ScreenRegistryProvider>
            <Toast />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
