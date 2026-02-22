import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Platform, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useData } from '@/lib/data-context';
import { PostCard } from '@/components/PostCard';
import { Post } from '@/lib/types';

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { posts, toggleLike, addPost, user } = useData();
  const [showCompose, setShowCompose] = useState(false);
  const [composeText, setComposeText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>();

  const tags = ['Engineering', 'Product', 'Team', 'Insights'];

  const handlePublish = () => {
    if (composeText.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addPost(composeText.trim(), selectedTag);
      setComposeText('');
      setSelectedTag(undefined);
      setShowCompose(false);
    }
  };

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard post={item} onLike={toggleLike} />
  ), [toggleLike]);

  const keyExtractor = useCallback((item: Post) => item.id, []);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: (Platform.OS === 'web' ? webTopInset : insets.top) + 8 }]}>
        <View>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.userName}>{user.name}</Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowCompose(true);
          }}
          style={({ pressed }) => [styles.composeBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <Ionicons name="add" size={22} color={Colors.dark.primaryForeground} />
        </Pressable>
      </View>

      <View style={styles.composerRow}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowCompose(true);
          }}
          style={styles.composerTrigger}
        >
          <Text style={styles.composerText}>Share an update...</Text>
        </Pressable>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={keyExtractor}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!posts.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="newspaper-outline" size={40} color={Colors.dark.textMeta} />
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
        }
      />

      <Modal visible={showCompose} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingTop: (Platform.OS === 'web' ? webTopInset : insets.top) + 16 }]}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowCompose(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={Colors.dark.text} />
              </Pressable>
              <Text style={styles.modalTitle}>New Post</Text>
              <Pressable
                onPress={handlePublish}
                style={({ pressed }) => [
                  styles.publishBtn,
                  !composeText.trim() && styles.publishBtnDisabled,
                  pressed && { opacity: 0.7 },
                ]}
                disabled={!composeText.trim()}
              >
                <Text style={[styles.publishText, !composeText.trim() && styles.publishTextDisabled]}>
                  Post
                </Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.composeInput}
              placeholder="Share an update..."
              placeholderTextColor={Colors.dark.textMeta}
              multiline
              autoFocus
              value={composeText}
              onChangeText={setComposeText}
              textAlignVertical="top"
            />
            <View style={styles.tagRow}>
              {tags.map(tag => (
                <Pressable
                  key={tag}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedTag(selectedTag === tag ? undefined : tag);
                  }}
                  style={[styles.tagOption, selectedTag === tag && styles.tagSelected]}
                >
                  <Text style={[styles.tagOptionText, selectedTag === tag && styles.tagSelectedText]}>
                    {tag}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  greeting: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    color: Colors.dark.textMeta,
    marginBottom: 2,
  },
  userName: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    color: Colors.dark.text,
  },
  composeBtn: {
    backgroundColor: Colors.dark.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  composerRow: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  composerTrigger: {
    borderWidth: 1,
    borderColor: Colors.dark.composerBorder,
    backgroundColor: Colors.dark.inputBackground,
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  composerText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    color: Colors.dark.composerText,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    color: Colors.dark.textMeta,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 17,
    color: Colors.dark.text,
  },
  publishBtn: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  publishBtnDisabled: {
    backgroundColor: Colors.dark.surface,
  },
  publishText: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 14,
    color: Colors.dark.primaryForeground,
  },
  publishTextDisabled: {
    color: Colors.dark.textMeta,
  },
  composeInput: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 16,
    color: Colors.dark.text,
    minHeight: 120,
    lineHeight: 24,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  tagOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.surfaceBorder,
  },
  tagSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: Colors.dark.surfaceBorderStrong,
  },
  tagOptionText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  tagSelectedText: {
    color: Colors.dark.text,
  },
});
