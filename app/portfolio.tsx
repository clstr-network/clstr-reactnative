/**
 * Portfolio Settings Screen — Phase 9.7
 *
 * Configure and activate the user's public portfolio.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  TextInput,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import {
  getPortfolioSettings,
  updatePortfolioSettings,
  activatePortfolio,
} from '@/lib/api/portfolio';
import type { PortfolioSettings } from '@/lib/api/portfolio';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { QUERY_KEYS } from '@/lib/query-keys';

export default function PortfolioScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { identity } = useIdentityContext();
  const userId = identity?.user_id ?? '';

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.portfolioSettings(userId),
    queryFn: () => getPortfolioSettings(userId),
    enabled: !!userId,
  });

  const settings = data as PortfolioSettings | undefined;

  const [slug, setSlug] = useState('');
  const [showProjects, setShowProjects] = useState(true);
  const [showSkills, setShowSkills] = useState(true);
  const [showExperience, setShowExperience] = useState(true);
  const [showEducation, setShowEducation] = useState(true);
  const [customBio, setCustomBio] = useState('');

  // Seed form from loaded settings
  useEffect(() => {
    if (settings) {
      setSlug(settings.slug ?? '');
      setShowProjects(settings.showProjects ?? true);
      setShowSkills(settings.showSkills ?? true);
      setShowExperience(settings.showExperience ?? true);
      setShowEducation(settings.showEducation ?? true);
    }
  }, [settings]);

  const updateMut = useMutation({
    mutationFn: () =>
      updatePortfolioSettings(userId, {
        slug,
        showProjects,
        showSkills,
        showExperience,
        showEducation,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.portfolioSettings(userId) });
      Alert.alert('Saved', 'Portfolio settings updated.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message ?? 'Could not save');
    },
  });

  const activateMut = useMutation({
    mutationFn: () => activatePortfolio(userId, { full_name: identity?.full_name ?? '', role: identity?.role ?? 'Student' }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.portfolioSettings(userId) });
      Alert.alert('Activated!', 'Your portfolio is now public.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message ?? 'Could not activate');
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  const isActive = settings?.isLive ?? false;
  const portfolioUrl = slug ? `https://clstr.network/p/${slug}` : undefined;

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Portfolio</Text>
        {portfolioUrl && isActive ? (
          <Pressable
            onPress={() => Linking.openURL(portfolioUrl)}
            hitSlop={8}
          >
            <Ionicons name="open-outline" size={22} color={colors.primary} />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status */}
        <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: isActive ? '#22c55e' : colors.textTertiary }]} />
            <Text style={[styles.statusLabel, { color: colors.text }]}>
              {isActive ? 'Portfolio Active' : 'Portfolio Inactive'}
            </Text>
          </View>
          {portfolioUrl && isActive && (
            <Pressable onPress={() => Linking.openURL(portfolioUrl)}>
              <Text style={[styles.urlText, { color: colors.primary }]}>{portfolioUrl}</Text>
            </Pressable>
          )}
          {!isActive && (
            <Pressable
              onPress={() => activateMut.mutate()}
              disabled={activateMut.isPending}
              style={[styles.activateBtn, { backgroundColor: colors.primary }]}
            >
              {activateMut.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.activateBtnText}>Activate Portfolio</Text>
              )}
            </Pressable>
          )}
        </View>

        {/* Slug */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Custom URL Slug</Text>
          <TextInput
            value={slug}
            onChangeText={setSlug}
            placeholder="your-name"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
            ]}
          />
          <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>
            clstr.network/p/{slug || 'your-name'}
          </Text>
        </View>

        {/* Custom bio */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Custom Bio</Text>
          <TextInput
            value={customBio}
            onChangeText={setCustomBio}
            placeholder="A brief intro for your portfolio visitors"
            placeholderTextColor={colors.textTertiary}
            multiline
            style={[
              styles.textArea,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
            ]}
          />
        </View>

        {/* Toggles */}
        <View style={styles.toggleGroup}>
          <Text style={[styles.fieldLabel, { color: colors.text, marginBottom: 8 }]}>
            Sections to Show
          </Text>
          {[
            { label: 'Projects', value: showProjects, setter: setShowProjects },
            { label: 'Skills', value: showSkills, setter: setShowSkills },
            { label: 'Experience', value: showExperience, setter: setShowExperience },
            { label: 'Education', value: showEducation, setter: setShowEducation },
          ].map((toggle) => (
            <View key={toggle.label} style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>{toggle.label}</Text>
              <Switch
                value={toggle.value}
                onValueChange={toggle.setter}
                trackColor={{ true: colors.primary, false: colors.surfaceSecondary }}
              />
            </View>
          ))}
        </View>

        {/* Save */}
        <Pressable
          onPress={() => updateMut.mutate()}
          disabled={updateMut.isPending}
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        >
          {updateMut.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Settings</Text>
          )}
        </Pressable>

        {/* Edit Content */}
        <Pressable
          onPress={() => router.push('/portfolio-editor' as any)}
          style={[styles.editCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.editCardLeft}>
            <Ionicons name="create-outline" size={22} color={colors.primary} />
            <View style={styles.editCardText}>
              <Text style={[styles.editCardTitle, { color: colors.text }]}>Edit Portfolio Content</Text>
              <Text style={[styles.editCardHint, { color: colors.textSecondary }]}>
                Customize projects, experience, and more
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </Pressable>


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
  },
  scrollContent: { padding: 16, gap: 20, paddingBottom: 40 },
  statusCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
  },
  urlText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    textDecorationLine: 'underline',
  },
  activateBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  activateBtnText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
  },
  field: { gap: 6 },
  fieldLabel: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
  },
  fieldHint: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
  },
  toggleGroup: {},
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleLabel: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
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
  editCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  editCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  editCardText: { flex: 1, gap: 2 },
  editCardTitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
  },
  editCardHint: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },
});
