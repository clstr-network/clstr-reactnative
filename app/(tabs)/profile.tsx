import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useThemeColors, getRoleBadgeColor } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import Avatar from '@/components/Avatar';
import RoleBadge from '@/components/RoleBadge';
import PostCard from '@/components/PostCard';
import { useAuth } from '@/lib/auth-context';
import { getProfile, type Profile } from '@/lib/api';
import { calculateProfileCompletion, getMissingProfileFields, getConnectionCount, getProfileViewsCount, getExperiences, getEducation, getSkills } from '@/lib/api/profile';
import type { ExperienceData, EducationData, SkillData } from '@/lib/api/profile';
import { getUserPostsCount, getPostsByUser } from '@/lib/api/social';
import { getMyProjects } from '@/lib/api/projects';
import type { Project as CollabProject } from '@/lib/api/projects';
import { QUERY_KEYS, MOBILE_QUERY_KEYS } from '@/lib/query-keys';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { useRolePermissions } from '@/lib/hooks/useRolePermissions';

export default function ProfileScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  // Phase 4 — Role-based permissions
  const { canDoSkillAnalysis, canOfferMentorship, canToggleMentorStatus, isAlumni, isFaculty, isClubLead } = useRolePermissions();
  const { canBrowseJobs, canAccessSkillAnalysis, canBrowseEcoCampus, canSaveBookmarks } = useFeatureAccess();

  const { data: profile, isLoading } = useQuery({
    queryKey: QUERY_KEYS.profile(user?.id ?? ''),
    queryFn: () => getProfile(user!.id),
    enabled: !!user?.id,
  });

  // F9 — Use dedicated DB count queries instead of profile.connections?.length
  const { data: connectionsCount = 0 } = useQuery({
    queryKey: MOBILE_QUERY_KEYS.connectionCount(user?.id ?? ''),
    queryFn: () => getConnectionCount(user!.id),
    enabled: !!user?.id,
  });

  const { data: postsCount = 0 } = useQuery({
    queryKey: MOBILE_QUERY_KEYS.userPostsCount(user?.id ?? ''),
    queryFn: () => getUserPostsCount(user!.id),
    enabled: !!user?.id,
  });

  // Phase 6 — Profile views count (web parity)
  const { data: profileViewsCount = 0 } = useQuery({
    queryKey: ['profile-views', user?.id ?? ''],
    queryFn: () => getProfileViewsCount(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // ─── 12.2 — Profile Tab State ─────────────────────────────
  type ProfileTab = 'posts' | 'about' | 'projects';
  const [profileTab, setProfileTab] = useState<ProfileTab>('posts');

  // 12.2 — User's Posts (paginated)
  const postsQ = useQuery({
    queryKey: ['myPosts', user?.id],
    queryFn: () => getPostsByUser(user!.id, { pageSize: 20 }),
    enabled: !!user?.id && profileTab === 'posts',
  });
  const myPosts = postsQ.data?.posts ?? [];

  // 12.2 — Education
  const { data: educationList = [] } = useQuery<EducationData[]>({
    queryKey: ['myEducation', user?.id],
    queryFn: () => getEducation(user!.id),
    enabled: !!user?.id && profileTab === 'about',
  });

  // 12.2 — Experience
  const { data: experienceList = [] } = useQuery<ExperienceData[]>({
    queryKey: ['myExperience', user?.id],
    queryFn: () => getExperiences(user!.id),
    enabled: !!user?.id && profileTab === 'about',
  });

  // 12.2 — Skills
  const { data: skillsList = [] } = useQuery<SkillData[]>({
    queryKey: ['mySkills', user?.id],
    queryFn: () => getSkills(user!.id),
    enabled: !!user?.id && profileTab === 'about',
  });

  // 12.2 — My Projects
  const { data: projectsData } = useQuery({
    queryKey: ['myProjects', user?.id],
    queryFn: () => getMyProjects(user!.id),
    enabled: !!user?.id && profileTab === 'projects',
  });
  const myProjects = projectsData?.data ?? [];

  // Phase 6 — Social links parsing
  const socialLinks = useMemo(() => {
    const links = profile?.social_links;
    if (!links || typeof links !== 'object') return [];
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      website: 'globe-outline',
      linkedin: 'logo-linkedin',
      twitter: 'logo-twitter',
      github: 'logo-github',
      instagram: 'logo-instagram',
      facebook: 'logo-facebook',
    };
    return Object.entries(links)
      .filter(([_, url]) => !!url)
      .map(([key, url]) => ({
        key,
        url: url as string,
        icon: iconMap[key] ?? ('link-outline' as keyof typeof Ionicons.glyphMap),
        label: key.charAt(0).toUpperCase() + key.slice(1),
      }));
  }, [profile?.social_links]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Profile not found</Text>
        </View>
      </View>
    );
  }

  const badgeColor = getRoleBadgeColor(profile.role ?? 'Student');
  // F9: connectionsCount and postsCount now come from dedicated useQuery hooks above
  const completionPct = calculateProfileCompletion(profile as any);
  const missingFields = getMissingProfileFields(profile as any);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/onboarding');
        },
      },
    ]);
  };

  // Phase 4 — Role-specific menu items (F4: all wired with navigation)
  const MENU_ITEMS = [
    { icon: 'person-outline' as const, label: 'Edit Profile', color: colors.tint, onPress: () => router.push('/edit-profile' as any), visible: true },
    { icon: 'bookmark-outline' as const, label: 'Saved Posts', color: colors.warning, onPress: () => router.push('/saved'), visible: canSaveBookmarks },
    ...(canBrowseJobs ? [{ icon: 'briefcase-outline' as const, label: 'Jobs & Careers', color: colors.tint, onPress: () => router.push('/jobs'), visible: true }] : []),
    ...(canAccessSkillAnalysis ? [{ icon: 'analytics-outline' as const, label: 'Skill Analysis', color: colors.success, onPress: () => router.push('/skill-analysis'), visible: true }] : []),
    ...(canOfferMentorship ? [{ icon: 'people-outline' as const, label: 'Mentorship', color: colors.warning, onPress: () => router.push('/mentorship'), visible: true }] : []),
    ...(canBrowseEcoCampus ? [{ icon: 'storefront-outline' as const, label: 'EcoCampus', color: colors.tint, onPress: () => router.push('/ecocampus'), visible: true }] : []),
    { icon: 'settings-outline' as const, label: 'Settings', color: colors.textSecondary, onPress: () => router.push('/settings'), visible: true },
    { icon: 'help-circle-outline' as const, label: 'Help & Support', color: colors.textSecondary, onPress: () => router.push('/settings'), visible: true },
  ].filter(item => item.visible);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.headerBg, { backgroundColor: badgeColor + '15', paddingTop: insets.top + webTopInset }]}>
        {/* Phase 5 — Header actions: settings + notifications */}
        <View style={styles.headerBar}>
          <View style={{ width: 38 }} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push('/settings')} style={styles.headerIconBtn} hitSlop={8}>
              <Ionicons name="settings-outline" size={22} color={colors.text} />
            </Pressable>
            <Pressable onPress={() => router.push('/notifications')} style={styles.headerIconBtn} hitSlop={8}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
            </Pressable>
          </View>
        </View>
        <View style={styles.profileSection}>
          <Avatar uri={profile.avatar_url} name={profile.full_name ?? 'User'} size={80} />
          <Text style={[styles.name, { color: colors.text }]}>{profile.full_name ?? 'User'}</Text>
          {profile.headline && (
            <Text style={[styles.username, { color: colors.textSecondary }]}>{profile.headline}</Text>
          )}
          {profile.role && <RoleBadge role={profile.role} size="md" />}
          {!!profile.bio && <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio}</Text>}
        </View>

        <View style={styles.statsRow}>
          <Pressable
            style={styles.statItem}
            onPress={() => { Haptics.selectionAsync(); router.push('/connections' as any); }}
          >
            <Text style={[styles.statNum, { color: colors.text }]}>{connectionsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.tint }]}>Connections</Text>
          </Pressable>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.text }]}>{postsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.text }]}>{profileViewsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Views</Text>
          </View>
        </View>
      </View>

      {/* F5 — Profile Completion Banner */}
      {completionPct < 100 && (
        <Pressable
          onPress={() => router.push('/edit-profile' as any)}
          style={[styles.completionBanner, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '30' }]}
        >
          <View style={styles.completionRow}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
            <Text style={[styles.completionText, { color: colors.text }]}>
              Profile {completionPct}% complete
            </Text>
          </View>
          {missingFields.length > 0 && (
            <Text style={[styles.completionHint, { color: colors.textSecondary }]}>
              Add {missingFields.slice(0, 2).join(', ')} to stand out
            </Text>
          )}
          <View style={[styles.completionBar, { backgroundColor: colors.border }]}>
            <View style={[styles.completionFill, { width: `${completionPct}%`, backgroundColor: colors.warning }]} />
          </View>
        </Pressable>
      )}

      {/* Phase 6 — Social Links */}
      {socialLinks.length > 0 && (
        <View style={[styles.socialLinksContainer, { borderColor: colors.border }]}>
          {socialLinks.map((link) => (
            <Pressable
              key={link.key}
              onPress={() => { Haptics.selectionAsync(); Linking.openURL(link.url); }}
              style={({ pressed }) => [
                styles.socialLinkBtn,
                { backgroundColor: pressed ? colors.surfaceElevated : colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name={link.icon} size={18} color={colors.tint} />
              <Text style={[styles.socialLinkLabel, { color: colors.text }]} numberOfLines={1}>
                {link.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* ─── 12.2 — Profile 3-Tab Bar ─────────────────────────── */}
      <View style={[styles.tabBar, { borderColor: colors.border }]}>
        {(['posts', 'about', 'projects'] as ProfileTab[]).map((tab) => {
          const active = profileTab === tab;
          const labels: Record<ProfileTab, string> = { posts: 'Posts', about: 'About', projects: 'Projects' };
          return (
            <Pressable
              key={tab}
              onPress={() => { Haptics.selectionAsync(); setProfileTab(tab); }}
              style={[styles.tabBtn, active && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
            >
              <Text style={[styles.tabBtnText, { color: active ? colors.tint : colors.textTertiary }]}>
                {labels[tab]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ─── 12.2 — Tab Content ────────────────────────────────── */}
      <View style={styles.tabContent}>
        {profileTab === 'posts' && (
          <>
            {postsQ.isLoading ? (
              <ActivityIndicator size="small" color={colors.tint} style={{ marginTop: 24 }} />
            ) : myPosts.length === 0 ? (
              <View style={styles.tabEmpty}>
                <Ionicons name="document-text-outline" size={40} color={colors.textTertiary} />
                <Text style={[styles.tabEmptyText, { color: colors.textSecondary }]}>No posts yet</Text>
                <Pressable onPress={() => router.push('/create-post')} style={[styles.tabEmptyBtn, { backgroundColor: colors.tint }]}>
                  <Text style={styles.tabEmptyBtnText}>Create Post</Text>
                </Pressable>
              </View>
            ) : (
              myPosts.map((post: any) => (
                <PostCard
                  key={String(post.id)}
                  post={post}
                  onPress={() => router.push(`/post/${post.id}` as any)}
                />
              ))
            )}
          </>
        )}

        {profileTab === 'about' && (
          <View style={styles.aboutSection}>
            {/* Education */}
            <View style={styles.aboutBlock}>
              <View style={styles.aboutBlockHeader}>
                <Ionicons name="school-outline" size={20} color={colors.tint} />
                <Text style={[styles.aboutBlockTitle, { color: colors.text }]}>Education</Text>
              </View>
              {educationList.length === 0 ? (
                <Text style={[styles.aboutEmpty, { color: colors.textTertiary }]}>No education added</Text>
              ) : (
                educationList.map((edu: EducationData, idx: number) => (
                  <View key={edu.id ?? idx} style={[styles.aboutEntry, { borderColor: colors.border }]}>
                    <Text style={[styles.aboutEntryTitle, { color: colors.text }]}>{edu.institution ?? 'Institution'}</Text>
                    {edu.degree && <Text style={[styles.aboutEntrySubtitle, { color: colors.textSecondary }]}>{edu.degree}{edu.field_of_study ? ` · ${edu.field_of_study}` : ''}</Text>}
                    {(edu.start_date || edu.end_date) && (
                      <Text style={[styles.aboutEntryDate, { color: colors.textTertiary }]}>
                        {edu.start_date ? new Date(edu.start_date).getFullYear() : '?'} – {edu.end_date ? new Date(edu.end_date).getFullYear() : 'Present'}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </View>

            {/* Experience */}
            <View style={styles.aboutBlock}>
              <View style={styles.aboutBlockHeader}>
                <Ionicons name="briefcase-outline" size={20} color={colors.tint} />
                <Text style={[styles.aboutBlockTitle, { color: colors.text }]}>Experience</Text>
              </View>
              {experienceList.length === 0 ? (
                <Text style={[styles.aboutEmpty, { color: colors.textTertiary }]}>No experience added</Text>
              ) : (
                experienceList.map((exp: ExperienceData, idx: number) => (
                  <View key={exp.id ?? idx} style={[styles.aboutEntry, { borderColor: colors.border }]}>
                    <Text style={[styles.aboutEntryTitle, { color: colors.text }]}>{exp.title ?? 'Position'}</Text>
                    {exp.company && <Text style={[styles.aboutEntrySubtitle, { color: colors.textSecondary }]}>{exp.company}{exp.location ? ` · ${exp.location}` : ''}</Text>}
                    {(exp.start_date || exp.end_date) && (
                      <Text style={[styles.aboutEntryDate, { color: colors.textTertiary }]}>
                        {exp.start_date ? new Date(exp.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '?'} – {exp.end_date ? new Date(exp.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Present'}
                      </Text>
                    )}
                    {exp.description && <Text style={[styles.aboutEntryDesc, { color: colors.textSecondary }]}>{exp.description}</Text>}
                  </View>
                ))
              )}
            </View>

            {/* Skills */}
            <View style={styles.aboutBlock}>
              <View style={styles.aboutBlockHeader}>
                <Ionicons name="flash-outline" size={20} color={colors.tint} />
                <Text style={[styles.aboutBlockTitle, { color: colors.text }]}>Skills</Text>
              </View>
              {skillsList.length === 0 ? (
                <Text style={[styles.aboutEmpty, { color: colors.textTertiary }]}>No skills added</Text>
              ) : (
                <View style={styles.skillChipsRow}>
                  {skillsList.map((skill: SkillData, idx: number) => (
                    <View key={skill.id ?? idx} style={[styles.skillChip, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '30' }]}>
                      <Text style={[styles.skillChipText, { color: colors.tint }]}>{skill.name}</Text>
                      {skill.level && <Text style={[styles.skillLevel, { color: colors.textTertiary }]}>{skill.level}</Text>}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {profileTab === 'projects' && (
          <>
            {!projectsData ? (
              <ActivityIndicator size="small" color={colors.tint} style={{ marginTop: 24 }} />
            ) : myProjects.length === 0 ? (
              <View style={styles.tabEmpty}>
                <Ionicons name="rocket-outline" size={40} color={colors.textTertiary} />
                <Text style={[styles.tabEmptyText, { color: colors.textSecondary }]}>No projects yet</Text>
                <Pressable onPress={() => router.push('/projects')} style={[styles.tabEmptyBtn, { backgroundColor: colors.tint }]}>
                  <Text style={styles.tabEmptyBtnText}>Browse Projects</Text>
                </Pressable>
              </View>
            ) : (
              myProjects.map((proj: any) => (
                <Pressable
                  key={proj.id}
                  onPress={() => router.push(`/project/${proj.id}` as any)}
                  style={({ pressed }) => [styles.projectCard, { backgroundColor: pressed ? colors.surfaceElevated : colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.projectCardHeader}>
                    <Text style={[styles.projectTitle, { color: colors.text }]} numberOfLines={1}>{proj.title}</Text>
                    {proj.status && (
                      <View style={[styles.projectStatus, { backgroundColor: proj.status === 'open' ? colors.success + '18' : colors.textTertiary + '18' }]}>
                        <Text style={[styles.projectStatusText, { color: proj.status === 'open' ? colors.success : colors.textTertiary }]}>{proj.status}</Text>
                      </View>
                    )}
                  </View>
                  {proj.description && <Text style={[styles.projectDesc, { color: colors.textSecondary }]} numberOfLines={2}>{proj.description}</Text>}
                  {proj.tech_stack && Array.isArray(proj.tech_stack) && proj.tech_stack.length > 0 && (
                    <View style={styles.techStackRow}>
                      {proj.tech_stack.slice(0, 4).map((tech: string, i: number) => (
                        <View key={i} style={[styles.techChip, { backgroundColor: colors.primary + '12' }]}>
                          <Text style={[styles.techChipText, { color: colors.primary }]}>{tech}</Text>
                        </View>
                      ))}
                      {proj.tech_stack.length > 4 && (
                        <Text style={[styles.techMore, { color: colors.textTertiary }]}>+{proj.tech_stack.length - 4}</Text>
                      )}
                    </View>
                  )}
                </Pressable>
              ))
            )}
          </>
        )}
      </View>

      {/* Phase 6 — Portfolio Link */}
      <Pressable
        onPress={() => { Haptics.selectionAsync(); router.push('/portfolio'); }}
        style={({ pressed }) => [
          styles.portfolioBanner,
          {
            backgroundColor: pressed ? colors.tint + '18' : colors.tint + '10',
            borderColor: colors.tint + '30',
          },
        ]}
      >
        <Ionicons name="briefcase-outline" size={20} color={colors.tint} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.portfolioTitle, { color: colors.text }]}>Portfolio</Text>
          <Text style={[styles.portfolioSubtitle, { color: colors.textSecondary }]}>
            Manage your public portfolio page
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </Pressable>

      <View style={styles.menuSection}>
        {MENU_ITEMS.map((item) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [
              styles.menuItem,
              { backgroundColor: pressed ? colors.surfaceElevated : colors.surface, borderColor: colors.border },
            ]}
            onPress={() => { Haptics.selectionAsync(); item.onPress?.(); }}
          >
            <View style={[styles.menuIconBg, { backgroundColor: item.color + '15' }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        ))}

        <Pressable
          style={({ pressed }) => [
            styles.menuItem,
            styles.logoutItem,
            { backgroundColor: pressed ? colors.error + '10' : 'transparent', borderColor: colors.border },
          ]}
          onPress={handleLogout}
        >
          <View style={[styles.menuIconBg, { backgroundColor: colors.error + '15' }]}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
          </View>
          <Text style={[styles.menuLabel, { color: colors.error }]}>Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBg: { paddingBottom: 24 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerIconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  profileSection: { alignItems: 'center', paddingTop: 12, gap: 6 },
  name: { fontSize: 24, fontWeight: '800', marginTop: 8, fontFamily: 'Inter_800ExtraBold' },
  username: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  bio: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, marginTop: 4, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  statsRow: { flexDirection: 'row', marginTop: 20, marginHorizontal: 16, borderRadius: 14, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statNum: { fontSize: 18, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  statLabel: { fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' },
  statDivider: { width: 1, marginVertical: 10 },
  menuSection: { paddingHorizontal: 16, paddingTop: 20, gap: 8 },
  socialLinksContainer: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, paddingTop: 16,
  },
  socialLinkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
  },
  socialLinkLabel: { fontSize: 13, fontWeight: '500', fontFamily: 'Inter_600SemiBold' },
  portfolioBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginTop: 16,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  portfolioTitle: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  portfolioSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  completionBanner: {
    marginHorizontal: 16, marginTop: 16, padding: 14, borderRadius: 14, borderWidth: 1,
  },
  completionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  completionText: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  completionHint: { fontSize: 13, marginTop: 4, marginLeft: 28, fontFamily: 'Inter_400Regular' },
  completionBar: { height: 4, borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  completionFill: { height: '100%', borderRadius: 2 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14,
    borderWidth: 1, gap: 12,
  },
  menuIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  logoutItem: { marginTop: 12, borderWidth: 0 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  /* ─── 12.2 — Tab Bar ─────────────────────────────────────── */
  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1,
    marginTop: 16, marginHorizontal: 16,
  },
  tabBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  tabContent: { minHeight: 200, paddingHorizontal: 16, paddingTop: 12 },
  tabEmpty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  tabEmptyText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  tabEmptyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 6 },
  tabEmptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  /* ─── About section ────────────────────────────────────── */
  aboutSection: { gap: 20 },
  aboutBlock: { gap: 8 },
  aboutBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  aboutBlockTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  aboutEmpty: { fontSize: 13, fontFamily: 'Inter_400Regular', marginLeft: 28 },
  aboutEntry: { marginLeft: 28, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
  aboutEntryTitle: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  aboutEntrySubtitle: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  aboutEntryDate: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  aboutEntryDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 4, lineHeight: 19 },
  skillChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginLeft: 28 },
  skillChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  skillChipText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  skillLevel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  /* ─── Project cards ──────────────────────────────────────── */
  projectCard: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  projectCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  projectTitle: { flex: 1, fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  projectStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  projectStatusText: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', textTransform: 'capitalize' },
  projectDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 6, lineHeight: 19 },
  techStackRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  techChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  techChipText: { fontSize: 11, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  techMore: { fontSize: 11, fontFamily: 'Inter_400Regular', alignSelf: 'center' },
});
