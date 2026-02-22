import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, radius } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { formatRelativeTime } from '@/lib/time';
import Avatar from '@/components/Avatar';
import RoleBadge from '@/components/RoleBadge';

const REACTION_EMOJIS: Record<string, string> = {
  like: '\u{1F44D}',
  celebrate: '\u{1F389}',
  support: '\u{1F91D}',
  love: '\u{2764}\u{FE0F}',
  insightful: '\u{1F4A1}',
  curious: '\u{1F914}',
  laugh: '\u{1F602}',
};

interface PostUser {
  full_name?: string;
  avatar_url?: string | null;
  role?: string;
}

interface TopReaction {
  type: string;
  count: number;
}

interface Post {
  id: number | string;
  content?: string;
  user?: PostUser;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  reposts_count?: number;
  created_at?: string;
  liked?: boolean;
  saved?: boolean;
  reposted?: boolean;
  userReaction?: string | null;
  topReactions?: TopReaction[];
}

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  onReact?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onRepost?: () => void;
}

function PostCard({ post, onPress, onReact, onComment, onShare, onRepost }: PostCardProps) {
  const colors = useThemeColors();
  const user = post.user;
  const totalReactions = post.likes_count ?? 0;
  const topReactions = post.topReactions ?? [];
  const isLiked = !!post.liked || !!post.userReaction;
  const isReposted = !!post.reposted;
  const repostShareCount = (post.reposts_count ?? 0) + (post.shares_count ?? 0);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <Avatar uri={user?.avatar_url} name={user?.full_name} size="lg" />
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {user?.full_name ?? 'Unknown'}
            </Text>
            {user?.role ? <RoleBadge role={user.role} size="sm" /> : null}
          </View>
          {post.created_at ? (
            <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
              {formatRelativeTime(post.created_at)}
            </Text>
          ) : null}
        </View>
      </View>

      {post.content ? (
        <Text style={[styles.content, { color: colors.text }]} numberOfLines={5}>
          {post.content}
        </Text>
      ) : null}

      {totalReactions > 0 && topReactions.length > 0 ? (
        <View style={[styles.reactionsRow, { borderTopColor: colors.borderLight }]}>
          <View style={styles.reactionEmojis}>
            {topReactions.slice(0, 3).map((r) => (
              <Text key={r.type} style={styles.reactionEmoji}>
                {REACTION_EMOJIS[r.type] ?? REACTION_EMOJIS.like}
              </Text>
            ))}
          </View>
          <Text style={[styles.reactionCount, { color: colors.textSecondary }]}>
            {totalReactions}
          </Text>
          {(post.comments_count ?? 0) > 0 ? (
            <Text style={[styles.commentCount, { color: colors.textSecondary }]}>
              {post.comments_count} comment{post.comments_count !== 1 ? 's' : ''}
            </Text>
          ) : null}
          {repostShareCount > 0 ? (
            <Text style={[styles.repostCount, { color: colors.textSecondary }]}>
              {repostShareCount} repost{repostShareCount !== 1 ? 's' : ''}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.actionBar, { borderTopColor: colors.border }]}>
        <Pressable style={styles.actionButton} onPress={onReact}>
          <Ionicons
            name={isLiked ? 'thumbs-up' : 'thumbs-up-outline'}
            size={20}
            color={isLiked ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.actionLabel,
              { color: isLiked ? colors.primary : colors.textSecondary },
            ]}
          >
            Like
          </Text>
        </Pressable>

        <Pressable style={styles.actionButton} onPress={onComment}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Comment</Text>
        </Pressable>

        <Pressable style={styles.actionButton} onPress={onRepost}>
          <Ionicons
            name={isReposted ? 'repeat' : 'repeat-outline'}
            size={20}
            color={isReposted ? colors.success : colors.textSecondary}
          />
          <Text
            style={[
              styles.actionLabel,
              { color: isReposted ? colors.success : colors.textSecondary },
            ]}
          >
            {isReposted ? 'Reposted' : 'Repost'}
          </Text>
        </Pressable>

        <Pressable style={styles.actionButton} onPress={onShare}>
          <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Share</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export default React.memo(PostCard);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    padding: 14,
    paddingBottom: 8,
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: fontSize.body,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
  },
  timestamp: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  content: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  reactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  reactionEmojis: {
    flexDirection: 'row',
    marginRight: 4,
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: -2,
  },
  reactionCount: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    marginLeft: 6,
  },
  commentCount: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    marginLeft: 'auto',
  },
  repostCount: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    marginLeft: 8,
  },
  actionBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 4,
  },
  actionLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
    fontFamily: fontFamily.medium,
  },
});
