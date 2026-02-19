/**
 * EventsScreen — Main events list screen.
 *
 * Uses FlatList with pull-to-refresh and category filter tabs.
 * Read-only + RSVP only (no event creation — Phase 9 scope).
 */
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { EventsStackParamList } from '@clstr/shared/navigation/types';
import { useTheme } from '@clstr/shared/design/useTheme';
import { tokens } from '@clstr/shared/design/tokens';
import { EmptyState } from '@clstr/shared/components/ui/EmptyState';
import { ErrorState } from '@clstr/shared/components/ui/ErrorState';
import { H3 } from '@clstr/shared/components/ui/Typography';
import { View } from '@clstr/shared/components/ui/primitives/View';
import { Text } from '@clstr/shared/components/ui/primitives/Text';
import { Pressable } from '@clstr/shared/components/ui/primitives/Pressable';

import { useEvents } from '../../hooks/useEvents';
import { EventCard } from '../../components/events/EventCard';
import type { Event } from '@clstr/core/api/events-api';

type EventsNav = NativeStackNavigationProp<EventsStackParamList, 'EventsScreen'>;

const FILTERS = ['All', 'Upcoming', 'Past'] as const;
type Filter = (typeof FILTERS)[number];

export function EventsScreen() {
  const navigation = useNavigation<EventsNav>();
  const { colors } = useTheme();
  const [activeFilter, setActiveFilter] = useState<Filter>('All');

  const {
    events,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useEvents();

  const filteredEvents = useMemo(() => {
    const now = new Date();
    switch (activeFilter) {
      case 'Upcoming':
        return events.filter((e) => new Date(e.event_date) >= now);
      case 'Past':
        return events.filter((e) => new Date(e.event_date) < now);
      default:
        return events;
    }
  }, [events, activeFilter]);

  const handleEventPress = useCallback(
    (eventId: string) => {
      navigation.navigate('EventDetail', { id: eventId });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Event }) => (
      <EventCard event={item} onPress={() => handleEventPress(item.id)} />
    ),
    [handleEventPress],
  );

  const keyExtractor = useCallback((item: Event) => item.id, []);

  // ── Loading state ──
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.headerBar}>
          <H3>Events</H3>
        </View>
        <View style={styles.loading}>
          <Text muted>Loading events...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ──
  if (isError) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.headerBar}>
          <H3>Events</H3>
        </View>
        <ErrorState
          message={error?.message ?? 'Failed to load events'}
          onRetry={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.headerBar}>
        <H3>Events</H3>
      </View>

      {/* ── Filter Tabs ── */}
      <View style={styles.filterRow}>
        {FILTERS.map((filter) => (
          <Pressable
            key={filter}
            onPress={() => setActiveFilter(filter)}
            style={[
              styles.filterTab,
              activeFilter === filter && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              size="xs"
              weight="medium"
              style={{
                color: activeFilter === filter ? colors.primaryForeground : colors.mutedForeground,
              }}
            >
              {filter}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredEvents}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No events"
            description={
              activeFilter === 'All'
                ? 'No events found for your campus yet.'
                : `No ${activeFilter.toLowerCase()} events.`
            }
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
    gap: tokens.spacing.xs,
  },
  filterTab: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  listContent: {
    paddingBottom: tokens.spacing.xl,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
