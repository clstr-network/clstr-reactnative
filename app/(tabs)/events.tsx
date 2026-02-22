import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform, RefreshControl, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { QUERY_KEYS } from '@/lib/query-keys';
import { getEvents, toggleEventRegistration, type Event } from '@/lib/api';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';

const CATEGORIES = ['All', 'Academic', 'Career', 'Social', 'Workshop', 'Sports'];

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  academic: 'school', career: 'briefcase', social: 'people', workshop: 'construct', sports: 'basketball',
};

function formatDateBadge(dateStr?: string): { month: string; day: string } {
  if (!dateStr) return { month: '---', day: '--' };
  const d = new Date(dateStr);
  return { month: d.toLocaleDateString('en', { month: 'short' }), day: String(d.getDate()) };
}

const InlineEventCard = React.memo(function InlineEventCard({ event, colors, onRsvp, onPress }: {
  event: Event; colors: any; onRsvp: (id: string) => void; onPress: (id: string) => void;
}) {
  const dateInfo = formatDateBadge(event.event_date);
  const catIcon = CATEGORY_ICONS[(event.category ?? '').toLowerCase()] || 'calendar';

  return (
    <Pressable
      onPress={() => onPress(event.id)}
      style={({ pressed }) => [styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.95 }]}
    >
      <View style={styles.eventTop}>
        <View style={[styles.dateBox, { backgroundColor: colors.tint + '12' }]}>
          <Text style={[styles.dateMonth, { color: colors.tint }]}>{dateInfo.month.toUpperCase()}</Text>
          <Text style={[styles.dateDay, { color: colors.tint }]}>{dateInfo.day}</Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={2}>{event.title}</Text>
          <View style={styles.eventMeta}>
            <Ionicons name={event.is_virtual ? 'videocam-outline' : 'location-outline'} size={13} color={colors.textTertiary} />
            <Text style={[styles.eventLocation, { color: colors.textTertiary }]} numberOfLines={1}>
              {event.is_virtual ? 'Virtual Event' : event.location ?? 'TBA'}
            </Text>
          </View>
          {event.event_time && (
            <View style={styles.eventMeta}>
              <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
              <Text style={[styles.eventTime, { color: colors.textTertiary }]}>{event.event_time}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.eventBottom, { borderTopColor: colors.border }]}>
        <View style={styles.eventStats}>
          {event.category && (
            <View style={styles.eventStat}>
              <Ionicons name={catIcon} size={14} color={colors.textSecondary} />
              <Text style={[styles.eventStatText, { color: colors.textSecondary }]}>{event.category}</Text>
            </View>
          )}
          <View style={styles.eventStat}>
            <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.eventStatText, { color: colors.textSecondary }]}>
              {event.attendees_count ?? 0}{event.max_attendees ? `/${event.max_attendees}` : ''}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onRsvp(event.id); }}
          style={({ pressed }) => [
            styles.rsvpBtn,
            event.is_registered
              ? { backgroundColor: colors.success + '15', borderColor: colors.success + '40', borderWidth: 1 }
              : { backgroundColor: colors.tint },
            pressed && { opacity: 0.85 },
          ]}
          hitSlop={8}
        >
          {event.is_registered ? (
            <>
              <Ionicons name="checkmark" size={14} color={colors.success} />
              <Text style={[styles.rsvpText, { color: colors.success }]}>Going</Text>
            </>
          ) : (
            <Text style={[styles.rsvpText, { color: '#fff' }]}>RSVP</Text>
          )}
        </Pressable>
      </View>
    </Pressable>
  );
});

export default function EventsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('All');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  // Phase 4 — Role-based permissions
  const { canCreateEvents } = useFeatureAccess();

  const { data: events = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.events,
    queryFn: getEvents,
    staleTime: 60_000,       // 1min — events change less frequently
    gcTime: 10 * 60 * 1000,  // 10min
  });

  const filtered = activeCategory === 'All'
    ? events
    : events.filter((e: Event) => (e.category ?? '').toLowerCase() === activeCategory.toLowerCase());

  const rsvpMutation = useMutation({
    mutationFn: (eventId: string) => toggleEventRegistration(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events });
    },
  });

  const handleRsvp = useCallback((id: string) => {
    rsvpMutation.mutate(id);
  }, [rsvpMutation]);

  const handlePress = useCallback((id: string) => {
    router.push({ pathname: '/event/[id]', params: { id } });
  }, []);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events });
  }, [queryClient]);

  const renderItem = useCallback(({ item }: { item: Event }) => (
    <InlineEventCard event={item} colors={colors} onRsvp={handleRsvp} onPress={handlePress} />
  ), [colors, handleRsvp, handlePress]);

  const keyExtractor = useCallback((item: Event) => item.id, []);

  const upcomingCount = events.length;
  const rsvpCount = events.filter((e: Event) => e.is_registered).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Events</Text>
          {canCreateEvents && (
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/create-event'); }}
              style={[styles.createEventBtn, { backgroundColor: colors.tint }]}
              hitSlop={8}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
          )}
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.statNum, { color: colors.tint }]}>{upcomingCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Upcoming</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.statNum, { color: colors.success }]}>{rsvpCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Going</Text>
          </View>
        </View>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterList}
          contentContainerStyle={styles.filterContent}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { setActiveCategory(item); Haptics.selectionAsync(); }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeCategory === item ? colors.tint : 'transparent',
                  borderColor: activeCategory === item ? colors.tint : colors.border,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: activeCategory === item ? '#fff' : colors.textSecondary }]}>
                {item}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          maxToRenderPerBatch={8}
          windowSize={5}
          initialNumToRender={8}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.tint} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No events in this category</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingBottom: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  createEventBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  statBox: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  statLabel: { fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' },
  filterList: { flexGrow: 0 },
  filterContent: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  listContent: { paddingTop: 12, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  eventCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  eventTop: { flexDirection: 'row', padding: 14, gap: 14 },
  dateBox: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dateMonth: { fontSize: 11, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  dateDay: { fontSize: 22, fontWeight: '800', marginTop: -2, fontFamily: 'Inter_800ExtraBold' },
  eventInfo: { flex: 1, gap: 4 },
  eventTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20, fontFamily: 'Inter_700Bold' },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventLocation: { fontSize: 12, flex: 1, fontFamily: 'Inter_400Regular' },
  eventTime: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  eventBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  eventStats: { flexDirection: 'row', gap: 14 },
  eventStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventStatText: { fontSize: 12, fontWeight: '500', textTransform: 'capitalize', fontFamily: 'Inter_500Medium' },
  rsvpBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, gap: 4 },
  rsvpText: { fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
