/**
 * Mentorship Screen — Phase 9.2
 *
 * Browse mentors, manage requests (both as mentee and mentor).
 * Segmented: Mentors · My Requests · (if mentor) Incoming · Active.
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
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import {
  getMentors,
  getMyMentorshipRequests,
  getIncomingMentorshipRequests,
  getActiveRelationships,
  updateMentorshipRequestStatus,
  cancelMentorshipRequest,
  MENTORSHIP_QUERY_KEYS,
} from '@/lib/api/mentorship';
import type { Mentor, MentorshipRequest } from '@/lib/api/mentorship';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { QUERY_KEYS } from '@/lib/query-keys';
import { Avatar } from '@/components/Avatar';

// ─── Tab types ───────────────────────────────────────────────

type TabKey = 'mentors' | 'myRequests' | 'incoming' | 'active';

// ─── Mentor Card ─────────────────────────────────────────────

const MentorCard = React.memo(function MentorCard({
  mentor,
  colors,
}: {
  mentor: Mentor;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/user/${mentor.id}`);
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { backgroundColor: colors.surfaceHover },
      ]}
    >
      <View style={styles.cardHeader}>
        <Avatar uri={mentor.avatar_url} name={mentor.full_name ?? '?'} size="md" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {mentor.full_name}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.textTertiary }]} numberOfLines={1}>
            {mentor.current_position ?? mentor.role}
            {mentor.current_company ? ` at ${mentor.current_company}` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>
      {mentor.industry && (
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.tagText, { color: colors.primary }]}>{mentor.industry}</Text>
          </View>
          {mentor.offer?.help_type && (
            <View style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>{mentor.offer.help_type}</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
});

// ─── Request Card ────────────────────────────────────────────

const RequestCard = React.memo(function RequestCard({
  request,
  colors,
  type,
  onAccept,
  onReject,
  onCancel,
}: {
  request: MentorshipRequest;
  colors: ReturnType<typeof useThemeColors>;
  type: 'myRequest' | 'incoming' | 'active';
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onCancel?: (id: string) => void;
}) {
  const person = type === 'myRequest' ? request.mentor : request.mentee;
  const statusColors: Record<string, string> = {
    pending: '#f59e0b',
    accepted: '#10b981',
    rejected: '#ef4444',
    completed: '#6366f1',
    cancelled: '#9ca3af',
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Avatar uri={person?.avatar_url} name={person?.full_name ?? '?'} size="sm" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {person?.full_name ?? 'Unknown'}
          </Text>
          <View style={styles.metaRow}>
            <View
              style={[styles.statusDot, { backgroundColor: statusColors[request.status] ?? colors.textTertiary }]}
            />
            <Text style={[styles.cardMeta, { color: colors.textTertiary }]}>
              {request.status}
            </Text>
          </View>
        </View>
      </View>

      {request.message && (
        <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {request.message}
        </Text>
      )}

      {/* Actions */}
      {type === 'incoming' && request.status === 'pending' && (
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => onAccept?.(request.id)}
          >
            <Text style={styles.actionBtnText}>Accept</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtnOutline, { borderColor: colors.border }]}
            onPress={() => onReject?.(request.id)}
          >
            <Text style={[styles.actionBtnOutlineText, { color: colors.textSecondary }]}>Decline</Text>
          </Pressable>
        </View>
      )}

      {type === 'myRequest' && request.status === 'pending' && (
        <Pressable
          style={[styles.actionBtnOutline, { borderColor: colors.border, alignSelf: 'flex-start' }]}
          onPress={() => onCancel?.(request.id)}
        >
          <Text style={[styles.actionBtnOutlineText, { color: colors.textSecondary }]}>Cancel</Text>
        </Pressable>
      )}
    </View>
  );
});

// ─── Screen ──────────────────────────────────────────────────

export default function MentorshipScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { identity, collegeDomain: identityDomain } = useIdentityContext();
  const userId = identity?.user_id ?? '';
  const collegeDomain = identityDomain ?? '';
  const {
    canBrowseMentors,
    canRequestMentorship,
    canOfferMentorship,
  } = useFeatureAccess();

  const tabs = useMemo<{ key: TabKey; label: string }[]>(() => {
    const t: { key: TabKey; label: string }[] = [
      { key: 'mentors', label: 'Mentors' },
      { key: 'myRequests', label: 'My Requests' },
    ];
    if (canOfferMentorship) {
      t.push({ key: 'incoming', label: 'Incoming' });
      t.push({ key: 'active', label: 'Active' });
    }
    return t;
  }, [canOfferMentorship]);

  const [activeTab, setActiveTab] = useState<TabKey>('mentors');

  // ── Queries ────────────────────────────────────────────────
  const mentorsQuery = useQuery({
    queryKey: MENTORSHIP_QUERY_KEYS.mentors(collegeDomain),
    queryFn: () => getMentors(collegeDomain),
    enabled: !!collegeDomain && canBrowseMentors,
    staleTime: 30_000,
  });

  const myRequestsQuery = useQuery({
    queryKey: MENTORSHIP_QUERY_KEYS.myRequests(userId),
    queryFn: () => getMyMentorshipRequests(userId),
    enabled: !!userId,
    staleTime: 15_000,
  });

  const incomingQuery = useQuery({
    queryKey: MENTORSHIP_QUERY_KEYS.incomingRequests(userId),
    queryFn: () => getIncomingMentorshipRequests(userId),
    enabled: !!userId && canOfferMentorship,
    staleTime: 15_000,
  });

  const activeRelQuery = useQuery({
    queryKey: MENTORSHIP_QUERY_KEYS.activeRelationships(userId),
    queryFn: () => getActiveRelationships(userId),
    enabled: !!userId && canOfferMentorship,
    staleTime: 15_000,
  });

  // ── Mutations ──────────────────────────────────────────────
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['mentorship'] });
  }, [queryClient]);

  const acceptMut = useMutation({
    mutationFn: (id: string) => updateMentorshipRequestStatus(userId, id, 'accepted'),
    onSuccess: invalidateAll,
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => updateMentorshipRequestStatus(userId, id, 'rejected'),
    onSuccess: invalidateAll,
  });
  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelMentorshipRequest(userId, id),
    onSuccess: invalidateAll,
  });

  // ── Resolved data ──────────────────────────────────────────
  const { data, isLoading, isRefetching, refetch } = useMemo(() => {
    switch (activeTab) {
      case 'mentors':
        return mentorsQuery;
      case 'myRequests':
        return myRequestsQuery;
      case 'incoming':
        return incomingQuery;
      case 'active':
        return activeRelQuery;
    }
  }, [activeTab, mentorsQuery, myRequestsQuery, incomingQuery, activeRelQuery]);

  const renderMentor = useCallback(
    ({ item }: { item: Mentor }) => <MentorCard mentor={item} colors={colors} />,
    [colors],
  );

  const renderRequest = useCallback(
    ({ item }: { item: MentorshipRequest }) => (
      <RequestCard
        request={item}
        colors={colors}
        type={activeTab === 'incoming' ? 'incoming' : activeTab === 'active' ? 'active' : 'myRequest'}
        onAccept={(id) => acceptMut.mutate(id)}
        onReject={(id) => rejectMut.mutate(id)}
        onCancel={(id) => cancelMut.mutate(id)}
      />
    ),
    [colors, activeTab, acceptMut, rejectMut, cancelMut],
  );

  const renderItem = activeTab === 'mentors' ? renderMentor : renderRequest;
  const keyExtractor = useCallback((item: any) => item.id ?? item.offer?.id ?? Math.random().toString(), []);

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mentorship</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {tabs.map((tab) => {
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
              <Text style={[styles.tabLabel, { color: isActive ? colors.primary : colors.textTertiary }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !data || (Array.isArray(data) && data.length === 0) ? (
        <View style={styles.centerContainer}>
          <Ionicons name="school-outline" size={56} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {activeTab === 'mentors' ? 'No mentors available' : 'No requests yet'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {activeTab === 'mentors'
              ? 'Mentors in your college will appear here'
              : 'Mentorship requests will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data as any[]}
          renderItem={renderItem as any}
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    flexGrow: 0,
  },
  tab: {
    paddingHorizontal: 16,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
  },
  actionBtnOutline: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnOutlineText: {
    fontSize: fontSize.sm,
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
