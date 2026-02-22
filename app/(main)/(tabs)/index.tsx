import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  TextInput, Platform, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/auth-context';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { colors } from '@/constants/colors';
import {
  Post, generateMockPosts, formatTimeAgo,
} from '@/lib/mock-data';

function PostCard({ post, onLike, onSave }: { post: Post; onLike: (id: string) => void; onSave: (id: string) => void }) {
  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Avatar name={post.authorName} size={40} />
        <View style={styles.postHeaderInfo}>
          <View style={styles.postAuthorRow}>
            <Text style={styles.postAuthorName}>{post.authorName}</Text>
            {post.authorRole === 'alumni' && <Badge text="Alumni" variant="primary" />}
          </View>
          <Text style={styles.postMeta}>{post.authorDepartment} {'\u00B7'} {formatTimeAgo(post.createdAt)}</Text>
        </View>
        <Pressable style={styles.moreButton}>
          <Feather name="more-horizontal" size={18} color={colors.textTertiary} />
        </Pressable>
      </View>

      <Text style={styles.postContent}>{post.content}</Text>

      <View style={styles.postActions}>
        <Pressable
          style={styles.actionButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onLike(post.id);
          }}
        >
          <Ionicons
            name={post.isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={post.isLiked ? colors.like : colors.textTertiary}
          />
          <Text style={[styles.actionText, post.isLiked && { color: colors.like }]}>
            {post.likesCount}
          </Text>
        </Pressable>

        <Pressable style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.textTertiary} />
          <Text style={styles.actionText}>{post.commentsCount}</Text>
        </Pressable>

        <Pressable style={styles.actionButton}>
          <Ionicons name="share-outline" size={18} color={colors.textTertiary} />
          <Text style={styles.actionText}>{post.sharesCount}</Text>
        </Pressable>

        <View style={{ flex: 1 }} />

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSave(post.id);
          }}
        >
          <Ionicons
            name={post.isSaved ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={post.isSaved ? colors.primary : colors.textTertiary}
          />
        </Pressable>
      </View>
    </View>
  );
}

function PostComposer({ userName }: { userName: string }) {
  const [text, setText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View style={styles.composer}>
      <View style={styles.composerRow}>
        <Avatar name={userName} size={36} />
        <Pressable
          style={styles.composerInput}
          onPress={() => setIsExpanded(true)}
        >
          {isExpanded ? (
            <TextInput
              style={styles.composerTextInput}
              placeholder="Share something with your network..."
              placeholderTextColor={colors.textTertiary}
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
            />
          ) : (
            <Text style={styles.composerPlaceholder}>Share something with your network...</Text>
          )}
        </Pressable>
      </View>
      {isExpanded && (
        <View style={styles.composerActions}>
          <Pressable style={styles.composerMediaButton}>
            <Ionicons name="image-outline" size={20} color={colors.primary} />
          </Pressable>
          <Pressable style={styles.composerMediaButton}>
            <Ionicons name="link-outline" size={20} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable
            style={[styles.postButton, !text.trim() && styles.postButtonDisabled]}
            disabled={!text.trim()}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setText('');
              setIsExpanded(false);
            }}
          >
            <Text style={styles.postButtonText}>Post</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>(() => generateMockPosts(15));
  const [refreshing, setRefreshing] = useState(false);

  const toggleLike = useCallback((id: string) => {
    setPosts(prev => prev.map(p =>
      p.id === id
        ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1 }
        : p
    ));
  }, []);

  const toggleSave = useCallback((id: string) => {
    setPosts(prev => prev.map(p =>
      p.id === id ? { ...p, isSaved: !p.isSaved } : p
    ));
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setPosts(generateMockPosts(15));
      setRefreshing(false);
    }, 1000);
  }, []);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={styles.screen}>
      <View style={[styles.headerBar, { paddingTop: insets.top + webTopInset }]}>
        <Text style={styles.headerTitle}>clstr</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push('/(main)/search')} style={styles.headerIconButton}>
            <Ionicons name="search-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => router.push('/(main)/settings')} style={styles.headerIconButton}>
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard post={item} onLike={toggleLike} onSave={toggleSave} />
        )}
        ListHeaderComponent={
          <PostComposer userName={user?.fullName || 'User'} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
  },
  listContent: {
    paddingBottom: 100,
  },
  composer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  composerInput: {
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  composerPlaceholder: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.textTertiary,
  },
  composerTextInput: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
    minHeight: 60,
  },
  composerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingLeft: 48,
    gap: 12,
  },
  composerMediaButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postButtonDisabled: {
    opacity: 0.4,
  },
  postButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFF',
  },
  postCard: {
    padding: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  postHeaderInfo: {
    flex: 1,
  },
  postAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postAuthorName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  postMeta: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textTertiary,
    marginTop: 1,
  },
  moreButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postContent: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
    lineHeight: 21,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textTertiary,
  },
});
