/**
 * Project Detail Screen � Phase 14.1
 *
 * Full project detail with cover image, owner info, tech stack, team members,
 * open roles with apply, owner actions (manage applications, close/delete),
 * dates, remote indicator, and realtime subscription.
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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import {
  getProject,
  getProjectRoles,
  getProjectTeamMembers,
  getApplicationsForProject,
  applyForRole,
  updateProjectApplicationStatus,
  updateProjectStatus,
  deleteProject,
} from '@/lib/api/projects';
import type {
  Project,
  ProjectRole,
  ProjectApplication,
  TeamMember,
} from '@/lib/api/projects';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { useRealtimeMultiSubscription } from '@/lib/hooks/useRealtimeSubscription';
import { QUERY_KEYS } from '@/lib/query-keys';
import { CHANNELS } from '@/lib/channels';
import { Avatar } from '@/components/Avatar';

// helpers

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function relativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: '#22c55e20', text: '#22c55e' },
  in_progress: { bg: '#3b82f620', text: '#3b82f6' },
  draft: { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.4)' },
  closed: { bg: '#ef444420', text: '#ef4444' },
  archived: { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.4)' },
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  draft: 'Draft',
  closed: 'Closed',
  archived: 'Archived',
};

// Role Card

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
  const filled = (role as any).spots_filled ?? (role as any).filled_count ?? 0;
  const total = (role as any).spots_total ?? (role as any).count ?? 1;
  const isFull = filled >= total;
  const roleStatus = (role as any).status as string | undefined;

  return (
    <View style={[styles.roleCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.roleTitle, { color: colors.text }]}>{(role as any).title}</Text>
        {(role as any).description && (
          <Text style={[styles.roleDesc, { color: colors.textSecondary }]} numberOfLines={2}>
            {(role as any).description}
          </Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <Text style={[styles.roleSlots, { color: colors.textTertiary }]}>
            {filled}/{total} filled
          </Text>
          {roleStatus && roleStatus !== 'open' && (
            <View style={[styles.miniStatusBadge, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
              <Text style={{ fontSize: 10, color: colors.textTertiary, fontFamily: fontFamily.regular }}>
                {roleStatus}
              </Text>
            </View>
          )}
        </View>
      </View>
      {canApply && !isFull && (roleStatus === 'open' || roleStatus === 'interviewing') && (
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

// Team Member Card

const TeamMemberCard = React.memo(function TeamMemberCard({
  member,
  colors,
}: {
  member: TeamMember;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Pressable
      onPress={() => router.push(`/user/${member.user_id}` as any)}
      style={[styles.memberCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
    >
      <Avatar
        uri={member.profile?.avatar_url}
        name={member.profile?.full_name}
        size="sm"
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
          {member.profile?.full_name ?? 'Unknown'}
        </Text>
        <Text style={[styles.memberRole, { color: colors.textTertiary }]} numberOfLines={1}>
          {member.is_owner ? 'Owner' : member.role_name ?? member.profile?.role ?? 'Member'}
        </Text>
      </View>
      {member.is_owner && (
        <View style={[styles.ownerBadge, { backgroundColor: colors.warning + '20' }]}>
          <Ionicons name="star" size={10} color={colors.warning} />
          <Text style={{ fontSize: 10, color: colors.warning, fontFamily: fontFamily.semiBold }}>Owner</Text>
        </View>
      )}
    </Pressable>
  );
});

// Application Card (Owner view)

const ApplicationCard = React.memo(function ApplicationCard({
  app,
  colors,
  onAccept,
  onReject,
  isPending,
}: {
  app: ProjectApplication;
  colors: ReturnType<typeof useThemeColors>;
  onAccept: () => void;
  onReject: () => void;
  isPending: boolean;
}) {
  const appStatus = (app as any).status as string;
  return (
    <View style={[styles.appCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        <Avatar
          uri={app.applicant?.avatar_url}
          name={app.applicant?.full_name}
          size="sm"
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
            {app.applicant?.full_name ?? 'Unknown'}
          </Text>
          {app.role && (
            <Text style={[styles.memberRole, { color: colors.textTertiary }]} numberOfLines={1}>
              Applied for: {(app.role as any).title}
            </Text>
          )}
          {(app as any).message && (
            <Text style={[styles.memberRole, { color: colors.textSecondary }]} numberOfLines={2}>
              {(app as any).message}
            </Text>
          )}
        </View>
      </View>
      {appStatus === 'applied' ? (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
          <Pressable
            onPress={onAccept}
            disabled={isPending}
            style={[styles.actionBtn, { backgroundColor: colors.success }]}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={14} color="#fff" />
                <Text style={styles.actionBtnText}>Accept</Text>
              </>
            )}
          </Pressable>
          <Pressable
            onPress={onReject}
            disabled={isPending}
            style={[styles.actionBtn, { backgroundColor: colors.error }]}
          >
            <Ionicons name="close" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Reject</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.miniStatusBadge, { backgroundColor: appStatus === 'accepted' ? '#22c55e20' : '#ef444420', marginTop: 8 }]}>
          <Text style={{ fontSize: 11, color: appStatus === 'accepted' ? '#22c55e' : '#ef4444', fontFamily: fontFamily.semiBold, textTransform: 'capitalize' }}>
            {appStatus}
          </Text>
        </View>
      )}
    </View>
  );
});

// Screen

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
  const [showApplications, setShowApplications] = useState(false);

  // Queries

  const projectQ = useQuery({
    queryKey: [...QUERY_KEYS.projects, 'detail', id],
    queryFn: () => getProject(id!),
    enabled: !!id,
  });

  const rolesQ = useQuery({
    queryKey: [...QUERY_KEYS.projects, id, 'roles'],
    queryFn: () => getProjectRoles(id!),
    enabled: !!id,
  });

  const teamQ = useQuery({
    queryKey: [...QUERY_KEYS.projects, id, 'team'],
    queryFn: () => getProjectTeamMembers(id!),
    enabled: !!id,
  });

  const project = (projectQ.data as any)?.data as Project | undefined ?? projectQ.data as Project | undefined;
  const roles = ((rolesQ.data as any)?.data ?? rolesQ.data ?? []) as ProjectRole[];
  const teamMembers = ((teamQ.data as any)?.data ?? teamQ.data ?? []) as TeamMember[];
  const isOwner = project?.owner_id === userId;

  const applicationsQ = useQuery({
    queryKey: [...QUERY_KEYS.projects, id, 'applications'],
    queryFn: () => getApplicationsForProject(id!, userId),
    enabled: !!id && isOwner && showApplications,
  });

  const applications = ((applicationsQ.data as any)?.data ?? applicationsQ.data ?? []) as ProjectApplication[];

  // Realtime

  useRealtimeMultiSubscription({
    channelName: CHANNELS.projectDetail(id ?? ''),
    subscriptions: [
      {
        table: 'collab_projects',
        event: '*',
        filter: `id=eq.${id}`,
        onPayload: () => {
          queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.projects, 'detail', id] });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
        },
      },
      {
        table: 'collab_project_roles',
        event: '*',
        filter: `project_id=eq.${id}`,
        onPayload: () => {
          queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.projects, id, 'roles'] });
        },
      },
      {
        table: 'collab_team_members',
        event: '*',
        filter: `project_id=eq.${id}`,
        onPayload: () => {
          queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.projects, id, 'team'] });
          queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.projects, 'detail', id] });
        },
      },
      {
        table: 'collab_project_applications',
        event: '*',
        filter: `project_id=eq.${id}`,
        onPayload: () => {
          queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.projects, id, 'applications'] });
        },
      },
    ],
    enabled: !!id,
  });

  // Mutations

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
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.projects, 'detail', id] });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.projects, id, 'roles'] });
      Alert.alert('Applied!', 'Your application has been submitted.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message ?? 'Could not apply');
    },
  });

  const updateAppMut = useMutation({
    mutationFn: (params: { applicationId: string; status: string }) =>
      updateProjectApplicationStatus({
        applicationId: params.applicationId,
        ownerId: userId,
        status: params.status,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.projects, id, 'applications'] });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.projects, id, 'team'] });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.projects, 'detail', id] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message ?? 'Could not update application');
    },
  });

  const statusMut = useMutation({
    mutationFn: (newStatus: string) =>
      updateProjectStatus({ projectId: id!, ownerId: userId, status: newStatus }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.projects, 'detail', id] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message ?? 'Could not update status');
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteProject({ projectId: id!, ownerId: userId }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message ?? 'Could not delete project');
    },
  });

  // Handlers

  const handleShareProject = useCallback(async () => {
    if (!project) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `${project.title} - Check out this project on Clstr!\nhttps://clstr.network/project/${id}`,
        url: `https://clstr.network/project/${id}`,
      });
    } catch {}
  }, [project, id]);

  const handleCloseProject = useCallback(() => {
    const pStatus = (project as any)?.status as string;
    const newStatus = pStatus === 'closed' ? 'open' : 'closed';
    Alert.alert(
      newStatus === 'closed' ? 'Close Project?' : 'Reopen Project?',
      newStatus === 'closed'
        ? 'This will stop accepting new applications.'
        : 'This will reopen the project for applications.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => statusMut.mutate(newStatus) },
      ],
    );
  }, [project, statusMut]);

  const handleDeleteProject = useCallback(() => {
    Alert.alert('Delete Project?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMut.mutate() },
    ]);
  }, [deleteMut]);

  // Loading / Error

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
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: colors.primary, fontFamily: fontFamily.semiBold }}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const projectStatus = (project as any).status as string;
  const statusStyle = STATUS_COLORS[projectStatus] ?? STATUS_COLORS.draft;
  const projectType = (project as any).project_type as string | undefined;
  const startsOn = (project as any).starts_on as string | undefined;
  const endsOn = (project as any).ends_on as string | undefined;
  const isRemote = (project as any).is_remote as boolean | undefined;
  const heroImage = (project as any).hero_image_url as string | undefined;
  const summary = (project as any).summary as string | undefined;
  const tags = ((project as any).tags ?? []) as string[];
  const skills = ((project as any).skills ?? []) as string[];
  const techStack = (project.tech_stack ?? []) as string[];
  const teamSizeCurrent = (project as any).team_size_current as number | undefined;
  const teamSizeTarget = ((project as any).team_size_target ?? project.max_team_size) as number | undefined;
  const createdAt = (project as any).created_at as string | undefined;

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
        {/* Cover Image */}
        {heroImage && (
          <Image
            source={{ uri: heroImage }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        )}

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>{project.title}</Text>

        {/* Meta Row */}
        <View style={styles.metaRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {STATUS_LABELS[projectStatus] ?? projectStatus}
            </Text>
          </View>
          {projectType && projectType !== 'other' && (
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
              <Text style={[styles.statusText, { color: colors.textSecondary, textTransform: 'capitalize' }]}>
                {projectType.replace('_', ' ')}
              </Text>
            </View>
          )}
          {isRemote !== undefined && (
            <View style={[styles.statusBadge, { backgroundColor: isRemote ? '#8b5cf620' : 'rgba(255,255,255,0.06)' }]}>
              <Ionicons
                name={isRemote ? 'globe-outline' : 'location-outline'}
                size={12}
                color={isRemote ? '#8b5cf6' : colors.textTertiary}
              />
              <Text style={[styles.statusText, { color: isRemote ? '#8b5cf6' : colors.textTertiary }]}>
                {isRemote ? 'Remote' : 'On-site'}
              </Text>
            </View>
          )}
          {teamSizeTarget && (
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              {teamSizeCurrent ?? 1}/{teamSizeTarget} members
            </Text>
          )}
        </View>

        {/* Dates */}
        {(startsOn || endsOn) && (
          <View style={[styles.dateRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
            {startsOn && (
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                Starts: {formatDate(startsOn)}
              </Text>
            )}
            {startsOn && endsOn && <Text style={{ color: colors.textTertiary }}>.</Text>}
            {endsOn && (
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                Ends: {formatDate(endsOn)}
              </Text>
            )}
          </View>
        )}

        {/* Owner Info */}
        {project.owner && (
          <Pressable
            onPress={() => router.push(`/user/${project.owner!.id}` as any)}
            style={[styles.ownerRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
          >
            <Avatar uri={project.owner.avatar_url} name={project.owner.full_name} size="md" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.ownerName, { color: colors.text }]}>
                {project.owner.full_name}
              </Text>
              <Text style={[styles.ownerLabel, { color: colors.textTertiary }]}>
                Project Owner
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        )}

        {/* Created */}
        {createdAt && (
          <Text style={[styles.createdText, { color: colors.textTertiary }]}>
            Created {relativeTime(createdAt)}
          </Text>
        )}

        {/* Summary */}
        {summary && summary !== project.title && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Summary</Text>
            <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>{summary}</Text>
          </View>
        )}

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
        {techStack.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tech Stack</Text>
            <View style={styles.tagsRow}>
              {techStack.map((tech: string, idx: number) => (
                <View key={idx} style={[styles.tag, { backgroundColor: colors.tint + '20' }]}>
                  <Text style={[styles.tagText, { color: '#60a5fa' }]}>{tech}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Skills Needed</Text>
            <View style={styles.tagsRow}>
              {skills.map((skill: string, idx: number) => (
                <View key={idx} style={[styles.tag, { backgroundColor: colors.accent + '20' }]}>
                  <Text style={[styles.tagText, { color: '#a78bfa' }]}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tags</Text>
            <View style={styles.tagsRow}>
              {tags.map((t: string, idx: number) => (
                <View key={idx} style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[styles.tagText, { color: colors.textSecondary }]}>#{t}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Team Members */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Team Members{teamMembers.length > 0 ? ` (${teamMembers.length})` : ''}
          </Text>
          {teamQ.isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : teamMembers.length === 0 ? (
            <Text style={[styles.sectionBody, { color: colors.textTertiary }]}>
              No team members yet
            </Text>
          ) : (
            <View style={{ gap: 6 }}>
              {teamMembers.map((member) => (
                <TeamMemberCard key={member.id} member={member} colors={colors} />
              ))}
            </View>
          )}
        </View>

        {/* Open Roles */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Open Roles{roles.length > 0 ? ` (${roles.length})` : ''}
          </Text>
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
                  canApply={canApplyToProjects && !isOwner}
                  onApply={(roleId) => setApplyingRoleId(roleId)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Apply Section */}
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
                  <Text style={styles.submitBtnText}>Submit Application</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Owner Actions */}
        {isOwner && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Owner Actions</Text>

            {/* Manage Applications */}
            <Pressable
              onPress={() => setShowApplications((v) => !v)}
              style={[styles.ownerActionBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
            >
              <Ionicons name="people-outline" size={18} color={colors.primary} />
              <Text style={[styles.ownerActionBtnText, { color: colors.text }]}>
                Manage Applications
              </Text>
              <Ionicons
                name={showApplications ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textTertiary}
              />
            </Pressable>

            {showApplications && (
              <View style={{ gap: 8, marginTop: 8 }}>
                {applicationsQ.isLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : applications.length === 0 ? (
                  <Text style={[styles.sectionBody, { color: colors.textTertiary }]}>
                    No applications yet
                  </Text>
                ) : (
                  applications.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      app={app}
                      colors={colors}
                      isPending={updateAppMut.isPending}
                      onAccept={() =>
                        updateAppMut.mutate({ applicationId: app.id, status: 'accepted' })
                      }
                      onReject={() =>
                        updateAppMut.mutate({ applicationId: app.id, status: 'rejected' })
                      }
                    />
                  ))
                )}
              </View>
            )}

            {/* Close / Reopen Project */}
            <Pressable
              onPress={handleCloseProject}
              disabled={statusMut.isPending}
              style={[
                styles.ownerActionBtn,
                {
                  backgroundColor: projectStatus === 'closed' ? '#22c55e15' : '#f9731615',
                  borderColor: projectStatus === 'closed' ? '#22c55e40' : '#f9731640',
                  marginTop: 8,
                },
              ]}
            >
              <Ionicons
                name={projectStatus === 'closed' ? 'lock-open-outline' : 'lock-closed-outline'}
                size={18}
                color={projectStatus === 'closed' ? '#22c55e' : '#f97316'}
              />
              <Text
                style={[
                  styles.ownerActionBtnText,
                  { color: projectStatus === 'closed' ? '#22c55e' : '#f97316' },
                ]}
              >
                {projectStatus === 'closed' ? 'Reopen Project' : 'Close Project'}
              </Text>
            </Pressable>

            {/* Delete Project */}
            <Pressable
              onPress={handleDeleteProject}
              disabled={deleteMut.isPending}
              style={[styles.ownerActionBtn, { backgroundColor: colors.error + '15', borderColor: colors.error + '40', marginTop: 8 }]}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={[styles.ownerActionBtnText, { color: colors.error }]}>
                Delete Project
              </Text>
            </Pressable>
          </View>
        )}

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// Styles

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
  coverImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  title: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    lineHeight: fontSize.xl * 1.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
  },
  metaText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  dateText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  ownerName: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
  },
  ownerLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    marginTop: 1,
  },
  createdText: {
    fontSize: fontSize.xs,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
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
  },
  miniStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  memberName: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
  },
  memberRole: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    marginTop: 1,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  appCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
  },
  applySection: {
    borderRadius: 12,
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
  ownerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  ownerActionBtnText: {
    flex: 1,
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
