import React from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useThemeColors, getRoleBadgeColor } from '@/constants/colors';
import { Avatar } from './Avatar';
import { RoleBadge } from './RoleBadge';
import type { Connection } from '@/lib/storage';

interface ConnectionCardProps {
  connection: Connection;
  onConnect: (id: string) => void;
  onAccept?: (id: string) => void;
}

export const ConnectionCard = React.memo(function ConnectionCard({ connection, onConnect, onAccept }: ConnectionCardProps) {
  const colors = useThemeColors(useColorScheme());
  const badgeColor = getRoleBadgeColor(connection.role, colors);

  const handlePress = () => {
    router.push({ pathname: '/user/[id]', params: { id: connection.id } });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card, { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.95 },
      ]}
    >
      <Avatar uri={connection.avatarUrl} name={connection.name} size={50} />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{connection.name}</Text>
          <RoleBadge role={connection.role} />
        </View>
        <Text style={[styles.dept, { color: colors.textSecondary }]}>{connection.department}</Text>
        {connection.mutualConnections > 0 && (
          <Text style={[styles.mutual, { color: colors.textTertiary }]}>
            {connection.mutualConnections} mutual connections
          </Text>
        )}
      </View>
      {connection.status === 'connected' ? (
        <View style={[styles.connectedBadge, { borderColor: colors.success + '40' }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        </View>
      ) : connection.status === 'pending' ? (
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onAccept?.(connection.id); }}
          style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.tint }, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.actionBtnText}>Accept</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onConnect(connection.id); }}
          style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.tint }, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="person-add" size={14} color="#fff" />
        </Pressable>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold', flexShrink: 1 },
  dept: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  mutual: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  connectedBadge: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
