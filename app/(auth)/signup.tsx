import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@/lib/auth-context';

// ---------------------------------------------------------------------------
// Google "G" icon — matches web exactly
// ---------------------------------------------------------------------------
function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithGoogle, signInWithOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingMethod, setSubmittingMethod] = useState<'google' | 'magic' | null>(null);
  const [error, setError] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const isValidEmail = email.includes('@') && email.includes('.');

  async function handleGoogleSignup() {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    setSubmittingMethod('google');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e.message || 'Google sign-up failed');
    } finally {
      setIsSubmitting(false);
      setSubmittingMethod(null);
    }
  }

  async function handleMagicLink() {
    if (!isValidEmail || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    setSubmittingMethod('magic');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { error: otpError } = await signInWithOtp(email.trim().toLowerCase());
      if (otpError) throw otpError;
      setMagicLinkSent(true);
    } catch (e: any) {
      setError(e.message || 'Failed to send magic link');
    } finally {
      setIsSubmitting(false);
      setSubmittingMethod(null);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 60) }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.7)" />
        </Pressable>

        {/* Card */}
        <View style={styles.card}>
          {/* Header */}
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Use your college email to join your campus network.
          </Text>

          {!!error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Google sign-up button */}
          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleGoogleSignup}
            disabled={isSubmitting}
          >
            {submittingMethod === 'google' ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <View style={styles.googleButtonInner}>
                <GoogleIcon size={18} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </View>
            )}
          </Pressable>

          {/* Separator */}
          <View style={styles.separatorRow}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>or use a magic link</Text>
            <View style={styles.separatorLine} />
          </View>

          {magicLinkSent ? (
            /* Success state */
            <View style={styles.successContainer}>
              <Ionicons name="mail-open-outline" size={32} color="rgba(255,255,255,0.6)" />
              <Text style={styles.successTitle}>Check your inbox</Text>
              <Text style={styles.successBody}>
                We sent a magic link to {email}. Click the link in the email to sign in.
              </Text>
              <Pressable
                style={styles.resendButton}
                onPress={() => { setMagicLinkSent(false); }}
              >
                <Text style={styles.resendText}>Use a different email</Text>
              </Pressable>
            </View>
          ) : (
            /* Magic link form */
            <View style={styles.magicForm}>
              <Text style={styles.inputLabel}>College email</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={16} color="rgba(255,255,255,0.40)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="you@university.edu"
                  placeholderTextColor="rgba(255,255,255,0.30)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isSubmitting}
                />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.magicButton,
                  !isValidEmail && styles.magicButtonDisabled,
                  pressed && isValidEmail && { opacity: 0.9 },
                ]}
                onPress={handleMagicLink}
                disabled={!isValidEmail || isSubmitting}
              >
                {submittingMethod === 'magic' ? (
                  <ActivityIndicator color="rgba(255,255,255,0.7)" size="small" />
                ) : (
                  <Text style={styles.magicButtonText}>Send magic link</Text>
                )}
              </Pressable>
            </View>
          )}

          {/* Footer link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.footerLink}> Sign in</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000000' },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 24,
    padding: 28,
    gap: 14,
  },
  title: {
    fontSize: fontSize['4xl'],
    fontFamily: fontFamily.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: 'rgba(255, 255, 255, 0.60)',
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 10,
  },
  errorText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.medium,
    color: '#EF4444',
    flex: 1,
  },
  googleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  googleButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  googleButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: '#FFFFFF',
  },
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 2,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  separatorText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: 'rgba(255, 255, 255, 0.60)',
  },
  magicForm: {
    gap: 10,
  },
  inputLabel: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  inputIcon: {
    paddingLeft: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 10,
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    color: '#FFFFFF',
  },
  magicButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 2,
  },
  magicButtonDisabled: {
    opacity: 0.4,
  },
  magicButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.medium,
    color: 'rgba(255, 255, 255, 0.80)',
  },
  successContainer: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  successTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.semiBold,
    color: '#FFFFFF',
  },
  successBody: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: 'rgba(255, 255, 255, 0.60)',
    textAlign: 'center',
    lineHeight: 20,
  },
  resendButton: {
    marginTop: 4,
  },
  resendText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.medium,
    color: 'rgba(255, 255, 255, 0.60)',
    textDecorationLine: 'underline',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  footerText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: 'rgba(255, 255, 255, 0.60)',
  },
  footerLink: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.medium,
    color: 'rgba(255, 255, 255, 0.60)',
    textDecorationLine: 'underline',
  },
});
