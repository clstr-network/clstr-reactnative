import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors, { badgeVariants } from '@/constants/colors';
import { Avatar } from './Avatar';
import { formatTime } from '@/lib/mock-data';
import type { Post } from '@/lib/mock-data';

interface PostCardProps {
  post: Post;
  onPress?: () => void;
}

export function PostCard({ post, onPress }: PostCardProps) {
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const c = Colors.colors;
  const badge = badgeVariants[post.author.userType.toLowerCase() as keyof typeof badgeVariants] || badgeVariants.student;

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    setLiked(!liked);
  };

  return (
    <Pressable style={[styles.card, { borderBottomColor: c.border }]} onPress={onPress}>
      <View style={styles.header}>
        <Avatar name={post.author.name} size={42} />
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
              {post.author.name}
            </Text>
            <Pressable style={styles.moreBtn}>
              <Ionicons name="ellipsis-horizontal" size={18} color={c.textTertiary} />
            </Pressable>
          </View>
          <View style={styles.metaRow}>
            <View style={[styles.typeBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Text style={[styles.typeBadgeText, { color: badge.text }]}>{post.author.userType}</Text>
            </View>
            <Text style={[styles.meta, { color: c.textTertiary }]}>
              {post.college} · {formatTime(post.timestamp)}
            </Text>
          </View>
        </View>
      </View>
      <Text style={[styles.content, { color: c.text }]}>{post.content}</Text>
      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={handleLike}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? c.danger : c.textTertiary}
          />
          <Text style={[styles.actionText, { color: liked ? c.danger : c.textTertiary }]}>
            {likeCount}
          </Text>
        </Pressable>
        <Pressable style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={18} color={c.textTertiary} />
          <Text style={[styles.actionText, { color: c.textTertiary }]}>{post.comments}</Text>
        </Pressable>
        <Pressable style={styles.actionBtn}>
          <Ionicons name="share-outline" size={18} color={c.textTertiary} />
        </Pressable>
        <Pressable style={styles.actionBtn}>
          <Ionicons name="bookmark-outline" size={18} color={c.textTertiary} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerText: {
    marginLeft: 10,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    flex: 1,
  },
  moreBtn: {
    padding: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 6,
  },
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
  },
  meta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    flex: 1,
  },
  content: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
});
