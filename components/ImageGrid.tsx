/**
 * ImageGrid — Phase 9.1
 * Renders 1-4+ post images in a responsive grid layout.
 * 1 image = full width, 2 = 2-col, 3 = 1 large + 2 small, 4+ = 2x2 with "+N" overlay.
 */

import React, { useCallback, useState } from 'react';
import { View, Image, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useThemeColors, radius } from '@/constants/colors';

interface ImageGridProps {
  images: string[];
  onImagePress?: (index: number) => void;
}

function ImageGrid({ images, onImagePress }: ImageGridProps) {
  const count = images.length;

  const handlePress = useCallback(
    (index: number) => {
      onImagePress?.(index);
    },
    [onImagePress],
  );

  if (count === 0) return null;

  if (count === 1) {
    return (
      <Pressable onPress={() => handlePress(0)} style={styles.container}>
        <ImageItem uri={images[0]} style={styles.singleImage} />
      </Pressable>
    );
  }

  if (count === 2) {
    return (
      <View style={[styles.container, styles.row]}>
        <Pressable onPress={() => handlePress(0)} style={styles.halfCol}>
          <ImageItem uri={images[0]} style={styles.fillImage} />
        </Pressable>
        <Pressable onPress={() => handlePress(1)} style={styles.halfCol}>
          <ImageItem uri={images[1]} style={styles.fillImage} />
        </Pressable>
      </View>
    );
  }

  if (count === 3) {
    return (
      <View style={[styles.container, styles.row]}>
        <Pressable onPress={() => handlePress(0)} style={styles.halfCol}>
          <ImageItem uri={images[0]} style={styles.fillImage} />
        </Pressable>
        <View style={styles.halfCol}>
          <Pressable onPress={() => handlePress(1)} style={styles.halfRow}>
            <ImageItem uri={images[1]} style={styles.fillImage} />
          </Pressable>
          <Pressable onPress={() => handlePress(2)} style={styles.halfRow}>
            <ImageItem uri={images[2]} style={styles.fillImage} />
          </Pressable>
        </View>
      </View>
    );
  }

  // 4+ images: 2x2 grid with "+N" overlay on the 4th
  const remaining = count - 4;
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable onPress={() => handlePress(0)} style={styles.halfCol}>
          <ImageItem uri={images[0]} style={styles.gridImage} />
        </Pressable>
        <Pressable onPress={() => handlePress(1)} style={styles.halfCol}>
          <ImageItem uri={images[1]} style={styles.gridImage} />
        </Pressable>
      </View>
      <View style={[styles.row, { marginTop: 2 }]}>
        <Pressable onPress={() => handlePress(2)} style={styles.halfCol}>
          <ImageItem uri={images[2]} style={styles.gridImage} />
        </Pressable>
        <Pressable onPress={() => handlePress(3)} style={styles.halfCol}>
          <ImageItem uri={images[3]} style={styles.gridImage} />
          {remaining > 0 && (
            <View style={styles.overlay}>
              <Text style={styles.overlayText}>+{remaining}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

/** Individual image with shimmer loading placeholder */
function ImageItem({ uri, style }: { uri: string; style: any }) {
  const colors = useThemeColors();
  const [loading, setLoading] = useState(true);
  return (
    <View style={[style, { backgroundColor: colors.surfaceElevated }]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        onLoadEnd={() => setLoading(false)}
      />
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.shimmer]}>
          <ActivityIndicator size="small" color={colors.textTertiary} />
        </View>
      )}
    </View>
  );
}

export default React.memo(ImageGrid);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    gap: 2,
  },
  singleImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  halfCol: {
    flex: 1,
    overflow: 'hidden',
  },
  halfRow: {
    flex: 1,
    overflow: 'hidden',
  },
  fillImage: {
    width: '100%',
    aspectRatio: 1,
  },
  gridImage: {
    width: '100%',
    aspectRatio: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  shimmer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
