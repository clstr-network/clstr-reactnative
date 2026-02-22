import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useData } from "@/lib/data-context";
import Colors from "@/constants/colors";

function Avatar({ name, size = 80 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SettingsRow({ icon, label, onPress, showChevron = true, color }: {
  icon: string;
  label: string;
  onPress?: () => void;
  showChevron?: boolean;
  color?: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.settingsRow, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={[styles.settingsIcon, { backgroundColor: (color || Colors.dark.primary) + "20" }]}>
        <Ionicons name={icon as any} size={18} color={color || Colors.dark.primary} />
      </View>
      <Text style={[styles.settingsLabel, color ? { color } : undefined]}>{label}</Text>
      {showChevron && <Ionicons name="chevron-forward" size={18} color={Colors.dark.textTertiary} />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, connections, posts, isLoading } = useData();
  const connectedCount = connections.filter(c => c.status === "connected").length;

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <ActivityIndicator size="large" color={Colors.dark.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === "web" ? 34 : 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#6C5CE720", Colors.dark.background]}
        style={[styles.headerGradient, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => router.push("/settings")}>
            <Ionicons name="settings-outline" size={24} color={Colors.dark.text} />
          </Pressable>
        </View>

        <View style={styles.profileInfo}>
          <Avatar name={currentUser.name} />
          <Text style={styles.profileName}>{currentUser.name}</Text>
          <Text style={styles.profileRole}>
            {currentUser.role === "student" ? "Student" : "Alumni"} - {currentUser.department}
          </Text>
          <Text style={styles.profileBio}>{currentUser.bio}</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Posts" value={posts.length} />
          <View style={styles.statDivider} />
          <StatCard label="Connections" value={connectedCount} />
          <View style={styles.statDivider} />
          <StatCard label="Class of" value={currentUser.gradYear} />
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.settingsGroup}>
          <SettingsRow icon="person-outline" label="Edit Profile" />
          <SettingsRow icon="bookmark-outline" label="Saved Posts" />
          <SettingsRow icon="shield-checkmark-outline" label="Privacy" />
          <SettingsRow icon="notifications-outline" label="Notifications" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>More</Text>
        <View style={styles.settingsGroup}>
          <SettingsRow icon="help-circle-outline" label="Help & Support" color={Colors.dark.accent} />
          <SettingsRow icon="information-circle-outline" label="About clstr" color={Colors.dark.accent} />
          <SettingsRow icon="log-out-outline" label="Sign Out" color={Colors.dark.error} showChevron={false} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingVertical: 8,
  },
  profileInfo: {
    alignItems: "center",
    marginTop: 8,
  },
  avatar: {
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
  profileName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
  },
  profileRole: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  profileBio: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    paddingVertical: 16,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.dark.border,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
    marginBottom: 12,
  },
  settingsGroup: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  settingsIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.text,
  },
});
