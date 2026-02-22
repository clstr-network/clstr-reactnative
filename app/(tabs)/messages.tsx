import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, useColorScheme, Platform, RefreshControl, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useThemeColors } from '@/constants/colors';
import ConversationItem from '@/components/ConversationItem';
import { QUERY_KEYS } from '@/lib/query-keys';
import { useMessageSubscription } from '@/lib/hooks/useMessageSubscription';
import { getConversations, type Conversation } from '@/lib/api';

export default function MessagesScreen() {
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  // Phase 3.1 — Realtime message subscription (conversation list level)
  useMessageSubscription();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.conversations,
    queryFn: getConversations,
  });

  const handlePress = useCallback((partnerId: string) => {
    router.push({ pathname: '/chat/[id]', params: { id: partnerId } });
  }, []);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations });
  }, [queryClient]);

  const renderItem = useCallback(({ item }: { item: Conversation }) => (
    <ConversationItem conversation={item} onPress={() => handlePress(item.partner_id)} />
  ), [handlePress]);

  const keyExtractor = useCallback((item: Conversation) => item.partner_id, []);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
          {totalUnread > 0 && (
            <View style={[styles.unreadPill, { backgroundColor: colors.tint }]}>
              <Text style={styles.unreadPillText}>{totalUnread} new</Text>
            </View>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.tint} />
          }
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No conversations yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>Connect with people to start chatting</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingBottom: 12, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 28, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  unreadPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  unreadPillText: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  listContent: { paddingBottom: 100 },
  separator: { height: 1, marginLeft: 80 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  emptySubtext: { fontSize: 14, fontFamily: 'Inter_400Regular' },
});
