import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, useColorScheme, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useThemeColors, getRoleBadgeColor } from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import { RoleBadge } from '@/components/RoleBadge';
import { getConnectionById, updateConnectionStatus, type Connection } from '@/lib/storage';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const { data: user } = useQuery({
    queryKey: ['connection', id],
    queryFn: () => getConnectionById(id!),
    enabled: !!id,
  });

  const handleConnect = useCallback(async () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = await updateConnectionStatus(id, 'connected');
    queryClient.setQueryData(['connections'], updated);
    queryClient.invalidateQueries({ queryKey: ['connection', id] });
  }, [id, queryClient]);

  if (!user) {
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

  const badgeColor = getRoleBadgeColor(user.role, colors);

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
        <View style={[styles.profileBg, { backgroundColor: badgeColor + '12' }]}>
          <Avatar uri={user.avatarUrl} name={user.name} size={88} showBorder />
          <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
          <Text style={[styles.username, { color: colors.textSecondary }]}>@{user.username}</Text>
          <RoleBadge role={user.role} size="medium" />
          <Text style={[styles.dept, { color: colors.textSecondary }]}>{user.department}</Text>
          {!!user.bio && <Text style={[styles.bio, { color: colors.textSecondary }]}>{user.bio}</Text>}
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{user.connectionsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Connections</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{user.postsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>{user.mutualConnections}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mutual</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {user.status === 'connected' ? (
            <View style={[styles.connectedBtn, { borderColor: colors.success + '40' }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.connectedText, { color: colors.success }]}>Connected</Text>
            </View>
          ) : (
            <Pressable
              onPress={handleConnect}
              style={({ pressed }) => [styles.connectBtn, { backgroundColor: colors.tint }, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="person-add" size={18} color="#fff" />
              <Text style={styles.connectBtnText}>
                {user.status === 'pending' ? 'Accept' : 'Connect'}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              const convId = `conv_${id?.replace('user_', '')}`;
              router.push({ pathname: '/chat/[id]', params: { id: convId } });
            }}
            style={({ pressed }) => [styles.msgBtn, { borderColor: colors.border }, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
            <Text style={[styles.msgBtnText, { color: colors.text }]}>Message</Text>
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
