/**
 * Slider — cross-platform
 *
 * Horizontal slider using PanResponder.
 * Mirrors shadcn/ui Slider API.
 */
import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View as RNView,
  PanResponder,
  LayoutChangeEvent,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { tokens } from '../../design/tokens';
import { useTheme } from '../../design/useTheme';

export interface SliderProps {
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Slider({
  value: controlledValue,
  defaultValue = [0],
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  disabled = false,
  style,
}: SliderProps) {
  const { colors } = useTheme();
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const values = controlledValue ?? uncontrolled;
  const trackWidth = useRef(0);

  const clamp = (v: number) => {
    const stepped = Math.round(v / step) * step;
    return Math.max(min, Math.min(max, stepped));
  };

  const ratio = (v: number) => (v - min) / (max - min);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (_, gs) => {
        if (trackWidth.current === 0) return;
        const r = gs.x0 / trackWidth.current;
        const v = clamp(min + r * (max - min));
        const next = [v];
        setUncontrolled(next);
        onValueChange?.(next);
      },
      onPanResponderMove: (_, gs) => {
        if (trackWidth.current === 0) return;
        const r = Math.max(0, Math.min(1, (gs.x0 + gs.dx) / trackWidth.current));
        const v = clamp(min + r * (max - min));
        const next = [v];
        setUncontrolled(next);
        onValueChange?.(next);
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
  };

  const fillWidth = `${ratio(values[0]) * 100}%`;

  return (
    <RNView
      style={[styles.container, disabled && styles.disabled, style]}
      onLayout={onLayout}
      {...panResponder.panHandlers}
    >
      <RNView style={[styles.track, { backgroundColor: colors.muted }]}>
        <RNView
          style={[
            styles.fill,
            { width: fillWidth as any, backgroundColor: colors.primary },
          ]}
        />
      </RNView>
      <RNView
        style={[
          styles.thumb,
          {
            left: fillWidth as any,
            backgroundColor: colors.background,
            borderColor: colors.primary,
          },
        ]}
      />
    </RNView>
  );
}

const THUMB = 20;

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 2,
    marginLeft: -(THUMB / 2),
    top: 10,
  },
});
