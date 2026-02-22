import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/constants/colors';
import Avatar from '@/components/Avatar';
import RoleBadge from '@/components/RoleBadge';

interface ConnectionUser {
  id?: number | string;
  full_name?: string;
  avatar_url?: string | null;
  role?: string;
  headline?: string | null;
}

interface Connection {
  id: number | string;
  user?: ConnectionUser;
}

interface ConnectionCardProps {
  connection: Connection;
  isPending?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onConnect?: () => void;
  onPress?: () => void;
}

export default function ConnectionCard({
  connection,
  isPending = false,
  onAccept,
  onReject,
  onConnect,
  onPress,
}: ConnectionCardProps) {
  const colors = useThemeColors();
  const user = connection.user;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Avatar uri={user?.avatar_url} name={user?.full_name} size={52} />

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {user?.full_name ?? 'Unknown'}
          </Text>
          {user?.role ? <RoleBadge role={user.role} /> : null}
        </View>

        {user?.headline ? (
          <Text style={[styles.headline, { color: colors.textSecondary }]} numberOfLines={2}>
            {user.headline}
          </Text>
        ) : null}

        {isPending ? (
          <View style={styles.pendingActions}>
            <Pressable
              onPress={onAccept}
              style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.acceptText}>Accept</Text>
            </Pressable>
            <Pressable
              onPress={onReject}
              style={[styles.rejectBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="close" size={16} color={colors.textSecondary} />
              <Text style={[styles.rejectText, { color: colors.textSecondary }]}>Ignore</Text>
            </Pressable>
          </View>
        ) : onConnect ? (
          <Pressable
            onPress={onConnect}
            style={[styles.connectBtn, { borderColor: colors.primary }]}
          >
            <Ionicons name="person-add-outline" size={14} color={colors.primary} />
            <Text style={[styles.connectText, { color: colors.primary }]}>Connect</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    gap: 12,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  headline: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  acceptText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  rejectText: {
    fontSize: 13,
    fontWeight: '500',
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  connectText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
