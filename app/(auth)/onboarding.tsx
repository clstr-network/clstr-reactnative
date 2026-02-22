import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth, type UserRole } from '@/lib/auth-context';
import { colors } from '@/constants/colors';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useAuth();
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [bio, setBio] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = fullName.trim().length >= 2 && department.trim().length >= 2;

  async function handleComplete() {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await completeOnboarding({
        fullName: fullName.trim(),
        department: department.trim(),
        graduationYear: graduationYear.trim(),
        bio: bio.trim(),
        role,
      });
      router.replace('/');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 40) }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.step}>Step 1 of 1</Text>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>Tell your college network a bit about yourself</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.roleSelector}>
            <Pressable
              style={[styles.roleOption, role === 'student' && styles.roleOptionActive]}
              onPress={() => setRole('student')}
            >
              <Ionicons name="school-outline" size={20} color={role === 'student' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.roleText, role === 'student' && styles.roleTextActive]}>Student</Text>
            </Pressable>
            <Pressable
              style={[styles.roleOption, role === 'faculty' && styles.roleOptionActive]}
              onPress={() => setRole('faculty')}
            >
              <Ionicons name="briefcase-outline" size={20} color={role === 'faculty' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.roleText, role === 'faculty' && styles.roleTextActive]}>Faculty</Text>
            </Pressable>
            <Pressable
              style={[styles.roleOption, role === 'alumni' && styles.roleOptionActive]}
              onPress={() => setRole('alumni')}
            >
              <Ionicons name="ribbon-outline" size={20} color={role === 'alumni' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.roleText, role === 'alumni' && styles.roleTextActive]}>Alumni</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Full Name *</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              placeholderTextColor={colors.textTertiary}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.label}>Department *</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="e.g., Computer Science"
              placeholderTextColor={colors.textTertiary}
              value={department}
              onChangeText={setDepartment}
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.label}>Graduation Year</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="e.g., 2026"
              placeholderTextColor={colors.textTertiary}
              value={graduationYear}
              onChangeText={setGraduationYear}
              keyboardType="numeric"
              maxLength={4}
            />
          </View>

          <Text style={styles.label}>Bio</Text>
          <View style={[styles.inputContainer, styles.bioContainer]}>
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Tell us about yourself..."
              placeholderTextColor={colors.textTertiary}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.completeButton,
              !isValid && styles.completeButtonDisabled,
              pressed && isValid && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleComplete}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text style={styles.completeButtonText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </>
            )}
          </Pressable>
        </View>

        <View style={{ height: insets.bottom + (Platform.OS === 'web' ? 34 : 20) }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 28,
  },
  step: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 6,
  },
  form: {
    gap: 12,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
  },
  roleOptionActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  roleText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  roleTextActive: {
    color: colors.primary,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
    marginTop: 4,
  },
  inputContainer: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  input: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
  },
  bioContainer: {
    minHeight: 80,
  },
  bioInput: {
    minHeight: 70,
  },
  completeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  completeButtonDisabled: {
    opacity: 0.4,
  },
  completeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
});
