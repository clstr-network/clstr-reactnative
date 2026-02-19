/**
 * CLSTR Navigation — Main Tabs (Bottom Tab Navigator)
 *
 * Mirrors the existing BottomNavigation.tsx with 5 tabs:
 * Home | Network | Events | Messages | Profile
 */
import React, { useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Platform, Text as RNText } from 'react-native';
import type { MainTabParamList } from './types';
import { tokens } from '../design/tokens';

// Stack navigators for each tab
import { HomeStack } from './HomeStack';
import { NetworkStack } from './NetworkStack';
import { EventsStack } from './EventsStack';
import { MessagingStack } from './MessagingStack';
import { ProfileStack } from './ProfileStack';
import { useScreenRegistry } from './ScreenRegistryContext';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const { homeScreens, profileScreens } = useScreenRegistry();

  // Stable wrappers that pass screens to each stack
  const HomeStackScreen = useCallback(
    () => <HomeStack screens={homeScreens} />,
    [homeScreens],
  );
  const ProfileStackScreen = useCallback(
    () => <ProfileStack screens={profileScreens} />,
    [profileScreens],
  );
  return (
    <Tab.Navigator
      id="MainTabs"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.colors.dark.primary,
        tabBarInactiveTintColor: tokens.colors.dark.mutedForeground,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="NetworkTab"
        component={NetworkStack}
        options={{
          tabBarLabel: 'Network',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="users" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="EventsTab"
        component={EventsStack}
        options={{
          tabBarLabel: 'Events',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="calendar" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="MessagingTab"
        component={MessagingStack}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="message" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="user" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Tab Icon (simple text fallback until lucide-react-native is wired) ──

function TabIcon({ name, color, size }: { name: string; color: string; size: number }) {
  // Map icon names to unicode symbols as temporary fallback
  const iconMap: Record<string, string> = {
    home: '\u2302',        // ⌂
    users: '\u2637',       // ☷
    calendar: '\u2637',    // ☷ 
    message: '\u2709',     // ✉
    user: '\u2603',        // ☃
  };

  return (
    <RNText style={{ fontSize: size, color, textAlign: 'center' }}>
      {iconMap[name] || '●'}
    </RNText>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: tokens.colors.dark.background,
    borderTopColor: tokens.colors.dark.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    height: Platform.OS === 'ios' ? 88 : 64,
  },
  tabBarLabel: {
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: tokens.typography.fontWeight.medium,
  },
});
