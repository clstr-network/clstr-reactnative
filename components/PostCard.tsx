/**
 * PostCard — Phase 9 Rewrite
 * Full-feature post card with:
 * - Image grid + lightbox (9.1)
 * - Video player (9.2)
 * - Document attachments (9.3)
 * - Poll rendering + voting (9.4)
 * - 7-type reaction picker (9.5)
 * - Reaction display (9.5)
 * - 3-dot action menu (9.7)
 * - Save/bookmark toggle (9.8)
 * - Repost with commentary header
 */

import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors, radius } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { formatRelativeTime } from '@/lib/time';
import { Avatar } from '@/components/Avatar';
import RoleBadge from '@/components/RoleBadge';
import ImageGrid from '@/components/ImageGrid';
import ImageLightbox from '@/components/ImageLightbox';
import VideoPlayer from '@/components/VideoPlayer';
import DocumentAttachment from '@/components/DocumentAttachment';
import PollView from '@/components/PollView';
import ReactionPicker, { type ReactionType } from '@/components/ReactionPicker';
import ReactionDisplay, { type TopReaction } from '@/components/ReactionDisplay';
import PostActionSheet from '@/components/PostActionSheet';

/* ─── Types ─── */

const REACTION_EMOJIS: Record<string, string> = {
  like: '\u{1F44D}',
  celebrate: '\u{1F389}',
  support: '\u{1F91D}',
  love: '\u{2764}\u{FE0F}',
  insightful: '\u{1F4A1}',
  curious: '\u{1F914}',
  laugh: '\u{1F602}',
};

export interface PostUser {
  id?: string;
  full_name?: string;
  avatar_url?: string | null;
  role?: string;
}

export interface PollOption {
  text: string;
  votes: number;
}

export interface Poll {
  question: string;
  options: PollOption[];
  endDate?: string;
  userVotedIndex?: number | null;
}

export interface Post {
  id: number | string;
  user_id?: string;
  content?: string;
  images?: string[] | null;
  video?: string | null;
  documents?: string[] | null;
  poll?: Poll | null;
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
  // Repost fields
  isRepost?: boolean;
  originalPost?: Post | null;
  repostCommentary?: string | null;
}

export interface PostCardProps {
  post: Post;
  onPress?: () => void;
  onReact?: (type: ReactionType) => void;
  onComment?: () => void;
  onShare?: () => void;
  onRepost?: () => void;
  onSave?: () => void;
  onVotePoll?: (optionIndex: number) => void;
  onPostRemoved?: () => void;
  onEdit?: () => void;
}

function PostCard({
  post,
  onPress,
  onReact,
  onComment,
  onShare,
  onRepost,
  onSave,
  onVotePoll,
  onPostRemoved,
  onEdit,
}: PostCardProps) {
  const colors = useThemeColors();
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  // Resolve content post (if repost, show original)
  const contentPost = post.isRepost && post.originalPost ? post.originalPost : post;
  const user = contentPost.user;
  const totalReactions = contentPost.likes_count ?? 0;
  const topReactions: TopReaction[] = (contentPost.topReactions ?? []).map((r) => ({
    ...r,
    emoji: r.emoji || REACTION_EMOJIS[r.type] || '\u{1F44D}',
  }));
  const isReposted = !!post.reposted;
  const repostShareCount = (contentPost.reposts_count ?? 0) + (contentPost.shares_count ?? 0);
  const images = contentPost.images ?? [];
  const video = contentPost.video;
  const documents = contentPost.documents ?? [];
  const poll = contentPost.poll;
  const isSaved = !!post.saved;
  const currentReaction = contentPost.userReaction as ReactionType | null | undefined;

  /* ─── Handlers ─── */

  const handleImagePress = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxVisible(true);
  }, []);

  const handleReaction = useCallback(
    (type: ReactionType) => {
      onReact?.(type);
    },
    [onReact],
  );

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave?.();
  }, [onSave]);

  const handleVote = useCallback(
    (index: number) => {
      onVotePoll?.(index);
    },
    [onVotePoll],
  );

  return (
    <>
      <Pressable
        onPress={onPress}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        {/* Repost header */}
        {post.isRepost && post.user && (
          <View style={styles.repostHeader}>
            <Ionicons name="repeat" size={14} color={colors.textTertiary} />
            <Text style={[styles.repostText, { color: colors.textTertiary }]}>
              {post.user.full_name ?? 'Someone'} reposted
            </Text>
          </View>
        )}

        {/* Author header + 3-dot menu */}
        <View style={styles.header}>
          <Avatar uri={user?.avatar_url} name={user?.full_name} size="lg" />
          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {user?.full_name ?? 'Unknown'}
              </Text>
              {user?.role ? <RoleBadge role={user.role} size="sm" /> : null}
            </View>
            {contentPost.created_at ? (
              <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
                {formatRelativeTime(contentPost.created_at)}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => setActionSheetVisible(true)}
            hitSlop={12}
            style={styles.menuButton}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Repost commentary */}
        {post.isRepost && post.repostCommentary ? (
          <Text style={[styles.content, { color: colors.text, fontStyle: 'italic' }]}>
            {post.repostCommentary}
          </Text>
        ) : null}

        {/* Post text content */}
        {contentPost.content ? (
          <Text style={[styles.content, { color: colors.text }]} numberOfLines={5}>
            {contentPost.content}
          </Text>
        ) : null}

        {/* Image grid (Task 9.1) */}
        {images.length > 0 ? (
          <View style={styles.mediaContainer}>
            <ImageGrid images={images} onImagePress={handleImagePress} />
          </View>
        ) : null}

        {/* Video player (Task 9.2) */}
        {video ? (
          <View style={styles.mediaContainer}>
            <VideoPlayer uri={video} />
          </View>
        ) : null}

        {/* Document attachments (Task 9.3) */}
        {documents.length > 0 ? (
          <View style={styles.documentsContainer}>
            {documents.map((doc, i) => (
              <DocumentAttachment key={i} url={doc} />
            ))}
          </View>
        ) : null}

        {/* Poll (Task 9.4) */}
        {poll ? (
          <View style={styles.pollContainer}>
            <PollView
              poll={{ question: poll.question, options: poll.options, endDate: poll.endDate }}
              userVoteIndex={poll.userVotedIndex ?? null}
              onVote={handleVote}
            />
          </View>
        ) : null}

        {/* Stats row: reactions display + comment/repost counts */}
        {(totalReactions > 0 || (contentPost.comments_count ?? 0) > 0 || repostShareCount > 0) ? (
          <View style={[styles.statsRow, { borderTopColor: colors.borderLight ?? colors.border }]}>
            <ReactionDisplay
              topReactions={topReactions}
              totalCount={totalReactions}
              onPress={() => {}}
            />

            <View style={styles.statsRight}>
              {(contentPost.comments_count ?? 0) > 0 ? (
                <Pressable onPress={onComment}>
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>
                    {contentPost.comments_count} comment{contentPost.comments_count !== 1 ? 's' : ''}
                  </Text>
                </Pressable>
              ) : null}
              {repostShareCount > 0 ? (
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {repostShareCount} repost{repostShareCount !== 1 ? 's' : ''}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Action bar: React | Comment | Repost | Bookmark */}
        <View style={[styles.actionBar, { borderTopColor: colors.border }]}>
          {/* Reaction picker (Task 9.5) — long-press for tray, tap = like */}
          <View style={styles.actionButton}>
            <ReactionPicker
              currentReaction={currentReaction}
              onReact={handleReaction}
            />
          </View>

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

          {/* Bookmark toggle (Task 9.8) */}
          <Pressable style={styles.actionButton} onPress={handleSave}>
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={isSaved ? colors.warning : colors.textSecondary}
            />
            <Text
              style={[
                styles.actionLabel,
                { color: isSaved ? colors.warning : colors.textSecondary },
              ]}
            >
              {isSaved ? 'Saved' : 'Save'}
            </Text>
          </Pressable>
        </View>
      </Pressable>

      {/* Image lightbox modal (Task 9.1) */}
      {images.length > 0 && (
        <ImageLightbox
          images={images}
          visible={lightboxVisible}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxVisible(false)}
        />
      )}

      {/* Post action sheet modal (Task 9.7) */}
      <PostActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        postId={String(contentPost.id)}
        authorId={contentPost.user_id ?? contentPost.user?.id ?? ''}
        isSaved={isSaved}
        onPostRemoved={onPostRemoved}
        onEdit={onEdit}
      />
    </>
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
  repostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 2,
  },
  repostText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
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
  menuButton: {
    padding: 4,
    marginLeft: 8,
  },
  content: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  mediaContainer: {
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  documentsContainer: {
    paddingHorizontal: 14,
    gap: 6,
    marginBottom: 10,
  },
  pollContainer: {
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
  },
  actionBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 2,
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
