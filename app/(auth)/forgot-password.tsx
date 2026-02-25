/**
 * ForgotPasswordScreen — Sends password reset email via Supabase.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/adapters/core-client';
import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';

export default function ForgotPasswordScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const isValid = email.includes('@') && email.includes('.');

  async function handleReset() {
    if (!isValid || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const redirectTo = Linking.createURL('auth/callback');
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (err) throw new Error(err.message);
      setSent(true);
    } catch (e: any) {
      setError(e.message || 'Failed to send reset email');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={[styles.container, {
          paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 40),
        }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        {sent ? (
          <View style={styles.sentContainer}>
            <View style={[styles.iconCircle, { backgroundColor: colors.tint + '15' }]}>
              <Ionicons name="mail-outline" size={40} color={colors.tint} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Check your email</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              We sent a password reset link to{'\n'}
              <Text style={{ fontFamily: fontFamily.semiBold }}>{email}</Text>
            </Text>
            <Pressable
              style={[styles.primaryButton, { backgroundColor: colors.tint }]}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.primaryButtonText}>Back to Sign In</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={[styles.title, { color: colors.text }]}>Forgot password?</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter your email and we&apos;ll send you a reset link
            </Text>

            {!!error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            )}

            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="College email"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: isValid ? colors.tint : colors.surface },
                pressed && isValid && { opacity: 0.9 },
              ]}
              onPress={handleReset}
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={[styles.primaryButtonText, { color: isValid ? '#FFF' : colors.textTertiary }]}>
                  Send Reset Link
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  sentContainer: { alignItems: 'center', marginTop: 60, gap: 16 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  form: { gap: 16, marginTop: 20 },
  title: { fontSize: fontSize['3xl'], fontFamily: fontFamily.bold, textAlign: 'center' },
  subtitle: { fontSize: fontSize.base, fontFamily: fontFamily.regular, textAlign: 'center', lineHeight: 20 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 10 },
  errorText: { fontSize: fontSize.md, fontFamily: fontFamily.medium, flex: 1 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1 },
  inputIcon: { paddingLeft: 14 },
  input: { flex: 1, paddingVertical: 15, paddingHorizontal: 12, fontSize: fontSize.body, fontFamily: fontFamily.regular },
  primaryButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  primaryButtonText: { fontSize: fontSize.lg, fontFamily: fontFamily.semiBold, color: '#FFFFFF' },
});
