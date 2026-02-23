/**
 * Alumni Directory Screen — Phase 9.4
 *
 * Browse verified alumni from the user's college domain.
 * Filters by graduation year, industry, and "willing to mentor".
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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { getAlumniByDomain } from '@/lib/api/alumni';
import type { AlumniUser } from '@/lib/api/alumni';
import { checkConnectionStatus, sendConnectionRequest } from '@/lib/api/social';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { useAuth } from '@/lib/auth-context';
import { MOBILE_QUERY_KEYS } from '@/lib/query-keys';
import { Avatar } from '@/components/Avatar';

// ─── Graduation year chips ───────────────────────────────────

const currentYear = new Date().getFullYear();
const GRAD_YEAR_FILTERS = ['All', ...Array.from({ length: 6 }, (_, i) => String(currentYear - i))];

// ─── Alumni Card ─────────────────────────────────────────────

const AlumniCard = React.memo(function AlumniCard({
  alumni,
  colors,
  currentUserId,
}: {
  alumni: AlumniUser;
  colors: ReturnType<typeof useThemeColors>;
  currentUserId: string;
}) {
  const queryClient = useQueryClient();

  // Phase 12.9 — Connection status query
  const { data: connectionStatus } = useQuery({
    queryKey: MOBILE_QUERY_KEYS.connectionStatus(alumni.id),
    queryFn: () => checkConnectionStatus(alumni.id),
    enabled: !!currentUserId && alumni.id !== currentUserId,
    staleTime: 60_000,
  });

  const connectMutation = useMutation({
    mutationFn: () => sendConnectionRequest(alumni.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOBILE_QUERY_KEYS.connectionStatus(alumni.id) });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to send connection request.'),
  });

  const isConnected = connectionStatus === 'accepted';
  const isPending = connectionStatus === 'pending';
  const isSelf = alumni.id === currentUserId;

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/user/${alumni.id}`);
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { backgroundColor: colors.surfaceHover },
      ]}
    >
      <View style={styles.cardHeader}>
        <Avatar uri={alumni.avatar_url} name={alumni.full_name} size="md" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {alumni.full_name}
          </Text>
          {alumni.headline ? (
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
              {alumni.headline}
            </Text>
          ) : alumni.current_position && alumni.current_company ? (
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
              {alumni.current_position} at {alumni.current_company}
            </Text>
          ) : null}
        </View>
        {alumni.willing_to_mentor && (
          <View style={[styles.mentorBadge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="school" size={12} color={colors.primary} />
            <Text style={[styles.mentorBadgeText, { color: colors.primary }]}>Mentor</Text>
          </View>
        )}
      </View>

      <View style={styles.tagsRow}>
        {alumni.graduation_year && (
          <View style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.tagText, { color: colors.textSecondary }]}>
              Class of {alumni.graduation_year}
            </Text>
          </View>
        )}
        {alumni.industry && (
          <View style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.tagText, { color: colors.textSecondary }]}>{alumni.industry}</Text>
          </View>
        )}
        {alumni.branch && (
          <View style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.tagText, { color: colors.textSecondary }]}>{alumni.branch}</Text>
          </View>
        )}
      </View>

      {alumni.location && (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={colors.textTertiary} />
          <Text style={[styles.locationText, { color: colors.textTertiary }]}>
            {alumni.location}
          </Text>
        </View>
      )}

      {/* Phase 12.9 — Connect / Message Actions */}
      {!isSelf && (
        <View style={styles.cardActions}>
          {isConnected ? (
            <>
              <View style={[styles.connectedBadge, { backgroundColor: colors.success + '15' }]}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={[styles.connectedText, { color: colors.success }]}>Connected</Text>
              </View>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/chat/${alumni.id}` as any);
                }}
                style={[styles.messageBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="chatbubble-outline" size={14} color="#fff" />
                <Text style={styles.messageBtnText}>Message</Text>
              </Pressable>
            </>
          ) : isPending ? (
            <View style={[styles.pendingBadge, { backgroundColor: colors.warning + '15' }]}>
              <Ionicons name="time-outline" size={14} color={colors.warning} />
              <Text style={[styles.pendingText, { color: colors.warning }]}>Pending</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                connectMutation.mutate();
              }}
              disabled={connectMutation.isPending}
              style={[styles.connectBtn, { backgroundColor: colors.primary }, connectMutation.isPending && { opacity: 0.6 }]}
            >
              {connectMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={14} color="#fff" />
                  <Text style={styles.connectBtnText}>Connect</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
});

// ─── Screen ──────────────────────────────────────────────────

export default function AlumniScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { identity, collegeDomain: identityDomain } = useIdentityContext();
  const { user } = useAuth();
  const userId = identity?.user_id ?? '';
  const collegeDomain = identityDomain ?? '';
  const currentUserId = user?.id ?? '';
  const { canViewAlumniDirectory } = useFeatureAccess();
  const [search, setSearch] = useState('');
  const [mentorOnly, setMentorOnly] = useState(false);
  const [gradYearFilter, setGradYearFilter] = useState('All');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['alumni', collegeDomain, userId],
    queryFn: () => getAlumniByDomain(collegeDomain, userId),
    enabled: !!userId && !!collegeDomain && canViewAlumniDirectory,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const alumni = useMemo(() => {
    let list = (data ?? []) as AlumniUser[];
    if (mentorOnly) list = list.filter((a) => a.willing_to_mentor);
    if (gradYearFilter !== 'All') {
      list = list.filter((a) => String(a.graduation_year) === gradYearFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.full_name.toLowerCase().includes(q) ||
          a.current_company?.toLowerCase().includes(q) ||
          a.current_position?.toLowerCase().includes(q) ||
          a.industry?.toLowerCase().includes(q) ||
          a.branch?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [data, search, mentorOnly, gradYearFilter]);

  const totalAlumni = (data ?? []).length;
  const mentorCount = (data ?? []).filter((a: AlumniUser) => a.willing_to_mentor).length;

  const renderItem = useCallback(
    ({ item }: { item: AlumniUser }) => <AlumniCard alumni={item} colors={colors} currentUserId={currentUserId} />,
    [colors, currentUserId],
  );

  const keyExtractor = useCallback((item: AlumniUser) => item.id, []);

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Alumni Directory</Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/alumni-invite' as any);
          }}
          hitSlop={8}
        >
          <Ionicons name="person-add-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {/* Search + Filter */}
      <View style={[styles.filtersRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search alumni…"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setMentorOnly((p) => !p);
          }}
          style={[
            styles.filterChip,
            mentorOnly
              ? { backgroundColor: colors.primary }
              : { borderColor: colors.border, borderWidth: 1 },
          ]}
        >
          <Ionicons name="school-outline" size={14} color={mentorOnly ? '#fff' : colors.text} />
          <Text
            style={[
              styles.filterChipText,
              { color: mentorOnly ? '#fff' : colors.text },
            ]}
          >
            Mentors
          </Text>
        </Pressable>
      </View>

      {/* Phase 6 — Alumni stats */}
      <View style={styles.alumniStatsRow}>
        <View style={[styles.alumniStatBox, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.alumniStatNum, { color: colors.primary }]}>{totalAlumni}</Text>
          <Text style={[styles.alumniStatLabel, { color: colors.textSecondary }]}>Alumni</Text>
        </View>
        <View style={[styles.alumniStatBox, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.alumniStatNum, { color: colors.primary }]}>{mentorCount}</Text>
          <Text style={[styles.alumniStatLabel, { color: colors.textSecondary }]}>Mentors</Text>
        </View>
        <View style={[styles.alumniStatBox, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.alumniStatNum, { color: colors.primary }]}>{alumni.length}</Text>
          <Text style={[styles.alumniStatLabel, { color: colors.textSecondary }]}>Filtered</Text>
        </View>
      </View>

      {/* Phase 6 — Graduation year filter chips */}
      <FlatList
        data={GRAD_YEAR_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.gradFilterList}
        contentContainerStyle={styles.gradFilterContent}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => { setGradYearFilter(item); Haptics.selectionAsync(); }}
            style={[
              styles.gradChip,
              {
                backgroundColor: gradYearFilter === item ? colors.primary : 'transparent',
                borderColor: gradYearFilter === item ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[styles.gradChipText, { color: gradYearFilter === item ? '#fff' : colors.textSecondary }]}>
              {item === 'All' ? 'All Years' : `Class of ${item}`}
            </Text>
          </Pressable>
        )}
      />

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : alumni.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="school-outline" size={56} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No alumni found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {search || mentorOnly ? 'Try adjusting your filters' : 'Alumni from your college will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={alumni}
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
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
  },
  alumniStatsRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  alumniStatBox: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  alumniStatNum: { fontSize: 20, fontWeight: '800', fontFamily: fontFamily.bold },
  alumniStatLabel: { fontSize: 11, marginTop: 2, fontFamily: fontFamily.regular },
  gradFilterList: { flexGrow: 0 },
  gradFilterContent: { paddingHorizontal: 14, paddingBottom: 8, gap: 6 },
  gradChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
  gradChipText: { fontSize: 12, fontWeight: '600', fontFamily: fontFamily.semiBold },
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
  cardTitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
  },
  cardMeta: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
  },
  mentorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mentorBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
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
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
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
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  messageBtnText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  connectedText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pendingText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
  },
});
