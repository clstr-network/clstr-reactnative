/**
 * ConnectionItem — Single connection row for users without conversations.
 *
 * Shows avatar, name, role. Tap navigates to ConversationDetail
 * to start a new conversation.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { tokens } from '@clstr/shared/design/tokens';
import type { MessageUser } from '@clstr/core/api/messages-api';

interface ConnectionItemProps {
  user: MessageUser;
  onPress: (userId: string) => void;
}

export function ConnectionItem({ user, onPress }: ConnectionItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={() => onPress(user.id)}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {user.full_name.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {user.full_name}
        </Text>
        <Text style={styles.role} numberOfLines={1}>
          {user.role}
        </Text>
      </View>

      {/* CTA hint */}
      <Text style={styles.cta}>Message</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border.subtle,
  },
  pressed: {
    backgroundColor: tokens.colors.overlay.hover,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.dark.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: tokens.spacing.md,
  },
  avatarText: {
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.dark.foreground,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: tokens.typography.fontSize.base,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.dark.foreground,
    marginBottom: 2,
  },
  role: {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.text.tertiary,
  },
  cta: {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.dark.primary,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
  },
});
