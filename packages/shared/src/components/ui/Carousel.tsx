/**
 * Carousel — cross-platform
 *
 * Horizontal ScrollView-based carousel with snap.
 * Replaces embla-carousel (web).
 */
import React, { useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View as RNView,
  Pressable as RNPressable,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { tokens } from '../../design/tokens';
import { useTheme } from '../../design/useTheme';
import { Text } from './primitives/Text';

const { width: SCREEN_W } = Dimensions.get('window');

export interface CarouselProps {
  children: React.ReactNode;
  itemWidth?: number;
  style?: StyleProp<ViewStyle>;
}

export function Carousel({ children, itemWidth = SCREEN_W * 0.85, style }: CarouselProps) {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const count = React.Children.count(children);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / itemWidth);
      setActiveIndex(idx);
    },
    [itemWidth],
  );

  const scrollTo = (idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * itemWidth, animated: true });
  };

  return (
    <RNView style={[styles.root, style]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        snapToInterval={itemWidth}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: (SCREEN_W - itemWidth) / 2 }}
      >
        {React.Children.map(children, (child, i) => (
          <RNView key={i} style={{ width: itemWidth }}>
            {child}
          </RNView>
        ))}
      </ScrollView>

      {/* Controls */}
      <RNView style={styles.controls}>
        <RNPressable
          onPress={() => scrollTo(Math.max(0, activeIndex - 1))}
          disabled={activeIndex === 0}
          style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]}
          accessibilityLabel="Previous slide"
        >
          <Text style={{ color: colors.foreground }}>{'‹'}</Text>
        </RNPressable>
        <RNPressable
          onPress={() => scrollTo(Math.min(count - 1, activeIndex + 1))}
          disabled={activeIndex >= count - 1}
          style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]}
          accessibilityLabel="Next slide"
        >
          <Text style={{ color: colors.foreground }}>{'›'}</Text>
        </RNPressable>
      </RNView>
    </RNView>
  );
}

export function CarouselContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function CarouselItem({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={[styles.item, style]}>{children}</RNView>;
}

export function CarouselPrevious({ onPress }: { onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <RNPressable onPress={onPress} style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={{ color: colors.foreground }}>{'‹'}</Text>
    </RNPressable>
  );
}

export function CarouselNext({ onPress }: { onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <RNPressable onPress={onPress} style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={{ color: colors.foreground }}>{'›'}</Text>
    </RNPressable>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.sm,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    paddingHorizontal: tokens.spacing.xs,
  },
});
