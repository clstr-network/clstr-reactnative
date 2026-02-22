import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, radius } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';

interface EventCreator {
  full_name?: string;
}

interface Event {
  id: number | string;
  title?: string;
  description?: string;
  event_date?: string;
  event_time?: string | null;
  location?: string | null;
  is_virtual?: boolean;
  creator?: EventCreator;
  attendees_count?: number;
  is_registered?: boolean;
}

interface EventCardProps {
  event: Event;
  onPress?: () => void;
}

function formatDateBadge(dateStr?: string): { month: string; day: string } {
  if (!dateStr) return { month: '---', day: '--' };
  const date = new Date(dateStr);
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = date.getDate().toString();
  return { month, day };
}

function EventCard({ event, onPress }: EventCardProps) {
  const colors = useThemeColors();
  const { month, day } = formatDateBadge(event.event_date);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.dateBadge, { backgroundColor: colors.primaryLight }]}>
        <Text style={[styles.dateMonth, { color: colors.primary }]}>{month}</Text>
        <Text style={[styles.dateDay, { color: colors.primary }]}>{day}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {event.title ?? 'Untitled Event'}
          </Text>
          {event.is_registered && (
            <View style={[styles.rsvpBadge, { backgroundColor: colors.success + '18' }]}>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
              <Text style={[styles.rsvpText, { color: colors.success }]}>Going</Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          {event.is_virtual ? (
            <View style={styles.metaItem}>
              <Ionicons name="videocam-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>Virtual</Text>
            </View>
          ) : event.location ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              {event.attendees_count ?? 0} attending
            </Text>
          </View>
          {event.creator?.full_name ? (
            <Text style={[styles.creator, { color: colors.textTertiary }]} numberOfLines={1}>
              By {event.creator.full_name}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default React.memo(EventCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.lg,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    gap: 12,
  },
  dateBadge: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    letterSpacing: 0.5,
  },
  dateDay: {
    fontSize: fontSize['3xl'],
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    marginTop: -2,
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
    flex: 1,
  },
  rsvpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rsvpText: {
    fontSize: fontSize['2xs'],
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  creator: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    flex: 1,
    textAlign: 'right',
  },
});
