/**
 * PostSkeleton — Shimmer placeholder mimicking PostCard layout.
 *
 * Uses shared Skeleton component from @clstr/shared.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { View } from '@clstr/shared/components/ui/primitives/View';
import { Card } from '@clstr/shared/components/ui/Card';
import { Skeleton } from '@clstr/shared/components/ui/Skeleton';
import { tokens } from '@clstr/shared/design/tokens';

export function PostSkeleton() {
  return (
    <Card style={styles.card}>
      {/* Header skeleton */}
      <View style={styles.header}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.headerText}>
          <Skeleton width={120} height={14} />
          <Skeleton width={80} height={12} style={styles.subtitleSkeleton} />
        </View>
      </View>

      {/* Content skeleton */}
      <View style={styles.content}>
        <Skeleton width="100%" height={14} />
        <Skeleton width="85%" height={14} style={styles.lineSkeleton} />
        <Skeleton width="60%" height={14} style={styles.lineSkeleton} />
      </View>

      {/* Footer skeleton */}
      <View style={styles.footer}>
        <Skeleton width={50} height={12} />
        <Skeleton width={50} height={12} style={styles.footerSpacer} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.spacing.md,
  },
  headerText: {
    marginLeft: tokens.spacing.sm,
    flex: 1,
  },
  subtitleSkeleton: {
    marginTop: 6,
  },
  content: {
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.sm,
  },
  lineSkeleton: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  footerSpacer: {
    marginLeft: tokens.spacing.md,
  },
});
