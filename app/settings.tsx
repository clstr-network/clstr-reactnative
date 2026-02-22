import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";

function SettingsRow({ icon, label, value, onPress, color }: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: (color || Colors.dark.primary) + "20" }]}>
        <Ionicons name={icon as any} size={18} color={color || Colors.dark.primary} />
      </View>
      <Text style={[styles.rowLabel, color ? { color } : undefined]}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={18} color={Colors.dark.textTertiary} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.group}>
            <SettingsRow icon="moon-outline" label="Appearance" value="Dark" />
            <SettingsRow icon="language-outline" label="Language" value="English" />
            <SettingsRow icon="notifications-outline" label="Notifications" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.group}>
            <SettingsRow icon="lock-closed-outline" label="Profile Visibility" value="Public" />
            <SettingsRow icon="eye-off-outline" label="Activity Status" value="On" />
            <SettingsRow icon="shield-outline" label="Blocked Users" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.group}>
            <SettingsRow icon="information-circle-outline" label="Version" value="1.0.0" color={Colors.dark.accent} />
            <SettingsRow icon="document-text-outline" label="Terms of Service" color={Colors.dark.accent} />
            <SettingsRow icon="shield-checkmark-outline" label="Privacy Policy" color={Colors.dark.accent} />
          </View>
        </View>

        <View style={styles.brandSection}>
          <Text style={styles.brandName}>clstr</Text>
          <Text style={styles.brandTagline}>Connecting students & alumni</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  group: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.text,
  },
  rowValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textTertiary,
    marginRight: 8,
  },
  brandSection: {
    alignItems: "center",
    marginTop: 40,
    paddingBottom: 20,
  },
  brandName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.primary,
  },
  brandTagline: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textTertiary,
    marginTop: 4,
  },
});
