/**
 * PostCard — Feed post card component.
 *
 * React.memo wrapped. Static display only (V1 kill rule: no reactions).
 * Uses shared UserAvatar, Card, Text from @clstr/shared.
 *
 * Layout:
 * ┌─────────────────────────────┐
 * │ [Avatar] Name      · 2h ago │
 * │─────────────────────────────│
 * │ Post content text...        │
 * │ [Image if exists]           │
 * │─────────────────────────────│
 * │ 👍 12   💬 3                │
 * └─────────────────────────────┘
 */
import React from 'react';
import { StyleSheet, Image, type ViewStyle, type StyleProp } from 'react-native';
import { View } from '@clstr/shared/components/ui/primitives/View';
import { Text } from '@clstr/shared/components/ui/primitives/Text';
import { Pressable } from '@clstr/shared/components/ui/primitives/Pressable';
import { UserAvatar } from '@clstr/shared/components/ui/UserAvatar';
import { Card } from '@clstr/shared/components/ui/Card';
import { useTheme } from '@clstr/shared/design/useTheme';
import { tokens } from '@clstr/shared/design/tokens';
import { timeAgo } from '../../utils/timeAgo';
import type { Post } from '@clstr/core/api/social-api';

export interface PostCardProps {
  post: Post;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const PostCard = React.memo(function PostCard({
  post,
  onPress,
  style,
}: PostCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable onPress={onPress} style={style as any}>
      <Card style={styles.card}>
        {/* ── Header: avatar + name + time ── */}
        <View style={styles.header}>
          <UserAvatar
            src={post.user?.avatar_url}
            name={post.user?.full_name ?? ''}
            size={40}
          />
          <View style={styles.headerText}>
            <Text weight="semibold" size="sm">
              {post.user?.full_name ?? 'Anonymous'}
            </Text>
            <Text size="xs" muted>
              {post.user?.role ?? 'Member'} · {timeAgo(post.created_at)}
            </Text>
          </View>
        </View>

        {/* ── Content ── */}
        <View style={styles.content}>
          <Text size="sm" numberOfLines={6}>
            {post.content}
          </Text>
        </View>

        {/* ── Media (first image only) ── */}
        {post.images && post.images.length > 0 && (
          <Image
            source={{ uri: post.images[0] }}
            style={styles.image}
            resizeMode="cover"
          />
        )}

        {/* ── Engagement counts (static, no tap handlers) ── */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text size="xs" muted>
            👍 {post.likes_count ?? 0}
          </Text>
          <Text size="xs" muted style={styles.footerSpacer}>
            💬 {post.comments_count ?? 0}
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing.md,
  },
  headerText: {
    marginLeft: tokens.spacing.sm,
    flex: 1,
  },
  content: {
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.sm,
  },
  image: {
    width: '100%',
    height: 200,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerSpacer: {
    marginLeft: tokens.spacing.md,
  },
});
