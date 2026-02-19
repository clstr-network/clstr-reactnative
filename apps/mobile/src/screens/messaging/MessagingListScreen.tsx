/**
 * MessagingListScreen — Conversation list + connections tab.
 *
 * Uses useConversations, useChatRealtime, useLastSeen.
 * FlatList with conversation items, search bar, tabs for
 * "Conversations" | "Connections".
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MessagingStackParamList } from '@clstr/shared/navigation/types';
import { tokens } from '@clstr/shared/design/tokens';

import { useConversations } from '../../hooks/useConversations';
import { useChatRealtime } from '../../hooks/useChatRealtime';
import { useRealtimeReconnect } from '../../hooks/useRealtimeReconnect';
import { useLastSeen } from '../../hooks/useLastSeen';
import { useAuth } from '@clstr/shared/hooks/useAuth';
import { ConversationItem } from '../../components/messaging/ConversationItem';
import { ConnectionItem } from '../../components/messaging/ConnectionItem';
import type { Conversation, MessageUser } from '@clstr/core/api/messages-api';

type Tab = 'conversations' | 'connections';

type Nav = NativeStackNavigationProp<MessagingStackParamList, 'MessagingScreen'>;

export function MessagingListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('conversations');
  const [search, setSearch] = useState('');

  // ── Data hooks ──
  const {
    conversations,
    connectionsWithoutConversations,
    isLoading,
  } = useConversations();

  // Global realtime subscription (no active partner on list screen)
  const { reconnect } = useChatRealtime();

  // R5: Reconnect on foreground — refetches conversations missed while bg'd
  useRealtimeReconnect(user?.id, reconnect);

  // Keep last_seen updated
  useLastSeen();

  // ── Tap handlers ──
  const handleConversationPress = useCallback(
    (partnerId: string) => {
      navigation.navigate('ConversationDetail', { conversationId: partnerId });
    },
    [navigation],
  );

  const handleConnectionPress = useCallback(
    (userId: string) => {
      navigation.navigate('ConversationDetail', { conversationId: userId });
    },
    [navigation],
  );

  // ── Search filter ──
  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c: Conversation) =>
      c.partner.full_name.toLowerCase().includes(q),
    );
  }, [conversations, search]);

  const filteredConnections = useMemo(() => {
    if (!search.trim()) return connectionsWithoutConversations;
    const q = search.toLowerCase();
    return connectionsWithoutConversations.filter((u: MessageUser) =>
      u.full_name.toLowerCase().includes(q),
    );
  }, [connectionsWithoutConversations, search]);

  // ── Renderers ──
  const renderConversation = useCallback(
    ({ item }: { item: Conversation }) => (
      <ConversationItem
        conversation={item}
        onPress={handleConversationPress}
      />
    ),
    [handleConversationPress],
  );

  const renderConnection = useCallback(
    ({ item }: { item: MessageUser }) => (
      <ConnectionItem user={item} onPress={handleConnectionPress} />
    ),
    [handleConnectionPress],
  );

  const keyExtractorConversation = useCallback(
    (item: Conversation) => item.partner_id,
    [],
  );

  const keyExtractorConnection = useCallback(
    (item: MessageUser) => item.id,
    [],
  );

  // ── Empty states ──
  const EmptyConversations = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No conversations yet</Text>
        <Text style={styles.emptySubtitle}>
          Start a conversation by connecting with someone
        </Text>
      </View>
    ),
    [],
  );

  const EmptyConnections = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No connections</Text>
        <Text style={styles.emptySubtitle}>
          Connect with people to start messaging
        </Text>
      </View>
    ),
    [],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor={tokens.colors.text.quaternary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, activeTab === 'conversations' && styles.tabActive]}
          onPress={() => setActiveTab('conversations')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'conversations' && styles.tabTextActive,
            ]}
          >
            Conversations
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'connections' && styles.tabActive]}
          onPress={() => setActiveTab('connections')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'connections' && styles.tabTextActive,
            ]}
          >
            Connections
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.colors.dark.primary} />
        </View>
      ) : activeTab === 'conversations' ? (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversation}
          keyExtractor={keyExtractorConversation}
          ListEmptyComponent={EmptyConversations}
          contentContainerStyle={filteredConversations.length === 0 ? styles.listEmpty : undefined}
        />
      ) : (
        <FlatList
          data={filteredConnections}
          renderItem={renderConnection}
          keyExtractor={keyExtractorConnection}
          ListEmptyComponent={EmptyConnections}
          contentContainerStyle={filteredConnections.length === 0 ? styles.listEmpty : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.dark.background,
  },
  header: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
  },
  headerTitle: {
    fontSize: tokens.typography.fontSize['2xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.dark.foreground,
  },
  searchContainer: {
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.sm,
  },
  searchInput: {
    height: 40,
    backgroundColor: tokens.colors.dark.input,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.dark.foreground,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: tokens.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border.default,
  },
  tab: {
    flex: 1,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: tokens.colors.dark.primary,
  },
  tabText: {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.text.tertiary,
  },
  tabTextActive: {
    color: tokens.colors.dark.primary,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: tokens.spacing['2xl'],
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
  },
  emptyTitle: {
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.dark.foreground,
    marginBottom: tokens.spacing.sm,
  },
  emptySubtitle: {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.text.tertiary,
    textAlign: 'center',
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
