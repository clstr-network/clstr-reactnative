import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Button,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@/lib/auth-context';
import { fontFamily, fontSize } from '@/constants/typography';

// ---------------------------------------------------------------------------
// Google "G" icon — matches web Login page exactly
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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithGoogle, setMockSession } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (__DEV__) {
      console.log('[LoginScreen] rendered');
    }
  }, []);

  async function handleGoogleLogin() {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await signInWithGoogle();
      // Auth state change will trigger the root layout guard to redirect
    } catch (e: any) {
      setError(e.message || 'Google sign-in failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleMockLogin = () => {
    setMockSession();
    router.replace('/');
  };

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
        {/* Main content — centered card */}
        <View style={styles.card}>
          {/* Logo */}
          <Text style={styles.logoText}>Clstr</Text>

          {/* Welcome text */}
          <View style={styles.welcomeBlock}>
            <Text style={styles.title}>Welcome to{'\n'}clstr</Text>
            <Text style={styles.subtitle}>Your college's private network</Text>
          </View>

          {/* New user signal */}
          <Text style={styles.hint}>
            New here? Your college email creates your account automatically.
          </Text>

          {!!error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Google sign-in button — matches web exactly */}
          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleGoogleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <View style={styles.googleButtonInner}>
                <GoogleIcon size={18} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </View>
            )}
          </Pressable>

          {process.env.EXPO_PUBLIC_AUTH_MODE === 'mock' && (
            <Button
              title="Continue as Mock User"
              onPress={handleMockLogin}
            />
          )}

          {/* Helper text */}
          <Text style={styles.helperText}>
            Only verified college email accounts are allowed
          </Text>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 20) }]}>
          <Text style={styles.footerLink}>Privacy Policy</Text>
          <Text style={styles.footerDivider}>|</Text>
          <Text style={styles.footerLink}>Terms</Text>
          <Text style={styles.footerDivider}>|</Text>
          <Text style={styles.footerLink}>Why college email?</Text>
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
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 24,
    padding: 32,
    gap: 16,
  },
  logoText: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  welcomeBlock: {
    gap: 8,
  },
  title: {
    fontSize: 34,
    fontFamily: fontFamily.bold,
    color: '#FFFFFF',
    lineHeight: 40,
  },
  subtitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    color: 'rgba(255, 255, 255, 0.60)',
  },
  hint: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: 'rgba(255, 255, 255, 0.60)',
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
    marginTop: 4,
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
  helperText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: 'rgba(255, 255, 255, 0.45)',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    gap: 8,
  },
  footerLink: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  footerDivider: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.30)',
  },
});
