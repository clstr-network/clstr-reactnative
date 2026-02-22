/**
 * Skill Analysis Screen — Phase 9.8
 *
 * View computed skill analysis, score distribution, and skill gap.
 */

import React from 'react';
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
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import {
  getOrComputeSkillAnalysis,
  computeSkillAnalysis,
  getSkillDistribution,
  getOverallScore,
  getScoreLabel,
  getScoreColor,
} from '@/lib/api/skill-analysis';
import type { SkillAnalysisData, SkillItem } from '@/lib/api/skill-analysis';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { QUERY_KEYS } from '@/lib/query-keys';

// ─── Skill Bar ───────────────────────────────────────────────

function SkillBar({
  skill,
  colors,
}: {
  skill: SkillItem;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const levelMap: Record<string, number> = {
    Beginner: 25,
    Intermediate: 50,
    Expert: 75,
    Professional: 100,
  };
  const pct = Math.min(levelMap[skill.level] ?? 0, 100);
  const barColor = getScoreColor(pct);

  return (
    <View style={styles.skillRow}>
      <View style={styles.skillLabel}>
        <Text style={[styles.skillName, { color: colors.text }]} numberOfLines={1}>
          {skill.name}
        </Text>
        <Text style={[styles.skillScore, { color: colors.textTertiary }]}>{pct}%</Text>
      </View>
      <View style={[styles.barBg, { backgroundColor: colors.surfaceSecondary }]}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

// ─── Distribution Section ────────────────────────────────────

function DistributionSection({
  data,
  colors,
}: {
  data: SkillAnalysisData;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const dist = getSkillDistribution(data);
  if (!dist) return null;

  const categories = Object.entries(dist);
  if (categories.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Skill Distribution</Text>
      <View style={styles.distGrid}>
        {categories.map(([category, count]) => (
          <View
            key={category}
            style={[styles.distCard, { backgroundColor: colors.surfaceSecondary }]}
          >
            <Text style={[styles.distCount, { color: colors.primary }]}>{String(count)}</Text>
            <Text style={[styles.distLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              {category}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────

export default function SkillAnalysisScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { identity } = useIdentityContext();
  const userId = identity?.user_id ?? '';
  const { canAccessSkillAnalysis } = useFeatureAccess();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.skillAnalysis(userId),
    queryFn: () => getOrComputeSkillAnalysis(userId),
    enabled: !!userId && canAccessSkillAnalysis,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  const recomputeMut = useMutation({
    mutationFn: () => computeSkillAnalysis(userId),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.skillAnalysis(userId) });
    },
  });

  const analysis = data as SkillAnalysisData | undefined;
  const overall = analysis ? getOverallScore(analysis) : 0;
  const label = getScoreLabel(overall);
  const skills = (analysis?.current_skills ?? []) as SkillItem[];

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Skill Analysis</Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            recomputeMut.mutate();
          }}
          disabled={recomputeMut.isPending}
          hitSlop={8}
        >
          {recomputeMut.isPending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={22} color={colors.primary} />
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !analysis ? (
        <View style={styles.centerContainer}>
          <Ionicons name="analytics-outline" size={56} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No analysis yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Add skills to your profile to get a skill analysis
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Overall Score */}
          <View style={[styles.scoreCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.scoreNumber, { color: getScoreColor(overall) }]}>{overall}</Text>
            <Text style={[styles.scoreLabel, { color: colors.text }]}>{label}</Text>
            <Text style={[styles.scoreHint, { color: colors.textTertiary }]}>
              Overall Skill Score
            </Text>
          </View>

          {/* Distribution */}
          <DistributionSection data={analysis} colors={colors} />

          {/* Individual Skills */}
          {skills.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Skills ({skills.length})
              </Text>
              <View style={{ gap: 10 }}>
                {skills
                  .sort((a, b) => {
                    const levelOrder: Record<string, number> = {
                      Beginner: 1,
                      Intermediate: 2,
                      Expert: 3,
                      Professional: 4,
                    };
                    return (levelOrder[b.level] ?? 0) - (levelOrder[a.level] ?? 0);
                  })
                  .map((skill, idx) => (
                    <SkillBar key={skill.name ?? idx} skill={skill} colors={colors} />
                  ))}
              </View>
            </View>
          )}
        </ScrollView>
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
  scrollContent: { padding: 16, gap: 20, paddingBottom: 40 },
  scoreCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 4,
  },
  scoreNumber: {
    fontSize: 48,
    fontFamily: fontFamily.bold,
    lineHeight: 56,
  },
  scoreLabel: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.semiBold,
  },
  scoreHint: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
  },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
  },
  distGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  distCard: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  distCount: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
  },
  distLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  skillRow: { gap: 4 },
  skillLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillName: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    flex: 1,
  },
  skillScore: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    marginLeft: 8,
  },
  barBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
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
});
