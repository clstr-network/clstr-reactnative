import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, useColorScheme, Platform, Linking
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useThemeColors, getRoleBadgeColor } from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import { RoleBadge } from '@/components/RoleBadge';
import { getEventById, toggleRsvp, getEvents } from '@/lib/storage';
import { formatEventDate } from '@/lib/time';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const { data: event } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getEventById(id!),
    enabled: !!id,
  });

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
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

  const dateInfo = formatEventDate(event.date);
  const spotsLeft = event.maxAttendees - event.attendeesCount;
  const badgeColor = getRoleBadgeColor(event.organizerRole, colors);

  const handleRsvp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = await toggleRsvp(event.id);
    queryClient.setQueryData(['events'], updated);
    queryClient.invalidateQueries({ queryKey: ['event', id] });
  };

  const handleOpenMap = () => {
    const query = encodeURIComponent(event.location);
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Event Details</Text>
        <Pressable hitSlop={12}>
          <Ionicons name="share-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 + webBottomInset }} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroSection, { backgroundColor: badgeColor + '10' }]}>
          <View style={[styles.bigDateBox, { backgroundColor: colors.tint + '15' }]}>
            <Text style={[styles.bigDateMonth, { color: colors.tint }]}>{dateInfo.month.toUpperCase()}</Text>
            <Text style={[styles.bigDateDay, { color: colors.tint }]}>{dateInfo.day}</Text>
            <Text style={[styles.bigDateWeekday, { color: colors.tint }]}>{dateInfo.weekday}</Text>
          </View>
          <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
          <View style={[styles.categoryPill, { backgroundColor: badgeColor + '20' }]}>
            <Text style={[styles.categoryText, { color: badgeColor }]}>{event.category}</Text>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <Pressable onPress={handleOpenMap} style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.detailIcon, { backgroundColor: colors.tint + '12' }]}>
              <Ionicons name="location" size={20} color={colors.tint} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Location</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{event.location}</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.textTertiary} />
          </Pressable>

          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.detailIcon, { backgroundColor: colors.accent + '12' }]}>
              <Ionicons name="time" size={20} color={colors.accent} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Date & Time</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{dateInfo.full}</Text>
              <Text style={[styles.detailSub, { color: colors.textSecondary }]}>{event.time}</Text>
            </View>
          </View>

          <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.detailIcon, { backgroundColor: colors.warning + '12' }]}>
              <Ionicons name="people" size={20} color={colors.warning} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Attendees</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{event.attendeesCount} / {event.maxAttendees}</Text>
              <Text style={[styles.detailSub, { color: spotsLeft < 10 ? colors.danger : colors.success }]}>{spotsLeft} spots left</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: badgeColor + '12' }]}>
              <Ionicons name="person" size={20} color={badgeColor} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Organizer</Text>
              <View style={styles.organizerRow}>
                <Avatar uri={event.organizerAvatar} name={event.organizerName} size={28} />
                <Text style={[styles.organizerName, { color: colors.text }]}>{event.organizerName}</Text>
                <RoleBadge role={event.organizerRole} size="small" />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.descSection}>
          <Text style={[styles.descTitle, { color: colors.text }]}>About this event</Text>
          <Text style={[styles.descText, { color: colors.textSecondary }]}>{event.description}</Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + webBottomInset + 8 }]}>
        <View style={styles.bottomInfo}>
          <Text style={[styles.bottomSpots, { color: spotsLeft < 10 ? colors.danger : colors.text }]}>
            {spotsLeft} spots left
          </Text>
          <Text style={[styles.bottomDate, { color: colors.textTertiary }]}>{dateInfo.month} {dateInfo.day}</Text>
        </View>
        <Pressable
          onPress={handleRsvp}
          style={({ pressed }) => [
            styles.rsvpBtnLarge,
            event.isRsvped
              ? { backgroundColor: colors.success + '15', borderColor: colors.success, borderWidth: 1.5 }
              : { backgroundColor: colors.tint },
            pressed && { opacity: 0.85 },
          ]}
        >
          {event.isRsvped ? (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[styles.rsvpBtnText, { color: colors.success }]}>Going</Text>
            </>
          ) : (
            <Text style={[styles.rsvpBtnText, { color: '#fff' }]}>RSVP Now</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroSection: { alignItems: 'center', paddingVertical: 28, gap: 14 },
  bigDateBox: { width: 90, height: 90, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bigDateMonth: { fontSize: 12, fontWeight: '700' },
  bigDateDay: { fontSize: 32, fontWeight: '900', marginTop: -2 },
  bigDateWeekday: { fontSize: 11, fontWeight: '600', marginTop: -2 },
  eventTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', paddingHorizontal: 24 },
  categoryPill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12 },
  categoryText: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  detailsSection: { marginHorizontal: 16, marginTop: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, gap: 14 },
  detailIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  detailContent: { flex: 1, gap: 2 },
  detailLabel: { fontSize: 12, fontWeight: '500' },
  detailValue: { fontSize: 15, fontWeight: '600' },
  detailSub: { fontSize: 13 },
  organizerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  organizerName: { fontSize: 14, fontWeight: '600' },
  descSection: { padding: 16, marginTop: 8 },
  descTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  descText: { fontSize: 15, lineHeight: 23 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1,
  },
  bottomInfo: { gap: 2 },
  bottomSpots: { fontSize: 15, fontWeight: '700' },
  bottomDate: { fontSize: 12 },
  rsvpBtnLarge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14, gap: 6,
  },
  rsvpBtnText: { fontSize: 16, fontWeight: '700' },
});
