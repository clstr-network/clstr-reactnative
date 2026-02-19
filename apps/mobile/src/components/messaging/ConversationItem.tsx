/**
 * ConversationItem — Single conversation row for the messaging list.
 *
 * Shows partner avatar, name, last message preview (truncated),
 * relative time, unread count badge, and online status indicator.
 * Pressable with overlay.hover feedback.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { tokens } from '@clstr/shared/design/tokens';
import { isUserOnline } from '@clstr/core/api/messages-api';
import type { Conversation } from '@clstr/core/api/messages-api';

interface ConversationItemProps {
  conversation: Conversation;
  onPress: (partnerId: string) => void;
  lastSeen?: string | null;
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function ConversationItem({ conversation, onPress, lastSeen }: ConversationItemProps) {
  const { partner, last_message, unread_count } = conversation;
  const online = isUserOnline(lastSeen ?? null);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={() => onPress(partner.id)}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {partner.full_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        {online && <View style={styles.onlineDot} />}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {partner.full_name}
          </Text>
          <Text style={styles.time}>
            {formatRelativeTime(last_message.created_at)}
          </Text>
        </View>
        <View style={styles.messageRow}>
          <Text style={styles.preview} numberOfLines={1}>
            {last_message.content}
          </Text>
          {unread_count > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unread_count > 99 ? '99+' : unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
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
  avatarContainer: {
    position: 'relative',
    marginRight: tokens.spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.dark.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.dark.foreground,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: tokens.colors.signal.green,
    borderWidth: 2,
    borderColor: tokens.colors.dark.background,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  name: {
    flex: 1,
    fontSize: tokens.typography.fontSize.base,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.dark.foreground,
    marginRight: tokens.spacing.sm,
  },
  time: {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.text.tertiary,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preview: {
    flex: 1,
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.text.secondary,
    marginRight: tokens.spacing.sm,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: tokens.colors.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.dark.primaryForeground,
  },
});
