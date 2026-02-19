/**
 * EventCard — Event list card component.
 *
 * React.memo wrapped. Static display only (V1 kill rule: no animations).
 * Uses shared Card, Text, View, UserAvatar from @clstr/shared.
 *
 * Layout:
 * ┌───────────────────────────────────────┐
 * │ Title                                 │
 * │ 📅 Date  · 📍 Location / 💻 Virtual  │
 * │ 👥 12 attendees · [Avatar] Creator    │
 * └───────────────────────────────────────┘
 */
import React from 'react';
import { StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { View } from '@clstr/shared/components/ui/primitives/View';
import { Text } from '@clstr/shared/components/ui/primitives/Text';
import { Pressable } from '@clstr/shared/components/ui/primitives/Pressable';
import { UserAvatar } from '@clstr/shared/components/ui/UserAvatar';
import { Card } from '@clstr/shared/components/ui/Card';
import { useTheme } from '@clstr/shared/design/useTheme';
import { tokens } from '@clstr/shared/design/tokens';
import type { Event } from '@clstr/core/api/events-api';

export interface EventCardProps {
  event: Event;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export const EventCard = React.memo(function EventCard({
  event,
  onPress,
  style,
}: EventCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable onPress={onPress} style={style as any}>
      <Card style={styles.card}>
        {/* ── Title ── */}
        <View style={styles.content}>
          <Text weight="semibold" size="sm" numberOfLines={2}>
            {event.title}
          </Text>
        </View>

        {/* ── Date + Location ── */}
        <View style={styles.meta}>
          <Text size="xs" muted>
            📅 {formatEventDate(event.event_date)}
            {event.start_time ? ` · ${event.start_time}` : ''}
          </Text>
          <Text size="xs" muted>
            {event.is_virtual ? '💻 Virtual' : `📍 ${event.location ?? 'TBD'}`}
          </Text>
        </View>

        {/* ── Footer: attendees + creator ── */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text size="xs" muted>
            👥 {event.attendees_count ?? 0} attendees
          </Text>
          {event.creator && (
            <View style={styles.creator}>
              <UserAvatar
                src={event.creator.avatar_url}
                name={event.creator.full_name ?? ''}
                size={20}
              />
              <Text size="xs" muted style={styles.creatorName}>
                {event.creator.full_name ?? 'Unknown'}
              </Text>
            </View>
          )}
        </View>
      </Card>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
  },
  content: {
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.xs,
  },
  meta: {
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.sm,
    gap: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  creator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorName: {
    marginLeft: tokens.spacing.xs,
  },
});
