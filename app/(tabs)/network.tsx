import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform, RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import ConnectionCard from '@/components/ConnectionCard';
import { useAuth } from '@/lib/auth-context';
import { QUERY_KEYS } from '@/lib/query-keys';
import { useRolePermissions } from '@/lib/hooks/useRolePermissions';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { useTypeaheadSearch } from '@/lib/hooks/useTypeaheadSearch';
import { useRealtimeMultiSubscription } from '@/lib/hooks/useRealtimeSubscription';
import { CHANNELS } from '@/lib/channels';
import {
  getConnections,
  getPendingRequests,
  acceptConnection,
  rejectConnection,
} from '@/lib/api';

const FILTERS = ['All', 'Connected', 'Pending'];

interface CardItem {
  id: string;
  user?: { id?: string; full_name?: string; avatar_url?: string | null; role?: string; headline?: string | null };
  isPending: boolean;
}

export default function NetworkScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { identity } = useIdentityContext();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  // Phase 4 — Role-based permissions
  const { canSendConnectionRequests, canMessage } = useRolePermissions();

  // Phase 13.3 — Realtime network subscription
  useRealtimeMultiSubscription({
    channelName: CHANNELS.networkConnections(user?.id ?? ''),
    subscriptions: [
      {
        table: 'connections',
        event: '*',
        filter: `requester_id=eq.${user?.id}`,
        onPayload: () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.network });
          queryClient.invalidateQueries({ queryKey: ['connection-requests'] });
        },
      },
      {
        table: 'connections',
        event: '*',
        filter: `receiver_id=eq.${user?.id}`,
        onPayload: () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.network });
          queryClient.invalidateQueries({ queryKey: ['connection-requests'] });
        },
      },
    ],
    enabled: !!user?.id,
  });

  // Phase 6 — Typeahead search
  const { data: searchResults, isLoading: searchLoading } = useTypeaheadSearch({
    query: searchQuery,
    collegeDomain: identity?.college_domain,
  });

  const { data: connections = [], isLoading: loadingConnections } = useQuery({
    queryKey: QUERY_KEYS.network,
    queryFn: getConnections,
    staleTime: 30_000,       // 30s
    gcTime: 5 * 60 * 1000,   // 5min
  });

  const { data: pendingRequests = [], isLoading: loadingPending } = useQuery({
    queryKey: ['connection-requests'],
    queryFn: getPendingRequests,
    staleTime: 10_000,       // 10s — pending requests change more frequently
    gcTime: 5 * 60 * 1000,
  });

  const isLoading = loadingConnections || loadingPending;

  const acceptMutation = useMutation({
    mutationFn: (connectionId: string) => acceptConnection(connectionId),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.network });
      queryClient.invalidateQueries({ queryKey: ['connection-requests'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (connectionId: string) => rejectConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connection-requests'] });
    },
  });

  // Transform accepted connections into card items
  const connectedItems: CardItem[] = useMemo(() =>
    connections.map((c: any) => {
      const otherUser = c.requester_id === user?.id ? c.receiver : c.requester;
      return { id: c.id, user: otherUser, isPending: false };
    }),
  [connections, user?.id]);

  // Transform pending requests into card items
  const pendingItems: CardItem[] = useMemo(() =>
    pendingRequests.map((r: any) => ({
      id: r.id,
      user: r.requester,
      isPending: true,
    })),
  [pendingRequests]);

  const allItems = useMemo(() => {
    if (activeFilter === 'Connected') return connectedItems;
    if (activeFilter === 'Pending') return pendingItems;
    return [...pendingItems, ...connectedItems];
  }, [activeFilter, connectedItems, pendingItems]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.network }),
      queryClient.invalidateQueries({ queryKey: ['connection-requests'] }),
    ]);
  }, [queryClient]);

  const renderItem = useCallback(({ item }: { item: CardItem }) => (
    <ConnectionCard
      connection={item}
      isPending={item.isPending}
      onAccept={() => acceptMutation.mutate(item.id as string)}
      onReject={() => rejectMutation.mutate(item.id as string)}
      onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.user?.id as string } })}
    />
  ), [acceptMutation, rejectMutation]);

  const keyExtractor = useCallback((item: CardItem) => String(item.id), []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Network</Text>

        {/* Phase 6 — Typeahead search bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search people..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.statNum, { color: colors.tint }]}>{connectedItems.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Connections</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.statNum, { color: colors.warning }]}>{pendingItems.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
          </View>
        </View>
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterList}
          contentContainerStyle={styles.filterContent}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { setActiveFilter(item); Haptics.selectionAsync(); }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === item ? colors.tint : 'transparent',
                  borderColor: activeFilter === item ? colors.tint : colors.border,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: activeFilter === item ? '#fff' : colors.textSecondary }]}>
                {item}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Phase 6 — Search results overlay */}
      {searchQuery.length >= 2 ? (
        <View style={styles.searchResultsContainer}>
          {searchLoading ? (
            <ActivityIndicator size="small" color={colors.tint} style={{ marginTop: 24 }} />
          ) : searchResults && searchResults.profiles?.length > 0 ? (
            <FlatList
              data={searchResults.profiles}
              keyExtractor={(item: any) => String(item.id)}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }: { item: any }) => (
                <Pressable
                  style={[styles.searchResultRow, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSearchQuery('');
                    router.push({ pathname: '/user/[id]', params: { id: item.id } });
                  }}
                >
                  <View style={[styles.searchAvatar, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.searchAvatarText, { color: colors.tint }]}>
                      {(item.full_name || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.searchResultInfo}>
                    <Text style={[styles.searchResultName, { color: colors.text }]} numberOfLines={1}>
                      {item.full_name || 'Unknown'}
                    </Text>
                    {item.headline ? (
                      <Text style={[styles.searchResultHeadline, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.headline}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </Pressable>
              )}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={36} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No results for "{searchQuery}"</Text>
            </View>
          )}
        </View>
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={allItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.tint} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No connections found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingBottom: 0 },
  title: { fontSize: 28, fontWeight: '800', paddingHorizontal: 16, marginBottom: 12, fontFamily: 'Inter_800ExtraBold' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  statBox: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  statLabel: { fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' },
  filterList: { flexGrow: 0 },
  filterContent: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  listContent: { paddingTop: 12, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 6, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, fontFamily: 'Inter_400Regular', padding: 0 },
  searchResultsContainer: { flex: 1 },
  searchResultRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  searchAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  searchAvatarText: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  searchResultInfo: { flex: 1, marginLeft: 12 },
  searchResultName: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  searchResultHeadline: { fontSize: 13, marginTop: 2, fontFamily: 'Inter_400Regular' },
});
