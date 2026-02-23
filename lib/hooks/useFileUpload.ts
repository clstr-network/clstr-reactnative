/**
 * useFileUpload — Mobile file upload hook using expo-image-picker.
 *
 * Provides camera/gallery image picking + Supabase Storage upload.
 * Matches web's src/hooks/useFileUpload.ts functionality.
 *
 * Phase 2.3: Onboarding Parity
 */

import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/adapters/core-client';
import { AVATAR_BUCKET, MAX_AVATAR_SIZE } from '@/lib/api/profile';

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

interface UseFileUploadOptions {
  /** Storage bucket name. Defaults to 'avatars'. */
  bucket?: string;
  /** Max file size in bytes. Defaults to 5MB. */
  maxSize?: number;
  /** Allowed MIME types. Defaults to common image types. */
  allowedTypes?: string[];
}

interface UseFileUploadReturn {
  /** Opens the device image picker (gallery). */
  pickImage: () => Promise<ImagePicker.ImagePickerResult | null>;
  /** Opens the device camera. */
  takePhoto: () => Promise<ImagePicker.ImagePickerResult | null>;
  /** Uploads a picked image to Supabase Storage. Returns the public URL. */
  uploadImage: (
    uri: string,
    userId: string,
    options?: { folder?: string },
  ) => Promise<string | null>;
  /** Whether an upload is currently in progress. */
  isUploading: boolean;
  /** Upload progress (0-1). */
  progress: number;
  /** Last error message, if any. */
  error: string | null;
  /** Clear any error state. */
  clearError: () => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const {
    bucket = AVATAR_BUCKET,
    maxSize = MAX_AVATAR_SIZE,
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const pickImage = useCallback(async (): Promise<ImagePicker.ImagePickerResult | null> => {
    try {
      setError(null);

      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access photos is required.');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (result.canceled) return null;
      return result;
    } catch (e: any) {
      setError(e.message || 'Failed to pick image');
      return null;
    }
  }, []);

  const takePhoto = useCallback(async (): Promise<ImagePicker.ImagePickerResult | null> => {
    try {
      setError(null);

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access camera is required.');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (result.canceled) return null;
      return result;
    } catch (e: any) {
      setError(e.message || 'Failed to take photo');
      return null;
    }
  }, []);

  const uploadImage = useCallback(
    async (
      uri: string,
      userId: string,
      uploadOptions: { folder?: string } = {},
    ): Promise<string | null> => {
      try {
        setError(null);
        setIsUploading(true);
        setProgress(0);

        // Determine file extension from URI
        const uriParts = uri.split('.');
        const fileExt = uriParts[uriParts.length - 1]?.toLowerCase() || 'jpg';
        const mimeType = Object.entries(MIME_EXTENSION_MAP).find(
          ([, ext]) => ext === fileExt,
        )?.[0] || 'image/jpeg';

        // Build storage path
        const folder = uploadOptions.folder || userId;
        const fileName = `${folder}/${Date.now()}.${fileExt}`;

        setProgress(0.2);

        // Fetch the image as a blob
        const response = await fetch(uri);
        const blob = await response.blob();

        // Validate size
        if (blob.size > maxSize) {
          const sizeMB = (maxSize / (1024 * 1024)).toFixed(0);
          throw new Error(`File too large. Maximum size is ${sizeMB}MB.`);
        }

        setProgress(0.4);

        // Convert blob to ArrayBuffer for upload
        const arrayBuffer = await new Response(blob).arrayBuffer();

        setProgress(0.6);

        // Upload to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, arrayBuffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        setProgress(0.9);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);

        setProgress(1.0);
        return urlData.publicUrl;
      } catch (e: any) {
        setError(e.message || 'Failed to upload image');
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [bucket, maxSize],
  );

  return {
    pickImage,
    takePhoto,
    uploadImage,
    isUploading,
    progress,
    error,
    clearError,
  };
}
