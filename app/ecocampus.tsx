/**
 * EcoCampus Screen — Phase 9.6
 *
 * Browse shared items and item requests.
 * Tabs: Shared Items / Requests / My Listings
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import {
  fetchSharedItems,
  fetchRequests,
  fetchMySharedItems,
  deleteSharedItem,
  createSharedItemIntent,
} from '@/lib/api/ecocampus';
import type { SharedItem, ItemRequest } from '@/lib/api/ecocampus';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';

type TabKey = 'items' | 'requests' | 'mine';

// ─── Shared Item Card ────────────────────────────────────────

const SharedItemCard = React.memo(function SharedItemCard({
  item,
  colors,
  onClaim,
}: {
  item: SharedItem;
  colors: ReturnType<typeof useThemeColors>;
  onClaim?: (itemId: string) => void;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
      )}
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.description && (
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.cardFooter}>
          <View style={[styles.conditionBadge, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.conditionText, { color: colors.textTertiary }]}>
              {item.share_type ?? 'Free'}
            </Text>
          </View>
          {item.category && (
            <Text style={[styles.categoryText, { color: colors.textTertiary }]}>
              {item.category}
            </Text>
          )}
        </View>
        {onClaim && item.status === 'available' && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClaim(item.id);
            }}
            style={[styles.claimBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.claimBtnText}>I'm Interested</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});

// ─── Request Card ────────────────────────────────────────────

const RequestCard = React.memo(function RequestCard({
  request,
  colors,
}: {
  request: ItemRequest;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {request.item}
        </Text>
        {request.description && (
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
            {request.description}
          </Text>
        )}
        <View style={styles.cardFooter}>
          {request.preference && (
            <View style={[styles.conditionBadge, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.conditionText, { color: colors.textTertiary }]}>
                {request.preference}
              </Text>
            </View>
          )}
          <Text style={[styles.categoryText, { color: colors.textTertiary }]}>
            {request.urgency ?? 'Normal'}
          </Text>
        </View>
      </View>
    </View>
  );
});

// ─── Screen ──────────────────────────────────────────────────

export default function EcoCampusScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { identity, collegeDomain } = useIdentityContext();
  const userId = identity?.user_id ?? '';
  const domain = collegeDomain ?? '';
  const { canBrowseEcoCampus, canCreateListing } = useFeatureAccess();
  const [tab, setTab] = useState<TabKey>('items');

  const itemsQ = useQuery({
    queryKey: ['eco', 'items', domain],
    queryFn: () => fetchSharedItems(),
    enabled: tab === 'items' && canBrowseEcoCampus,
    staleTime: 30_000,
  });

  const requestsQ = useQuery({
    queryKey: ['eco', 'requests', domain],
    queryFn: () => fetchRequests(),
    enabled: tab === 'requests' && canBrowseEcoCampus,
    staleTime: 30_000,
  });

  const myQ = useQuery({
    queryKey: ['eco', 'mine', userId],
    queryFn: () => fetchMySharedItems(),
    enabled: tab === 'mine' && !!userId,
    staleTime: 30_000,
  });

  const intentMut = useMutation({
    mutationFn: (itemId: string) => {
      const item = (itemsQ.data ?? []).find((i: SharedItem) => i.id === itemId);
      return createSharedItemIntent(itemId, item?.user_id ?? '', 'contact');
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['eco', 'items'] });
    },
  });

  const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'items', label: 'Items', icon: 'leaf-outline' },
    { key: 'requests', label: 'Requests', icon: 'hand-left-outline' },
    { key: 'mine', label: 'My Listings', icon: 'person-outline' },
  ];

  const queryMap = { items: itemsQ, requests: requestsQ, mine: myQ };
  const activeQ = queryMap[tab];
  const activeData = (activeQ.data ?? []) as any[];

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      if (tab === 'requests') {
        return <RequestCard request={item} colors={colors} />;
      }
      return (
        <SharedItemCard
          item={item}
          colors={colors}
          onClaim={tab === 'items' ? (id) => intentMut.mutate(id) : undefined}
        />
      );
    },
    [colors, tab, intentMut],
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>EcoCampus</Text>
        <View style={{ width: 24 }} />
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

      {/* Content */}
      {activeQ.isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeData.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="leaf-outline" size={56} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing here yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {tab === 'mine'
              ? 'Your shared items will appear here'
              : 'Be the first to share or request something!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={activeQ.isRefetching}
              onRefresh={activeQ.refetch}
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
  listContent: { padding: 16, gap: 12 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: 160,
  },
  cardBody: {
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
  },
  cardDesc: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    lineHeight: fontSize.base * 1.4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  conditionText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    textTransform: 'capitalize',
  },
  categoryText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },
  claimBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  claimBtnText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
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
