/**
 * Update Password Screen â€” Phase 4.2
 *
 * Handles deep-link from password reset email.
 * Validates session recovery â†’ allows password update â†’ signs out â†’ redirects to auth.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { supabase } from '@/lib/adapters/core-client';

type ScreenState = 'verifying' | 'ready' | 'error';

export default function UpdatePasswordScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const [screenState, setScreenState] = useState<ScreenState>('verifying');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const confirmRef = useRef<TextInput>(null);

  // Check for valid recovery session on mount
  useEffect(() => {
    const checkSession = async () => {
      setSessionError(null);

      const { data, error: sessionErr } = await supabase.auth.getSession();

      if (sessionErr) {
        setSessionError("Couldn't verify your reset link. Please try again.");
        setScreenState('error');
        return;
      }

      if (data.session) {
        setScreenState('ready');
        return;
      }
    };

    checkSession();

    // Listen for PASSWORD_RECOVERY event
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setScreenState('ready');
      }
    });

    // Timeout: if no session after 5s, show error
    const timeout = setTimeout(() => {
      setScreenState((prev) => {
        if (prev === 'verifying') {
          setSessionError('Invalid or expired reset link. Please request a new one.');
          return 'error';
        }
        return prev;
      });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const validatePassword = (value: string) => {
    if (!value) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    if (/\s/.test(value)) return 'Password cannot contain spaces';
    return '';
  };

  const handleSubmit = async () => {
    setError('');

    const validation = validatePassword(password);
    if (validation) {
      setError(validation);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      Alert.alert('Password updated', 'Your password has been changed. Please sign in again.', [
        {
          text: 'OK',
          onPress: async () => {
            await supabase.auth.signOut({ scope: 'local' });
            router.replace('/(auth)' as any);
          },
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      setError(message);
      setIsSubmitting(false);
    }
  };

  // â”€â”€ Verifying state â”€â”€
  if (screenState === 'verifying') {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.textSecondary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Verifying reset link...
        </Text>
      </View>
    );
  }

  // â”€â”€ Error state â”€â”€
  if (screenState === 'error') {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={48} color="rgba(255,255,255,0.4)" />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Invalid Link</Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {sessionError || 'Unable to verify reset link'}
        </Text>
        <Pressable
          style={[styles.button, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.1)' }]}
          onPress={() => router.replace('/(auth)' as any)}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>Back to Login</Text>
        </Pressable>
      </View>
    );
  }

  // â”€â”€ Ready state â€” password form â”€â”€
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <Text style={[styles.logo, { color: colors.text }]}>clstr</Text>

        {/* Card */}
        <View style={[styles.card, { borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Set new password</Text>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            Enter your new password below
          </Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#ef4444" />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* Password field */}
          <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
          <View style={[styles.inputRow, { borderColor: 'rgba(255,255,255,0.12)' }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="Enter new password"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="rgba(255,255,255,0.4)"
              />
            </Pressable>
          </View>
          <Text style={[styles.hint, { color: colors.textTertiary }]}>
            Must be at least 6 characters long
          </Text>

          {/* Confirm password field */}
          <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>
            Confirm New Password
          </Text>
          <View style={[styles.inputRow, { borderColor: 'rgba(255,255,255,0.12)' }]}>
            <TextInput
              ref={confirmRef}
              style={[styles.input, { color: colors.text }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            <Pressable
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="rgba(255,255,255,0.4)"
              />
            </Pressable>
          </View>

          {/* Submit */}
          <Pressable
            style={[
              styles.submitButton,
              {
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderColor: 'rgba(255,255,255,0.15)',
                opacity: isSubmitting ? 0.6 : 1,
              },
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="white" />
                <Text style={styles.submitText}>Update password</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  scrollContent: { paddingHorizontal: 24, alignItems: 'center' },
  logo: { fontSize: fontSize['2xl'], fontFamily: fontFamily.bold, marginBottom: 24 },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 24,
  },
  cardTitle: { fontSize: fontSize.xl, fontFamily: fontFamily.bold },
  cardDesc: { fontSize: fontSize.base, fontFamily: fontFamily.regular, marginTop: 4 },
  label: { fontSize: fontSize.base, fontFamily: fontFamily.semiBold, marginTop: 20, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    height: 46,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
  },
  eyeButton: { paddingHorizontal: 12 },
  hint: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, marginTop: 4 },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 24,
    gap: 8,
  },
  submitText: { fontSize: fontSize.body, fontFamily: fontFamily.semiBold, color: 'white' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  errorBannerText: { fontSize: fontSize.md, color: '#ef4444', fontFamily: fontFamily.regular, flex: 1 },
  loadingText: { fontSize: fontSize.base, fontFamily: fontFamily.regular, marginTop: 12 },
  errorTitle: { fontSize: fontSize.xl, fontFamily: fontFamily.bold, marginTop: 16 },
  errorMessage: { fontSize: fontSize.base, fontFamily: fontFamily.regular, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 20,
  },
  buttonText: { fontSize: fontSize.body, fontFamily: fontFamily.semiBold },
});
