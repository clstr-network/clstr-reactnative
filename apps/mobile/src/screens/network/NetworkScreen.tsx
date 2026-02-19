/**
 * NetworkScreen — Network / connections screen.
 *
 * Two-tab layout: "People" (same-domain users) and "Requests" (pending incoming).
 * Accept/Reject buttons on request cards, Connect on user cards.
 */
import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NetworkStackParamList } from '@clstr/shared/navigation/types';
import { useTheme } from '@clstr/shared/design/useTheme';
import { tokens } from '@clstr/shared/design/tokens';
import { EmptyState } from '@clstr/shared/components/ui/EmptyState';
import { ErrorState } from '@clstr/shared/components/ui/ErrorState';
import { H3 } from '@clstr/shared/components/ui/Typography';
import { View } from '@clstr/shared/components/ui/primitives/View';
import { Text } from '@clstr/shared/components/ui/primitives/Text';
import { Pressable } from '@clstr/shared/components/ui/primitives/Pressable';

import {
  useNetworkUsers,
  usePendingRequests,
  useSentRequests,
  useAcceptConnection,
  useRejectConnection,
  useSendConnectionRequest,
} from '../../hooks/useConnections';
import { ConnectionCard } from '../../components/network/ConnectionCard';
import type { ConnectionCardUser } from '../../components/network/ConnectionCard';

type NetworkNav = NativeStackNavigationProp<NetworkStackParamList, 'NetworkScreen'>;

const TABS = ['People', 'Requests'] as const;
type Tab = (typeof TABS)[number];

export function NetworkScreen() {
  const navigation = useNavigation<NetworkNav>();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('People');

  const {
    users,
    isLoading: usersLoading,
    isError: usersError,
    error: usersErr,
    refetch: refetchUsers,
    isRefetching: usersRefetching,
  } = useNetworkUsers();

  const {
    requests,
    isLoading: requestsLoading,
    isError: requestsError,
    error: requestsErr,
    refetch: refetchRequests,
    isRefetching: requestsRefetching,
  } = usePendingRequests();

  const { requests: sentRequests } = useSentRequests();
  const sentIds = new Set(sentRequests.map((r) => r.receiver_id));

  const acceptMutation = useAcceptConnection();
  const rejectMutation = useRejectConnection();
  const sendMutation = useSendConnectionRequest();

  const handleProfilePress = useCallback(
    (userId: string) => {
      navigation.navigate('Profile', { id: userId });
    },
    [navigation],
  );

  const isLoading = activeTab === 'People' ? usersLoading : requestsLoading;
  const isError = activeTab === 'People' ? usersError : requestsError;
  const errorMsg = activeTab === 'People' ? usersErr : requestsErr;
  const isRefetching = activeTab === 'People' ? usersRefetching : requestsRefetching;
  const refetch = activeTab === 'People' ? refetchUsers : refetchRequests;

  // ── People list item ──
  const renderUserItem = useCallback(
    ({ item }: { item: ConnectionCardUser }) => {
      const isPending = sentIds.has(item.id);
      return (
        <ConnectionCard
          user={item}
          mode={
            isPending
              ? { type: 'pending' }
              : {
                  type: 'connect',
                  onConnect: () => sendMutation.mutate(item.id),
                }
          }
          onPress={() => handleProfilePress(item.id)}
          isLoading={sendMutation.isPending}
        />
      );
    },
    [sentIds, sendMutation, handleProfilePress],
  );

  // ── Request list item ──
  const renderRequestItem = useCallback(
    ({ item }: { item: any }) => {
      const user: ConnectionCardUser = item.requester ?? {
        id: item.requester_id,
        full_name: 'Unknown',
        avatar_url: null,
      };
      return (
        <ConnectionCard
          user={user}
          mode={{
            type: 'request',
            onAccept: () => acceptMutation.mutate(item.id),
            onReject: () => rejectMutation.mutate(item.id),
          }}
          onPress={() => handleProfilePress(user.id)}
          isLoading={acceptMutation.isPending || rejectMutation.isPending}
        />
      );
    },
    [acceptMutation, rejectMutation, handleProfilePress],
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  // ── Loading ──
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.headerBar}>
          <H3>Network</H3>
        </View>
        <View style={styles.loading}>
          <Text muted>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──
  if (isError) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.headerBar}>
          <H3>Network</H3>
        </View>
        <ErrorState
          message={errorMsg?.message ?? 'Failed to load network'}
          onRetry={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.headerBar}>
        <H3>Network</H3>
      </View>

      {/* ── Tab bar ── */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tab,
              activeTab === tab && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              size="xs"
              weight="medium"
              style={{
                color: activeTab === tab ? colors.primaryForeground : colors.mutedForeground,
              }}
            >
              {tab}
              {tab === 'Requests' && requests.length > 0 ? ` (${requests.length})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'People' ? (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={keyExtractor}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No users found"
              description="No one from your campus network yet."
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={keyExtractor}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No pending requests"
              description="You have no incoming connection requests."
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
    gap: tokens.spacing.xs,
  },
  tab: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  listContent: {
    paddingBottom: tokens.spacing.xl,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
