/**
 * SignupScreen — Email + password registration for CLSTR mobile.
 *
 * Confirm-password validation, design tokens, useAuth().signUp(),
 * navigates to VerifyEmail on success.
 * Includes "Continue with Google" via native Google Sign-In.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import Svg, { Path } from 'react-native-svg';

import { tokens } from '../../design/tokens';
import { useAuth } from '../../hooks/useAuth';
import type { AuthStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Signup'>;

/** Compact Google "G" logo rendered as SVG (no external image needed) */
function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

export function SignupScreen() {
  const navigation = useNavigation<Nav>();
  const { signUp, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      Toast.show({ type: 'error', text1: 'Please fill in all fields' });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Passwords do not match' });
      return;
    }

    if (password.length < 6) {
      Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    const { error } = await signUp(email.trim(), password);
    setLoading(false);

    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Sign Up Failed',
        text2: error.message,
      });
      return;
    }

    // Navigate to email verification screen
    Toast.show({ type: 'success', text1: 'Check your email for a verification link' });
    navigation.navigate('VerifyEmail', { email: email.trim() });
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);

    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Google Sign Up Failed',
        text2: error.message,
      });
    }
    // On success, onAuthStateChange in useAuth picks up the new session.
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Heading */}
        <Text style={styles.heading}>Create account</Text>
        <Text style={styles.subheading}>Join the CLSTR campus network</Text>

        {/* Continue with Google */}
        <TouchableOpacity
          style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
          onPress={handleGoogleSignUp}
          disabled={googleLoading}
          activeOpacity={0.8}
        >
          {googleLoading ? (
            <ActivityIndicator color={tokens.colors.dark.foreground} />
          ) : (
            <>
              <GoogleIcon />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@university.edu"
          placeholderTextColor={tokens.colors.dark.mutedForeground}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
        />

        {/* Password */}
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="At least 6 characters"
          placeholderTextColor={tokens.colors.dark.mutedForeground}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
        />

        {/* Confirm Password */}
        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Re-enter your password"
          placeholderTextColor={tokens.colors.dark.mutedForeground}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          textContentType="newPassword"
        />

        {/* Sign up button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={tokens.colors.dark.primaryForeground} />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        {/* Navigate to login */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.dark.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.lg,
  },
  heading: {
    fontSize: tokens.typography.fontSize['3xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.dark.foreground,
    marginBottom: tokens.spacing.xs,
  },
  subheading: {
    fontSize: tokens.typography.fontSize.base,
    color: tokens.colors.dark.mutedForeground,
    marginBottom: tokens.spacing.xl,
  },
  label: {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.dark.foreground,
    marginBottom: tokens.spacing.xs,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: tokens.colors.dark.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    color: tokens.colors.dark.foreground,
    fontSize: tokens.typography.fontSize.base,
    backgroundColor: tokens.colors.dark.input,
    marginBottom: tokens.spacing.md,
  },
  link: {
    color: tokens.colors.dark.primary,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  googleButton: {
    height: 48,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.dark.card,
    borderWidth: 1,
    borderColor: tokens.colors.dark.border,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: tokens.spacing.md,
  },
  googleButtonText: {
    color: tokens.colors.dark.foreground,
    fontSize: tokens.typography.fontSize.base,
    fontWeight: tokens.typography.fontWeight.medium,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: tokens.colors.dark.border,
  },
  dividerText: {
    color: tokens.colors.dark.mutedForeground,
    fontSize: tokens.typography.fontSize.sm,
    marginHorizontal: tokens.spacing.md,
  },
  button: {
    height: 48,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: tokens.colors.dark.primaryForeground,
    fontSize: tokens.typography.fontSize.base,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    color: tokens.colors.dark.mutedForeground,
    fontSize: tokens.typography.fontSize.sm,
  },
});
