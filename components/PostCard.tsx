import React from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { Avatar } from './Avatar';
import { RoleBadge } from './RoleBadge';
import { formatRelativeTime } from '@/lib/time';
import type { Post } from '@/lib/storage';

interface PostCardProps {
  post: Post;
  onLike: (id: string) => void;
  onPress?: (id: string) => void;
  onLongPress?: (id: string) => void;
}

const CATEGORY_ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  academic: { name: 'school-outline', color: '#3B82F6' },
  career: { name: 'briefcase-outline', color: '#F59E0B' },
  events: { name: 'calendar-outline', color: '#8B5CF6' },
  social: { name: 'people-outline', color: '#10B981' },
  general: { name: 'chatbubble-outline', color: '#6B7280' },
};

export const PostCard = React.memo(function PostCard({ post, onLike, onPress, onLongPress }: PostCardProps) {
  const colors = useThemeColors(useColorScheme());
  const cat = CATEGORY_ICONS[post.category] || CATEGORY_ICONS.general;

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike(post.id);
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress?.(post.id);
  };

  return (
    <Pressable
      onPress={() => onPress?.(post.id)}
      onLongPress={handleLongPress}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.95 },
      ]}
    >
      <View style={styles.header}>
        <Avatar uri={post.authorAvatar} name={post.authorName} size={42} />
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{post.authorName}</Text>
            <RoleBadge role={post.authorRole} />
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.username, { color: colors.textTertiary }]}>@{post.authorUsername}</Text>
            <Text style={[styles.dot, { color: colors.textTertiary }]}>{'\u00B7'}</Text>
            <Text style={[styles.time, { color: colors.textTertiary }]}>{formatRelativeTime(post.createdAt)}</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.content, { color: colors.text }]}>{post.content}</Text>

      <View style={[styles.categoryTag, { backgroundColor: cat.color + '15' }]}>
        <Ionicons name={cat.name} size={13} color={cat.color} />
        <Text style={[styles.categoryText, { color: cat.color }]}>{post.category}</Text>
      </View>

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <Pressable onPress={handleLike} style={styles.actionBtn} hitSlop={8}>
          <Ionicons
            name={post.isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={post.isLiked ? colors.danger : colors.textTertiary}
          />
          <Text style={[styles.actionText, { color: post.isLiked ? colors.danger : colors.textTertiary }]}>
            {post.likesCount}
          </Text>
        </Pressable>
        <View style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.textTertiary} />
          <Text style={[styles.actionText, { color: colors.textTertiary }]}>{post.commentsCount}</Text>
        </View>
        <Pressable style={styles.actionBtn} hitSlop={8}>
          <Ionicons name="share-outline" size={18} color={colors.textTertiary} />
        </Pressable>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 0,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  username: {
    fontSize: 13,
  },
  dot: {
    marginHorizontal: 4,
    fontSize: 13,
  },
  time: {
    fontSize: 13,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 14,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 24,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
