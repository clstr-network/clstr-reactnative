/**
 * Portfolio Template Picker — Phase 14.4
 *
 * 2-column grid of available portfolio templates. Tap to select and apply.
 * Shows "Current" badge on the active template.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { usePortfolioEditor } from '@/lib/hooks/usePortfolioEditor';
import {
  PORTFOLIO_TEMPLATES,
  type TemplateId,
  type TemplateInfo,
} from '@clstr/shared/types/portfolio';

// Color schemes for template preview thumbnails
const TEMPLATE_COLORS: Record<TemplateId, { bg: string; accent: string; icon: string }> = {
  minimal: { bg: '#1a1a1a', accent: '#ffffff', icon: 'grid-outline' },
  eliana: { bg: '#2d1b2e', accent: '#f472b6', icon: 'heart-outline' },
  typefolio: { bg: '#1e293b', accent: '#38bdf8', icon: 'text-outline' },
  geeky: { bg: '#0f1a0f', accent: '#4ade80', icon: 'code-slash-outline' },
};

// Template card component
const TemplateCard = React.memo(function TemplateCard({
  template,
  isCurrent,
  colors,
  onSelect,
}: {
  template: TemplateInfo;
  isCurrent: boolean;
  colors: ReturnType<typeof useThemeColors>;
  onSelect: (id: TemplateId) => void;
}) {
  const scheme = TEMPLATE_COLORS[template.id];
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect(template.id);
      }}
      style={[
        styles.card,
        {
          borderColor: isCurrent ? colors.primary : colors.border,
          borderWidth: isCurrent ? 2 : 1,
          backgroundColor: colors.surfaceSecondary,
        },
      ]}
    >
      {/* Preview thumbnail */}
      <View style={[styles.preview, { backgroundColor: scheme.bg }]}>
        <View style={[styles.previewAccent, { backgroundColor: scheme.accent + '25' }]} />
        <Ionicons name={scheme.icon as any} size={32} color={scheme.accent} />
        <Text
          style={[
            styles.previewLetter,
            { color: scheme.accent, opacity: 0.15 },
          ]}
        >
          {template.name[0]}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardName, { color: colors.text }]}>{template.name}</Text>
          {isCurrent && (
            <View style={[styles.currentBadge, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
              <Text style={[styles.currentText, { color: colors.primary }]}>Current</Text>
            </View>
          )}
        </View>
        <Text style={[styles.cardDesc, { color: colors.textTertiary }]} numberOfLines={2}>
          {template.description}
        </Text>
      </View>
    </Pressable>
  );
});

export default function PortfolioTemplatePickerScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { identity } = useIdentityContext();
  const userId = identity?.user_id;

  const { profile, updateSettings, isLoading } = usePortfolioEditor(userId);
  const currentTemplate = profile?.settings?.template ?? 'minimal';

  const handleSelect = (templateId: TemplateId) => {
    if (templateId === currentTemplate) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateSettings({ template: templateId });
    // Navigate back to the editor
    setTimeout(() => router.back(), 300);
  };

  const renderItem = ({ item }: { item: TemplateInfo }) => (
    <TemplateCard
      template={item}
      isCurrent={item.id === currentTemplate}
      colors={colors}
      onSelect={handleSelect}
    />
  );

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Choose Template</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={PORTFOLIO_TEMPLATES}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Select a template for your public portfolio page. Your content stays the same.
            </Text>
          }
        />
      )}
    </View>
  );
}

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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    lineHeight: fontSize.sm * 1.5,
    marginBottom: 16,
  },
  grid: {
    padding: 16,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  preview: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  previewAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 60,
    height: 60,
    borderBottomLeftRadius: 60,
  },
  previewLetter: {
    position: 'absolute',
    fontSize: 80,
    fontFamily: fontFamily.bold,
    bottom: -10,
    right: 8,
  },
  cardInfo: {
    padding: 12,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  cardName: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.semiBold,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentText: {
    fontSize: 10,
    fontFamily: fontFamily.semiBold,
  },
  cardDesc: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    lineHeight: fontSize.xs * 1.4,
  },
});
