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

      <View style={styles.footer}>
        <View style={[styles.categoryTag, { backgroundColor: cat.color + '12' }]}>
          <Ionicons name={cat.name} size={12} color={cat.color} />
          <Text style={[styles.categoryText, { color: cat.color }]}>{post.category}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={handleLike} style={styles.actionBtn} hitSlop={8}>
            <Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={18} color={post.isLiked ? colors.danger : colors.textTertiary} />
            <Text style={[styles.actionCount, { color: post.isLiked ? colors.danger : colors.textTertiary }]}>{post.likesCount}</Text>
          </Pressable>
          <View style={styles.actionBtn}>
            <Ionicons name="chatbubble-outline" size={16} color={colors.textTertiary} />
            <Text style={[styles.actionCount, { color: colors.textTertiary }]}>{post.commentsCount}</Text>
          </View>
          {post.isSaved && (
            <Ionicons name="bookmark" size={14} color={colors.warning} style={{ marginLeft: 4 }} />
          )}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, borderWidth: 1, padding: 14 },
  header: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  headerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold', flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  username: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  dot: { fontSize: 13 },
  time: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  content: { fontSize: 15, lineHeight: 22, fontFamily: 'Inter_400Regular', marginBottom: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  categoryText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize', fontFamily: 'Inter_600SemiBold' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionCount: { fontSize: 13, fontWeight: '500', fontFamily: 'Inter_500Medium' },
});
