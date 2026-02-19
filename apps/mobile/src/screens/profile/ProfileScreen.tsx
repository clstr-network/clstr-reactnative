/**
 * ProfileScreen — Profile view screen.
 *
 * Receives optional { id } from route params.
 * Own profile: shows edit button + all sections.
 * Other profile: shows Connect/Message buttons.
 * V1: View-only. No inline editing. "Edit" is a nav stub.
 *
 * Uses ScrollView (not FlatList) — mixed content heights.
 */
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '@clstr/shared/navigation/types';
import { useTheme } from '@clstr/shared/design/useTheme';
import { tokens } from '@clstr/shared/design/tokens';
import { ErrorState } from '@clstr/shared/components/ui/ErrorState';
import { View } from '@clstr/shared/components/ui/primitives/View';
import { Text } from '@clstr/shared/components/ui/primitives/Text';
import { Pressable } from '@clstr/shared/components/ui/primitives/Pressable';

import { useProfile } from '../../hooks/useProfile';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { ProfileSection } from '../../components/profile/ProfileSection';
import { ProfileSkeleton } from '../../components/profile/ProfileSkeleton';

type ProfileRoute = RouteProp<ProfileStackParamList, 'ProfileScreen'>;
type ProfileNav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileScreen'>;

export function ProfileScreen() {
  const route = useRoute<ProfileRoute>();
  const navigation = useNavigation<ProfileNav>();
  const { colors } = useTheme();
  const userId = route.params?.id;

  const { profile, isLoading, isError, error, refetch, isOwnProfile } =
    useProfile(userId);

  // ── Loading state ──
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        {!isOwnProfile && <BackHeader onBack={() => navigation.goBack()} />}
        <ProfileSkeleton />
      </SafeAreaView>
    );
  }

  // ── Error state ──
  if (isError || !profile) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
        {!isOwnProfile && <BackHeader onBack={() => navigation.goBack()} />}
        <ErrorState
          message={error?.message ?? 'Profile not found'}
          onRetry={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {!isOwnProfile && <BackHeader onBack={() => navigation.goBack()} />}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          profile={profile}
          isOwnProfile={isOwnProfile}
          onEditProfile={() => {
            // V1 stub — future edit screen
          }}
          onConnect={() => {
            // V1 stub — future connection API
          }}
          onMessage={() => {
            // V1 stub — future messaging navigation
          }}
        />

        {/* ── Experience ── */}
        {(profile.experience?.length ?? 0) > 0 && (
          <ProfileSection title="Experience" count={profile.experience!.length}>
            {profile.experience!.map((exp) => (
              <View key={exp.id ?? exp.title} style={styles.sectionItem}>
                <Text weight="semibold" size="sm">
                  {exp.title}
                </Text>
                <Text size="xs" muted>
                  {exp.company}
                  {exp.location ? ` · ${exp.location}` : ''}
                </Text>
                {exp.start_date && (
                  <Text size="xs" muted>
                    {exp.start_date} — {exp.end_date ?? 'Present'}
                  </Text>
                )}
                {exp.description ? (
                  <Text size="xs" style={styles.descriptionText} numberOfLines={3}>
                    {exp.description}
                  </Text>
                ) : null}
              </View>
            ))}
          </ProfileSection>
        )}

        {/* ── Education ── */}
        {(profile.education?.length ?? 0) > 0 && (
          <ProfileSection title="Education" count={profile.education!.length}>
            {profile.education!.map((edu) => (
              <View key={edu.id ?? edu.school} style={styles.sectionItem}>
                <Text weight="semibold" size="sm">
                  {edu.school}
                </Text>
                <Text size="xs" muted>
                  {edu.degree}
                  {edu.location ? ` · ${edu.location}` : ''}
                </Text>
                {edu.start_date && (
                  <Text size="xs" muted>
                    {edu.start_date} — {edu.end_date ?? 'Present'}
                  </Text>
                )}
              </View>
            ))}
          </ProfileSection>
        )}

        {/* ── Skills ── */}
        {(profile.skills?.length ?? 0) > 0 && (
          <ProfileSection title="Skills" count={profile.skills!.length}>
            <View style={styles.skillsGrid}>
              {profile.skills!.map((skill) => (
                <View key={skill.id ?? skill.name} style={[styles.skillChip, { borderColor: colors.border }]}>
                  <Text size="xs">
                    {skill.name}
                  </Text>
                  <Text size="xs" muted>
                    {' '}· {skill.level}
                  </Text>
                </View>
              ))}
            </View>
          </ProfileSection>
        )}

        {/* ── Projects ── */}
        {(profile.projects?.length ?? 0) > 0 && (
          <ProfileSection title="Projects" count={profile.projects!.length}>
            {profile.projects!.map((proj) => (
              <View key={proj.id ?? proj.name} style={styles.sectionItem}>
                <Text weight="semibold" size="sm">
                  {proj.name}
                </Text>
                {proj.description ? (
                  <Text size="xs" muted numberOfLines={2}>
                    {proj.description}
                  </Text>
                ) : null}
                {proj.skills && proj.skills.length > 0 && (
                  <Text size="xs" muted style={styles.projectSkills}>
                    {proj.skills.join(', ')}
                  </Text>
                )}
              </View>
            ))}
          </ProfileSection>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Back button header (only for non-own profiles) ──
function BackHeader({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.headerBar}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Text size="lg" style={{ color: colors.primary }}>
          ← Back
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  backBtn: {
    paddingVertical: tokens.spacing.xs,
  },
  scrollContent: {
    paddingBottom: tokens.spacing.xl,
  },
  sectionItem: {
    marginBottom: tokens.spacing.md,
  },
  descriptionText: {
    marginTop: 2,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.xs,
  },
  skillChip: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
  },
  projectSkills: {
    marginTop: 2,
  },
});
