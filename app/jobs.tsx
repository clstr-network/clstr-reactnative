/**
 * Jobs Screen — Phase 9.1 → Phase 12.5
 *
 * Browse, recommended, saved, applications tabs.
 * Post Job dialog for alumni. Apply dialog.
 */

import React, { useState, useCallback, useMemo } from 'react';
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
import {
  getJobs,
  getSavedJobs,
  toggleSaveJob,
  getRecommendedJobs,
  getMyApplications,
  createJob,
  applyToJob,
} from '@/lib/api/jobs';
import type { Job, JobWithMatchScore, JobApplication, CreateJobInput, ApplyToJobInput } from '@/lib/api/jobs';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { QUERY_KEYS } from '@/lib/query-keys';
import { useRealtimeMultiSubscription } from '@/lib/hooks/useRealtimeSubscription';
import { CHANNELS } from '@/lib/channels';

// ─── Tab types ───────────────────────────────────────────────

type TabKey = 'browse' | 'recommended' | 'saved' | 'applications';

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'browse', label: 'Browse', icon: 'briefcase-outline' },
  { key: 'recommended', label: 'For You', icon: 'sparkles-outline' },
  { key: 'saved', label: 'Saved', icon: 'bookmark-outline' },
  { key: 'applications', label: 'Applied', icon: 'paper-plane-outline' },
];

const JOB_TYPE_FILTERS = ['All', 'Full-time', 'Part-time', 'Internship', 'Contract', 'Remote'];

// ─── Job Card ────────────────────────────────────────────────

const JobCard = React.memo(function JobCard({
  job,
  colors,
  onSave,
  isSaved,
  matchScore,
  onApply,
}: {
  job: Job;
  colors: ReturnType<typeof useThemeColors>;
  onSave: (jobId: string) => void;
  isSaved?: boolean;
  matchScore?: number;
  onApply?: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/job/${job.id}`);
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { backgroundColor: colors.surfaceHover },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.jobIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="briefcase" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {job.title}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.textTertiary }]} numberOfLines={1}>
            {job.company_name ?? 'Unknown'} {job.location ? `· ${job.location}` : ''}
          </Text>
        </View>
        <Pressable onPress={() => onSave(job.id)} hitSlop={8}>
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={isSaved ? colors.primary : colors.textTertiary}
          />
        </Pressable>
      </View>

      {/* Match score badge (12.5) */}
      {matchScore != null && matchScore > 0 && (
        <View style={[styles.matchBadge, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="sparkles" size={14} color={colors.primary} />
          <Text style={[styles.matchText, { color: colors.primary }]}>{Math.round(matchScore)}% Match</Text>
        </View>
      )}

      {job.description && (
        <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {job.description}
        </Text>
      )}

      <View style={styles.tagRow}>
        {job.job_type && (
          <View style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.tagText, { color: colors.primary }]}>{job.job_type}</Text>
          </View>
        )}
        {job.experience_level && (
          <View style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.tagText, { color: colors.textSecondary }]}>{job.experience_level}</Text>
          </View>
        )}
        {(job.salary_min != null || job.salary_max != null) && (
          <View style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.tagText, { color: colors.textSecondary }]}>
              {job.salary_min != null && job.salary_max != null
                ? `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
                : job.salary_min != null
                  ? `From ${job.salary_min.toLocaleString()}`
                  : `Up to ${job.salary_max!.toLocaleString()}`}
            </Text>
          </View>
        )}
      </View>

      {/* Apply button (12.5) */}
      {onApply && (
        <Pressable
          onPress={onApply}
          style={[styles.applyBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="paper-plane" size={14} color="#fff" />
          <Text style={styles.applyBtnText}>Quick Apply</Text>
        </Pressable>
      )}
    </Pressable>
  );
});

// ─── Application Card (12.5) ─────────────────────────────────

const ApplicationCard = React.memo(function ApplicationCard({
  app,
  colors,
}: {
  app: JobApplication;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const statusColor =
    app.status === 'accepted' ? colors.success
    : app.status === 'rejected' ? (colors as any).error ?? '#ef4444'
    : colors.warning;
  const statusLabel = app.status ? app.status.charAt(0).toUpperCase() + app.status.slice(1) : 'Pending';

  return (
    <Pressable
      onPress={() => {
        if (app.job_id) router.push(`/job/${app.job_id}`);
      }}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.jobIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="paper-plane" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {app.job?.title ?? 'Job Application'}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.textTertiary }]} numberOfLines={1}>
            {app.job?.company_name ?? 'Unknown'} · {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : ''}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
});

// ─── Screen ──────────────────────────────────────────────────

export default function JobsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { identity } = useIdentityContext();
  const userId = identity?.user_id ?? '';
  const { canBrowseJobs, canSaveJobs, canPostJobs, canApplyToJobs, canUseAIJobMatching } = useFeatureAccess();

  // Phase 13.4 — Realtime jobs subscription
  useRealtimeMultiSubscription({
    channelName: CHANNELS.jobsRealtime(),
    subscriptions: [
      {
        table: 'jobs',
        event: '*',
        onPayload: () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs });
        },
      },
      {
        table: 'saved_items',
        event: '*',
        filter: userId ? `user_id=eq.${userId}` : undefined,
        onPayload: () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.savedJobs });
        },
      },
      {
        table: 'job_applications',
        event: '*',
        onPayload: () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs });
        },
      },
    ],
    enabled: !!userId,
  });

  const [activeTab, setActiveTab] = useState<TabKey>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('All');

  // ── Dialogs ────────────────────────────────────────────────
  const [showPostJob, setShowPostJob] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [applyJobId, setApplyJobId] = useState<string | null>(null);

  // ── Post Job form state ─────────────────────────────────
  const [pjTitle, setPjTitle] = useState('');
  const [pjCompany, setPjCompany] = useState('');
  const [pjDesc, setPjDesc] = useState('');
  const [pjLocation, setPjLocation] = useState('');
  const [pjType, setPjType] = useState('Full-time');
  const [pjCategory, setPjCategory] = useState('Engineering');

  // ── Apply form state ────────────────────────────────────
  const [apResumeUrl, setApResumeUrl] = useState('');
  const [apCover, setApCover] = useState('');
  const [apPortfolio, setApPortfolio] = useState('');

  // ── Browse jobs ────────────────────────────────────────────
  const browseQuery = useQuery({
    queryKey: [...QUERY_KEYS.jobs, 'browse', searchQuery],
    queryFn: () =>
      getJobs({
        search: searchQuery || undefined,
      }),
    enabled: canBrowseJobs,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  // ── Saved jobs ─────────────────────────────────────────────
  const savedQuery = useQuery({
    queryKey: QUERY_KEYS.savedJobs,
    queryFn: () => getSavedJobs(),
    enabled: !!userId && canSaveJobs,
    staleTime: 30_000,
  });

  // ── Recommended jobs (12.5) ─────────────────────────────────
  const recommendedQuery = useQuery({
    queryKey: [...QUERY_KEYS.jobs, 'recommended'],
    queryFn: () => getRecommendedJobs(),
    enabled: !!userId && canUseAIJobMatching && activeTab === 'recommended',
    staleTime: 60_000,
  });

  // ── My applications (12.5) ──────────────────────────────────
  const applicationsQuery = useQuery({
    queryKey: [...QUERY_KEYS.jobs, 'applications'],
    queryFn: () => getMyApplications(),
    enabled: !!userId && activeTab === 'applications',
    staleTime: 30_000,
  });

  const savedIds = useMemo(
    () => new Set((savedQuery.data?.jobs ?? []).map((j: Job) => j.id)),
    [savedQuery.data],
  );

  // ── Toggle save ────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (jobId: string) => toggleSaveJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.savedJobs });
    },
  });

  const handleSave = useCallback(
    (jobId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      saveMutation.mutate(jobId);
    },
    [saveMutation],
  );

  // ── Create job mutation (12.5) ──────────────────────────────
  const createJobMut = useMutation({
    mutationFn: () =>
      createJob({
        job_title: pjTitle.trim(),
        company_name: pjCompany.trim(),
        description: pjDesc.trim(),
        location: pjLocation.trim(),
        job_type: pjType,
        category: pjCategory,
      } as CreateJobInput),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowPostJob(false);
      setPjTitle(''); setPjCompany(''); setPjDesc(''); setPjLocation('');
      Alert.alert('Success', 'Job posted successfully!');
    },
    onError: () => Alert.alert('Error', 'Failed to post job.'),
  });

  // ── Apply mutation (12.5) ───────────────────────────────────
  const applyMut = useMutation({
    mutationFn: () =>
      applyToJob({
        job_id: applyJobId!,
        resume_url: apResumeUrl.trim(),
        cover_letter: apCover.trim() || undefined,
        portfolio_url: apPortfolio.trim() || undefined,
      } as ApplyToJobInput),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.jobs, 'applications'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowApply(false);
      setApResumeUrl(''); setApCover(''); setApPortfolio(''); setApplyJobId(null);
      Alert.alert('Applied!', 'Your application has been submitted.');
    },
    onError: () => Alert.alert('Error', 'Failed to submit application.'),
  });

  const openApplyDialog = useCallback((jobId: string) => {
    setApplyJobId(jobId);
    setShowApply(true);
  }, []);

  // ── Resolved data ──────────────────────────────────────────
  const displayJobs = useMemo(() => {
    let jobs: Job[] = [];
    if (activeTab === 'saved') jobs = savedQuery.data?.jobs ?? [];
    else if (activeTab === 'recommended') jobs = (recommendedQuery.data as any)?.jobs ?? [];
    else jobs = browseQuery.data?.jobs ?? [];
    if (jobTypeFilter !== 'All') {
      jobs = jobs.filter((j: Job) => (j.job_type ?? '').toLowerCase() === jobTypeFilter.toLowerCase());
    }
    return jobs;
  }, [activeTab, browseQuery.data, savedQuery.data, recommendedQuery.data, jobTypeFilter]);

  const applications: JobApplication[] = (applicationsQuery.data as any)?.applications ?? [];

  const isLoading =
    activeTab === 'browse' ? browseQuery.isLoading
    : activeTab === 'saved' ? savedQuery.isLoading
    : activeTab === 'recommended' ? recommendedQuery.isLoading
    : applicationsQuery.isLoading;
  const isRefetching =
    activeTab === 'browse' ? browseQuery.isRefetching
    : activeTab === 'saved' ? savedQuery.isRefetching
    : activeTab === 'recommended' ? recommendedQuery.isRefetching
    : applicationsQuery.isRefetching;
  const refetch =
    activeTab === 'browse' ? browseQuery.refetch
    : activeTab === 'saved' ? savedQuery.refetch
    : activeTab === 'recommended' ? recommendedQuery.refetch
    : applicationsQuery.refetch;

  const renderItem = useCallback(
    ({ item }: { item: Job }) => (
      <JobCard
        job={item}
        colors={colors}
        onSave={handleSave}
        isSaved={savedIds.has(item.id)}
        matchScore={(item as JobWithMatchScore).total_score}
        onApply={canApplyToJobs ? () => openApplyDialog(item.id) : undefined}
      />
    ),
    [colors, handleSave, savedIds, canApplyToJobs, openApplyDialog],
  );

  const keyExtractor = useCallback((item: Job) => item.id, []);

  if (!canBrowseJobs) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8), borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Jobs</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="lock-closed-outline" size={56} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Access Restricted</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            You don&apos;t have permission to browse jobs.
          </Text>
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
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8),
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Jobs</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { borderBottomColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search jobs..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab(tab.key);
              }}
              style={[styles.tab, isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            >
              <Ionicons name={tab.icon} size={16} color={isActive ? colors.primary : colors.textTertiary} />
              <Text style={[styles.tabLabel, { color: isActive ? colors.primary : colors.textTertiary }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Phase 6 — Job type filter chips */}
      <FlatList
        data={JOB_TYPE_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.jobTypeFilterList}
        contentContainerStyle={styles.jobTypeFilterContent}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => { setJobTypeFilter(item); Haptics.selectionAsync(); }}
            style={[
              styles.jobTypeChip,
              {
                backgroundColor: jobTypeFilter === item ? colors.primary : 'transparent',
                borderColor: jobTypeFilter === item ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[styles.jobTypeChipText, { color: jobTypeFilter === item ? '#fff' : colors.textSecondary }]}>
              {item}
            </Text>
          </Pressable>
        )}
      />

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeTab === 'applications' ? (
        applications.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="paper-plane-outline" size={56} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No applications yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Jobs you apply to will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={applications}
            renderItem={({ item }) => <ApplicationCard app={item} colors={colors} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
            }
          />
        )
      ) : displayJobs.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="briefcase-outline" size={56} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {activeTab === 'saved' ? 'No saved jobs' : activeTab === 'recommended' ? 'No recommendations yet' : 'No jobs found'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {activeTab === 'saved' ? 'Jobs you save will appear here' : activeTab === 'recommended' ? 'Complete your profile to get AI-matched jobs' : 'Try adjusting your search'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayJobs}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        />
      )}

      {/* Post Job FAB (alumni only) */}
      {canPostJobs && (
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowPostJob(true); }}
          style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 16 }]}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      )}

      {/* ── Post Job Modal ─────────────────────────────────── */}
      <Modal visible={showPostJob} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowPostJob(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Post a Job</Text>
                <Pressable onPress={() => setShowPostJob(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                placeholder="Job Title *"
                placeholderTextColor={colors.textTertiary}
                value={pjTitle}
                onChangeText={setPjTitle}
              />
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                placeholder="Company Name *"
                placeholderTextColor={colors.textTertiary}
                value={pjCompany}
                onChangeText={setPjCompany}
              />
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                placeholder="Location"
                placeholderTextColor={colors.textTertiary}
                value={pjLocation}
                onChangeText={setPjLocation}
              />
              <TextInput
                style={[styles.modalTextArea, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                placeholder="Job Description *"
                placeholderTextColor={colors.textTertiary}
                value={pjDesc}
                onChangeText={setPjDesc}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Job Type Picker */}
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Job Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalChipRow}>
                {['Full-time', 'Part-time', 'Internship', 'Contract', 'Remote'].map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setPjType(t)}
                    style={[styles.modalChip, { backgroundColor: pjType === t ? colors.primary : 'transparent', borderColor: pjType === t ? colors.primary : colors.border }]}
                  >
                    <Text style={[styles.modalChipText, { color: pjType === t ? '#fff' : colors.textSecondary }]}>{t}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Category Picker */}
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalChipRow}>
                {['Engineering', 'Design', 'Marketing', 'Business', 'Science', 'Arts', 'Other'].map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setPjCategory(c)}
                    style={[styles.modalChip, { backgroundColor: pjCategory === c ? colors.primary : 'transparent', borderColor: pjCategory === c ? colors.primary : colors.border }]}
                  >
                    <Text style={[styles.modalChipText, { color: pjCategory === c ? '#fff' : colors.textSecondary }]}>{c}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Pressable
                onPress={() => {
                  if (!pjTitle.trim() || !pjCompany.trim() || !pjDesc.trim()) {
                    Alert.alert('Missing Fields', 'Title, company, and description are required.');
                    return;
                  }
                  createJobMut.mutate();
                }}
                disabled={createJobMut.isPending}
                style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: createJobMut.isPending ? 0.6 : 1 }]}
              >
                <Text style={styles.modalBtnText}>{createJobMut.isPending ? 'Posting...' : 'Post Job'}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Apply Modal ────────────────────────────────────── */}
      <Modal visible={showApply} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowApply(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Apply to Job</Text>
                <Pressable onPress={() => setShowApply(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                placeholder="Resume URL *"
                placeholderTextColor={colors.textTertiary}
                value={apResumeUrl}
                onChangeText={setApResumeUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
              <TextInput
                style={[styles.modalTextArea, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                placeholder="Cover Letter (optional)"
                placeholderTextColor={colors.textTertiary}
                value={apCover}
                onChangeText={setApCover}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground }]}
                placeholder="Portfolio URL (optional)"
                placeholderTextColor={colors.textTertiary}
                value={apPortfolio}
                onChangeText={setApPortfolio}
                autoCapitalize="none"
                keyboardType="url"
              />

              <Pressable
                onPress={() => {
                  if (!apResumeUrl.trim()) {
                    Alert.alert('Missing Field', 'Resume URL is required.');
                    return;
                  }
                  applyMut.mutate();
                }}
                disabled={applyMut.isPending}
                style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: applyMut.isPending ? 0.6 : 1 }]}
              >
                <Text style={styles.modalBtnText}>{applyMut.isPending ? 'Submitting...' : 'Submit Application'}</Text>
              </Pressable>
            </ScrollView>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    paddingVertical: 0,
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
    gap: 4,
    paddingVertical: 12,
  },
  tabLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
  },
  jobTypeFilterList: { flexGrow: 0 },
  jobTypeFilterContent: { paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  jobTypeChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
  jobTypeChipText: { fontSize: 12, fontWeight: '600', fontFamily: fontFamily.semiBold },
  listContent: { padding: 16, gap: 12 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  jobIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
  },
  cardMeta: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },
  cardDescription: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    lineHeight: fontSize.base * 1.4,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
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
  // ── Match / Apply / Status (12.5) ─────────────────────────
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  matchText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 2,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.semiBold,
  },
  // ── FAB ──────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  // ── Modal ────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
  },
  modalLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    marginBottom: 10,
  },
  modalTextArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    marginBottom: 10,
    minHeight: 100,
  },
  modalChipRow: {
    flexDirection: 'row',
    marginBottom: 10,
    flexGrow: 0,
  },
  modalChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 6,
  },
  modalChipText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
  },
  modalBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  modalBtnText: {
    color: '#fff',
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
  },
});
