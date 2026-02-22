/**
 * Job Detail Screen — Phase 9.1
 *
 * Displays full job details, with apply and save actions.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { getJobById, toggleSaveJob, applyToJob } from '@/lib/api/jobs';
import type { Job } from '@/lib/api/jobs';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { QUERY_KEYS } from '@/lib/query-keys';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { identity } = useIdentityContext();
  const userId = identity?.user_id ?? '';
  const { canApplyToJobs, canSaveJobs } = useFeatureAccess();

  const { data: result, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.jobs, 'detail', id],
    queryFn: () => getJobById(id!),
    enabled: !!id,
    staleTime: 30_000,
  });

  const job = result?.job ?? null;

  const saveMutation = useMutation({
    mutationFn: () => toggleSaveJob(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.savedJobs });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.jobs, 'detail', id] });
    },
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      applyToJob({
        job_id: id!,
        resume_url: '',
        cover_letter: '',
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.jobs, 'detail', id] });
    },
  });

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    saveMutation.mutate();
  }, [saveMutation]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8), borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Job Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8), borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Job Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="briefcase-outline" size={56} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Job not found</Text>
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Job Details</Text>
        {canSaveJobs ? (
          <Pressable onPress={handleSave} hitSlop={8}>
            <Ionicons
              name={job.isSaved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={job.isSaved ? colors.primary : colors.text}
            />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title section */}
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Text style={[styles.jobTitle, { color: colors.text }]}>{job.title}</Text>
          <Text style={[styles.company, { color: colors.primary }]}>
            {job.company_name ?? 'Unknown Company'}
          </Text>
          <View style={styles.metaRow}>
            {job.location && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{job.location}</Text>
              </View>
            )}
            {job.job_type && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{job.job_type}</Text>
              </View>
            )}
          </View>
          {(job.salary_min != null || job.salary_max != null) && (
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={14} color={colors.textTertiary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {job.salary_min != null && job.salary_max != null
                  ? `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
                  : job.salary_min != null
                    ? `From ${job.salary_min.toLocaleString()}`
                    : `Up to ${job.salary_max!.toLocaleString()}`}
              </Text>
            </View>
          )}
        </View>

        {/* Tags */}
        {((job.required_skills && job.required_skills.length > 0) || job.experience_level) && (
          <View style={[styles.section, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Requirements</Text>
            <View style={styles.tagRow}>
              {job.experience_level && (
                <View style={[styles.tag, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>{job.experience_level}</Text>
                </View>
              )}
              {job.required_skills?.map((skill: string) => (
                <View key={skill} style={[styles.tag, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[styles.tagText, { color: colors.textSecondary }]}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Description */}
        {job.description && (
          <View style={[styles.section, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
              {job.description}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Apply button */}
      {canApplyToJobs && (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + 12,
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <Pressable
            onPress={() => applyMutation.mutate()}
            disabled={applyMutation.isPending}
            style={({ pressed }) => [
              styles.applyButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
              applyMutation.isPending && { opacity: 0.6 },
            ]}
          >
            {applyMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.applyButtonText}>Apply Now</Text>
            )}
          </Pressable>
        </View>
      )}
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
  scrollContent: { paddingBottom: 100 },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    gap: 8,
  },
  sectionTitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
  },
  company: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.medium,
  },
  descriptionText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    lineHeight: fontSize.base * 1.6,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  applyButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: fontSize.body,
    fontFamily: fontFamily.bold,
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
