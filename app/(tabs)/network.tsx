import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, useColorScheme, Platform, RefreshControl, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { ConnectionCard } from '@/components/ConnectionCard';
import { getConnections, updateConnectionStatus, type Connection } from '@/lib/storage';

const FILTERS = ['All', 'Connected', 'Pending', 'Suggested'];

export default function NetworkScreen() {
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState('All');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: getConnections,
  });

  const filtered = activeFilter === 'All'
    ? connections
    : connections.filter(c => c.status === activeFilter.toLowerCase());

  const handleConnect = useCallback(async (id: string) => {
    const updated = await updateConnectionStatus(id, 'connected');
    queryClient.setQueryData(['connections'], updated);
  }, [queryClient]);

  const handleAccept = useCallback(async (id: string) => {
    const updated = await updateConnectionStatus(id, 'connected');
    queryClient.setQueryData(['connections'], updated);
  }, [queryClient]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['connections'] });
  }, [queryClient]);

  const renderItem = useCallback(({ item }: { item: Connection }) => (
    <ConnectionCard connection={item} onConnect={handleConnect} onAccept={handleAccept} />
  ), [handleConnect, handleAccept]);

  const keyExtractor = useCallback((item: Connection) => item.id, []);

  const connectedCount = connections.filter(c => c.status === 'connected').length;
  const pendingCount = connections.filter(c => c.status === 'pending').length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Network</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.statNum, { color: colors.tint }]}>{connectedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Connections</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.statNum, { color: colors.warning }]}>{pendingCount}</Text>
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
          data={filtered}
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
  title: { fontSize: 28, fontWeight: '800', paddingHorizontal: 16, marginBottom: 12 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  statBox: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 2 },
  filterList: { flexGrow: 0 },
  filterContent: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '600' },
  listContent: { paddingTop: 12, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15 },
});
