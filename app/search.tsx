/**
 * Search Screen — Phase 8.1
 *
 * Typeahead search for People, Events using `typeaheadSearch()` from @clstr/core.
 * Debounced input → React Query → results grouped by category.
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { typeaheadSearch } from '@/lib/api/search';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { QUERY_KEYS } from '@/lib/query-keys';
import { Avatar } from '@/components/Avatar';
import RoleBadge from '@/components/RoleBadge';

// ─── Debounce hook ───────────────────────────────────────────

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    timerRef.current = setTimeout(() => setDebounced(value), delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay]);

  return debounced;
}

// ─── Result item types ───────────────────────────────────────

type SearchResultItem =
  | { type: 'section'; title: string; key: string }
  | { type: 'profile'; id: string; full_name: string | null; headline: string | null; avatar_url: string | null; role: string | null; key: string }
  | { type: 'event'; id: string; title: string | null; event_date: string | null; location: string | null; category: string | null; key: string }
  | { type: 'empty'; key: string; message: string };

// ─── Screen ──────────────────────────────────────────────────

export default function SearchScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { collegeDomain } = useIdentityContext();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const inputRef = useRef<TextInput>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: QUERY_KEYS.typeahead(debouncedQuery, collegeDomain ?? ''),
    queryFn: () => typeaheadSearch({ query: debouncedQuery, collegeDomain }),
    enabled: debouncedQuery.length >= 2 && !!collegeDomain,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // Build flat list data with section headers
  const listData = useMemo<SearchResultItem[]>(() => {
    if (!data) return [];
    const items: SearchResultItem[] = [];

    if (data.profiles.length > 0) {
      items.push({ type: 'section', title: 'People', key: 'section-people' });
      data.profiles.forEach((p) =>
        items.push({
          type: 'profile',
          id: p.id,
          full_name: p.full_name,
          headline: p.headline,
          avatar_url: p.avatar_url,
          role: p.role,
          key: `profile-${p.id}`,
        }),
      );
    }

    if (data.events.length > 0) {
      items.push({ type: 'section', title: 'Events', key: 'section-events' });
      data.events.forEach((e) =>
        items.push({
          type: 'event',
          id: e.id,
          title: e.title,
          event_date: e.event_date,
          location: e.location,
          category: e.category,
          key: `event-${e.id}`,
        }),
      );
    }

    if (debouncedQuery.length >= 2 && items.length === 0 && !isLoading) {
      items.push({ type: 'empty', key: 'empty', message: `No results for "${debouncedQuery}"` });
    }

    return items;
  }, [data, debouncedQuery, isLoading]);

  const handleProfilePress = useCallback((id: string) => {
    Haptics.selectionAsync();
    Keyboard.dismiss();
    router.push(`/user/${id}`);
  }, []);

  const handleEventPress = useCallback((id: string) => {
    Haptics.selectionAsync();
    Keyboard.dismiss();
    router.push(`/event/${id}`);
  }, []);

  const handleClear = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: SearchResultItem }) => {
      switch (item.type) {
        case 'section':
          return (
            <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
              {item.title}
            </Text>
          );
        case 'profile':
          return (
            <Pressable
              onPress={() => handleProfilePress(item.id)}
              style={({ pressed }) => [
                styles.resultRow,
                { backgroundColor: pressed ? colors.surfaceHover : 'transparent' },
              ]}
            >
              <Avatar
                uri={item.avatar_url}
                name={item.full_name ?? '?'}
                size="md"
              />
              <View style={styles.resultTextContainer}>
                <View style={styles.nameRow}>
                  <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>
                    {item.full_name ?? 'Unknown'}
                  </Text>
                  {item.role && <RoleBadge role={item.role} size="sm" />}
                </View>
                {item.headline ? (
                  <Text style={[styles.resultSub, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.headline}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </Pressable>
          );
        case 'event':
          return (
            <Pressable
              onPress={() => handleEventPress(item.id)}
              style={({ pressed }) => [
                styles.resultRow,
                { backgroundColor: pressed ? colors.surfaceHover : 'transparent' },
              ]}
            >
              <View style={[styles.eventIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="calendar" size={20} color={colors.primary} />
              </View>
              <View style={styles.resultTextContainer}>
                <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>
                  {item.title ?? 'Untitled Event'}
                </Text>
                <Text style={[styles.resultSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.event_date
                    ? new Date(item.event_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : ''}
                  {item.location ? ` · ${item.location}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </Pressable>
          );
        case 'empty':
          return (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {item.message}
              </Text>
            </View>
          );
        default:
          return null;
      }
    },
    [colors, handleProfilePress, handleEventPress],
  );

  const keyExtractor = useCallback((item: SearchResultItem) => item.key, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8),
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>

        {/* Search input */}
        <View style={[styles.searchBar, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search people, events..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={handleClear} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </Pressable>
          )}
          {isFetching && <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />}
        </View>
      </View>

      {/* Prompt */}
      {debouncedQuery.length < 2 && (
        <View style={styles.promptContainer}>
          <Ionicons name="search-outline" size={56} color={colors.textTertiary} />
          <Text style={[styles.promptTitle, { color: colors.text }]}>Search Clstr</Text>
          <Text style={[styles.promptSub, { color: colors.textSecondary }]}>
            Find people and events in your college network
          </Text>
        </View>
      )}

      {/* Results */}
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 40,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    paddingVertical: 0,
  },
  spinner: { marginLeft: 4 },
  listContent: { paddingBottom: 40 },
  sectionHeader: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  resultTextContainer: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultName: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.medium,
  },
  resultSub: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  promptContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: 12,
  },
  promptTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
  },
  promptSub: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
