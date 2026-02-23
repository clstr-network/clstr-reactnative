import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import RoleBadge from '@/components/RoleBadge';
import ImageGrid from '@/components/ImageGrid';
import ImageLightbox from '@/components/ImageLightbox';
import VideoPlayer from '@/components/VideoPlayer';
import DocumentAttachment from '@/components/DocumentAttachment';
import PollView from '@/components/PollView';
import ReactionPicker, { type ReactionType } from '@/components/ReactionPicker';
import ReactionDisplay from '@/components/ReactionDisplay';
import CommentSection from '@/components/CommentSection';
import PostActionSheet from '@/components/PostActionSheet';
import ShareSheet from '@/components/ShareSheet';
import RepostSheet from '@/components/RepostSheet';
import { QUERY_KEYS } from '@/lib/query-keys';
import {
  getPostById,
  toggleReaction,
  REACTION_EMOJI_MAP,
} from '@/lib/api';
import { toggleSavePost, voteOnPoll } from '@/lib/api/social';
import { formatRelativeTime } from '@/lib/time';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [repostSheetVisible, setRepostSheetVisible] = useState(false);

  const { data: post } = useQuery({
    queryKey: ['post', id],
    queryFn: () => getPostById(id!),
    enabled: !!id,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });

  const reactionMutation = useMutation({
    mutationFn: ({ postId, type }: { postId: string; type: ReactionType }) =>
      toggleReaction(postId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', id] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => toggleSavePost(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', id] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
    },
  });

  const pollVoteMutation = useMutation({
    mutationFn: (optionIndex: number) => voteOnPoll(id!, optionIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', id] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
    },
  });

  const handleReaction = useCallback(
    (type: ReactionType) => {
      if (!id) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      reactionMutation.mutate({ postId: id, type });
    },
    [id, reactionMutation],
  );

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    saveMutation.mutate();
  }, [saveMutation]);

  const handleShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShareSheetVisible(true);
  }, []);

  const handleRepost = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRepostSheetVisible(true);
  }, []);

  if (!post) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Post</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Post not found</Text>
        </View>
      </View>
    );
  }

  const profile = post.profile;
  const userReaction = post.user_reaction as ReactionType | null | undefined;
  const isSaved = !!(post as any).is_saved;
  const images = post.images ?? [];
  const video = (post as any).video;
  const documents = (post as any).documents ?? [];
  const poll = (post as any).poll;

  const reactionsSummary = (post.reactions_summary ?? {}) as Record<string, number>;
  const totalReactions: number = Object.values(reactionsSummary).reduce((s: number, c: number) => s + c, 0);
  const topReactions = Object.entries(reactionsSummary)
    .map(([type, count]) => ({ type, count, emoji: REACTION_EMOJI_MAP[type as ReactionType] ?? '👍' }))
    .sort((a, b) => b.count - a.count);
  const repostShareCount = (post.reposts_count ?? 0) + (post.shares_count ?? 0);

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior="padding" keyboardVerticalOffset={0}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Post</Text>
        <Pressable onPress={() => setActionSheetVisible(true)} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.postSection}>
          {/* Author */}
          <View style={styles.authorRow}>
            <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: post.user_id } })} style={styles.authorInfo}>
              <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={48} />
              <View>
                <View style={styles.nameRow}>
                  <Text style={[styles.authorName, { color: colors.text }]}>{profile?.full_name ?? 'Unknown'}</Text>
                  {profile?.role ? <RoleBadge role={profile.role} /> : null}
                </View>
                <Text style={[styles.authorMeta, { color: colors.textTertiary }]}>{formatRelativeTime(post.created_at)}</Text>
              </View>
            </Pressable>
          </View>

          {/* Content */}
          <Text style={[styles.postContent, { color: colors.text }]}>{post.content}</Text>

          {/* Media: Images */}
          {images.length > 0 && (
            <View style={styles.mediaSection}>
              <ImageGrid
                images={images}
                onImagePress={(index) => {
                  setLightboxIndex(index);
                  setLightboxVisible(true);
                }}
              />
            </View>
          )}

          {/* Media: Video */}
          {video && (
            <View style={styles.mediaSection}>
              <VideoPlayer uri={video} />
            </View>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <View style={styles.docsSection}>
              {documents.map((doc: string, i: number) => (
                <DocumentAttachment key={i} url={doc} />
              ))}
            </View>
          )}

          {/* Poll */}
          {poll && (
            <View style={styles.pollSection}>
              <PollView
                poll={{ question: poll.question, options: poll.options, endDate: poll.endDate }}
                userVoteIndex={poll.userVotedIndex ?? null}
                onVote={(index) => pollVoteMutation.mutate(index)}
              />
            </View>
          )}

          {/* Stats row */}
          {(totalReactions > 0 || (post.comments_count ?? 0) > 0 || repostShareCount > 0) && (
            <View style={[styles.statsRow, { borderTopColor: colors.borderLight ?? colors.border }]}>
              <ReactionDisplay
                topReactions={topReactions}
                totalCount={totalReactions}
              />
              <View style={styles.statsRight}>
                {(post.comments_count ?? 0) > 0 && (
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>
                    {post.comments_count} comment{post.comments_count !== 1 ? 's' : ''}
                  </Text>
                )}
                {repostShareCount > 0 && (
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>
                    {repostShareCount} repost{repostShareCount !== 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Action bar */}
          <View style={[styles.actionsRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
            <View style={styles.actionItem}>
              <ReactionPicker
                currentReaction={userReaction}
                onReact={handleReaction}
              />
            </View>
            <Pressable style={styles.actionItem}>
              <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>{post.comments_count ?? 0}</Text>
            </Pressable>
            <Pressable style={styles.actionItem} onPress={handleRepost}>
              <Ionicons
                name={(post as any).is_reposted ? 'repeat' : 'repeat-outline'}
                size={20}
                color={(post as any).is_reposted ? colors.success : colors.textSecondary}
              />
              <Text style={[styles.actionLabel, { color: (post as any).is_reposted ? colors.success : colors.textSecondary }]}>
                {post.reposts_count ?? 0}
              </Text>
            </Pressable>
            <Pressable style={styles.actionItem} onPress={handleShare}>
              <Ionicons name="paper-plane-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Share</Text>
            </Pressable>
            <Pressable style={styles.actionItem} onPress={handleSave}>
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={isSaved ? colors.warning : colors.textSecondary}
              />
              <Text style={[styles.actionLabel, { color: isSaved ? colors.warning : colors.textSecondary }]}>
                {isSaved ? 'Saved' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Threaded comment section (Phase 9.6) */}
        {id && <CommentSection postId={id} />}
      </ScrollView>

      {/* Image lightbox */}
      {images.length > 0 && (
        <ImageLightbox
          images={images}
          visible={lightboxVisible}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxVisible(false)}
        />
      )}

      {/* Action sheet */}
      <PostActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        postId={String(post.id)}
        authorId={post.user_id}
        isSaved={isSaved}
        onPostRemoved={() => router.back()}
      />

      {/* Phase 11: Share & Repost sheets */}
      <ShareSheet
        visible={shareSheetVisible}
        onClose={() => setShareSheetVisible(false)}
        shareData={{
          type: 'post',
          id: String(post.id),
          previewText: post.content?.slice(0, 120) ?? '',
          authorName: profile?.full_name ?? 'Unknown',
        }}
      />
      <RepostSheet
        visible={repostSheetVisible}
        onClose={() => setRepostSheetVisible(false)}
        postId={String(post.id)}
        isReposted={!!(post as any).is_reposted}
        postPreview={{
          authorName: profile?.full_name ?? 'Unknown',
          content: post.content?.slice(0, 200) ?? '',
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  postSection: { padding: 16 },
  authorRow: { marginBottom: 14 },
  authorInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorName: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  authorMeta: { fontSize: 13, marginTop: 2, fontFamily: 'Inter_400Regular' },
  postContent: { fontSize: 17, lineHeight: 26, marginBottom: 16, fontFamily: 'Inter_400Regular' },
  mediaSection: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  docsSection: {
    gap: 6,
    marginBottom: 12,
  },
  pollSection: {
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  statsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  actionsRow: {
    flexDirection: 'row', gap: 28, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1,
  },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionLabel: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  listContent: { paddingBottom: 40 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, fontFamily: 'Inter_400Regular' },
});
