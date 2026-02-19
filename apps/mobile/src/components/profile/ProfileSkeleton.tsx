/**
 * ProfileSkeleton — Shimmer placeholder for profile loading state.
 *
 * Uses shared Skeleton component from @clstr/shared.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { View } from '@clstr/shared/components/ui/primitives/View';
import { Skeleton } from '@clstr/shared/components/ui/Skeleton';
import { tokens } from '@clstr/shared/design/tokens';

export function ProfileSkeleton() {
  return (
    <View style={styles.root}>
      {/* Avatar */}
      <View style={styles.avatarRow}>
        <Skeleton width={80} height={80} borderRadius={40} />
      </View>

      {/* Name */}
      <Skeleton width={180} height={20} style={styles.centered} />

      {/* Headline */}
      <Skeleton width={220} height={14} style={[styles.centered, styles.gapSm]} />

      {/* University */}
      <Skeleton width={160} height={12} style={[styles.centered, styles.gapXs]} />

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Skeleton width={50} height={30} />
        <Skeleton width={50} height={30} />
        <Skeleton width={50} height={30} />
      </View>

      {/* Action button */}
      <Skeleton width={140} height={36} borderRadius={8} style={styles.action} />

      {/* Section placeholders */}
      <View style={styles.sections}>
        <Skeleton width="100%" height={14} />
        <Skeleton width="90%" height={14} style={styles.gapSm} />
        <Skeleton width="70%" height={14} style={styles.gapSm} />
        <Skeleton width="100%" height={14} style={styles.gapLg} />
        <Skeleton width="85%" height={14} style={styles.gapSm} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingTop: tokens.spacing.xl,
    paddingHorizontal: tokens.spacing.lg,
  },
  avatarRow: {
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  centered: {
    alignSelf: 'center',
  },
  gapXs: {
    marginTop: 4,
  },
  gapSm: {
    marginTop: 8,
  },
  gapLg: {
    marginTop: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: tokens.spacing.xl,
    marginTop: tokens.spacing.lg,
  },
  action: {
    alignSelf: 'center',
    marginTop: tokens.spacing.lg,
  },
  sections: {
    marginTop: tokens.spacing.xl,
  },
});
