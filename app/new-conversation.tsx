/**
 * New Conversation Screen — Phase F6
 *
 * Shows the user's connections list. Tapping a connection opens a chat with them.
 * Includes search/filter to find connections quickly.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
  Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { useThemeColors } from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/lib/auth-context';
import { getConnections } from '@/lib/api/social';
import { QUERY_KEYS } from '@/lib/query-keys';

export default function NewConversationScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const [search, setSearch] = useState('');

  const { data: connections = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.connections(user?.id ?? ''),
    queryFn: () => getConnections(),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Filter connections by search text
  const filteredConnections = useMemo(() => {
    if (!search.trim()) return connections;
    const q = search.toLowerCase();
    return connections.filter((c: any) => {
      const name = (c.full_name ?? c.name ?? '').toLowerCase();
      const headline = (c.headline ?? '').toLowerCase();
      return name.includes(q) || headline.includes(q);
    });
  }, [connections, search]);

  const handleSelectConnection = useCallback((partnerId: string) => {
    router.replace({ pathname: '/chat/[id]', params: { id: partnerId } });
  }, []);

  const renderItem = useCallback(({ item }: { item: any }) => {
    const partnerId = item.connected_user_id ?? item.id;
    const name = item.full_name ?? item.name ?? 'User';
    const avatarUrl = item.avatar_url;
    const headline = item.headline ?? '';

    return (
      <Pressable
        onPress={() => handleSelectConnection(partnerId)}
        style={({ pressed }) => [
          styles.connectionItem,
          { backgroundColor: pressed ? colors.surfaceHover : 'transparent' },
        ]}
      >
        <Avatar uri={avatarUrl} name={name} size={44} />
        <View style={styles.connectionInfo}>
          <Text style={[styles.connectionName, { color: colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          {!!headline && (
            <Text style={[styles.connectionHeadline, { color: colors.textSecondary }]} numberOfLines={1}>
              {headline}
            </Text>
          )}
        </View>
        <Ionicons name="chatbubble-outline" size={20} color={colors.tint} />
      </Pressable>
    );
  }, [colors, handleSelectConnection]);

  const keyExtractor = useCallback((item: any) => item.connected_user_id ?? item.id ?? String(Math.random()), []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>New Message</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { borderBottomColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search connections..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* Connections List */}
      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={filteredConnections}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                {search.trim() ? 'No matching connections' : 'No connections yet'}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                {search.trim()
                  ? 'Try a different search term'
                  : 'Connect with people to start messaging'}
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },

  listContent: { paddingBottom: 40 },
  connectionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  connectionInfo: { flex: 1 },
  connectionName: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  connectionHeadline: { fontSize: 14, marginTop: 2, fontFamily: 'Inter_400Regular' },

  separator: { height: 1, marginLeft: 72 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  emptySubtext: { fontSize: 14, fontFamily: 'Inter_400Regular' },
});
