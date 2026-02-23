/**
 * CreatePostScreen — Rich post creation with 4 content types.
 * Phase 10: Multi-image, video, document attachment, poll creator, tab switcher.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useThemeColors } from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { createPost } from '@/lib/api/social';
import type { CreatePostPayload } from '@/lib/api/social';
import { QUERY_KEYS } from '@/lib/query-keys';
import PollCreator, { type PollData } from '@/components/PollCreator';

// ---------- Types ----------

type CategoryValue = 'general' | 'academic' | 'career' | 'events' | 'social';
type ContentTab = 'text' | 'media' | 'document' | 'poll';

interface SelectedFile {
  uri: string;
  type: string; // MIME
  name: string;
  size?: number;
}

const CATEGORIES: { value: CategoryValue; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'general', label: 'General', icon: 'chatbubble-outline' },
  { value: 'academic', label: 'Academic', icon: 'school-outline' },
  { value: 'career', label: 'Career', icon: 'briefcase-outline' },
  { value: 'events', label: 'Events', icon: 'calendar-outline' },
  { value: 'social', label: 'Social', icon: 'people-outline' },
];

const TABS: { key: ContentTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'text', label: 'Text', icon: 'text-outline' },
  { key: 'media', label: 'Media', icon: 'images-outline' },
  { key: 'document', label: 'Doc', icon: 'document-text-outline' },
  { key: 'poll', label: 'Poll', icon: 'stats-chart-outline' },
];

const MAX_IMAGES = 10;
const MAX_VIDEO_MB = 100;
const ALLOWED_DOC_TYPES = ['application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

// ---------- Component ----------

export default function CreatePostScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  // Core state
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<CategoryValue>('general');
  const [activeTab, setActiveTab] = useState<ContentTab>('text');
  const [posting, setPosting] = useState(false);

  // Media state (images + video)
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // Document state
  const [selectedDocument, setSelectedDocument] = useState<SelectedFile | null>(null);

  // Poll state
  const [pollData, setPollData] = useState<PollData | null>(null);

  // Upload progress
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // ----- Image picking -----
  const pickImages = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to attach images.');
      return;
    }
    const remaining = MAX_IMAGES - selectedImages.length;
    if (remaining <= 0) {
      Alert.alert('Limit Reached', `You can attach up to ${MAX_IMAGES} images.`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setSelectedImages(prev => [...prev, ...result.assets].slice(0, MAX_IMAGES));
      setSelectedVideo(null); // clear video when images selected
      Haptics.selectionAsync();
    }
  }, [selectedImages.length]);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access to take photos.');
      return;
    }
    if (selectedImages.length >= MAX_IMAGES) {
      Alert.alert('Limit Reached', `You can attach up to ${MAX_IMAGES} images.`);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImages(prev => [...prev, result.assets[0]].slice(0, MAX_IMAGES));
      setSelectedVideo(null);
      Haptics.selectionAsync();
    }
  }, [selectedImages.length]);

  const removeImage = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    Haptics.selectionAsync();
  }, []);

  // ----- Video picking -----
  const pickVideo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to attach a video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      // Size check: fileSize is in bytes on some platforms
      if (asset.fileSize && asset.fileSize > MAX_VIDEO_MB * 1024 * 1024) {
        Alert.alert('File Too Large', `Videos must be under ${MAX_VIDEO_MB}MB.`);
        return;
      }
      setSelectedVideo(asset);
      setSelectedImages([]); // clear images when video selected
      Haptics.selectionAsync();
    }
  }, []);

  const removeVideo = useCallback(() => {
    setSelectedVideo(null);
    Haptics.selectionAsync();
  }, []);

  // ----- Document picking -----
  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_DOC_TYPES,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedDocument({
          uri: asset.uri,
          type: asset.mimeType || 'application/octet-stream',
          name: asset.name,
          size: asset.size ?? undefined,
        });
        Haptics.selectionAsync();
      }
    } catch {
      Alert.alert('Error', 'Failed to pick document.');
    }
  }, []);

  const removeDocument = useCallback(() => {
    setSelectedDocument(null);
    Haptics.selectionAsync();
  }, []);

  // ----- Tab switch -----
  const switchTab = useCallback((tab: ContentTab) => {
    setActiveTab(tab);
    Haptics.selectionAsync();
  }, []);

  // ----- Can Post? -----
  const canPost = content.trim().length > 0 || (activeTab === 'poll' && pollData !== null);

  // ----- Submit -----
  const handlePost = async () => {
    if (!canPost || !user) return;
    setPosting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const payload: CreatePostPayload = { content: content.trim() };

      // Build attachments based on active tab content
      if (activeTab === 'media' || selectedImages.length > 0 || selectedVideo) {
        if (selectedImages.length > 0) {
          setUploadProgress(`Uploading ${selectedImages.length} image(s)...`);
          payload.attachments = selectedImages.map(img => {
            const ext = img.uri.split('.').pop()?.toLowerCase() || 'jpg';
            return {
              type: 'image' as const,
              file: {
                uri: img.uri,
                type: img.mimeType || `image/${ext}`,
                name: `post-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`,
              },
            };
          });
        } else if (selectedVideo) {
          setUploadProgress('Uploading video...');
          const ext = selectedVideo.uri.split('.').pop()?.toLowerCase() || 'mp4';
          payload.attachments = [{
            type: 'video' as const,
            file: {
              uri: selectedVideo.uri,
              type: selectedVideo.mimeType || `video/${ext}`,
              name: `post-${Date.now()}.${ext}`,
            },
          }];
        }
      }

      if ((activeTab === 'document' || selectedDocument) && selectedDocument) {
        setUploadProgress('Uploading document...');
        payload.attachments = [{
          type: 'document' as const,
          file: {
            uri: selectedDocument.uri,
            type: selectedDocument.type,
            name: selectedDocument.name,
          },
        }];
      }

      if (activeTab === 'poll' && pollData) {
        payload.poll = {
          question: pollData.question,
          options: pollData.options,
          endDate: pollData.endDate,
        };
      }

      setUploadProgress('Creating post...');
      await createPost(payload);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setPosting(false);
      setUploadProgress(null);
    }
  };

  // ----- Compute attachment count for badge -----
  const attachCount =
    selectedImages.length +
    (selectedVideo ? 1 : 0) +
    (selectedDocument ? 1 : 0) +
    (pollData ? 1 : 0);

  // ----- Format file size -----
  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ─── Header ─── */}
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>New Post</Text>
        <Pressable
          onPress={handlePost}
          disabled={!canPost || posting}
          style={({ pressed }) => [
            styles.postBtn,
            { backgroundColor: canPost ? colors.tint : colors.surfaceElevated },
            pressed && { opacity: 0.85 },
          ]}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.postBtnText, { color: canPost ? '#fff' : colors.textTertiary }]}>
              Post
            </Text>
          )}
        </Pressable>
      </View>

      {/* ─── Upload progress banner ─── */}
      {posting && uploadProgress && (
        <View style={[styles.progressBanner, { backgroundColor: colors.tint + '15' }]}>
          <ActivityIndicator size="small" color={colors.tint} />
          <Text style={[styles.progressText, { color: colors.tint }]}>{uploadProgress}</Text>
        </View>
      )}

      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        bottomOffset={20}
      >
        {/* ─── Text Input ─── */}
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

        {/* ─── Tab Switcher (Task 10.5) ─── */}
        <View style={[styles.tabRow, { borderColor: colors.border }]}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const hasBadge =
              (tab.key === 'media' && (selectedImages.length > 0 || !!selectedVideo)) ||
              (tab.key === 'document' && !!selectedDocument) ||
              (tab.key === 'poll' && !!pollData);
            return (
              <Pressable
                key={tab.key}
                onPress={() => switchTab(tab.key)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: isActive ? colors.tint + '15' : 'transparent',
                    borderColor: isActive ? colors.tint : 'transparent',
                  },
                ]}
              >
                <View>
                  <Ionicons
                    name={tab.icon}
                    size={20}
                    color={isActive ? colors.tint : colors.textSecondary}
                  />
                  {hasBadge && <View style={[styles.tabBadge, { backgroundColor: colors.tint }]} />}
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isActive ? colors.tint : colors.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ─── Media Panel (Task 10.1 + 10.2) ─── */}
        {activeTab === 'media' && (
          <View style={styles.panelContainer}>
            {/* Image previews — horizontal scroll */}
            {selectedImages.length > 0 && (
              <View>
                <Text style={[styles.panelLabel, { color: colors.text }]}>
                  Images ({selectedImages.length}/{MAX_IMAGES})
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.imageScrollContent}
                >
                  {selectedImages.map((img, i) => (
                    <View key={img.uri + i} style={styles.imageThumb}>
                      <Image source={{ uri: img.uri }} style={styles.thumbImage} resizeMode="cover" />
                      <Pressable
                        onPress={() => removeImage(i)}
                        style={[styles.thumbRemoveBtn, { backgroundColor: colors.background }]}
                      >
                        <Ionicons name="close-circle" size={22} color={colors.error ?? '#ef4444'} />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Video preview */}
            {selectedVideo && (
              <View style={styles.videoPreviewWrap}>
                <Text style={[styles.panelLabel, { color: colors.text }]}>Video</Text>
                <View style={[styles.videoCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  {selectedVideo.uri ? (
                    <Image
                      source={{ uri: selectedVideo.uri }}
                      style={styles.videoThumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.videoThumb, { backgroundColor: colors.surface }]}>
                      <Ionicons name="videocam" size={32} color={colors.textTertiary} />
                    </View>
                  )}
                  <View style={styles.videoInfo}>
                    <Text style={[styles.videoName, { color: colors.text }]} numberOfLines={1}>
                      Video attachment
                    </Text>
                    {selectedVideo.fileSize && (
                      <Text style={[styles.videoSize, { color: colors.textSecondary }]}>
                        {formatSize(selectedVideo.fileSize)}
                      </Text>
                    )}
                    {selectedVideo.duration && (
                      <Text style={[styles.videoSize, { color: colors.textSecondary }]}>
                        {Math.round(selectedVideo.duration / 1000)}s
                      </Text>
                    )}
                  </View>
                  <Pressable onPress={removeVideo} hitSlop={8}>
                    <Ionicons name="close-circle" size={22} color={colors.error ?? '#ef4444'} />
                  </Pressable>
                </View>
              </View>
            )}

            {/* Picker buttons */}
            <View style={styles.mediaButtons}>
              {!selectedVideo && (
                <>
                  <Pressable
                    onPress={pickImages}
                    style={[styles.mediaBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  >
                    <Ionicons name="images-outline" size={22} color={colors.tint} />
                    <Text style={[styles.mediaBtnText, { color: colors.text }]}>Gallery</Text>
                  </Pressable>
                  <Pressable
                    onPress={takePhoto}
                    style={[styles.mediaBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                  >
                    <Ionicons name="camera-outline" size={22} color={colors.tint} />
                    <Text style={[styles.mediaBtnText, { color: colors.text }]}>Camera</Text>
                  </Pressable>
                </>
              )}
              {selectedImages.length === 0 && (
                <Pressable
                  onPress={pickVideo}
                  style={[styles.mediaBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                >
                  <Ionicons name="videocam-outline" size={22} color={colors.tint} />
                  <Text style={[styles.mediaBtnText, { color: colors.text }]}>Video</Text>
                </Pressable>
              )}
            </View>

            {selectedImages.length === 0 && !selectedVideo && (
              <Text style={[styles.hintText, { color: colors.textTertiary }]}>
                Attach up to {MAX_IMAGES} images or 1 video ({MAX_VIDEO_MB}MB max)
              </Text>
            )}
          </View>
        )}

        {/* ─── Document Panel (Task 10.3) ─── */}
        {activeTab === 'document' && (
          <View style={styles.panelContainer}>
            {selectedDocument ? (
              <View style={[styles.docCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Ionicons
                  name={
                    selectedDocument.type.includes('pdf')
                      ? 'document-text'
                      : 'document'
                  }
                  size={32}
                  color={colors.tint}
                />
                <View style={styles.docInfo}>
                  <Text style={[styles.docName, { color: colors.text }]} numberOfLines={1}>
                    {selectedDocument.name}
                  </Text>
                  <Text style={[styles.docSize, { color: colors.textSecondary }]}>
                    {selectedDocument.type.split('/').pop()?.toUpperCase() ?? 'FILE'}
                    {selectedDocument.size ? ` · ${formatSize(selectedDocument.size)}` : ''}
                  </Text>
                </View>
                <Pressable onPress={removeDocument} hitSlop={8}>
                  <Ionicons name="close-circle" size={22} color={colors.error ?? '#ef4444'} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={pickDocument}
                style={[styles.docPickerBtn, { borderColor: colors.border }]}
              >
                <Ionicons name="cloud-upload-outline" size={28} color={colors.tint} />
                <Text style={[styles.docPickerTitle, { color: colors.text }]}>Attach Document</Text>
                <Text style={[styles.docPickerHint, { color: colors.textTertiary }]}>
                  PDF, DOC, DOCX supported
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ─── Poll Panel (Task 10.4) ─── */}
        {activeTab === 'poll' && (
          <View style={styles.panelContainer}>
            <PollCreator value={pollData} onChange={setPollData} />
          </View>
        )}

        {/* ─── Category Selector ─── */}
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

        {/* ─── Attachment Summary ─── */}
        {attachCount > 0 && activeTab === 'text' && (
          <View style={[styles.attachSummary, { backgroundColor: colors.tint + '10', borderColor: colors.tint + '30' }]}>
            <Ionicons name="attach" size={18} color={colors.tint} />
            <Text style={[styles.attachSummaryText, { color: colors.tint }]}>
              {selectedImages.length > 0 && `${selectedImages.length} image(s)`}
              {selectedVideo ? '1 video' : ''}
              {selectedDocument ? `1 document (${selectedDocument.name})` : ''}
              {pollData ? '1 poll' : ''}
              {' attached'}
            </Text>
          </View>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  cancelText: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  headerTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  postBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18, minWidth: 60, alignItems: 'center' },
  postBtnText: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  contentInput: { fontSize: 17, lineHeight: 26, minHeight: 120, fontFamily: 'Inter_400Regular' },
  charCount: { fontSize: 12, textAlign: 'right', fontFamily: 'Inter_400Regular' },

  // Progress banner
  progressBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  progressText: { fontSize: 13, fontFamily: 'Inter_500Medium' },

  // Tab switcher
  tabRow: {
    flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 6,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
    marginHorizontal: 3,
  },
  tabLabel: { fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  tabBadge: {
    position: 'absolute', top: -2, right: -6,
    width: 8, height: 8, borderRadius: 4,
  },

  // Panel
  panelContainer: { gap: 12 },
  panelLabel: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginBottom: 4 },

  // Image previews
  imageScrollContent: { gap: 10, paddingVertical: 4 },
  imageThumb: { width: 100, height: 100, borderRadius: 10, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  thumbRemoveBtn: {
    position: 'absolute', top: 4, right: 4, borderRadius: 12,
    width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
  },

  // Video preview
  videoPreviewWrap: { gap: 4 },
  videoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  videoThumb: {
    width: 64, height: 64, borderRadius: 8, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  videoInfo: { flex: 1 },
  videoName: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  videoSize: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },

  // Media buttons
  mediaButtons: { flexDirection: 'row', gap: 10 },
  mediaBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1,
  },
  mediaBtnText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  hintText: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },

  // Document
  docCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  docSize: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  docPickerBtn: {
    alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 32, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed',
  },
  docPickerTitle: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  docPickerHint: { fontSize: 12, fontFamily: 'Inter_400Regular' },

  // Category
  sectionLabel: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryOption: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 18, borderWidth: 1, gap: 6,
  },
  categoryLabel: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  // Attachment summary
  attachSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  attachSummaryText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
});
