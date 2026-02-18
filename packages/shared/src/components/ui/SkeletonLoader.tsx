/**
 * SkeletonLoader — cross-platform
 *
 * Pre-built skeleton shapes: text lines, avatar circle, card.
 * Uses the shared Skeleton shimmer component internally.
 */
import React from 'react';
import { StyleSheet, View as RNView, type ViewStyle, type StyleProp } from 'react-native';
import { tokens } from '../../design/tokens';
import { Skeleton } from './Skeleton';

/* ------------------------------------------------------------------ */
/*  Text block                                                        */
/* ------------------------------------------------------------------ */

export interface SkeletonTextProps {
  lines?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonText({ lines = 3, style }: SkeletonTextProps) {
  return (
    <RNView style={[styles.textBlock, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          style={[
            styles.line,
            i === lines - 1 && { width: '60%' },
          ]}
        />
      ))}
    </RNView>
  );
}

/* ------------------------------------------------------------------ */
/*  Avatar                                                            */
/* ------------------------------------------------------------------ */

export interface SkeletonAvatarProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonAvatar({ size = 40, style }: SkeletonAvatarProps) {
  return (
    <Skeleton
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Card                                                              */
/* ------------------------------------------------------------------ */

export interface SkeletonCardProps {
  style?: StyleProp<ViewStyle>;
}

export function SkeletonCard({ style }: SkeletonCardProps) {
  return (
    <RNView style={[styles.card, style]}>
      <Skeleton style={styles.cardImage} />
      <RNView style={styles.cardBody}>
        <Skeleton style={[styles.line, { width: '70%' }]} />
        <Skeleton style={[styles.line, { width: '90%' }]} />
        <Skeleton style={[styles.line, { width: '50%' }]} />
      </RNView>
    </RNView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  textBlock: {
    gap: tokens.spacing.sm,
  },
  line: {
    height: 14,
    borderRadius: tokens.radius.sm,
    width: '100%',
  },
  card: {
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
  },
  cardImage: {
    height: 140,
    width: '100%',
  },
  cardBody: {
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
});
