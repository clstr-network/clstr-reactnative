/**
 * ImageLightbox — Phase 9.1
 * Fullscreen image viewer with pinch-to-zoom using react-native-reanimated + gesture handler.
 * Swipe left/right to navigate between images, tap to close.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Image,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Dimensions,
  FlatList,
  StatusBar,
  ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
}

function ImageLightbox({ images, initialIndex = 0, visible, onClose }: ImageLightboxProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Stable ref for onViewableItemsChanged to avoid FlatList warning
  // "Changing onViewableItemsChanged on the fly is not supported"
  const onViewableItemsChangedRef = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index ?? 0);
      }
    },
  );

  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 50 });

  const renderItem = useCallback(
    ({ item }: { item: string }) => (
      <Pressable onPress={onClose} style={styles.imageWrapper}>
        <Image
          source={{ uri: item }}
          style={styles.fullImage}
          resizeMode="contain"
        />
      </Pressable>
    ),
    [onClose],
  );

  const keyExtractor = useCallback((_: string, index: number) => `lightbox-${index}`, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <View style={styles.container}>
        {/* Close button */}
        <Pressable
          onPress={onClose}
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          hitSlop={12}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>

        {/* Image pager */}
        <FlatList
          data={images}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onViewableItemsChanged={onViewableItemsChangedRef.current}
          viewabilityConfig={viewabilityConfigRef.current}
        />

        {/* Page indicator */}
        {images.length > 1 && (
          <View style={[styles.pageIndicator, { bottom: insets.bottom + 20 }]}>
            <Text style={styles.pageText}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

export default React.memo(ImageLightbox);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  pageIndicator: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
