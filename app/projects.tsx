/**
 * Projects / CollabHub Screen — Phase 9.5
 *
 * Browse open projects (CollabHub), view own projects.
 * Tabs: Explore / My Projects
 */

import React, { useCallback, useMemo, useState } from 'react';
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
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { getProjects, getMyProjects } from '@/lib/api/projects';
import type { Project } from '@/lib/api/projects';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { QUERY_KEYS } from '@/lib/query-keys';

type TabKey = 'explore' | 'mine';

// ─── Project Card ────────────────────────────────────────────

const ProjectCard = React.memo(function ProjectCard({
  project,
  colors,
}: {
  project: Project;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const statusColor =
    project.status === 'active'
      ? '#22c55e'
      : project.status === 'completed'
        ? colors.primary
        : colors.textTertiary;

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/project/${project.id}`);
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { backgroundColor: colors.surfaceHover },
      ]}
    >
      <View style={styles.cardHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
            {project.title}
          </Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </View>

      {project.description && (
        <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {project.description}
        </Text>
      )}

      {/* Tech stack tags */}
      {project.tech_stack && project.tech_stack.length > 0 && (
        <View style={styles.tagsRow}>
          {project.tech_stack.slice(0, 5).map((tech: string, idx: number) => (
            <View key={idx} style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tech}</Text>
            </View>
          ))}
          {project.tech_stack.length > 5 && (
            <View style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.tagText, { color: colors.textTertiary }]}>
                +{project.tech_stack.length - 5}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.footerRow}>
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          {project.status === 'active' ? 'Recruiting' : project.status}
        </Text>
        {(project as any).team_members_count != null && (
          <View style={styles.teamCountRow}>
            <Ionicons name="people-outline" size={12} color={colors.textTertiary} />
            <Text style={[styles.footerText, { color: colors.textTertiary }]}>
              {(project as any).team_members_count}{project.max_team_size ? `/${project.max_team_size}` : ''} members
            </Text>
          </View>
        )}
        {(project as any).team_members_count == null && project.max_team_size && (
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            Team: up to {project.max_team_size}
          </Text>
        )}
      </View>
    </Pressable>
  );
});

// ─── Screen ──────────────────────────────────────────────────

export default function ProjectsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { identity, collegeDomain } = useIdentityContext();
  const userId = identity?.user_id ?? '';
  const { canViewProjects, canCreateProjects } = useFeatureAccess();
  const [tab, setTab] = useState<TabKey>('explore');
  const [projectSearch, setProjectSearch] = useState('');

  const exploreQ = useQuery({
    queryKey: [...QUERY_KEYS.projects, 'explore', collegeDomain],
    queryFn: () =>
      getProjects({
        collegeDomain: collegeDomain ?? '',
        filters: { status: ['active'] },
      }),
    enabled: tab === 'explore' && canViewProjects,
    staleTime: 30_000,
  });

  const myQ = useQuery({
    queryKey: [...QUERY_KEYS.projects, 'mine', userId],
    queryFn: () => getMyProjects(userId),
    enabled: tab === 'mine' && !!userId,
    staleTime: 30_000,
  });

  const isActive = tab === 'explore';
  const queryObj = isActive ? exploreQ : myQ;
  const projects = useMemo(() => {
    const raw = (queryObj.data ?? []) as Project[];
    if (!projectSearch.trim()) return raw;
    const q = projectSearch.toLowerCase();
    return raw.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.tech_stack ?? []).some((t: string) => t.toLowerCase().includes(q)),
    );
  }, [queryObj.data, projectSearch]);

  const renderItem = useCallback(
    ({ item }: { item: Project }) => <ProjectCard project={item} colors={colors} />,
    [colors],
  );

  const keyExtractor = useCallback((item: Project) => item.id, []);

  const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'explore', label: 'Explore', icon: 'compass-outline' },
    { key: 'mine', label: 'My Projects', icon: 'folder-outline' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8), borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>CollabHub</Text>
        {canCreateProjects ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/project/create' as any);
            }}
            hitSlop={8}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {tabs.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => {
              Haptics.selectionAsync();
              setTab(t.key);
            }}
            style={[styles.tab, tab === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Ionicons
              name={t.icon}
              size={16}
              color={tab === t.key ? colors.primary : colors.textTertiary}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: tab === t.key ? colors.primary : colors.textTertiary },
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Phase 6 — Project search bar */}
      <View style={[styles.projectSearchRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.projectSearchBar, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
          <TextInput
            value={projectSearch}
            onChangeText={setProjectSearch}
            placeholder="Search projects or tech..."
            placeholderTextColor={colors.textTertiary}
            style={[styles.projectSearchInput, { color: colors.text }]}
            autoCorrect={false}
            returnKeyType="search"
          />
          {projectSearch.length > 0 && (
            <Pressable onPress={() => setProjectSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Content */}
      {queryObj.isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : projects.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="code-slash-outline" size={56} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No projects yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {tab === 'mine'
              ? 'Create a project to start building with others'
              : 'Open projects will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={queryObj.isRefetching}
              onRefresh={queryObj.refetch}
              tintColor={colors.primary}
            />
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
  },
  projectSearchRow: { paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1 },
  projectSearchBar: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 10, height: 36 },
  projectSearchInput: { flex: 1, fontSize: fontSize.base, fontFamily: fontFamily.regular },
  teamCountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listContent: { padding: 16, gap: 12 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    lineHeight: fontSize.body * 1.35,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  cardDescription: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    lineHeight: fontSize.base * 1.4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
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
