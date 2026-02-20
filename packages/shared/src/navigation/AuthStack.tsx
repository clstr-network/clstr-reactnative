/**
 * CLSTR Navigation — Auth Stack
 *
 * Screens shown before the user is authenticated.
 * Login and Signup use real implementations; remaining screens
 * are placeholders to be wired in later phases.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import type { AuthStackParamList } from './types';
import { tokens } from '../design/tokens';

// Real screen implementations
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignupScreen } from '../screens/auth/SignupScreen';
import { AuthCallbackScreen } from '../screens/auth/AuthCallbackScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

// ─── Placeholder Screens ─────────────────────────────────────
// These will be replaced by actual page components in later phases

const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>Coming soon</Text>
  </View>
);

const ForgotPasswordScreen = () => <PlaceholderScreen title="Forgot Password" />;
const VerifyEmailScreen = () => <PlaceholderScreen title="Verify Email" />;
const MagicLinkSentScreen = () => <PlaceholderScreen title="Magic Link Sent" />;
const UpdatePasswordScreen = () => <PlaceholderScreen title="Update Password" />;
const AcademicEmailRequiredScreen = () => <PlaceholderScreen title="Academic Email Required" />;
const VerifyPersonalEmailScreen = () => <PlaceholderScreen title="Verify Personal Email" />;
const ClubAuthScreen = () => <PlaceholderScreen title="Club Auth" />;
const ClubOnboardingScreen = () => <PlaceholderScreen title="Club Onboarding" />;
const AlumniInviteScreen = () => <PlaceholderScreen title="Alumni Invite" />;

// ─── Stack ───────────────────────────────────────────────────

export function AuthStack() {
  return (
    <Stack.Navigator
      id="AuthStack"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.colors.dark.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <Stack.Screen name="MagicLinkSent" component={MagicLinkSentScreen} />
      <Stack.Screen name="UpdatePassword" component={UpdatePasswordScreen} />
      <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} />
      <Stack.Screen name="AcademicEmailRequired" component={AcademicEmailRequiredScreen} />
      <Stack.Screen name="VerifyPersonalEmail" component={VerifyPersonalEmailScreen} />
      <Stack.Screen name="ClubAuth" component={ClubAuthScreen} />
      <Stack.Screen name="ClubOnboarding" component={ClubOnboardingScreen} />
      <Stack.Screen name="AlumniInvite" component={AlumniInviteScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: tokens.colors.dark.background,
  },
  title: {
    fontSize: tokens.typography.fontSize['2xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.dark.foreground,
    marginBottom: tokens.spacing.sm,
  },
  subtitle: {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.dark.mutedForeground,
  },
});
