/**
 * Search Screen — Phase 8.1 → Phase 12.11
 *
 * Multi-category search: People, Posts, Events, Jobs, Clubs, Projects.
 * Uses `typeaheadSearch()` for profiles + events, direct Supabase for the rest.
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
  ScrollView,
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
import { QUERY_KEYS, MOBILE_QUERY_KEYS } from '@/lib/query-keys';
import { Avatar } from '@/components/Avatar';
import RoleBadge from '@/components/RoleBadge';
import { supabase } from '@/lib/adapters/core-client';

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

// ─── Search categories ───────────────────────────────────────

type SearchCategory = 'all' | 'people' | 'posts' | 'events' | 'jobs' | 'clubs' | 'projects';

const CATEGORIES: { key: SearchCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'search-outline' },
  { key: 'people', label: 'People', icon: 'person-outline' },
  { key: 'posts', label: 'Posts', icon: 'document-text-outline' },
  { key: 'events', label: 'Events', icon: 'calendar-outline' },
  { key: 'jobs', label: 'Jobs', icon: 'briefcase-outline' },
  { key: 'clubs', label: 'Clubs', icon: 'people-outline' },
  { key: 'projects', label: 'Projects', icon: 'code-slash-outline' },
];

// ─── Result item types ───────────────────────────────────────

type SearchResultItem =
  | { type: 'section'; title: string; key: string }
  | { type: 'profile'; id: string; full_name: string | null; headline: string | null; avatar_url: string | null; role: string | null; key: string }
  | { type: 'event'; id: string; title: string | null; event_date: string | null; location: string | null; category: string | null; key: string }
  | { type: 'job'; id: string; title: string | null; company: string | null; location: string | null; job_type: string | null; key: string }
  | { type: 'club'; id: string; name: string | null; description: string | null; club_type: string | null; key: string }
  | { type: 'post'; id: string; content: string | null; author_name: string | null; created_at: string | null; key: string }
  | { type: 'project'; id: string; title: string | null; description: string | null; status: string | null; key: string }
  | { type: 'empty'; key: string; message: string };

// ─── Screen ──────────────────────────────────────────────────

export default function SearchScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { collegeDomain } = useIdentityContext();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const inputRef = useRef<TextInput>(null);

  // Core typeahead: profiles + events
  const { data, isLoading, isFetching } = useQuery({
    queryKey: QUERY_KEYS.typeahead(debouncedQuery, collegeDomain ?? ''),
    queryFn: () => typeaheadSearch({ query: debouncedQuery, collegeDomain }),
    enabled: debouncedQuery.length >= 2 && !!collegeDomain && (category === 'all' || category === 'people' || category === 'events'),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // Posts search
  const { data: postsData } = useQuery({
    queryKey: MOBILE_QUERY_KEYS.search.posts(debouncedQuery, collegeDomain ?? ''),
    queryFn: async () => {
      const pattern = `%${debouncedQuery}%`;
      const { data: rows, error } = await supabase
        .from('posts')
        .select('id, content, created_at, profiles!posts_user_id_fkey(full_name)')
        .eq('college_domain', collegeDomain!.trim().toLowerCase())
        .ilike('content', pattern)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (rows ?? []).map((r: any) => ({
        id: r.id,
        content: r.content,
        created_at: r.created_at,
        author_name: r.profiles?.full_name ?? null,
      }));
    },
    enabled: debouncedQuery.length >= 2 && !!collegeDomain && (category === 'all' || category === 'posts'),
    staleTime: 60_000,
  });

  // Jobs search
  const { data: jobsData } = useQuery({
    queryKey: MOBILE_QUERY_KEYS.search.jobs(debouncedQuery, collegeDomain ?? ''),
    queryFn: async () => {
      const pattern = `%${debouncedQuery}%`;
      const { data: rows, error } = await supabase
        .from('jobs')
        .select('id, title, company, location, job_type')
        .eq('college_domain', collegeDomain!.trim().toLowerCase())
        .or(`title.ilike.${pattern},company.ilike.${pattern}`)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return rows ?? [];
    },
    enabled: debouncedQuery.length >= 2 && !!collegeDomain && (category === 'all' || category === 'jobs'),
    staleTime: 60_000,
  });

  // Clubs search
  const { data: clubsData } = useQuery({
    queryKey: MOBILE_QUERY_KEYS.search.clubs(debouncedQuery, collegeDomain ?? ''),
    queryFn: async () => {
      const pattern = `%${debouncedQuery}%`;
      const { data: rows, error } = await supabase
        .from('clubs')
        .select('id, name, description, club_type')
        .eq('college_domain', collegeDomain!.trim().toLowerCase())
        .or(`name.ilike.${pattern},description.ilike.${pattern}`)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return rows ?? [];
    },
    enabled: debouncedQuery.length >= 2 && !!collegeDomain && (category === 'all' || category === 'clubs'),
    staleTime: 60_000,
  });

  // Projects search
  const { data: projectsData } = useQuery({
    queryKey: MOBILE_QUERY_KEYS.search.projects(debouncedQuery, collegeDomain ?? ''),
    queryFn: async () => {
      const pattern = `%${debouncedQuery}%`;
      const { data: rows, error } = await supabase
        .from('collab_projects')
        .select('id, title, description, status')
        .eq('college_domain', collegeDomain!.trim().toLowerCase())
        .or(`title.ilike.${pattern},description.ilike.${pattern}`)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return rows ?? [];
    },
    enabled: debouncedQuery.length >= 2 && !!collegeDomain && (category === 'all' || category === 'projects'),
    staleTime: 60_000,
  });

  // Build flat list data with section headers
  const listData = useMemo<SearchResultItem[]>(() => {
    if (debouncedQuery.length < 2) return [];
    const items: SearchResultItem[] = [];

    // People
    if ((category === 'all' || category === 'people') && data?.profiles && data.profiles.length > 0) {
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

    // Posts
    if ((category === 'all' || category === 'posts') && postsData && postsData.length > 0) {
      items.push({ type: 'section', title: 'Posts', key: 'section-posts' });
      postsData.forEach((p: any) =>
        items.push({
          type: 'post' as const,
          id: p.id,
          content: p.content,
          author_name: p.author_name,
          created_at: p.created_at,
          key: `post-${p.id}`,
        }),
      );
    }

    // Events
    if ((category === 'all' || category === 'events') && data?.events && data.events.length > 0) {
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

    // Jobs
    if ((category === 'all' || category === 'jobs') && jobsData && jobsData.length > 0) {
      items.push({ type: 'section', title: 'Jobs', key: 'section-jobs' });
      jobsData.forEach((j: any) =>
        items.push({
          type: 'job',
          id: j.id,
          title: j.title,
          company: j.company,
          location: j.location,
          job_type: j.job_type,
          key: `job-${j.id}`,
        }),
      );
    }

    // Clubs
    if ((category === 'all' || category === 'clubs') && clubsData && clubsData.length > 0) {
      items.push({ type: 'section', title: 'Clubs', key: 'section-clubs' });
      clubsData.forEach((c: any) =>
        items.push({
          type: 'club',
          id: c.id,
          name: c.name,
          description: c.description,
          club_type: c.club_type,
          key: `club-${c.id}`,
        }),
      );
    }

    // Projects
    if ((category === 'all' || category === 'projects') && projectsData && projectsData.length > 0) {
      items.push({ type: 'section', title: 'Projects', key: 'section-projects' });
      projectsData.forEach((p: any) =>
        items.push({
          type: 'project',
          id: p.id,
          title: p.title,
          description: p.description,
          status: p.status,
          key: `project-${p.id}`,
        }),
      );
    }

    if (items.length === 0 && !isLoading) {
      items.push({ type: 'empty', key: 'empty', message: `No results for "${debouncedQuery}"` });
    }

    return items;
  }, [data, postsData, jobsData, clubsData, projectsData, debouncedQuery, isLoading, category]);

  const handleProfilePress = useCallback((id: string) => {
    Haptics.selectionAsync();
    Keyboard.dismiss();
    router.push(`/user/${id}`);
  }, []);

  const handlePostPress = useCallback((id: string) => {
    Haptics.selectionAsync();
    Keyboard.dismiss();
    router.push(`/post/${id}`);
  }, []);

  const handleEventPress = useCallback((id: string) => {
    Haptics.selectionAsync();
    Keyboard.dismiss();
    router.push(`/event/${id}`);
  }, []);

  const handleJobPress = useCallback((id: string) => {
    Haptics.selectionAsync();
    Keyboard.dismiss();
    router.push(`/job/${id}`);
  }, []);

  const handleClubPress = useCallback((id: string) => {
    Haptics.selectionAsync();
    Keyboard.dismiss();
    router.push(`/club/${id}` as any);
  }, []);

  const handleProjectPress = useCallback((id: string) => {
    Haptics.selectionAsync();
    Keyboard.dismiss();
    router.push(`/project/${id}`);
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
        case 'post':
          return (
            <Pressable
              onPress={() => handlePostPress(item.id)}
              style={({ pressed }) => [
                styles.resultRow,
                { backgroundColor: pressed ? colors.surfaceHover : 'transparent' },
              ]}
            >
              <View style={[styles.eventIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="document-text" size={20} color={colors.primary} />
              </View>
              <View style={styles.resultTextContainer}>
                <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={2}>
                  {item.content ? item.content.slice(0, 100) : 'Untitled Post'}
                </Text>
                <Text style={[styles.resultSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {[item.author_name, item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null].filter(Boolean).join(' · ')}
                </Text>
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
        case 'job':
          return (
            <Pressable
              onPress={() => handleJobPress(item.id)}
              style={({ pressed }) => [
                styles.resultRow,
                { backgroundColor: pressed ? colors.surfaceHover : 'transparent' },
              ]}
            >
              <View style={[styles.eventIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="briefcase" size={20} color={colors.primary} />
              </View>
              <View style={styles.resultTextContainer}>
                <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>
                  {item.title ?? 'Untitled Job'}
                </Text>
                <Text style={[styles.resultSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {[item.company, item.location, item.job_type].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </Pressable>
          );
        case 'club':
          return (
            <Pressable
              onPress={() => handleClubPress(item.id)}
              style={({ pressed }) => [
                styles.resultRow,
                { backgroundColor: pressed ? colors.surfaceHover : 'transparent' },
              ]}
            >
              <View style={[styles.eventIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="people" size={20} color={colors.primary} />
              </View>
              <View style={styles.resultTextContainer}>
                <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>
                  {item.name ?? 'Untitled Club'}
                </Text>
                {item.club_type && (
                  <Text style={[styles.resultSub, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.club_type}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </Pressable>
          );
        case 'project':
          return (
            <Pressable
              onPress={() => handleProjectPress(item.id)}
              style={({ pressed }) => [
                styles.resultRow,
                { backgroundColor: pressed ? colors.surfaceHover : 'transparent' },
              ]}
            >
              <View style={[styles.eventIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="code-slash" size={20} color={colors.primary} />
              </View>
              <View style={styles.resultTextContainer}>
                <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>
                  {item.title ?? 'Untitled Project'}
                </Text>
                {item.status && (
                  <Text style={[styles.resultSub, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.status}
                  </Text>
                )}
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
    [colors, handleProfilePress, handlePostPress, handleEventPress, handleJobPress, handleClubPress, handleProjectPress],
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
            placeholder="Search people, posts, events, jobs, clubs…"
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

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipBar}
        style={{ flexGrow: 0 }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = category === cat.key;
          return (
            <Pressable
              key={cat.key}
              onPress={() => { setCategory(cat.key); Haptics.selectionAsync(); }}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? colors.tint + '18' : colors.surfaceSecondary,
                  borderColor: isActive ? colors.tint : colors.border,
                },
              ]}
            >
              <Ionicons name={cat.icon} size={14} color={isActive ? colors.tint : colors.textSecondary} />
              <Text style={[styles.chipLabel, { color: isActive ? colors.tint : colors.textSecondary }]}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Prompt */}
      {debouncedQuery.length < 2 && (
        <View style={styles.promptContainer}>
          <Ionicons name="search-outline" size={56} color={colors.textTertiary} />
          <Text style={[styles.promptTitle, { color: colors.text }]}>Search Clstr</Text>
          <Text style={[styles.promptSub, { color: colors.textSecondary }]}>
            Find people, posts, events, jobs, clubs and projects
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
  chipBar: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  chipLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
  },
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
