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

// ── Real screen implementations (injected via ScreenRegistryProvider) ──
import { FeedScreen } from './src/screens/feed/FeedScreen';
import { PostDetailScreen } from './src/screens/feed/PostDetailScreen';
import { ProfileScreen } from './src/screens/profile/ProfileScreen';
import { ProfileConnectionsScreen } from './src/screens/profile/ProfileConnectionsScreen';
import { MessagingListScreen } from './src/screens/messaging/MessagingListScreen';
import { ConversationDetailScreen } from './src/screens/messaging/ConversationDetailScreen';

import type { HomeStackScreens } from '../../packages/shared/src/navigation/HomeStack';
import type { ProfileStackScreens } from '../../packages/shared/src/navigation/ProfileStack';
import type { MessagingStackScreens } from '../../packages/shared/src/navigation/MessagingStack';

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
  // Settings, HelpCenter, SavedItems, SkillAnalysis → placeholder
};

const messagingScreens: MessagingStackScreens = {
  MessagingScreen: MessagingListScreen,
  ConversationDetail: ConversationDetailScreen,
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
            >
              <NavigationContainer linking={linking}>
                <RootNavigator />
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
