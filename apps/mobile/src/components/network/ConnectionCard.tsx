/**
 * ConnectionCard — Network user/request card component.
 *
 * React.memo wrapped. Shows avatar, name, role/branch,
 * and an action button (Connect / Pending / Accept+Reject).
 */
import React from 'react';
import { StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { View } from '@clstr/shared/components/ui/primitives/View';
import { Text } from '@clstr/shared/components/ui/primitives/Text';
import { Pressable } from '@clstr/shared/components/ui/primitives/Pressable';
import { UserAvatar } from '@clstr/shared/components/ui/UserAvatar';
import { Card } from '@clstr/shared/components/ui/Card';
import { useTheme } from '@clstr/shared/design/useTheme';
import { tokens } from '@clstr/shared/design/tokens';

export interface ConnectionCardUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  headline?: string | null;
  role?: string | null;
  branch?: string | null;
}

export type ConnectionCardMode =
  | { type: 'connect'; onConnect: () => void }
  | { type: 'pending' }
  | { type: 'request'; onAccept: () => void; onReject: () => void };

export interface ConnectionCardProps {
  user: ConnectionCardUser;
  mode: ConnectionCardMode;
  onPress?: () => void;
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ConnectionCard = React.memo(function ConnectionCard({
  user,
  mode,
  onPress,
  isLoading,
  style,
}: ConnectionCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable onPress={onPress} style={style as any}>
      <Card style={styles.card}>
        <View style={styles.row}>
          {/* ── Avatar + Info ── */}
          <UserAvatar
            src={user.avatar_url}
            name={user.full_name ?? ''}
            size={44}
          />
          <View style={styles.info}>
            <Text weight="semibold" size="sm" numberOfLines={1}>
              {user.full_name ?? 'Unknown'}
            </Text>
            <Text size="xs" muted numberOfLines={1}>
              {user.headline ?? user.role ?? 'Student'}
              {user.branch ? ` · ${user.branch}` : ''}
            </Text>
          </View>

          {/* ── Actions ── */}
          <View style={styles.actions}>
            {mode.type === 'connect' && (
              <Pressable
                onPress={mode.onConnect}
                disabled={isLoading}
                style={[styles.btn, { backgroundColor: colors.primary, opacity: isLoading ? 0.6 : 1 }]}
              >
                <Text size="xs" weight="medium" style={{ color: colors.primaryForeground }}>
                  Connect
                </Text>
              </Pressable>
            )}

            {mode.type === 'pending' && (
              <View style={[styles.btn, { backgroundColor: colors.muted }]}>
                <Text size="xs" weight="medium" style={{ color: colors.mutedForeground }}>
                  Pending
                </Text>
              </View>
            )}

            {mode.type === 'request' && (
              <View style={styles.requestActions}>
                <Pressable
                  onPress={mode.onAccept}
                  disabled={isLoading}
                  style={[styles.btn, { backgroundColor: colors.primary, opacity: isLoading ? 0.6 : 1 }]}
                >
                  <Text size="xs" weight="medium" style={{ color: colors.primaryForeground }}>
                    Accept
                  </Text>
                </Pressable>
                <Pressable
                  onPress={mode.onReject}
                  disabled={isLoading}
                  style={[styles.btn, styles.rejectBtn, { borderColor: colors.border, opacity: isLoading ? 0.6 : 1 }]}
                >
                  <Text size="xs" weight="medium" style={{ color: colors.mutedForeground }}>
                    Reject
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Card>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing.md,
  },
  info: {
    flex: 1,
    marginLeft: tokens.spacing.sm,
    marginRight: tokens.spacing.sm,
  },
  actions: {
    flexShrink: 0,
  },
  requestActions: {
    flexDirection: 'row',
    gap: tokens.spacing.xs,
  },
  btn: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
});
