/**
 * Connections Screen â€” Phase 4.1
 *
 * Displays user's connections as a FlatList. Uses social API getConnections.
 * Only viewable for the current user (no other-user connections viewing).
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { getConnections } from '@/lib/api/social';
import { MOBILE_QUERY_KEYS } from '@/lib/query-keys';

export default function ConnectionsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { identity } = useIdentityContext();
  const { isClub } = useFeatureAccess();
  const userId = identity?.user_id ?? '';

  const {
    data: connections,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: MOBILE_QUERY_KEYS.connectionCount(userId),
    queryFn: () => getConnections(),
    enabled: !!userId && !isClub,
    staleTime: 30_000,
  });

  const navigateToProfile = useCallback(
    (profileId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/user/${profileId}`);
    },
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const name = item.full_name || 'Unknown User';
      const headline = item.headline || '';
      const avatarUrl = item.avatar_url;

      return (
        <Pressable
          style={[styles.connectionItem, { borderBottomColor: 'rgba(255,255,255,0.06)' }]}
          onPress={() => navigateToProfile(item.id)}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.connectionInfo}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {name}
            </Text>
            {headline ? (
              <Text style={[styles.headline, { color: colors.textSecondary }]} numberOfLines={1}>
                {headline}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </Pressable>
      );
    },
    [colors, navigateToProfile],
  );

  // Phase 5 — Club accounts don't have personal connections
  if (isClub) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, paddingTop: insets.top }}>
        <Ionicons name="people-outline" size={56} color={colors.textTertiary} />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginTop: 16 }}>Not Available</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>Club accounts manage followers instead of connections.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Connections</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.textSecondary} />
        </View>
      ) : (
        <FlatList
          data={connections ?? []}
          keyExtractor={(item: any) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 20 },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No connections yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                Connect with peers and mentors from your campus
              </Text>
            </View>
          }
          refreshing={isRefetching}
          onRefresh={refetch}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: { width: 40, alignItems: 'flex-start' },
  title: { fontSize: 18, fontFamily: fontFamily.bold },
  list: { paddingHorizontal: 16 },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontFamily: fontFamily.semiBold,
    color: 'rgba(255,255,255,0.5)',
  },
  connectionInfo: { flex: 1, marginRight: 8 },
  name: { fontSize: 15, fontFamily: fontFamily.semiBold },
  headline: { fontSize: 13, fontFamily: fontFamily.regular, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, fontFamily: fontFamily.semiBold, marginTop: 16 },
  emptySubtext: { fontSize: 13, fontFamily: fontFamily.regular, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
});
