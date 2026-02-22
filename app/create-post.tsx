import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, Platform, Alert, Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors } from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { createPost } from '@/lib/api/social';
import { QUERY_KEYS } from '@/lib/query-keys';

type CategoryValue = 'general' | 'academic' | 'career' | 'events' | 'social';

const CATEGORIES: { value: CategoryValue; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'general', label: 'General', icon: 'chatbubble-outline' },
  { value: 'academic', label: 'Academic', icon: 'school-outline' },
  { value: 'career', label: 'Career', icon: 'briefcase-outline' },
  { value: 'events', label: 'Events', icon: 'calendar-outline' },
  { value: 'social', label: 'Social', icon: 'people-outline' },
];

export default function CreatePostScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const [content, setContent] = useState('');
  const [category, setCategory] = useState<CategoryValue>('general');
  const [posting, setPosting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0]);
      Haptics.selectionAsync();
    }
  };

  const handlePost = async () => {
    if (!content.trim() || !user) return;
    setPosting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const payload: Parameters<typeof createPost>[0] = { content: content.trim() };
      if (selectedImage) {
        const uri = selectedImage.uri;
        const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
        payload.attachment = {
          type: 'image',
          file: { uri, type: selectedImage.mimeType || `image/${ext}`, name: `post-${Date.now()}.${ext}` },
        };
      }
      await createPost(payload);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>New Post</Text>
        <Pressable
          onPress={handlePost}
          disabled={!content.trim() || posting}
          style={({ pressed }) => [
            styles.postBtn,
            { backgroundColor: content.trim() ? colors.tint : colors.surfaceElevated },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={[styles.postBtnText, { color: content.trim() ? '#fff' : colors.textTertiary }]}>
            {posting ? 'Posting...' : 'Post'}
          </Text>
        </Pressable>
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        bottomOffset={20}
      >
        <TextInput
          style={[styles.contentInput, { color: colors.text }]}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.textTertiary}
          value={content}
          onChangeText={setContent}
          multiline
          autoFocus
          maxLength={1000}
          textAlignVertical="top"
        />

        <Text style={[styles.charCount, { color: content.length > 900 ? colors.warning : colors.textTertiary }]}>
          {content.length}/1000
        </Text>

        {/* Image preview */}
        {selectedImage ? (
          <View style={styles.imagePreviewWrap}>
            <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} resizeMode="cover" />
            <Pressable
              onPress={() => { setSelectedImage(null); Haptics.selectionAsync(); }}
              style={[styles.removeImageBtn, { backgroundColor: colors.background }]}
            >
              <Ionicons name="close-circle" size={24} color={colors.error ?? '#ef4444'} />
            </Pressable>
          </View>
        ) : null}

        {/* Toolbar */}
        <View style={[styles.toolbar, { borderColor: colors.border }]}>
          <Pressable onPress={pickImage} style={styles.toolbarBtn} hitSlop={8}>
            <Ionicons name="image-outline" size={22} color={selectedImage ? colors.tint : colors.textSecondary} />
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map(c => (
            <Pressable
              key={c.value}
              onPress={() => { setCategory(c.value); Haptics.selectionAsync(); }}
              style={[
                styles.categoryOption,
                {
                  backgroundColor: category === c.value ? colors.tint + '15' : colors.surfaceElevated,
                  borderColor: category === c.value ? colors.tint : colors.border,
                },
              ]}
            >
              <Ionicons name={c.icon} size={18} color={category === c.value ? colors.tint : colors.textSecondary} />
              <Text style={[styles.categoryLabel, { color: category === c.value ? colors.tint : colors.textSecondary }]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  cancelText: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  headerTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  postBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18 },
  postBtnText: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  contentInput: { fontSize: 17, lineHeight: 26, minHeight: 150, fontFamily: 'Inter_400Regular' },
  charCount: { fontSize: 12, textAlign: 'right', fontFamily: 'Inter_400Regular' },
  sectionLabel: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryOption: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 18, borderWidth: 1, gap: 6,
  },
  categoryLabel: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  imagePreviewWrap: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
  imagePreview: { width: '100%', height: 200, borderRadius: 12 },
  removeImageBtn: {
    position: 'absolute', top: 8, right: 8, borderRadius: 14, width: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  toolbar: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingVertical: 8 },
  toolbarBtn: { padding: 6 },
});
