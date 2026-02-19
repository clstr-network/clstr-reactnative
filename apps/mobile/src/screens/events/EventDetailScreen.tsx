/**
 * EventDetailScreen — Full event detail view.
 *
 * Displays title, description, date/time, location, creator,
 * and an RSVP toggle button. Static display per kill rule — no animations.
 */
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { EventsStackParamList } from '@clstr/shared/navigation/types';
import { useTheme } from '@clstr/shared/design/useTheme';
import { tokens } from '@clstr/shared/design/tokens';
import { ErrorState } from '@clstr/shared/components/ui/ErrorState';
import { H3 } from '@clstr/shared/components/ui/Typography';
import { View } from '@clstr/shared/components/ui/primitives/View';
import { Text } from '@clstr/shared/components/ui/primitives/Text';
import { Pressable } from '@clstr/shared/components/ui/primitives/Pressable';
import { UserAvatar } from '@clstr/shared/components/ui/UserAvatar';

import { useEventDetail, useRegisterEvent, useUnregisterEvent } from '../../hooks/useEvents';

type EventDetailRoute = RouteProp<EventsStackParamList, 'EventDetail'>;

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function EventDetailScreen() {
  const route = useRoute<EventDetailRoute>();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { id: eventId } = route.params;

  const { event, isLoading, isError, error, refetch } = useEventDetail(eventId);
  const registerMutation = useRegisterEvent();
  const unregisterMutation = useUnregisterEvent();

  const isRsvpLoading = registerMutation.isPending || unregisterMutation.isPending;

  const handleRsvpToggle = useCallback(() => {
    if (!event) return;

    if (event.is_registered) {
      unregisterMutation.mutate(eventId, {
        onSuccess: () => refetch(),
      });
    } else {
      registerMutation.mutate(eventId, {
        onSuccess: () => refetch(),
      });
    }
  }, [event, eventId, registerMutation, unregisterMutation, refetch]);

  const handleVirtualLink = useCallback(() => {
    if (event?.virtual_link) {
      Linking.openURL(event.virtual_link).catch(() => {
        Alert.alert('Error', 'Could not open the virtual event link.');
      });
    }
  }, [event?.virtual_link]);

  // ── Loading ──
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()}>
            <Text size="sm" style={{ color: colors.primary }}>
              ← Back
            </Text>
          </Pressable>
        </View>
        <View style={styles.loading}>
          <Text muted>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──
  if (isError || !event) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()}>
            <Text size="sm" style={{ color: colors.primary }}>
              ← Back
            </Text>
          </Pressable>
        </View>
        <ErrorState
          message={error?.message ?? 'Event not found'}
          onRetry={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text size="sm" style={{ color: colors.primary }}>
            ← Back
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Title ── */}
        <H3>{event.title}</H3>

        {/* ── Date & Time ── */}
        <View style={styles.section}>
          <Text size="sm" muted>
            📅 {formatFullDate(event.event_date)}
          </Text>
          {event.start_time && (
            <Text size="sm" muted>
              🕐 {event.start_time}
              {event.end_time ? ` – ${event.end_time}` : ''}
            </Text>
          )}
        </View>

        {/* ── Location ── */}
        <View style={styles.section}>
          {event.is_virtual ? (
            <>
              <Text size="sm" muted>
                💻 Virtual Event
              </Text>
              {event.virtual_link && (
                <Pressable onPress={handleVirtualLink} style={styles.linkBtn}>
                  <Text size="sm" style={{ color: colors.primary }}>
                    Join Virtual Event →
                  </Text>
                </Pressable>
              )}
            </>
          ) : (
            <Text size="sm" muted>
              📍 {event.location ?? 'Location TBD'}
            </Text>
          )}
        </View>

        {/* ── Category ── */}
        {event.category && (
          <View style={styles.section}>
            <Text size="xs" muted>
              Category: {event.category}
            </Text>
          </View>
        )}

        {/* ── Description ── */}
        {event.description && (
          <View style={styles.section}>
            <Text size="sm">{event.description}</Text>
          </View>
        )}

        {/* ── Creator ── */}
        {event.creator && (
          <View style={[styles.section, styles.creatorRow]}>
            <UserAvatar
              src={event.creator.avatar_url}
              name={event.creator.full_name ?? ''}
              size={36}
            />
            <View style={styles.creatorInfo}>
              <Text size="sm" weight="medium">
                {event.creator.full_name ?? 'Unknown'}
              </Text>
              <Text size="xs" muted>
                {event.creator.role ?? 'Organizer'}
              </Text>
            </View>
          </View>
        )}

        {/* ── Attendees ── */}
        <View style={styles.section}>
          <Text size="sm" muted>
            👥 {event.attendees_count ?? 0} attendees
            {event.max_attendees ? ` / ${event.max_attendees} max` : ''}
          </Text>
        </View>

        {/* ── RSVP Button ── */}
        <Pressable
          onPress={handleRsvpToggle}
          disabled={isRsvpLoading}
          style={[
            styles.rsvpBtn,
            {
              backgroundColor: event.is_registered
                ? 'transparent'
                : colors.primary,
              borderColor: colors.primary,
              opacity: isRsvpLoading ? 0.6 : 1,
            },
          ]}
        >
          <Text
            size="sm"
            weight="semibold"
            style={{
              color: event.is_registered
                ? colors.primary
                : colors.primaryForeground,
            }}
          >
            {isRsvpLoading
              ? 'Processing...'
              : event.is_registered
                ? 'Cancel RSVP'
                : 'RSVP'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
  },
  scrollContent: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing['2xl'],
  },
  section: {
    marginTop: tokens.spacing.md,
    gap: 4,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorInfo: {
    marginLeft: tokens.spacing.sm,
  },
  linkBtn: {
    marginTop: tokens.spacing.xs,
  },
  rsvpBtn: {
    marginTop: tokens.spacing.xl,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
