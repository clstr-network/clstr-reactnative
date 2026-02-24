/**
 * Projects / CollabHub Screen — Phase 9.5 + 12.6
 *
 * Browse open projects, team-ups, own projects, and manage applications.
 * Tabs: Explore / My Projects / Team-Ups / Requests
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  Switch,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { default as Avatar } from '@/components/Avatar';
import {
  getProjects,
  getMyProjects,
  createProject,
  applyForRole,
  getOwnerApplications,
  updateProjectApplicationStatus,
} from '@/lib/api/projects';
import type {
  Project,
  ProjectApplicationWithProject,
  CreateProjectParams,
  ApplyForRoleParams,
  UpdateApplicationStatusParams,
} from '@/lib/api/projects';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { QUERY_KEYS } from '@/lib/query-keys';
import { useRealtimeMultiSubscription } from '@/lib/hooks/useRealtimeSubscription';
import { CHANNELS } from '@/lib/channels';

type TabKey = 'explore' | 'mine' | 'teamups' | 'requests';

// ─── Project Card ────────────────────────────────────────────

const ProjectCard = React.memo(function ProjectCard({
  project,
  colors,
  onApply,
}: {
  project: Project;
  colors: ReturnType<typeof useThemeColors>;
  onApply?: (projectId: string, projectTitle: string) => void;
}) {
  const statusColor =
    project.status === 'active'
      ? '#22c55e'
      : project.status === 'completed'
        ? colors.primary
        : colors.textTertiary;

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/project/${project.id}`);
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { backgroundColor: colors.surfaceHover },
      ]}
    >
      <View style={styles.cardHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
            {project.title}
          </Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </View>

      {project.description && (
        <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {project.description}
        </Text>
      )}

      {/* Tech stack tags */}
      {project.tech_stack && project.tech_stack.length > 0 && (
        <View style={styles.tagsRow}>
          {project.tech_stack.slice(0, 5).map((tech: string, idx: number) => (
            <View key={idx} style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tech}</Text>
            </View>
          ))}
          {project.tech_stack.length > 5 && (
            <View style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.tagText, { color: colors.textTertiary }]}>
                +{project.tech_stack.length - 5}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.footerRow}>
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          {project.status === 'active' ? 'Recruiting' : project.status}
        </Text>
        {(project as any).team_members_count != null && (
          <View style={styles.teamCountRow}>
            <Ionicons name="people-outline" size={12} color={colors.textTertiary} />
            <Text style={[styles.footerText, { color: colors.textTertiary }]}>
              {(project as any).team_members_count}{project.max_team_size ? `/${project.max_team_size}` : ''} members
            </Text>
          </View>
        )}
        {(project as any).team_members_count == null && project.max_team_size && (
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            Team: up to {project.max_team_size}
          </Text>
        )}
      </View>
      {/* 12.6 — Apply button */}
      {project.status === 'active' && onApply && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onApply(project.id, project.title);
          }}
          style={[styles.applyCardBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="hand-left-outline" size={14} color="#fff" />
          <Text style={styles.applyCardBtnText}>Apply</Text>
        </Pressable>
      )}
    </Pressable>
  );
});

// ─── Application Card (12.6) ──────────────────────────────────

const ApplicationCard = React.memo(function ApplicationCard({
  app,
  colors,
  onAccept,
  onReject,
}: {
  app: ProjectApplicationWithProject;
  colors: ReturnType<typeof useThemeColors>;
  onAccept: () => void;
  onReject: () => void;
}) {
  const statusColor =
    app.status === 'accepted' ? '#22c55e' : app.status === 'rejected' ? colors.error : colors.warning;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.appApplicantRow}>
          <Avatar
            uri={(app.applicant as any)?.avatar_url}
            name={(app.applicant as any)?.full_name ?? 'Applicant'}
            size="sm"
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {(app.applicant as any)?.full_name ?? 'Unknown'}
            </Text>
            {(app as any).project?.title && (
              <Text style={[styles.appProject, { color: colors.textSecondary }]} numberOfLines={1}>
                for {(app as any).project.title}
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.appStatusBadge, { backgroundColor: statusColor + '18' }]}>
          <Text style={[styles.appStatusText, { color: statusColor }]}>{app.status}</Text>
        </View>
      </View>
      {app.message && (
        <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={3}>
          {app.message}
        </Text>
      )}
      {(app.role as any)?.title && (
        <Text style={[styles.appRoleLabel, { color: colors.tint }]}>
          Role: {(app.role as any).title}
        </Text>
      )}
      {app.status === 'applied' && (
        <View style={styles.appActions}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAccept(); }}
            style={[styles.appActionBtn, { backgroundColor: '#22c55e' }]}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.appActionText}>Accept</Text>
          </Pressable>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onReject(); }}
            style={[styles.appActionBtn, { backgroundColor: colors.error }]}
          >
            <Ionicons name="close" size={16} color="#fff" />
            <Text style={styles.appActionText}>Reject</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
});

// ─── Screen ──────────────────────────────────────────────────

export default function ProjectsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { identity, collegeDomain } = useIdentityContext();
  const userId = identity?.user_id ?? '';
  const { canViewProjects, canCreateProjects } = useFeatureAccess();
  const [tab, setTab] = useState<TabKey>('explore');
  const [projectSearch, setProjectSearch] = useState('');
  // 12.6 — Modal states
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTeamUp, setShowCreateTeamUp] = useState(false);
  const [showApply, setShowApply] = useState<{ projectId: string; projectTitle: string } | null>(null);
  // 12.6 — Create Project form
  const [cpTitle, setCpTitle] = useState('');
  const [cpSummary, setCpSummary] = useState('');
  const [cpDescription, setCpDescription] = useState('');
  const [cpCategory, setCpCategory] = useState('');
  const [cpSkills, setCpSkills] = useState('');
  const [cpTags, setCpTags] = useState('');
  const [cpTeamSize, setCpTeamSize] = useState('');
  const [cpIsRemote, setCpIsRemote] = useState(false);
  const [cpLocation, setCpLocation] = useState('');
  // 12.6 — Create Team-Up form
  const [tuTitle, setTuTitle] = useState('');
  const [tuDescription, setTuDescription] = useState('');
  const [tuEventType, setTuEventType] = useState('hackathon');
  const [tuSkills, setTuSkills] = useState('');
  const [tuTeamSize, setTuTeamSize] = useState('');
  const [tuDeadline, setTuDeadline] = useState('');
  // 12.6 — Apply form
  const [applyMessage, setApplyMessage] = useState('');
  const [applySkills, setApplySkills] = useState('');
  const [applyAvailability, setApplyAvailability] = useState('');

  // Phase 13.6 — Realtime projects subscription
  useRealtimeMultiSubscription({
    channelName: CHANNELS.projects(collegeDomain ?? '', userId),
    subscriptions: [
      {
        table: 'collab_projects',
        event: '*',
        filter: collegeDomain ? `college_domain=eq.${collegeDomain}` : undefined,
        onPayload: () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
        },
      },
      {
        table: 'collab_project_roles',
        event: '*',
        onPayload: () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
        },
      },
      {
        table: 'collab_team_members',
        event: '*',
        onPayload: () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
        },
      },
      {
        table: 'collab_project_applications',
        event: '*',
        onPayload: () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
        },
      },
    ],
    enabled: !!userId && !!collegeDomain,
  });

  const exploreQ = useQuery({
    queryKey: [...QUERY_KEYS.projects, 'explore', collegeDomain],
    queryFn: () =>
      getProjects({
        collegeDomain: collegeDomain ?? '',
        filters: { status: ['active'] },
      }),
    enabled: tab === 'explore' && canViewProjects,
    staleTime: 30_000,
  });

  const myQ = useQuery({
    queryKey: [...QUERY_KEYS.projects, 'mine', userId],
    queryFn: () => getMyProjects(userId),
    enabled: tab === 'mine' && !!userId,
    staleTime: 30_000,
  });

  // 12.6 — Team-Ups (projects with project_type = 'team_up')
  const teamUpsQ = useQuery({
    queryKey: [...QUERY_KEYS.projects, 'teamups', collegeDomain],
    queryFn: () =>
      getProjects({
        collegeDomain: collegeDomain ?? '',
        filters: { status: ['active'], category: 'team_up' },
      }),
    enabled: tab === 'teamups' && canViewProjects,
    staleTime: 30_000,
  });

  // 12.6 — Owner applications (requests tab)
  const requestsQ = useQuery({
    queryKey: [...QUERY_KEYS.projects, 'requests', userId],
    queryFn: () => getOwnerApplications(userId),
    enabled: tab === 'requests' && !!userId,
    staleTime: 30_000,
  });

  // 12.6 — Mutations
  const createProjectMut = useMutation({
    mutationFn: (params: CreateProjectParams) => createProject(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      setShowCreateProject(false);
      resetCreateProject();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => Alert.alert('Error', 'Failed to create project'),
  });

  const createTeamUpMut = useMutation({
    mutationFn: (params: CreateProjectParams) => createProject(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      setShowCreateTeamUp(false);
      resetCreateTeamUp();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => Alert.alert('Error', 'Failed to create team-up'),
  });

  const applyMut = useMutation({
    mutationFn: (params: ApplyForRoleParams) => applyForRole(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      setShowApply(null);
      setApplyMessage('');
      setApplySkills('');
      setApplyAvailability('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => Alert.alert('Error', 'Failed to submit application'),
  });

  const updateAppStatusMut = useMutation({
    mutationFn: (params: UpdateApplicationStatusParams) => updateProjectApplicationStatus(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.projects, 'requests'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const resetCreateProject = () => {
    setCpTitle(''); setCpSummary(''); setCpDescription(''); setCpCategory('');
    setCpSkills(''); setCpTags(''); setCpTeamSize(''); setCpIsRemote(false); setCpLocation('');
  };
  const resetCreateTeamUp = () => {
    setTuTitle(''); setTuDescription(''); setTuEventType('hackathon');
    setTuSkills(''); setTuTeamSize(''); setTuDeadline('');
  };

  const handleCreateProject = () => {
    if (!cpTitle.trim() || !cpDescription.trim()) {
      Alert.alert('Required', 'Title and description are required');
      return;
    }
    createProjectMut.mutate({
      title: cpTitle.trim(),
      description: cpDescription.trim(),
      summary: cpSummary.trim() || undefined,
      category: cpCategory.trim() || undefined,
      project_type: 'project',
      skills: cpSkills ? cpSkills.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      tags: cpTags ? cpTags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      team_size_target: cpTeamSize ? parseInt(cpTeamSize, 10) : undefined,
      is_remote: cpIsRemote,
      location: cpLocation.trim() || undefined,
      userId,
      collegeDomain: collegeDomain ?? '',
    });
  };

  const handleCreateTeamUp = () => {
    if (!tuTitle.trim() || !tuDescription.trim()) {
      Alert.alert('Required', 'Title and description are required');
      return;
    }
    createTeamUpMut.mutate({
      title: tuTitle.trim(),
      description: tuDescription.trim(),
      project_type: 'team_up',
      category: tuEventType,
      skills: tuSkills ? tuSkills.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      team_size_target: tuTeamSize ? parseInt(tuTeamSize, 10) : undefined,
      ends_on: tuDeadline.trim() || undefined,
      userId,
      collegeDomain: collegeDomain ?? '',
    });
  };

  const handleApply = () => {
    if (!showApply || !applyMessage.trim()) {
      Alert.alert('Required', 'Please include a message');
      return;
    }
    applyMut.mutate({
      projectId: showApply.projectId,
      roleId: null,
      applicantId: userId,
      message: applyMessage.trim(),
      skills: applySkills ? applySkills.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      availability: applyAvailability.trim() || undefined,
      collegeDomain: collegeDomain ?? '',
    });
  };

  // Active tab data
  const activeQuery = tab === 'explore' ? exploreQ : tab === 'mine' ? myQ : tab === 'teamups' ? teamUpsQ : null;
  const projects = useMemo(() => {
    if (!activeQuery) return [];
    const raw = (
      Array.isArray(activeQuery.data)
        ? activeQuery.data
        : (activeQuery.data as any)?.data ?? []
    ) as Project[];
    if (!projectSearch.trim()) return raw;
    const q = projectSearch.toLowerCase();
    return raw.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.tech_stack ?? []).some((t: string) => t.toLowerCase().includes(q)),
    );
  }, [activeQuery, projectSearch]);

  const renderItem = useCallback(
    ({ item }: { item: Project }) => (
      <ProjectCard
        project={item}
        colors={colors}
        onApply={(projectId, projectTitle) => setShowApply({ projectId, projectTitle })}
      />
    ),
    [colors],
  );

  const keyExtractor = useCallback((item: Project) => item.id, []);

  const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'explore', label: 'Explore', icon: 'compass-outline' },
    { key: 'mine', label: 'My Projects', icon: 'folder-outline' },
    { key: 'teamups', label: 'Team-Ups', icon: 'people-outline' },
    { key: 'requests', label: 'Requests', icon: 'mail-outline' },
  ];

  const requestsList = (requestsQ.data?.data ?? []) as ProjectApplicationWithProject[];

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>CollabHub</Text>
        {canCreateProjects ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (tab === 'teamups') setShowCreateTeamUp(true);
              else setShowCreateProject(true);
            }}
            hitSlop={8}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabBar, { borderBottomColor: colors.border }]} contentContainerStyle={{ paddingHorizontal: 4 }}>
        {tabs.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => {
              Haptics.selectionAsync();
              setTab(t.key);
            }}
            style={[styles.tab, tab === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Ionicons
              name={t.icon}
              size={16}
              color={tab === t.key ? colors.primary : colors.textTertiary}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: tab === t.key ? colors.primary : colors.textTertiary },
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Phase 6 — Project search bar (non-requests tabs) */}
      {tab !== 'requests' && (
        <View style={[styles.projectSearchRow, { borderBottomColor: colors.border }]}>
          <View style={[styles.projectSearchBar, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
            <TextInput
              value={projectSearch}
              onChangeText={setProjectSearch}
              placeholder="Search projects or tech..."
              placeholderTextColor={colors.textTertiary}
              style={[styles.projectSearchInput, { color: colors.text }]}
              autoCorrect={false}
              returnKeyType="search"
            />
            {projectSearch.length > 0 && (
              <Pressable onPress={() => setProjectSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* ─── Content ──────────────────────────────────────────── */}
      {tab === 'requests' ? (
        /* 12.6 — Requests/Applications Tab */
        requestsQ.isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : requestsList.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="mail-open-outline" size={56} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No applications</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Applications for your projects will show up here
            </Text>
          </View>
        ) : (
          <FlatList
            data={requestsList}
            renderItem={({ item }) => (
              <ApplicationCard
                app={item}
                colors={colors}
                onAccept={() =>
                  updateAppStatusMut.mutate({
                    applicationId: (item as any).id,
                    ownerId: userId,
                    status: 'accepted',
                  })
                }
                onReject={() =>
                  updateAppStatusMut.mutate({
                    applicationId: (item as any).id,
                    ownerId: userId,
                    status: 'rejected',
                  })
                }
              />
            )}
            keyExtractor={(item) => (item as any).id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={requestsQ.isRefetching}
                onRefresh={requestsQ.refetch}
                tintColor={colors.primary}
              />
            }
          />
        )
      ) : activeQuery?.isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : projects.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name={tab === 'teamups' ? 'people-outline' : 'code-slash-outline'} size={56} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {tab === 'teamups' ? 'No team-ups yet' : 'No projects yet'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {tab === 'mine'
              ? 'Create a project to start building with others'
              : tab === 'teamups'
                ? 'Create a team-up for hackathons and events'
                : 'Open projects will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={activeQuery?.isRefetching ?? false}
              onRefresh={activeQuery?.refetch}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* ─── 12.6 — Create Project Modal ─────────────────────── */}
      <Modal visible={showCreateProject} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowCreateProject(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setShowCreateProject(false)} hitSlop={8}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
                <Text style={[styles.modalTitle, { color: colors.text }]}>New Project</Text>
                <View style={{ width: 24 }} />
              </View>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Title *</Text>
              <TextInput
                value={cpTitle}
                onChangeText={setCpTitle}
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                placeholder="Project title"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Summary</Text>
              <TextInput
                value={cpSummary}
                onChangeText={setCpSummary}
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                placeholder="Brief summary"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Description *</Text>
              <TextInput
                value={cpDescription}
                onChangeText={setCpDescription}
                style={[styles.modalTextArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                placeholder="Describe the project..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Category</Text>
              <TextInput
                value={cpCategory}
                onChangeText={setCpCategory}
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                placeholder="e.g. Web, Mobile, AI/ML"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Skills (comma-separated)</Text>
              <TextInput
                value={cpSkills}
                onChangeText={setCpSkills}
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                placeholder="React, Node.js, Python"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Tags (comma-separated)</Text>
              <TextInput
                value={cpTags}
                onChangeText={setCpTags}
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                placeholder="fullstack, opensource"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Team Size</Text>
              <TextInput
                value={cpTeamSize}
                onChangeText={setCpTeamSize}
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                placeholder="e.g. 5"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
              />
              <View style={styles.switchRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: 0 }]}>Remote</Text>
                <Switch value={cpIsRemote} onValueChange={setCpIsRemote} />
              </View>
              {!cpIsRemote && (
                <>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Location</Text>
                  <TextInput
                    value={cpLocation}
                    onChangeText={setCpLocation}
                    style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                    placeholder="City or campus"
                    placeholderTextColor={colors.textTertiary}
                  />
                </>
              )}
              <Pressable
                onPress={handleCreateProject}
                disabled={createProjectMut.isPending}
                style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: createProjectMut.isPending ? 0.6 : 1 }]}
              >
                {createProjectMut.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalBtnText}>Create Project</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── 12.6 — Create Team-Up Modal ─────────────────────── */}
      <Modal visible={showCreateTeamUp} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowCreateTeamUp(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setShowCreateTeamUp(false)} hitSlop={8}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
                <Text style={[styles.modalTitle, { color: colors.text }]}>New Team-Up</Text>
                <View style={{ width: 24 }} />
              </View>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Title *</Text>
              <TextInput
                value={tuTitle}
                onChangeText={setTuTitle}
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                placeholder="Team-up title"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Description *</Text>
              <TextInput
                value={tuDescription}
                onChangeText={setTuDescription}
                style={[styles.modalTextArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                placeholder="What's the team-up for?"
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Event Type</Text>
              <View style={styles.chipRow}>
                {['hackathon', 'competition', 'project fair', 'study group', 'other'].map((et) => (
                  <Pressable
                    key={et}
                    onPress={() => setTuEventType(et)}
                    style={[
                      styles.chip,
                      { borderColor: colors.border },
                      tuEventType === et && { backgroundColor: colors.primary + '18', borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: tuEventType === et ? colors.primary : colors.textSecondary }]}>
                      {et.charAt(0).toUpperCase() + et.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Skills Needed (comma-separated)</Text>
              <TextInput
                value={tuSkills}
                onChangeText={setTuSkills}
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                placeholder="React, Design, Marketing"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Team Size</Text>
              <TextInput
                value={tuTeamSize}
                onChangeText={setTuTeamSize}
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                placeholder="e.g. 4"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
              />
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Deadline (YYYY-MM-DD)</Text>
              <TextInput
                value={tuDeadline}
                onChangeText={setTuDeadline}
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                placeholder="2025-03-15"
                placeholderTextColor={colors.textTertiary}
              />
              <Pressable
                onPress={handleCreateTeamUp}
                disabled={createTeamUpMut.isPending}
                style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: createTeamUpMut.isPending ? 0.6 : 1 }]}
              >
                {createTeamUpMut.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalBtnText}>Create Team-Up</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── 12.6 — Apply Modal ──────────────────────────────── */}
      <Modal visible={!!showApply} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowApply(null)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowApply(null)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                Apply — {showApply?.projectTitle}
              </Text>
              <View style={{ width: 24 }} />
            </View>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Message *</Text>
            <TextInput
              value={applyMessage}
              onChangeText={setApplyMessage}
              style={[styles.modalTextArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              placeholder="Why are you a good fit?"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Your Skills (comma-separated)</Text>
            <TextInput
              value={applySkills}
              onChangeText={setApplySkills}
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              placeholder="React, TypeScript, AI/ML"
              placeholderTextColor={colors.textTertiary}
            />
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Availability</Text>
            <TextInput
              value={applyAvailability}
              onChangeText={setApplyAvailability}
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              placeholder="e.g. 10 hrs/week"
              placeholderTextColor={colors.textTertiary}
            />
            <Pressable
              onPress={handleApply}
              disabled={applyMut.isPending}
              style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: applyMut.isPending ? 0.6 : 1 }]}
            >
              {applyMut.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalBtnText}>Submit Application</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
  },
  projectSearchRow: { paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1 },
  projectSearchBar: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 10, height: 36 },
  projectSearchInput: { flex: 1, fontSize: fontSize.base, fontFamily: fontFamily.regular },
  teamCountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listContent: { padding: 16, gap: 12 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    lineHeight: fontSize.body * 1.35,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  cardDescription: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    lineHeight: fontSize.base * 1.4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
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
  emptySubtitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
  },
  /* ─── 12.6 — Apply button on card ────────────────────────── */
  applyCardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, borderRadius: 10, marginTop: 4,
  },
  applyCardBtnText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '600', fontFamily: fontFamily.semiBold },
  /* ─── 12.6 — Application Card ────────────────────────────── */
  appApplicantRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  appProject: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, marginTop: 1 },
  appStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  appStatusText: { fontSize: fontSize.xs, fontWeight: '600', fontFamily: fontFamily.semiBold, textTransform: 'capitalize' },
  appRoleLabel: { fontSize: fontSize.xs, fontFamily: fontFamily.semiBold, marginTop: 2 },
  appActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  appActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center', paddingVertical: 8, borderRadius: 10 },
  appActionText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '600', fontFamily: fontFamily.semiBold },
  /* ─── 12.6 — Modal styles ───────────────────────────────── */
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', fontFamily: fontFamily.bold },
  modalLabel: { fontSize: fontSize.sm, fontFamily: fontFamily.semiBold, marginTop: 12, marginBottom: 4 },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: fontSize.base, fontFamily: fontFamily.regular },
  modalTextArea: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: fontSize.base, fontFamily: fontFamily.regular, minHeight: 100 },
  modalBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 20 },
  modalBtnText: { color: '#fff', fontSize: fontSize.body, fontWeight: '700', fontFamily: fontFamily.bold },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: fontSize.xs, fontFamily: fontFamily.semiBold },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
});
