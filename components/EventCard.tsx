import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/constants/colors';

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

export default function EventCard({ event, onPress }: EventCardProps) {
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
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {event.title ?? 'Untitled Event'}
        </Text>

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

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    gap: 12,
  },
  dateBadge: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateDay: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: -2,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
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
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  creator: {
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
  },
});
