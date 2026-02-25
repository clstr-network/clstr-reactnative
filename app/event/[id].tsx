import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator, Share, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useThemeColors } from '@/constants/colors';
import Avatar from '@/components/Avatar';
import RoleBadge from '@/components/RoleBadge';
import { getEventById, toggleEventRegistration, type Event } from '@/lib/api';
import { QUERY_KEYS } from '@/lib/query-keys';
import { useRealtimeMultiSubscription } from '@/lib/hooks/useRealtimeSubscription';
import { CHANNELS } from '@/lib/channels';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';

function formatDateBanner(dateStr?: string): { month: string; day: string; weekday: string } {
  if (!dateStr) return { month: '---', day: '--', weekday: '---' };
  const d = new Date(dateStr);
  return {
    month: d.toLocaleDateString('en', { month: 'short' }),
    day: String(d.getDate()),
    weekday: d.toLocaleDateString('en', { weekday: 'long' }),
  };
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const { canAttendEvents } = useFeatureAccess();

  // Phase 13.9 — Realtime event detail subscription
  useRealtimeMultiSubscription({
    channelName: CHANNELS.eventDetail(id ?? ''),
    subscriptions: [
      {
        table: 'events',
        event: '*',
        filter: `id=eq.${id}`,
        onPayload: () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event(id!) });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events });
        },
      },
      {
        table: 'event_registrations',
        event: '*',
        filter: `event_id=eq.${id}`,
        onPayload: () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event(id!) });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events });
        },
      },
    ],
    enabled: !!id,
  });

  const { data: event, isLoading } = useQuery({
    queryKey: QUERY_KEYS.event(id!),
    queryFn: () => getEventById(id!),
    enabled: !!id,
  });

  const rsvpMutation = useMutation({
    mutationFn: () => toggleEventRegistration(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event(id!) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events });
    },
  });

  const handleRsvp = useCallback(() => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    rsvpMutation.mutate();
  }, [id, rsvpMutation]);

  // F12 — Event Share
  const eventUrl = `https://clstr.network/event/${id}`;

  const handleShareEvent = useCallback(async () => {
    if (!event) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Check out "${event.title}" on Clstr: ${eventUrl}`,
        url: eventUrl,
      });
    } catch (_e) {
      // User cancelled
    }
  }, [event, eventUrl]);

  const handleCopyEventLink = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(eventUrl);
    Alert.alert('Copied', 'Event link copied to clipboard.');
  }, [eventUrl]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Event</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Event</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={{ color: colors.textSecondary }}>Event not found</Text>
        </View>
      </View>
    );
  }

  const dateInfo = formatDateBanner(event.event_date);
  const attendees = event.attendees_count ?? 0;
  const maxAttendees = event.max_attendees ?? 0;
  const spotsLeft = maxAttendees > 0 ? maxAttendees - attendees : null;
  const percentFull = maxAttendees > 0 ? (attendees / maxAttendees) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Event Details</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={handleCopyEventLink} hitSlop={8} style={styles.headerBtn}>
            <Ionicons name="copy-outline" size={20} color={colors.text} />
          </Pressable>
          <Pressable onPress={handleShareEvent} hitSlop={8} style={styles.headerBtn}>
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.dateBanner, { backgroundColor: colors.tint + '12' }]}>
          <Text style={[styles.dateMonth, { color: colors.tint }]}>{dateInfo.month.toUpperCase()}</Text>
          <Text style={[styles.dateDay, { color: colors.tint }]}>{dateInfo.day}</Text>
          <Text style={[styles.dateWeekday, { color: colors.textSecondary }]}>{dateInfo.weekday}</Text>
        </View>

        <View style={styles.contentSection}>
          <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>

          {event.event_time && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{event.event_time}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name={event.is_virtual ? 'videocam-outline' : 'location-outline'} size={18} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {event.is_virtual ? 'Virtual Event' : event.location ?? 'TBA'}
            </Text>
          </View>

          {event.creator && (
            <View style={[styles.organizerRow, { borderColor: colors.border }]}>
              <Avatar uri={event.creator.avatar_url} name={event.creator.full_name ?? 'Organizer'} size={40} />
              <View style={styles.organizerInfo}>
                <Text style={[styles.organizerName, { color: colors.text }]}>{event.creator.full_name ?? 'Organizer'}</Text>
                {event.creator.role && <RoleBadge role={event.creator.role} />}
              </View>
            </View>
          )}

          {event.description && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>About</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>{event.description}</Text>
            </>
          )}

          {maxAttendees > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Capacity</Text>
              <View style={styles.capacityRow}>
                <View style={[styles.progressBg, { backgroundColor: colors.surfaceElevated }]}>
                  <View style={[styles.progressFill, { width: `${Math.min(percentFull, 100)}%`, backgroundColor: spotsLeft !== null && spotsLeft < 10 ? colors.warning : colors.tint }]} />
                </View>
                <Text style={[styles.capacityText, { color: colors.textSecondary }]}>
                  {attendees}/{maxAttendees}{spotsLeft !== null ? ` (${spotsLeft} spots left)` : ''}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Phase 5 — Only show RSVP if the user's role can attend events */}
      {canAttendEvents && (
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16), backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Pressable
          onPress={handleRsvp}
          disabled={rsvpMutation.isPending}
          style={({ pressed }) => [
            styles.rsvpButton,
            event.is_registered
              ? { backgroundColor: colors.success + '15', borderColor: colors.success, borderWidth: 1 }
              : { backgroundColor: colors.tint },
            pressed && { opacity: 0.85 },
          ]}
        >
          {event.is_registered ? (
            <>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <Text style={[styles.rsvpButtonText, { color: colors.success }]}>Going</Text>
            </>
          ) : (
            <>
              <Ionicons name="calendar" size={22} color="#fff" />
              <Text style={[styles.rsvpButtonText, { color: '#fff' }]}>RSVP Now</Text>
            </>
          )}
        </Pressable>
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dateBanner: { alignItems: 'center', paddingVertical: 24 },
  dateMonth: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  dateDay: { fontSize: 48, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', marginTop: -4 },
  dateWeekday: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  contentSection: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '800', lineHeight: 32, fontFamily: 'Inter_800ExtraBold' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  organizerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14,
    borderTopWidth: 1, borderBottomWidth: 1, marginVertical: 4,
  },
  organizerInfo: { gap: 4 },
  organizerName: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  sectionLabel: { fontSize: 16, fontWeight: '700', marginTop: 4, fontFamily: 'Inter_700Bold' },
  description: { fontSize: 15, lineHeight: 24, fontFamily: 'Inter_400Regular' },
  capacityRow: { gap: 8 },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  capacityText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  scrollContent: { paddingBottom: 100 },
  bottomBar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  rsvpButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14, gap: 8,
  },
  rsvpButtonText: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
