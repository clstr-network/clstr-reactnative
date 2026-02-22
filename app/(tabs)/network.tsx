import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useData } from '@/lib/data-context';
import { ConnectionCard } from '@/components/ConnectionCard';
import { Connection } from '@/lib/types';

type Filter = 'all' | 'connected' | 'pending' | 'discover';

export default function NetworkScreen() {
  const insets = useSafeAreaInsets();
  const { connections, updateConnectionStatus } = useData();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = connections.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'connected') return c.status === 'connected';
    if (filter === 'pending') return c.status === 'pending';
    if (filter === 'discover') return c.status === 'none';
    return true;
  });

  const stats = {
    connected: connections.filter(c => c.status === 'connected').length,
    pending: connections.filter(c => c.status === 'pending').length,
  };

  const renderConnection = useCallback(({ item }: { item: Connection }) => (
    <ConnectionCard connection={item} onAction={updateConnectionStatus} />
  ), [updateConnectionStatus]);

  const keyExtractor = useCallback((item: Connection) => item.id, []);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'connected', label: 'Connected' },
    { key: 'pending', label: 'Pending' },
    { key: 'discover', label: 'Discover' },
  ];

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: (Platform.OS === 'web' ? webTopInset : insets.top) + 8 }]}>
        <Text style={styles.title}>Network</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{stats.connected}</Text>
            <Text style={styles.statLabel}>Connected</Text>
          </View>
          <View style={[styles.stat, styles.statBorder]}>
            <Text style={[styles.statNum, { color: Colors.dark.warning }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterRow}>
        {filters.map(f => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.filterBtn, filter === f.key && styles.filterActive]}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        renderItem={renderConnection}
        keyExtractor={keyExtractor}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filtered.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color={Colors.dark.textMeta} />
            <Text style={styles.emptyText}>No connections found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    color: Colors.dark.text,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
    overflow: 'hidden',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  statBorder: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.dark.divider,
  },
  statNum: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    color: Colors.dark.success,
  },
  statLabel: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    color: Colors.dark.textMeta,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 14,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
  },
  filterActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: Colors.dark.surfaceBorderStrong,
  },
  filterText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 13,
    color: Colors.dark.textMeta,
  },
  filterTextActive: {
    color: Colors.dark.text,
  },
  list: {
    paddingHorizontal: 16,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    color: Colors.dark.textMeta,
  },
});
