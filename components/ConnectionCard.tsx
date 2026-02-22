import React from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { Avatar } from './Avatar';
import { RoleBadge } from './RoleBadge';
import type { Connection } from '@/lib/storage';

interface ConnectionCardProps {
  connection: Connection;
  onConnect?: (id: string) => void;
  onAccept?: (id: string) => void;
}

export const ConnectionCard = React.memo(function ConnectionCard({ connection, onConnect, onAccept }: ConnectionCardProps) {
  const colors = useThemeColors(useColorScheme());

  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (connection.status === 'pending') {
      onAccept?.(connection.id);
    } else if (connection.status === 'suggested') {
      onConnect?.(connection.id);
    }
  };

  const handlePress = () => {
    router.push({ pathname: '/user/[id]', params: { id: connection.id } });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.95 }]}
    >
      <Avatar uri={connection.avatarUrl} name={connection.name} size={50} />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{connection.name}</Text>
          <RoleBadge role={connection.role} />
        </View>
        <Text style={[styles.dept, { color: colors.textSecondary }]}>{connection.department}</Text>
        <Text style={[styles.mutual, { color: colors.textTertiary }]}>
          {connection.mutualConnections} mutual connections
        </Text>
      </View>
      {connection.status === 'connected' ? (
        <View style={[styles.statusBadge, { backgroundColor: colors.success + '20' }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        </View>
      ) : (
        <Pressable
          onPress={handleAction}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: connection.status === 'pending' ? colors.tint : colors.tint + '20' },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.actionText, { color: connection.status === 'pending' ? '#fff' : colors.tint }]}>
            {connection.status === 'pending' ? 'Accept' : 'Connect'}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  dept: {
    fontSize: 13,
    marginTop: 2,
  },
  mutual: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
