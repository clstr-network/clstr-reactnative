/**
 * Project Detail Screen — Phase 9.5
 *
 * View project details, open roles, and apply.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
  TextInput,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { getProject, getProjectRoles, applyForRole } from '@/lib/api/projects';
import type { Project, ProjectRole } from '@/lib/api/projects';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { QUERY_KEYS } from '@/lib/query-keys';

// ─── Role Card ───────────────────────────────────────────────

const RoleCard = React.memo(function RoleCard({
  role,
  colors,
  canApply,
  onApply,
}: {
  role: ProjectRole;
  colors: ReturnType<typeof useThemeColors>;
  canApply: boolean;
  onApply: (roleId: string) => void;
}) {
  const filled = role.filled_count ?? 0;
  const total = role.count ?? 1;
  const isFull = filled >= total;

  return (
    <View style={[styles.roleCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.roleTitle, { color: colors.text }]}>{role.title}</Text>
        {role.description && (
          <Text style={[styles.roleDesc, { color: colors.textSecondary }]} numberOfLines={2}>
            {role.description}
          </Text>
        )}
        <Text style={[styles.roleSlots, { color: colors.textTertiary }]}>
          {filled}/{total} filled
        </Text>
      </View>
      {canApply && !isFull && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onApply(role.id);
          }}
          style={[styles.applyRoleBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.applyRoleBtnText}>Apply</Text>
        </Pressable>
      )}
    </View>
  );
});

// ─── Screen ──────────────────────────────────────────────────

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { identity, collegeDomain } = useIdentityContext();
  const userId = identity?.user_id ?? '';
  const { canApplyToProjects } = useFeatureAccess();
  const [applyingRoleId, setApplyingRoleId] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState('');

  const projectQ = useQuery({
    queryKey: [...QUERY_KEYS.projects, id],
    queryFn: () => getProject(id!),
    enabled: !!id,
  });

  const rolesQ = useQuery({
    queryKey: [...QUERY_KEYS.projects, id, 'roles'],
    queryFn: () => getProjectRoles(id!),
    enabled: !!id,
  });

  const project = projectQ.data as Project | undefined;
  const roles = (rolesQ.data ?? []) as ProjectRole[];

  const handleShareProject = useCallback(async () => {
    if (!project) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `${project.title} — Check out this project on Clstr!\nhttps://clstr.network/project/${id}`,
        url: `https://clstr.network/project/${id}`,
      });
    } catch {}
  }, [project, id]);

  const applyMut = useMutation({
    mutationFn: () =>
      applyForRole({
        projectId: id!,
        roleId: applyingRoleId!,
        applicantId: userId,
        message: applyMessage || '',
        collegeDomain: collegeDomain ?? '',
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setApplyingRoleId(null);
      setApplyMessage('');
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.projects, id] });
      Alert.alert('Applied!', 'Your application has been submitted.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message ?? 'Could not apply');
    },
  });

  if (projectQ.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!project) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Project not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8), borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          Project Details
        </Text>
        <Pressable onPress={handleShareProject} hitSlop={8}>
          <Ionicons name="share-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title + Status */}
        <Text style={[styles.title, { color: colors.text }]}>{project.title}</Text>

        <View style={styles.metaRow}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  project.status === 'active' ? '#22c55e20' : colors.surfaceSecondary,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: project.status === 'active' ? '#22c55e' : colors.textTertiary,
                },
              ]}
            >
              {project.status}
            </Text>
          </View>
          {project.max_team_size && (
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              Team up to {project.max_team_size}
            </Text>
          )}
        </View>

        {/* Description */}
        {project.description && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
            <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>
              {project.description}
            </Text>
          </View>
        )}

        {/* Tech Stack */}
        {project.tech_stack && project.tech_stack.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tech Stack</Text>
            <View style={styles.tagsRow}>
              {project.tech_stack.map((tech: string, idx: number) => (
                <View key={idx} style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tech}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Roles */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Open Roles</Text>
          {rolesQ.isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : roles.length === 0 ? (
            <Text style={[styles.sectionBody, { color: colors.textTertiary }]}>
              No open roles listed
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {roles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  colors={colors}
                  canApply={canApplyToProjects}
                  onApply={(roleId) => setApplyingRoleId(roleId)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Apply Modal-like section */}
        {applyingRoleId && (
          <View style={[styles.applySection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Apply for this role</Text>
            <TextInput
              value={applyMessage}
              onChangeText={setApplyMessage}
              placeholder="Why are you a good fit? (optional)"
              placeholderTextColor={colors.textTertiary}
              multiline
              style={[
                styles.applyInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
              ]}
            />
            <View style={styles.applyActions}>
              <Pressable
                onPress={() => setApplyingRoleId(null)}
                style={[styles.cancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => applyMut.mutate()}
                disabled={applyMut.isPending}
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              >
                {applyMut.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
    maxWidth: '70%',
  },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 40 },
  title: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    lineHeight: fontSize.xl * 1.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
    textTransform: 'capitalize',
  },
  metaText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
  },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
  },
  sectionBody: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    lineHeight: fontSize.base * 1.5,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  roleTitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
  },
  roleDesc: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  roleSlots: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    marginTop: 4,
  },
  applyRoleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  applyRoleBtnText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
  },
  applySection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  applyInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
  },
  applyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelBtn: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
  },
  submitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
  },
});
