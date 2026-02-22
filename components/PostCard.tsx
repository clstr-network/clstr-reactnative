import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Avatar } from './Avatar';
import { GlassContainer } from './GlassContainer';
import { Post } from '@/lib/types';

interface PostCardProps {
  post: Post;
  onLike: (id: string) => void;
}

const tagColors: Record<string, string> = {
  Engineering: 'rgba(255, 255, 255, 0.75)',
  Performance: Colors.dark.success,
  Product: 'rgba(255, 255, 255, 0.75)',
  Team: Colors.dark.warning,
  Insights: Colors.dark.danger,
};

export function PostCard({ post, onLike }: PostCardProps) {
  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike(post.id);
  };

  const tagColor = post.tag ? (tagColors[post.tag] || Colors.dark.textSecondary) : Colors.dark.textSecondary;

  return (
    <GlassContainer style={styles.container}>
      <View style={styles.header}>
        <Avatar initials={post.authorAvatar} size={40} />
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{post.authorName}</Text>
          <Text style={styles.meta}>
            {post.authorHandle} · {post.timestamp}
          </Text>
        </View>
        {post.tag && (
          <View style={[styles.tag, { backgroundColor: Colors.dark.secondary }]}>
            <Text style={[styles.tagText, { color: tagColor }]}>{post.tag}</Text>
          </View>
        )}
      </View>
      <Text style={styles.content}>{post.content}</Text>
      <View style={styles.actions}>
        <Pressable
          onPress={handleLike}
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Ionicons
            name={post.isLiked ? 'heart' : 'heart-outline'}
            size={18}
            color={post.isLiked ? Colors.dark.danger : Colors.dark.textMeta}
          />
          <Text style={[styles.actionText, post.isLiked && { color: Colors.dark.danger }]}>
            {post.likes}
          </Text>
        </Pressable>
        <View style={styles.action}>
          <Ionicons name="chatbubble-outline" size={17} color={Colors.dark.textMeta} />
          <Text style={styles.actionText}>{post.comments}</Text>
        </View>
        <View style={styles.action}>
          <Ionicons name="share-outline" size={17} color={Colors.dark.textMeta} />
        </View>
      </View>
    </GlassContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorInfo: {
    flex: 1,
    marginLeft: 10,
  },
  authorName: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 15,
    color: Colors.dark.text,
  },
  meta: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    color: Colors.dark.textMeta,
    marginTop: 1,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  content: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    color: Colors.dark.textBody,
    lineHeight: 24.5,
    marginBottom: 14,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.divider,
    paddingTop: 12,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    color: Colors.dark.textMeta,
  },
});
