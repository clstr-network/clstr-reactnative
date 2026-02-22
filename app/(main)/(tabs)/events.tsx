import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  Platform, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { Event, generateMockEvents } from '@/lib/mock-data';

const categoryColors: Record<string, string> = {
  workshop: '#3B82F6',
  meetup: '#8B5CF6',
  seminar: '#06B6D4',
  social: '#EC4899',
  career: '#22C55E',
};

const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  workshop: 'construct-outline',
  meetup: 'people-outline',
  seminar: 'school-outline',
  social: 'happy-outline',
  career: 'briefcase-outline',
};

function EventCard({ event, onRsvp }: { event: Event; onRsvp: (id: string) => void }) {
  const eventDate = new Date(event.date);
  const month = eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = eventDate.getDate();
  const catColor = categoryColors[event.category] || colors.primary;

  return (
    <View style={styles.eventCard}>
      <View style={[styles.dateBox, { borderColor: catColor }]}>
        <Text style={[styles.dateMonth, { color: catColor }]}>{month}</Text>
        <Text style={styles.dateDay}>{day}</Text>
      </View>
      <View style={styles.eventInfo}>
        <View style={styles.eventCategoryRow}>
          <Ionicons name={categoryIcons[event.category] || 'ellipse'} size={12} color={catColor} />
          <Text style={[styles.eventCategory, { color: catColor }]}>
            {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
          </Text>
        </View>
        <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
        <View style={styles.eventMeta}>
          <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
          <Text style={styles.eventMetaText}>{event.time}</Text>
          <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
          <Text style={styles.eventMetaText}>{event.location}</Text>
        </View>
        <View style={styles.eventFooter}>
          <View style={styles.attendeesInfo}>
            <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.attendeesText}>{event.attendeesCount} attending</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.rsvpButton,
              event.isRsvpd && styles.rsvpButtonActive,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onRsvp(event.id);
            }}
          >
            <Text style={[styles.rsvpText, event.isRsvpd && styles.rsvpTextActive]}>
              {event.isRsvpd ? 'Going' : 'RSVP'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<Event[]>(() => generateMockEvents(8));
  const [refreshing, setRefreshing] = useState(false);

  const handleRsvp = useCallback((id: string) => {
    setEvents(prev => prev.map(e =>
      e.id === id
        ? { ...e, isRsvpd: !e.isRsvpd, attendeesCount: e.isRsvpd ? e.attendeesCount - 1 : e.attendeesCount + 1 }
        : e
    ));
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setEvents(generateMockEvents(8));
      setRefreshing(false);
    }, 1000);
  }, []);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={styles.screen}>
      <View style={[styles.headerBar, { paddingTop: insets.top + webTopInset }]}>
        <Text style={styles.headerTitle}>Events</Text>
        <Text style={styles.headerSubtitle}>Upcoming campus events</Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventCard event={item} onRsvp={handleRsvp} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No upcoming events</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
  eventCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dateBox: {
    width: 52,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  dateDay: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginTop: -2,
  },
  eventInfo: {
    flex: 1,
  },
  eventCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  eventCategory: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    lineHeight: 20,
    marginBottom: 6,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  eventMetaText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textTertiary,
    marginRight: 8,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attendeesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendeesText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  rsvpButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  rsvpButtonActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  rsvpText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },
  rsvpTextActive: {
    color: colors.primaryLight,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: colors.textTertiary,
  },
});
