import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, useColorScheme, Platform, RefreshControl, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import ConnectionCard from '@/components/ConnectionCard';
import { useAuth } from '@/lib/auth-context';
import { QUERY_KEYS } from '@/lib/query-keys';
import { useRolePermissions } from '@/lib/hooks/useRolePermissions';
import {
  getConnections,
  getConnectionRequests,
  acceptConnectionRequest,
  rejectConnectionRequest,
} from '@/lib/api';

const FILTERS = ['All', 'Connected', 'Pending'];

interface CardItem {
  id: string;
  user?: { id?: string; full_name?: string; avatar_url?: string | null; role?: string; headline?: string | null };
  isPending: boolean;
}

export default function NetworkScreen() {
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('All');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  // Phase 4 — Role-based permissions
  const { canSendConnectionRequests, canMessage } = useRolePermissions();

  const { data: connections = [], isLoading: loadingConnections } = useQuery({
    queryKey: QUERY_KEYS.network,
    queryFn: getConnections,
  });

  const { data: pendingRequests = [], isLoading: loadingPending } = useQuery({
    queryKey: ['connection-requests'],
    queryFn: getConnectionRequests,
  });

  const isLoading = loadingConnections || loadingPending;

  const acceptMutation = useMutation({
    mutationFn: (connectionId: string) => acceptConnectionRequest(connectionId),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.network });
      queryClient.invalidateQueries({ queryKey: ['connection-requests'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (connectionId: string) => rejectConnectionRequest(connectionId),
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

      {isLoading ? (
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
});
