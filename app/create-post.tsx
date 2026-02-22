import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, useColorScheme, Platform,
  KeyboardAvoidingView, ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { addPost, type Post } from '@/lib/storage';

const CATEGORIES: { value: Post['category']; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'general', label: 'General', icon: 'chatbubble-outline' },
  { value: 'academic', label: 'Academic', icon: 'school-outline' },
  { value: 'career', label: 'Career', icon: 'briefcase-outline' },
  { value: 'events', label: 'Events', icon: 'calendar-outline' },
  { value: 'social', label: 'Social', icon: 'people-outline' },
];

export default function CreatePostScreen() {
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Post['category']>('general');
  const [isPosting, setIsPosting] = useState(false);

  const canPost = content.trim().length > 0 && !isPosting;

  const handlePost = async () => {
    if (!canPost || !user) return;
    setIsPosting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await addPost({
        authorId: user.id,
        authorName: user.name,
        authorUsername: user.username,
        authorRole: user.role,
        authorAvatar: user.avatarUrl,
        content: content.trim(),
        category,
      });
      await queryClient.invalidateQueries({ queryKey: ['posts'] });
      router.back();
    } catch (e) {
      console.error(e);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={28} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>New Post</Text>
          <Pressable
            onPress={handlePost}
            disabled={!canPost}
            style={({ pressed }) => [
              styles.postBtn,
              { backgroundColor: canPost ? colors.tint : colors.border },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.postBtnText, { color: canPost ? '#fff' : colors.textTertiary }]}>
              {isPosting ? 'Posting...' : 'Post'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="What's on your mind?"
            placeholderTextColor={colors.textTertiary}
            value={content}
            onChangeText={setContent}
            multiline
            autoFocus
            textAlignVertical="top"
            maxLength={500}
          />

          <Text style={[styles.charCount, { color: colors.textTertiary }]}>{content.length}/500</Text>

          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(c => (
              <Pressable
                key={c.value}
                onPress={() => { setCategory(c.value); Haptics.selectionAsync(); }}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: category === c.value ? colors.tint + '20' : colors.surfaceElevated,
                    borderColor: category === c.value ? colors.tint : colors.border,
                  },
                ]}
              >
                <Ionicons name={c.icon} size={16} color={category === c.value ? colors.tint : colors.textSecondary} />
                <Text style={[styles.catText, { color: category === c.value ? colors.tint : colors.textSecondary }]}>
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  postBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  postBtnText: { fontSize: 14, fontWeight: '700' },
  body: { flex: 1 },
  bodyContent: { padding: 16 },
  input: { fontSize: 17, lineHeight: 24, minHeight: 120 },
  charCount: { fontSize: 12, textAlign: 'right', marginTop: 8 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginTop: 24, marginBottom: 12 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, gap: 6,
  },
  catText: { fontSize: 13, fontWeight: '600' },
});
