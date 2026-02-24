/**
 * ═══════════════════════════════════════════════════════════════
 * AppToast — Custom toast config for OLED-dark theme
 * ═══════════════════════════════════════════════════════════════
 *
 * Custom toast rendering config passed to react-native-toast-message.
 * Renders in the root layout via <AppToaster />.
 *
 * Variants: success, error, warning, info, undo
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Toast, { type ToastConfigParams } from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { fontFamily, fontSize } from '@/constants/typography';

// ─── Icon map ────────────────────────────────────────────────

const VARIANT_CONFIG: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  success: {
    icon: 'checkmark-circle',
    color: '#34D399',
    bg: 'rgba(52, 211, 153, 0.12)',
  },
  error: {
    icon: 'alert-circle',
    color: '#F87171',
    bg: 'rgba(248, 113, 113, 0.12)',
  },
  warning: {
    icon: 'warning',
    color: '#FBBF24',
    bg: 'rgba(251, 191, 36, 0.12)',
  },
  info: {
    icon: 'information-circle',
    color: '#60A5FA',
    bg: 'rgba(96, 165, 250, 0.12)',
  },
  undo: {
    icon: 'arrow-undo',
    color: '#A78BFA',
    bg: 'rgba(167, 139, 250, 0.12)',
  },
};

// ─── Custom toast component ──────────────────────────────────

function CustomToast({ text1, text2, type, onPress }: ToastConfigParams<any>) {
  const config = VARIANT_CONFIG[type ?? 'info'] ?? VARIANT_CONFIG.info;

  return (
    <Pressable onPress={onPress} style={styles.outerContainer}>
      <View style={[styles.container, { borderLeftColor: config.color }]}>
        <View style={[styles.iconWrap, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>
        <View style={styles.textWrap}>
          {text1 ? (
            <Text style={styles.title} numberOfLines={1}>
              {text1}
            </Text>
          ) : null}
          {text2 ? (
            <Text style={styles.description} numberOfLines={2}>
              {text2}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Toast config ────────────────────────────────────────────

export const toastConfig = {
  success: (props: ToastConfigParams<any>) => <CustomToast {...props} />,
  error: (props: ToastConfigParams<any>) => <CustomToast {...props} />,
  warning: (props: ToastConfigParams<any>) => <CustomToast {...props} />,
  info: (props: ToastConfigParams<any>) => <CustomToast {...props} />,
  undo: (props: ToastConfigParams<any>) => <CustomToast {...props} />,
};

// ─── Toaster component for root layout ──────────────────────

export function AppToaster() {
  return <Toast config={toastConfig} topOffset={54} />;
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerContainer: {
    width: '92%',
    alignSelf: 'center',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgb(23, 22, 22)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderLeftWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    // Elevation for Android
    elevation: 8,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: '#FFFFFF',
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
