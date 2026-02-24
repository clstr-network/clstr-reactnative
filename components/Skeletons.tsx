/**
 * ═══════════════════════════════════════════════════════════════
 * Screen Skeletons — App-specific loading placeholders
 * ═══════════════════════════════════════════════════════════════
 *
 * Re-exports shared Skeleton primitives + adds screen-specific
 * presets that replace ActivityIndicator spinners for a polished UX.
 *
 * Each skeleton mirrors the actual screen layout shape so users
 * perceive faster load times (perceived performance).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton as SkeletonBase } from '@clstr/shared/components/ui/Skeleton';
import {
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
} from '@clstr/shared/components/ui/SkeletonLoader';

// Re-export primitives for convenience
export { SkeletonBase as Skeleton, SkeletonText, SkeletonAvatar, SkeletonCard };

// ─── Feed / Post Skeleton ────────────────────────────────────

function PostSkeleton() {
  return (
    <View style={styles.postCard}>
      {/* Header: avatar + name + time */}
      <View style={styles.postHeader}>
        <SkeletonBase width={40} height={40} borderRadius={20} />
        <View style={styles.postHeaderText}>
          <SkeletonBase width={120} height={14} borderRadius={6} />
          <SkeletonBase width={80} height={10} borderRadius={4} />
        </View>
      </View>
      {/* Body text */}
      <SkeletonBase width="100%" height={14} borderRadius={6} />
      <SkeletonBase width="85%" height={14} borderRadius={6} />
      <SkeletonBase width="60%" height={14} borderRadius={6} />
      {/* Image placeholder */}
      <SkeletonBase
        width="100%"
        height={180}
        borderRadius={12}
        style={{ marginTop: 8 }}
      />
      {/* Action bar */}
      <View style={styles.postActions}>
        <SkeletonBase width={60} height={12} borderRadius={4} />
        <SkeletonBase width={60} height={12} borderRadius={4} />
        <SkeletonBase width={60} height={12} borderRadius={4} />
      </View>
    </View>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </View>
  );
}

// ─── Profile Skeleton ────────────────────────────────────────

export function ProfileSkeleton() {
  return (
    <View style={styles.container}>
      {/* Cover image area */}
      <SkeletonBase width="100%" height={160} borderRadius={0} />
      {/* Avatar + name */}
      <View style={styles.profileInfo}>
        <SkeletonBase
          width={80}
          height={80}
          borderRadius={40}
          style={{ marginTop: -40 }}
        />
        <SkeletonBase
          width={180}
          height={18}
          borderRadius={6}
          style={{ marginTop: 12 }}
        />
        <SkeletonBase
          width={140}
          height={13}
          borderRadius={4}
          style={{ marginTop: 6 }}
        />
      </View>
      {/* Stats row */}
      <View style={styles.statsRow}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.statBlock}>
            <SkeletonBase width={40} height={20} borderRadius={4} />
            <SkeletonBase width={60} height={10} borderRadius={4} />
          </View>
        ))}
      </View>
      {/* Bio */}
      <View style={styles.section}>
        <SkeletonBase width="100%" height={14} borderRadius={6} />
        <SkeletonBase width="90%" height={14} borderRadius={6} />
        <SkeletonBase width="70%" height={14} borderRadius={6} />
      </View>
    </View>
  );
}

// ─── Event Skeleton ──────────────────────────────────────────

function EventCardSkeleton() {
  return (
    <View style={styles.eventCard}>
      {/* Image */}
      <SkeletonBase width="100%" height={140} borderRadius={12} />
      {/* Title + date */}
      <View style={styles.eventBody}>
        <SkeletonBase width="75%" height={16} borderRadius={6} />
        <SkeletonBase width="50%" height={12} borderRadius={4} />
        <SkeletonBase width="60%" height={12} borderRadius={4} />
      </View>
    </View>
  );
}

export function EventsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </View>
  );
}

// ─── Job Skeleton ────────────────────────────────────────────

function JobCardSkeleton() {
  return (
    <View style={styles.jobCard}>
      {/* Company logo + title */}
      <View style={styles.jobHeader}>
        <SkeletonBase width={44} height={44} borderRadius={10} />
        <View style={styles.jobHeaderText}>
          <SkeletonBase width={150} height={14} borderRadius={6} />
          <SkeletonBase width={100} height={11} borderRadius={4} />
        </View>
      </View>
      {/* Tags */}
      <View style={styles.jobTags}>
        <SkeletonBase width={70} height={24} borderRadius={12} />
        <SkeletonBase width={90} height={24} borderRadius={12} />
        <SkeletonBase width={60} height={24} borderRadius={12} />
      </View>
      {/* Description lines */}
      <SkeletonBase width="100%" height={12} borderRadius={4} />
      <SkeletonBase width="80%" height={12} borderRadius={4} />
    </View>
  );
}

export function JobsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </View>
  );
}

// ─── Network/Connections Skeleton ────────────────────────────

function ConnectionCardSkeleton() {
  return (
    <View style={styles.connectionCard}>
      <SkeletonBase width={48} height={48} borderRadius={24} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBase width={130} height={14} borderRadius={6} />
        <SkeletonBase width={100} height={11} borderRadius={4} />
      </View>
      <SkeletonBase width={80} height={32} borderRadius={8} />
    </View>
  );
}

export function NetworkSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <ConnectionCardSkeleton key={i} />
      ))}
    </View>
  );
}

// ─── Messages Skeleton ───────────────────────────────────────

function ConversationSkeleton() {
  return (
    <View style={styles.conversationRow}>
      <SkeletonBase width={50} height={50} borderRadius={25} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBase width={140} height={14} borderRadius={6} />
        <SkeletonBase width={200} height={11} borderRadius={4} />
      </View>
      <SkeletonBase width={40} height={10} borderRadius={4} />
    </View>
  );
}

export function MessagesSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <ConversationSkeleton key={i} />
      ))}
    </View>
  );
}

// ─── Notifications Skeleton ──────────────────────────────────

function NotificationSkeleton() {
  return (
    <View style={styles.notificationRow}>
      <SkeletonBase width={40} height={40} borderRadius={20} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBase width="90%" height={13} borderRadius={4} />
        <SkeletonBase width="60%" height={10} borderRadius={4} />
      </View>
    </View>
  );
}

export function NotificationsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <NotificationSkeleton key={i} />
      ))}
    </View>
  );
}

// ─── Generic Loading Skeleton ────────────────────────────────

/** Drop-in replacement for the fullscreen ActivityIndicator spinner */
export function LoadingSkeleton() {
  return (
    <View style={styles.loadingContainer}>
      <SkeletonText lines={4} />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },

  // Feed / Post
  postCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    gap: 8,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  postHeaderText: {
    gap: 4,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 8,
  },

  // Profile
  profileInfo: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
  },
  statBlock: {
    alignItems: 'center',
    gap: 4,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },

  // Events
  eventCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  eventBody: {
    padding: 14,
    gap: 8,
  },

  // Jobs
  jobCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    gap: 8,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  jobHeaderText: {
    gap: 4,
  },
  jobTags: {
    flexDirection: 'row',
    gap: 8,
  },

  // Network
  connectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
  },

  // Messages
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },

  // Notifications
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
});
