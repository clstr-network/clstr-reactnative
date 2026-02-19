/**
 * ProfileConnectionsScreen — Connections list.
 *
 * Receives { id } from route params.
 * Uses getConnections from @clstr/core/api/social-api.
 * FlatList of connection cards.
 */
import React, { useCallback } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '@clstr/shared/navigation/types';
import { useQuery } from '@tanstack/react-query';
import { getConnections } from '@clstr/core/api/social-api';
import { supabase } from '@clstr/shared/integrations/supabase/client';
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { useTheme } from '@clstr/shared/design/useTheme';
import { tokens } from '@clstr/shared/design/tokens';
import { ErrorState } from '@clstr/shared/components/ui/ErrorState';
import { EmptyState } from '@clstr/shared/components/ui/EmptyState';
import { UserAvatar } from '@clstr/shared/components/ui/UserAvatar';
import { View } from '@clstr/shared/components/ui/primitives/View';
import { Text } from '@clstr/shared/components/ui/primitives/Text';
import { Pressable } from '@clstr/shared/components/ui/primitives/Pressable';
import { Skeleton } from '@clstr/shared/components/ui/Skeleton';
import { H3 } from '@clstr/shared/components/ui/Typography';

type ConnectionsRoute = RouteProp<ProfileStackParamList, 'ProfileConnections'>;
type ConnectionsNav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileConnections'>;

interface ConnectionItem {
  id: string;
  requester_id: string;
  receiver_id: string;
  requester?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
  };
  receiver?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
  };
}

export function ProfileConnectionsScreen() {
  const route = useRoute<ConnectionsRoute>();
  const navigation = useNavigation<ConnectionsNav>();
  const { colors } = useTheme();

  const connectionsQuery = useQuery({
    queryKey: [...QUERY_KEYS.social.network(), 'connections'],
    queryFn: () => getConnections(supabase),
  });

  const connections: ConnectionItem[] = (connectionsQuery.data as ConnectionItem[]) ?? [];

  const handleProfilePress = useCallback(
    (userId: string) => {
      navigation.navigate('ProfileScreen', { id: userId });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: ConnectionItem }) => {
      // Show the "other" person in the connection
      const other = item.requester?.id === route.params.id
        ? item.receiver
        : item.requester;

      return (
        <Pressable
          onPress={() => other?.id && handleProfilePress(other.id)}
          style={styles.connectionRow}
        >
          <UserAvatar
            src={other?.avatar_url}
            name={other?.full_name ?? ''}
            size={44}
          />
          <View style={styles.connectionText}>
            <Text weight="semibold" size="sm">
              {other?.full_name ?? 'Anonymous'}
            </Text>
            <Text size="xs" muted>
              {other?.role ?? 'Member'}
            </Text>
          </View>
        </Pressable>
      );
    },
    [route.params.id, handleProfilePress],
  );

  // ── Loading state ──
  if (connectionsQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <HeaderBar onBack={() => navigation.goBack()} />
        <View style={styles.skeletonContainer}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <View style={styles.skeletonText}>
                <Skeleton width={140} height={14} />
                <Skeleton width={80} height={12} style={{ marginTop: 6 }} />
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ──
  if (connectionsQuery.isError) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        <HeaderBar onBack={() => navigation.goBack()} />
        <ErrorState
          message={connectionsQuery.error?.message ?? 'Failed to load connections'}
          onRetry={() => connectionsQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar onBack={() => navigation.goBack()} />

      <FlatList
        data={connections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <EmptyState
            title="No connections yet"
            description="Connections will appear here once accepted."
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function HeaderBar({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.headerBar}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Text size="lg" style={{ color: colors.primary }}>
          ← Back
        </Text>
      </Pressable>
      <H3 style={{ flex: 1, textAlign: 'center' }}>Connections</H3>
      <View style={styles.backBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  backBtn: {
    width: 60,
    paddingVertical: tokens.spacing.xs,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
  },
  connectionText: {
    marginLeft: tokens.spacing.sm,
    flex: 1,
  },
  skeletonContainer: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  skeletonText: {
    marginLeft: tokens.spacing.sm,
  },
  listContent: {
    paddingBottom: tokens.spacing.xl,
  },
});
