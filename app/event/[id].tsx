import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, useColorScheme, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import { RoleBadge } from '@/components/RoleBadge';
import { getEventById, toggleRsvp } from '@/lib/storage';
import { formatEventDate } from '@/lib/time';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const { data: event } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getEventById(id!),
    enabled: !!id,
  });

  const handleRsvp = useCallback(async () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = await toggleRsvp(id);
    queryClient.setQueryData(['events'], updated);
    queryClient.invalidateQueries({ queryKey: ['event', id] });
  }, [id, queryClient]);

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

  const dateInfo = formatEventDate(event.date);
  const spotsLeft = event.maxAttendees - event.attendeesCount;
  const percentFull = (event.attendeesCount / event.maxAttendees) * 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Event Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.dateBanner, { backgroundColor: colors.tint + '12' }]}>
          <Text style={[styles.dateMonth, { color: colors.tint }]}>{dateInfo.month.toUpperCase()}</Text>
          <Text style={[styles.dateDay, { color: colors.tint }]}>{dateInfo.day}</Text>
          <Text style={[styles.dateWeekday, { color: colors.tintDark }]}>{dateInfo.weekday}</Text>
        </View>

        <View style={styles.contentSection}>
          <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{event.time}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{event.location}</Text>
          </View>

          <View style={[styles.organizerRow, { borderColor: colors.border }]}>
            <Avatar uri={event.organizerAvatar} name={event.organizerName} size={40} />
            <View style={styles.organizerInfo}>
              <Text style={[styles.organizerName, { color: colors.text }]}>{event.organizerName}</Text>
              <RoleBadge role={event.organizerRole} />
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>About</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{event.description}</Text>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>Capacity</Text>
          <View style={styles.capacityRow}>
            <View style={[styles.progressBg, { backgroundColor: colors.surfaceElevated }]}>
              <View style={[styles.progressFill, { width: `${Math.min(percentFull, 100)}%`, backgroundColor: spotsLeft < 10 ? colors.warning : colors.tint }]} />
            </View>
            <Text style={[styles.capacityText, { color: colors.textSecondary }]}>
              {event.attendeesCount}/{event.maxAttendees} ({spotsLeft} spots left)
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16), backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Pressable
          onPress={handleRsvp}
          style={({ pressed }) => [
            styles.rsvpButton,
            event.isRsvped
              ? { backgroundColor: colors.success + '15', borderColor: colors.success, borderWidth: 1 }
              : { backgroundColor: colors.tint },
            pressed && { opacity: 0.85 },
          ]}
        >
          {event.isRsvped ? (
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
