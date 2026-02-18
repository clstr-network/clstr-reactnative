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
import { linking } from '../../packages/shared/src/navigation/linking';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider initialMode="dark">
            <NavigationContainer linking={linking}>
              <RootNavigator />
              <StatusBar style="light" />
            </NavigationContainer>
            <Toast />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
