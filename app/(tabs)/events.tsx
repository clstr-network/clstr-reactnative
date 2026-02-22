import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useData, type Event } from "@/lib/data-context";
import Colors from "@/constants/colors";
import { format, parseISO } from "date-fns";

const CATEGORY_COLORS: Record<string, string> = {
  Career: "#6C5CE7",
  Tech: "#00CEC9",
  Startup: "#FF6B6B",
  Workshop: "#FDCB6E",
  Networking: "#00B894",
};

const EventCard = React.memo(function EventCard({ event, onRSVP }: { event: Event; onRSVP: () => void }) {
  const categoryColor = CATEGORY_COLORS[event.category] || Colors.dark.primary;
  const eventDate = parseISO(event.date);
  const monthStr = format(eventDate, "MMM").toUpperCase();
  const dayStr = format(eventDate, "dd");

  return (
    <Pressable
      style={({ pressed }) => [styles.eventCard, pressed && { opacity: 0.8 }]}
      onPress={() => router.push({ pathname: "/event/[id]", params: { id: event.id } })}
    >
      <View style={styles.eventDateBox}>
        <Text style={styles.eventMonth}>{monthStr}</Text>
        <Text style={styles.eventDay}>{dayStr}</Text>
      </View>
      <View style={styles.eventInfo}>
        <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}20` }]}>
          <Text style={[styles.categoryText, { color: categoryColor }]}>{event.category}</Text>
        </View>
        <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
        <View style={styles.eventMeta}>
          <View style={styles.eventMetaItem}>
            <Ionicons name="location-outline" size={13} color={Colors.dark.textTertiary} />
            <Text style={styles.eventMetaText}>{event.location}</Text>
          </View>
          <View style={styles.eventMetaItem}>
            <Ionicons name="people-outline" size={13} color={Colors.dark.textTertiary} />
            <Text style={styles.eventMetaText}>{event.attendees}</Text>
          </View>
        </View>
      </View>
      <Pressable
        style={[styles.rsvpBtn, event.rsvpd && styles.rsvpBtnActive]}
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onRSVP();
        }}
        hitSlop={4}
      >
        <Ionicons
          name={event.rsvpd ? "checkmark" : "add"}
          size={18}
          color={event.rsvpd ? "#fff" : Colors.dark.primary}
        />
      </Pressable>
    </Pressable>
  );
}, (prev, next) =>
  prev.event.id === next.event.id &&
  prev.event.rsvpd === next.event.rsvpd &&
  prev.event.attendees === next.event.attendees
);

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const { events, toggleRSVP, isLoading } = useData();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleRSVP = useCallback((id: string) => {
    toggleRSVP(id);
  }, [toggleRSVP]);

  const keyExtractor = useCallback((item: Event) => item.id, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <ActivityIndicator size="large" color={Colors.dark.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <Text style={styles.headerTitle}>Events</Text>
      </View>
      <FlatList
        data={events}
        renderItem={({ item }) => (
          <EventCard event={item} onRSVP={() => handleRSVP(item.id)} />
        )}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!events.length}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={Colors.dark.textTertiary} />
            <Text style={styles.emptyTitle}>No events</Text>
            <Text style={styles.emptySubtitle}>Check back later for upcoming events</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 12,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
  },
  eventDateBox: {
    width: 52,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  eventMonth: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.primary,
    letterSpacing: 0.5,
  },
  eventDay: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
    marginTop: -2,
  },
  eventInfo: {
    flex: 1,
    marginLeft: 14,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  eventTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
    marginBottom: 6,
  },
  eventMeta: {
    flexDirection: "row",
    gap: 12,
  },
  eventMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eventMetaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textTertiary,
  },
  rsvpBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  rsvpBtnActive: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
});
