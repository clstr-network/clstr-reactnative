/**
 * Jobs Screen — Phase 9.1
 *
 * Browse jobs posted by alumni / organizations.
 * Features: search, filters (type, location, saved), recommended jobs tab.
 * Uses `getJobs()`, `toggleSaveJob()` from `lib/api/jobs`.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { getJobs, getSavedJobs, toggleSaveJob } from '@/lib/api/jobs';
import type { Job } from '@/lib/api/jobs';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { QUERY_KEYS } from '@/lib/query-keys';

// ─── Tab types ───────────────────────────────────────────────

type TabKey = 'browse' | 'saved';

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'browse', label: 'Browse', icon: 'briefcase-outline' },
  { key: 'saved', label: 'Saved', icon: 'bookmark-outline' },
];

// ─── Job Card ────────────────────────────────────────────────

const JobCard = React.memo(function JobCard({
  job,
  colors,
  onSave,
  isSaved,
}: {
  job: Job;
  colors: ReturnType<typeof useThemeColors>;
  onSave: (jobId: string) => void;
  isSaved?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/job/${job.id}`);
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { backgroundColor: colors.surfaceHover },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.jobIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="briefcase" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {job.title}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.textTertiary }]} numberOfLines={1}>
            {job.company_name ?? 'Unknown'} {job.location ? `· ${job.location}` : ''}
          </Text>
        </View>
        <Pressable onPress={() => onSave(job.id)} hitSlop={8}>
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={isSaved ? colors.primary : colors.textTertiary}
          />
        </Pressable>
      </View>

      {job.description && (
        <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {job.description}
        </Text>
      )}

      <View style={styles.tagRow}>
        {job.job_type && (
          <View style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.tagText, { color: colors.primary }]}>{job.job_type}</Text>
          </View>
        )}
        {job.experience_level && (
          <View style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.tagText, { color: colors.textSecondary }]}>{job.experience_level}</Text>
          </View>
        )}
        {(job.salary_min != null || job.salary_max != null) && (
          <View style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.tagText, { color: colors.textSecondary }]}>
              {job.salary_min != null && job.salary_max != null
                ? `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
                : job.salary_min != null
                  ? `From ${job.salary_min.toLocaleString()}`
                  : `Up to ${job.salary_max!.toLocaleString()}`}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
});

// ─── Screen ──────────────────────────────────────────────────

export default function JobsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { identity } = useIdentityContext();
  const userId = identity?.user_id ?? '';
  const { canBrowseJobs, canSaveJobs } = useFeatureAccess();

  const [activeTab, setActiveTab] = useState<TabKey>('browse');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Browse jobs ────────────────────────────────────────────
  const browseQuery = useQuery({
    queryKey: [...QUERY_KEYS.jobs, 'browse', searchQuery],
    queryFn: () =>
      getJobs({
        search: searchQuery || undefined,
      }),
    enabled: canBrowseJobs,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  // ── Saved jobs ─────────────────────────────────────────────
  const savedQuery = useQuery({
    queryKey: QUERY_KEYS.savedJobs,
    queryFn: () => getSavedJobs(),
    enabled: !!userId && canSaveJobs,
    staleTime: 30_000,
  });

  const savedIds = useMemo(
    () => new Set((savedQuery.data?.jobs ?? []).map((j: Job) => j.id)),
    [savedQuery.data],
  );

  // ── Toggle save ────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (jobId: string) => toggleSaveJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.savedJobs });
    },
  });

  const handleSave = useCallback(
    (jobId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      saveMutation.mutate(jobId);
    },
    [saveMutation],
  );

  // ── Resolved data ──────────────────────────────────────────
  const displayJobs = useMemo(() => {
    if (activeTab === 'saved') return savedQuery.data?.jobs ?? [];
    return browseQuery.data?.jobs ?? [];
  }, [activeTab, browseQuery.data, savedQuery.data]);

  const isLoading = activeTab === 'browse' ? browseQuery.isLoading : savedQuery.isLoading;
  const isRefetching = activeTab === 'browse' ? browseQuery.isRefetching : savedQuery.isRefetching;
  const refetch = activeTab === 'browse' ? browseQuery.refetch : savedQuery.refetch;

  const renderItem = useCallback(
    ({ item }: { item: Job }) => (
      <JobCard job={item} colors={colors} onSave={handleSave} isSaved={savedIds.has(item.id)} />
    ),
    [colors, handleSave, savedIds],
  );

  const keyExtractor = useCallback((item: Job) => item.id, []);

  if (!canBrowseJobs) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8), borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Jobs</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="lock-closed-outline" size={56} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Access Restricted</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            You don't have permission to browse jobs.
          </Text>
        </View>
      </View>
    );
  }

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Jobs</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { borderBottomColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search jobs..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab(tab.key);
              }}
              style={[styles.tab, isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            >
              <Ionicons name={tab.icon} size={16} color={isActive ? colors.primary : colors.textTertiary} />
              <Text style={[styles.tabLabel, { color: isActive ? colors.primary : colors.textTertiary }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : displayJobs.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="briefcase-outline" size={56} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {activeTab === 'saved' ? 'No saved jobs' : 'No jobs found'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {activeTab === 'saved' ? 'Jobs you save will appear here' : 'Try adjusting your search'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayJobs}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        />
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    paddingVertical: 0,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  tabLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
  },
  listContent: { padding: 16, gap: 12 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  jobIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
  },
  cardMeta: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },
  cardDescription: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    lineHeight: fontSize.base * 1.4,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
  },
  emptySubtitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
  },
});
