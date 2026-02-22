import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useThemeColors, getRoleBadgeColor } from '@/constants/colors';
import Avatar from '@/components/Avatar';
import RoleBadge from '@/components/RoleBadge';
import { getProfileById } from '@/lib/api/profile';
import type { UserProfile } from '@/lib/api/profile';
import {
  checkConnectionStatus,
  sendConnectionRequest,
  removeConnection,
  countMutualConnections,
  getUserPostsCount,
} from '@/lib/api/social';
import { QUERY_KEYS } from '@/lib/query-keys';

import { useAuth } from '@/lib/auth-context';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const { data: profile, isLoading } = useQuery<UserProfile | null>({
    queryKey: QUERY_KEYS.profile(id ?? ''),
    queryFn: () => getProfileById(id!),
    enabled: !!id,
  });

  const { data: connectionStatus } = useQuery<string | null>({
    queryKey: ['connectionStatus', id],
    queryFn: () => checkConnectionStatus(id!),
    enabled: !!id,
  });

  const { data: mutualCount } = useQuery<number>({
    queryKey: ['mutualConnections', id],
    queryFn: () => countMutualConnections(authUser!.id, id!),
    enabled: !!id && !!authUser,
  });

  const { data: postsCount } = useQuery<number>({
    queryKey: ['userPostsCount', id],
    queryFn: () => getUserPostsCount(id!),
    enabled: !!id,
  });

  const connectMutation = useMutation({
    mutationFn: () => sendConnectionRequest(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connectionStatus', id] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.network });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => removeConnection(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connectionStatus', id] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.network });
    },
  });

  const handleConnect = useCallback(async () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    connectMutation.mutate();
  }, [id, connectMutation]);

  const handleDisconnect = useCallback(async () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    disconnectMutation.mutate();
  }, [id, disconnectMutation]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={{ color: colors.textSecondary }}>User not found</Text>
        </View>
      </View>
    );
  }

  const badgeColor = getRoleBadgeColor(profile.role ?? '');
  const isConnected = connectionStatus === 'connected';
  const isPending = connectionStatus === 'pending';
  const isBusy = connectMutation.isPending || disconnectMutation.isPending;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileBg, { backgroundColor: badgeColor.bg + '20' }]}>
          <Avatar uri={profile.avatar_url ?? undefined} name={profile.full_name ?? 'User'} size={88} />
          <Text style={[styles.name, { color: colors.text }]}>{profile.full_name ?? 'Unknown'}</Text>
          {!!profile.headline && (
            <Text style={[styles.username, { color: colors.textSecondary }]}>{profile.headline}</Text>
          )}
          <RoleBadge role={profile.role ?? ''} />
          <Text style={[styles.dept, { color: colors.textSecondary }]}>
            {profile.major ?? profile.university ?? ''}
          </Text>
          {!!profile.bio && <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio}</Text>}
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{profile.connections?.length ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Connections</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{postsCount ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{mutualCount ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mutual</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {isConnected ? (
            <Pressable
              onPress={handleDisconnect}
              disabled={isBusy}
              style={[styles.connectedBtn, { borderColor: colors.success + '40' }, isBusy && { opacity: 0.6 }]}
            >
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.connectedText, { color: colors.success }]}>Connected</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleConnect}
              disabled={isBusy || isPending}
              style={({ pressed }) => [
                styles.connectBtn,
                { backgroundColor: isPending ? colors.surfaceSecondary : colors.tint },
                pressed && { opacity: 0.85 },
                (isBusy || isPending) && { opacity: 0.6 },
              ]}
            >
              <Ionicons name="person-add" size={18} color={isPending ? colors.textSecondary : '#fff'} />
              <Text style={[styles.connectBtnText, isPending && { color: colors.textSecondary }]}>
                {isPending ? 'Pending' : 'Connect'}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              if (isConnected) {
                router.push({ pathname: '/chat/[id]', params: { id: id! } });
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                Alert.alert('Not Connected', 'You need to connect with this user before sending a message.');
              }
            }}
            disabled={!isConnected}
            style={({ pressed }) => [
              styles.msgBtn,
              { borderColor: isConnected ? colors.border : colors.border + '40' },
              !isConnected && { opacity: 0.5 },
              pressed && isConnected && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="chatbubble-outline" size={18} color={isConnected ? colors.text : colors.textTertiary} />
            <Text style={[styles.msgBtnText, { color: isConnected ? colors.text : colors.textTertiary }]}>Message</Text>
          </Pressable>
        </View>
      </ScrollView>
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
  scrollContent: { paddingBottom: 40 },
  profileBg: { alignItems: 'center', paddingTop: 32, paddingBottom: 24, gap: 6 },
  name: { fontSize: 24, fontWeight: '800', marginTop: 12, fontFamily: 'Inter_800ExtraBold' },
  username: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  dept: { fontSize: 14, marginTop: 2, fontFamily: 'Inter_400Regular' },
  bio: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, marginTop: 4, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  statsRow: { flexDirection: 'row', padding: 16, gap: 8 },
  statBox: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  statLabel: { fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  connectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, gap: 6 },
  connectBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  connectedBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1, gap: 6 },
  connectedText: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  msgBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1, gap: 6 },
  msgBtnText: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
