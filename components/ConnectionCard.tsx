import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Avatar } from './Avatar';
import { GlassContainer } from './GlassContainer';
import { Connection } from '@/lib/types';

interface ConnectionCardProps {
  connection: Connection;
  onAction: (id: string, status: 'connected' | 'pending' | 'none') => void;
}

export function ConnectionCard({ connection, onAction }: ConnectionCardProps) {
  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (connection.status === 'none') {
      onAction(connection.id, 'pending');
    } else if (connection.status === 'pending') {
      onAction(connection.id, 'connected');
    }
  };

  return (
    <GlassContainer style={styles.container}>
      <View style={styles.row}>
        <Avatar initials={connection.avatar} size={46} isOnline={connection.isOnline} />
        <View style={styles.info}>
          <Text style={styles.name}>{connection.name}</Text>
          <Text style={styles.role}>{connection.role}</Text>
          <Text style={styles.mutual}>{connection.mutual} mutual</Text>
        </View>
        {connection.status !== 'connected' && (
          <Pressable
            onPress={handleAction}
            style={({ pressed }) => [
              styles.actionBtn,
              connection.status === 'pending' && styles.pendingBtn,
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={4}
          >
            {connection.status === 'none' ? (
              <Ionicons name="person-add-outline" size={16} color={Colors.dark.primaryForeground} />
            ) : (
              <Ionicons name="checkmark" size={16} color={Colors.dark.text} />
            )}
          </Pressable>
        )}
        {connection.status === 'connected' && (
          <View style={styles.connectedBadge}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.dark.success} />
          </View>
        )}
      </View>
    </GlassContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15,
    color: Colors.dark.text,
  },
  role: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 1,
  },
  mutual: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 11,
    color: Colors.dark.textMeta,
    marginTop: 2,
  },
  actionBtn: {
    backgroundColor: Colors.dark.primary,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorderStrong,
  },
  connectedBadge: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
