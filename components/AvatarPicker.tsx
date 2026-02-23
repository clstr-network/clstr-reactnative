/**
 * AvatarPicker — Profile picture selector component.
 *
 * Circular preview + "Upload Photo" / "Change" / "Remove" buttons.
 * Uses expo-image-picker via the useFileUpload hook.
 *
 * Phase 2.4c: Onboarding Parity
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFileUpload } from '@/lib/hooks/useFileUpload';

interface AvatarPickerProps {
  /** Current avatar URL (local uri or remote). */
  avatarUrl: string | null;
  /** Called when a new image is selected (local URI). */
  onImagePicked: (uri: string) => void;
  /** Called when avatar is removed. */
  onRemove?: () => void;
  /** Size of the avatar circle. */
  size?: number;
  /** Color tokens. */
  colors: {
    text: string;
    textSecondary: string;
    textTertiary: string;
    surface: string;
    border: string;
    tint: string;
    primaryForeground?: string;
  };
}

export function AvatarPicker({
  avatarUrl,
  onImagePicked,
  onRemove,
  size = 120,
  colors,
}: AvatarPickerProps) {
  const { pickImage, takePhoto, error: uploadError } = useFileUpload();
  const [isLoading, setIsLoading] = useState(false);

  const handlePick = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === 'web') {
      // On web, go straight to gallery
      setIsLoading(true);
      const result = await pickImage();
      setIsLoading(false);
      if (result && !result.canceled && result.assets[0]) {
        onImagePicked(result.assets[0].uri);
      }
      return;
    }

    // On native, show action sheet
    Alert.alert('Profile Photo', 'Choose how to set your photo', [
      {
        text: 'Take Photo',
        onPress: async () => {
          setIsLoading(true);
          const result = await takePhoto();
          setIsLoading(false);
          if (result && !result.canceled && result.assets[0]) {
            onImagePicked(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          setIsLoading(true);
          const result = await pickImage();
          setIsLoading(false);
          if (result && !result.canceled && result.assets[0]) {
            onImagePicked(result.assets[0].uri);
          }
        },
      },
      ...(avatarUrl && onRemove
        ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: onRemove }]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }, [pickImage, takePhoto, avatarUrl, onRemove, onImagePicked]);

  return (
    <View style={styles.container}>
      <Pressable onPress={handlePick} style={styles.avatarWrapper}>
        <View
          style={[
            styles.avatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.tint} />
          ) : avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={[
                styles.avatarImage,
                { width: size, height: size, borderRadius: size / 2 },
              ]}
            />
          ) : (
            <View style={styles.placeholderContent}>
              <Ionicons name="camera-outline" size={size * 0.3} color={colors.textTertiary} />
            </View>
          )}
        </View>

        {/* Edit overlay badge */}
        <View
          style={[
            styles.editBadge,
            { backgroundColor: colors.tint },
          ]}
        >
          <Ionicons name="pencil" size={14} color={colors.primaryForeground ?? '#000'} />
        </View>
      </Pressable>

      <Pressable onPress={handlePick}>
        <Text style={[styles.label, { color: colors.tint }]}>
          {avatarUrl ? 'Change Photo' : 'Upload Photo'}
        </Text>
      </Pressable>

      {uploadError && (
        <Text style={[styles.errorText, { color: '#EF4444' }]}>{uploadError}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    resizeMode: 'cover',
  },
  placeholderContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  editBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
