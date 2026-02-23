/**
 * Verify Personal Email Screen â€” Phase 4.3
 *
 * Deep link landing page for personal email verification.
 * Reads code from deep link params, auto-verifies via RPC.
 * Requires the user to be logged in.
 *
 * Deep link format: clstr://verify-personal-email?code=123456
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { useThemeColors } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';
import { supabase } from '@/lib/adapters/core-client';
import { verifyPersonalEmail } from '@/lib/api/email-transition';
import { QUERY_KEYS } from '@/lib/query-keys';

type Status = 'loading' | 'success' | 'error' | 'no-code' | 'no-auth';

export default function VerifyPersonalEmailScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { code } = useLocalSearchParams<{ code: string }>();

  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const hasVerified = useRef(false);

  useEffect(() => {
    if (hasVerified.current) return;

    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      setStatus('no-code');
      setMessage('Invalid or missing verification code in the link.');
      return;
    }

    const verify = async () => {
      hasVerified.current = true;

      // Check if user is logged in
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setStatus('no-auth');
        setMessage('Please log in first, then open the link again.');
        return;
      }

      // Auto-verify using the same RPC as manual OTP
      const result = await verifyPersonalEmail(code);

      if (result.success) {
        setStatus('success');
        setMessage('Your personal email has been verified! Your lifetime access is secured.');
        // Invalidate caches so the UI reflects the change
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.identity });
      } else {
        setStatus('error');
        setMessage(
          result.error || 'Verification failed. The code may be expired or already used.',
        );
      }
    };

    verify();
  }, [code, queryClient]);

  const renderIcon = (name: keyof typeof Ionicons.glyphMap, iconColor: string) => (
    <View style={[styles.iconCircle, { backgroundColor: `${iconColor}15` }]}>
      <Ionicons name={name} size={32} color={iconColor} />
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.content}>
        {/* Loading */}
        {status === 'loading' && (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={colors.textSecondary} />
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>
              Verifying your personal email...
            </Text>
          </View>
        )}

        {/* Success */}
        {status === 'success' && (
          <View style={styles.stateContainer}>
            {renderIcon('checkmark-circle', '#34d399')}
            <Text style={[styles.stateTitle, { color: colors.text }]}>Email Verified!</Text>
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>{message}</Text>
            <Pressable
              style={[styles.primaryButton, { borderColor: 'rgba(255,255,255,0.1)' }]}
              onPress={() => router.replace('/settings')}
            >
              <Ionicons name="arrow-forward" size={16} color="white" />
              <Text style={styles.primaryButtonText}>Go to Settings</Text>
            </Pressable>
          </View>
        )}

        {/* Error */}
        {status === 'error' && (
          <View style={styles.stateContainer}>
            {renderIcon('alert-circle-outline', 'rgba(255,255,255,0.4)')}
            <Text style={[styles.stateTitle, { color: colors.text }]}>Verification Failed</Text>
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>{message}</Text>
            <Text style={[styles.hint, { color: colors.textTertiary }]}>
              You can still enter the code manually in Settings.
            </Text>
            <Pressable
              style={[styles.outlineButton, { borderColor: 'rgba(255,255,255,0.1)' }]}
              onPress={() => router.replace('/settings')}
            >
              <Text style={[styles.outlineButtonText, { color: colors.textSecondary }]}>
                Go to Settings
              </Text>
            </Pressable>
          </View>
        )}

        {/* No code in URL */}
        {status === 'no-code' && (
          <View style={styles.stateContainer}>
            {renderIcon('alert-circle-outline', 'rgba(255,255,255,0.4)')}
            <Text style={[styles.stateTitle, { color: colors.text }]}>Invalid Link</Text>
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>{message}</Text>
            <Pressable
              style={[styles.outlineButton, { borderColor: 'rgba(255,255,255,0.1)' }]}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={[styles.outlineButtonText, { color: colors.textSecondary }]}>
                Go Home
              </Text>
            </Pressable>
          </View>
        )}

        {/* Not logged in */}
        {status === 'no-auth' && (
          <View style={styles.stateContainer}>
            {renderIcon('alert-circle-outline', 'rgba(255,255,255,0.4)')}
            <Text style={[styles.stateTitle, { color: colors.text }]}>Login Required</Text>
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>{message}</Text>
            <Pressable
              style={[styles.primaryButton, { borderColor: 'rgba(255,255,255,0.1)' }]}
              onPress={() => router.replace('/(auth)' as any)}
            >
              <Text style={styles.primaryButtonText}>Log In</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  stateContainer: { alignItems: 'center', maxWidth: 340, width: '100%' },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stateTitle: { fontSize: 20, fontFamily: fontFamily.bold, marginBottom: 8 },
  stateText: { fontSize: 14, fontFamily: fontFamily.regular, textAlign: 'center', marginBottom: 12 },
  hint: { fontSize: 12, fontFamily: fontFamily.regular, textAlign: 'center', marginBottom: 16 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 8,
  },
  primaryButtonText: { fontSize: 15, fontFamily: fontFamily.semiBold, color: 'white' },
  outlineButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginTop: 8,
  },
  outlineButtonText: { fontSize: 15, fontFamily: fontFamily.semiBold },
});
