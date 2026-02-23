/**
 * DocumentAttachment — Phase 9.3
 * Renders a document attachment card with file icon, name, size.
 * Tap to open in system viewer via Linking.openURL.
 */

import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, radius } from '@/constants/colors';
import { fontSize } from '@/constants/typography';

interface DocumentAttachmentProps {
  url: string;
  filename?: string;
  size?: number; // in bytes
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(filename?: string): string {
  if (!filename) return 'document-outline';
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'document-text-outline';
    case 'doc':
    case 'docx':
      return 'document-outline';
    case 'xls':
    case 'xlsx':
      return 'grid-outline';
    case 'ppt':
    case 'pptx':
      return 'easel-outline';
    default:
      return 'document-outline';
  }
}

function DocumentAttachment({ url, filename, size }: DocumentAttachmentProps) {
  const colors = useThemeColors();
  const displayName = filename || url.split('/').pop() || 'Document';
  const sizeStr = formatFileSize(size);

  const handlePress = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot open file', 'No app found to open this file type.');
      }
    } catch {
      Alert.alert('Error', 'Could not open the document.');
    }
  }, [url]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name={getFileIcon(displayName) as any} size={22} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.filename, { color: colors.text }]} numberOfLines={1}>
          {displayName}
        </Text>
        {sizeStr ? (
          <Text style={[styles.fileSize, { color: colors.textTertiary }]}>{sizeStr}</Text>
        ) : null}
      </View>
      <Ionicons name="download-outline" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

export default React.memo(DocumentAttachment);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 10,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  filename: {
    fontSize: fontSize.base,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  fileSize: {
    fontSize: fontSize.sm,
    fontFamily: 'Inter_400Regular',
  },
});
