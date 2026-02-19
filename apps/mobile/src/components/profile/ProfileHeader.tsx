/**
 * ProfileHeader — Profile hero section.
 *
 * Displays avatar, name, headline, bio, university, stats row.
 * Own profile: "Edit Profile" button.
 * Other profile: "Connect" + "Message" buttons (nav stubs, no API in V1).
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { View } from '@clstr/shared/components/ui/primitives/View';
import { Text } from '@clstr/shared/components/ui/primitives/Text';
import { UserAvatar } from '@clstr/shared/components/ui/UserAvatar';
import { Button } from '@clstr/shared/components/ui/Button';
import { useTheme } from '@clstr/shared/design/useTheme';
import { tokens } from '@clstr/shared/design/tokens';
import type { UserProfile } from '@clstr/core/types/profile';

export interface ProfileHeaderProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  onEditProfile?: () => void;
  onConnect?: () => void;
  onMessage?: () => void;
}

export function ProfileHeader({
  profile,
  isOwnProfile,
  onEditProfile,
  onConnect,
  onMessage,
}: ProfileHeaderProps) {
  const { colors } = useTheme();

  const connectionsCount = profile.connections?.length ?? 0;
  const postsCount = profile.posts?.length ?? 0;
  const skillsCount = profile.skills?.length ?? 0;

  return (
    <View style={styles.root}>
      {/* Avatar + name */}
      <View style={styles.avatarRow}>
        <UserAvatar
          src={profile.avatar_url}
          name={profile.full_name ?? ''}
          size={80}
        />
      </View>

      <Text weight="bold" size="xl" style={styles.name}>
        {profile.full_name ?? 'Anonymous'}
      </Text>

      {profile.headline ? (
        <Text size="sm" muted style={styles.headline}>
          {profile.headline}
        </Text>
      ) : null}

      {profile.university ? (
        <Text size="xs" muted style={styles.university}>
          {profile.university}
        </Text>
      ) : null}

      {profile.bio ? (
        <Text size="sm" style={styles.bio} numberOfLines={4}>
          {profile.bio}
        </Text>
      ) : null}

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text weight="semibold" size="sm">
            {connectionsCount}
          </Text>
          <Text size="xs" muted>
            Connections
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text weight="semibold" size="sm">
            {postsCount}
          </Text>
          <Text size="xs" muted>
            Posts
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text weight="semibold" size="sm">
            {skillsCount}
          </Text>
          <Text size="xs" muted>
            Skills
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        {isOwnProfile ? (
          <Button variant="outline" onPress={onEditProfile}>
            Edit Profile
          </Button>
        ) : (
          <>
            <Button variant="default" onPress={onConnect} style={styles.actionBtn}>
              Connect
            </Button>
            <Button variant="outline" onPress={onMessage} style={styles.actionBtn}>
              Message
            </Button>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.xl,
    paddingBottom: tokens.spacing.lg,
  },
  avatarRow: {
    marginBottom: tokens.spacing.md,
  },
  name: {
    textAlign: 'center',
  },
  headline: {
    textAlign: 'center',
    marginTop: tokens.spacing.xs,
  },
  university: {
    textAlign: 'center',
    marginTop: 2,
  },
  bio: {
    textAlign: 'center',
    marginTop: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: tokens.spacing.lg,
    gap: tokens.spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    marginTop: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
