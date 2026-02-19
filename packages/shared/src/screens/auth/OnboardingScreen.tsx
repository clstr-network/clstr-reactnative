/**
 * OnboardingScreen — Post-signup profile setup for CLSTR mobile.
 *
 * Collects Name, Role (Student/Faculty/Alumni), and College,
 * then upserts into Supabase `profiles` table and navigates to Main.
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
  ScrollView,
  StyleSheet,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import { useOnboarding } from '../../navigation/OnboardingContext';
import { tokens } from '../../design/tokens';

const ROLES = ['Student', 'Faculty', 'Alumni'] as const;
type Role = (typeof ROLES)[number];

export function OnboardingScreen() {
  const { user } = useAuth();
  const { markOnboarded } = useOnboarding();

  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [college, setCollege] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!fullName.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter your name' });
      return;
    }
    if (!role) {
      Toast.show({ type: 'error', text1: 'Please select a role' });
      return;
    }
    if (!college.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter your college' });
      return;
    }
    if (!user) {
      Toast.show({ type: 'error', text1: 'Session expired — please sign in again' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName.trim(),
      role: role.toLowerCase(),
      university: college.trim(),
      onboarded: true,
    });
    setLoading(false);

    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not save profile',
        text2: error.message,
      });
      return;
    }

    // RootNavigator will react to isOnboarded becoming true and
    // switch from Onboarding → Main automatically.
    markOnboarded();
    Toast.show({ type: 'success', text1: 'Welcome to CLSTR!' });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Set up your profile</Text>
        <Text style={styles.subheading}>Tell us a bit about yourself</Text>

        {/* Full Name */}
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your full name"
          placeholderTextColor={tokens.colors.dark.mutedForeground}
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          textContentType="name"
        />

        {/* Role selector */}
        <Text style={styles.label}>Role</Text>
        <View style={styles.roleRow}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleChip, role === r && styles.roleChipActive]}
              onPress={() => setRole(r)}
              activeOpacity={0.8}
            >
              <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* College */}
        <Text style={styles.label}>College / University</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. IIT Delhi"
          placeholderTextColor={tokens.colors.dark.mutedForeground}
          value={college}
          onChangeText={setCollege}
          autoCapitalize="words"
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleComplete}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={tokens.colors.dark.primaryForeground} />
          ) : (
            <Text style={styles.buttonText}>Get Started</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.dark.background,
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.xl,
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
  roleRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
  },
  roleChip: {
    flex: 1,
    height: 44,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.dark.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: tokens.colors.dark.input,
  },
  roleChipActive: {
    borderColor: tokens.colors.dark.primary,
    backgroundColor: tokens.colors.dark.primary + '20',
  },
  roleText: {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.dark.mutedForeground,
  },
  roleTextActive: {
    color: tokens.colors.dark.primary,
  },
  button: {
    height: 48,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: tokens.spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: tokens.colors.dark.primaryForeground,
    fontSize: tokens.typography.fontSize.base,
    fontWeight: tokens.typography.fontWeight.semibold,
  },
});
