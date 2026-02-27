/**
 * Tab Layout — Phase 5.1 restructured.
 *
 * Visible tabs: Home · Network · Create(+) · Messages · Profile
 * Hidden tabs (accessible via navigation): Events, Notifications, More
 *
 * Notifications are accessed via header bell icon on each tab.
 * Events are accessed via navigation from Feed or other screens.
 * Create tab intercepts press to open create-post modal.
 */
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, router } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { SymbolView } from "expo-symbols";
import { Platform, StyleSheet, View, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";

import { useThemeColors } from "@/constants/colors";
import { useNotificationSubscription } from "@/lib/hooks/useNotificationSubscription";

// -----------------------------------------------------------------------
// Shared notification bell header button (wired into each visible tab)
// -----------------------------------------------------------------------
function NotificationBell({ tint, unreadCount }: { tint: string; unreadCount: number }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => router.push("/notifications")}
      style={styles.headerBell}
      hitSlop={8}
    >
      <Ionicons name="notifications-outline" size={22} color={tint} />
      {unreadCount > 0 && (
        <View style={[styles.bellBadge, { backgroundColor: colors.error }]}>
          <Text style={styles.bellBadgeText}>
            {unreadCount > 99 ? "99+" : String(unreadCount)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// -----------------------------------------------------------------------
// Custom Create (+) tab bar button
// -----------------------------------------------------------------------
function CreateTabButton({ color }: { color: string }) {
  return (
    <View style={styles.createIconContainer}>
      <View style={[styles.createIconCircle, { backgroundColor: color }]}>
        <Ionicons name="add" size={26} color="#000" />
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------
// iOS 26+ native tab layout with liquid glass
// -----------------------------------------------------------------------
function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="network">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Network</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <Icon sf={{ default: "message", selected: "message.fill" }} />
        <Label>Messages</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="events">
        <Icon sf={{ default: "calendar", selected: "calendar.fill" }} />
        <Label>Events</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <Icon sf={{ default: "ellipsis.circle", selected: "ellipsis.circle.fill" }} />
        <Label>More</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// -----------------------------------------------------------------------
// Classic cross-platform tab layout
// -----------------------------------------------------------------------
function ClassicTabLayout() {
  const colors = useThemeColors();
  const { unreadCount } = useNotificationSubscription();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: "#000000",
            web: "#000000",
            default: "#000000",
          }),
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
        },
      }}
    >
      {/* ── Visible tabs ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={22}
                color={color}
              />
              {unreadCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {unreadCount > 9 ? "9+" : String(unreadCount)}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="network"
        options={{
          title: "Network",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "people" : "people-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "ellipsis-horizontal-circle" : "ellipsis-horizontal-circle-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />

      {/* ── Hidden tabs (accessible via navigation, not shown in tab bar) ── */}
      <Tabs.Screen
        name="create"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ href: null }}
      />
    </Tabs>
  );
}

// -----------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------
export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  headerBell: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  bellBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  createIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -8,
  },
  createIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  tabBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
});

