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
import { useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useData } from "@/lib/data-context";
import Colors from "@/constants/colors";
import { format, parseISO } from "date-fns";

const CATEGORY_COLORS: Record<string, string> = {
  Career: "#6C5CE7",
  Tech: "#00CEC9",
  Startup: "#FF6B6B",
  Workshop: "#FDCB6E",
  Networking: "#00B894",
};

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events, toggleRSVP } = useData();

  const event = events.find(e => e.id === id);

  if (!event) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
          </Pressable>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Event not found</Text>
        </View>
      </View>
    );
  }

  const categoryColor = CATEGORY_COLORS[event.category] || Colors.dark.primary;
  const eventDate = parseISO(event.date);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Event Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[`${categoryColor}30`, Colors.dark.background]}
          style={styles.heroGradient}
        >
          <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}20` }]}>
            <Text style={[styles.categoryText, { color: categoryColor }]}>{event.category}</Text>
          </View>
          <Text style={styles.eventTitle}>{event.title}</Text>
        </LinearGradient>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: Colors.dark.primary + "20" }]}>
              <Ionicons name="calendar-outline" size={20} color={Colors.dark.primary} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{format(eventDate, "EEEE, MMMM d, yyyy")}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: Colors.dark.accent + "20" }]}>
              <Ionicons name="time-outline" size={20} color={Colors.dark.accent} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Time</Text>
              <Text style={styles.infoValue}>{event.time}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: Colors.dark.success + "20" }]}>
              <Ionicons name="location-outline" size={20} color={Colors.dark.success} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{event.location}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: Colors.dark.warning + "20" }]}>
              <Ionicons name="person-outline" size={20} color={Colors.dark.warning} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Organizer</Text>
              <Text style={styles.infoValue}>{event.organizer}</Text>
            </View>
          </View>
        </View>

        <View style={styles.descSection}>
          <Text style={styles.descTitle}>About this event</Text>
          <Text style={styles.descText}>{event.description}</Text>
        </View>

        <View style={styles.attendeeSection}>
          <Ionicons name="people" size={18} color={Colors.dark.primary} />
          <Text style={styles.attendeeText}>{event.attendees} people attending</Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Platform.OS === "web" ? 34 : Math.max(insets.bottom, 16) }]}>
        <Pressable
          style={[styles.rsvpButton, event.rsvpd && styles.rsvpButtonActive]}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            toggleRSVP(event.id);
          }}
        >
          <Ionicons
            name={event.rsvpd ? "checkmark-circle" : "add-circle-outline"}
            size={22}
            color="#fff"
          />
          <Text style={styles.rsvpButtonText}>
            {event.rsvpd ? "Registered" : "RSVP"}
          </Text>
        </Pressable>
      </View>
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
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroGradient: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: "flex-start",
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  eventTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
    lineHeight: 34,
  },
  infoSection: {
    paddingHorizontal: 20,
    gap: 16,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textTertiary,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.text,
    marginTop: 1,
  },
  descSection: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  descTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
    marginBottom: 8,
  },
  descText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    lineHeight: 23,
  },
  attendeeSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 24,
  },
  attendeeText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.primary,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.dark.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.border,
  },
  rsvpButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.dark.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  rsvpButtonActive: {
    backgroundColor: Colors.dark.success,
  },
  rsvpButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
});
