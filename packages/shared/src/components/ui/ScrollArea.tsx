/**
 * ScrollArea — cross-platform
 *
 * Replaces shadcn/ui ScrollArea with RN ScrollView.
 */
import React from 'react';
import {
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
} from 'react-native';

export interface ScrollAreaProps extends ScrollViewProps {
  horizontal?: boolean;
}

export function ScrollArea({ children, horizontal, style, ...props }: ScrollAreaProps) {
  return (
    <ScrollView
      horizontal={horizontal}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      style={[styles.root, style]}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

export function ScrollBar(_props: any) {
  // RN handles scrollbars natively; this is a compatibility stub.
  return null;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
