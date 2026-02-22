import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, useColorScheme, Platform, ScrollView, KeyboardAvoidingView
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useThemeColors, getRoleBadgeColor } from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { setOnboardingComplete, type UserRole } from '@/lib/storage';

const ROLES: { role: UserRole; icon: keyof typeof Ionicons.glyphMap; label: string; desc: string }[] = [
  { role: 'student', icon: 'school-outline', label: 'Student', desc: 'Currently enrolled' },
  { role: 'faculty', icon: 'briefcase-outline', label: 'Faculty', desc: 'Professor or staff' },
  { role: 'alumni', icon: 'ribbon-outline', label: 'Alumni', desc: 'Graduated member' },
];

const DEPARTMENTS = [
  'Computer Science', 'Engineering', 'Business', 'Design', 'Mathematics',
  'Physics', 'Biology', 'Psychology', 'Economics', 'Communications',
];

export default function OnboardingScreen() {
  const colors = useThemeColors(useColorScheme());
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [department, setDepartment] = useState('');
  const [bio, setBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step < 2) setStep(step + 1);
    else handleComplete();
  };

  const handleComplete = async () => {
    if (!selectedRole || !name.trim() || !department) return;
    setIsSubmitting(true);
    try {
      await signUp({ name: name.trim(), role: selectedRole, department, bio: bio.trim() });
      await setOnboardingComplete();
      router.replace('/(tabs)');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = step === 0 ? !!name.trim() : step === 1 ? !!selectedRole : !!department;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + webTopInset }]}>
        <View style={styles.progressBar}>
          {[0, 1, 2].map(i => (
            <View
              key={i}
              style={[styles.progressDot, { backgroundColor: i <= step ? colors.tint : colors.border }]}
            />
          ))}
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollInner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContent}>
              <Ionicons name="person-circle-outline" size={64} color={colors.tint} />
              <Text style={[styles.title, { color: colors.text }]}>What's your name?</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>This is how others will see you on clstr</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceElevated, color: colors.text, borderColor: colors.border }]}
                placeholder="Full name"
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={setName}
                autoFocus
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => { if (name.trim()) handleNext(); }}
              />
            </Animated.View>
          )}

          {step === 1 && (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContent}>
              <Ionicons name="people-circle-outline" size={64} color={colors.tint} />
              <Text style={[styles.title, { color: colors.text }]}>Select your role</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>This helps personalize your experience</Text>
              <View style={styles.rolesGrid}>
                {ROLES.map(r => {
                  const badgeColor = getRoleBadgeColor(r.role, colors);
                  const isSelected = selectedRole === r.role;
                  return (
                    <Pressable
                      key={r.role}
                      onPress={() => { setSelectedRole(r.role); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={[
                        styles.roleCard,
                        {
                          backgroundColor: isSelected ? badgeColor + '15' : colors.surfaceElevated,
                          borderColor: isSelected ? badgeColor : colors.border,
                        },
                      ]}
                    >
                      <Ionicons name={r.icon} size={32} color={isSelected ? badgeColor : colors.textSecondary} />
                      <Text style={[styles.roleLabel, { color: isSelected ? badgeColor : colors.text }]}>{r.label}</Text>
                      <Text style={[styles.roleDesc, { color: colors.textTertiary }]}>{r.desc}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {step === 2 && (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.stepContent}>
              <Ionicons name="library-outline" size={64} color={colors.tint} />
              <Text style={[styles.title, { color: colors.text }]}>Your department</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Select or type your department</Text>
              <View style={styles.deptGrid}>
                {DEPARTMENTS.map(d => (
                  <Pressable
                    key={d}
                    onPress={() => { setDepartment(d); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[
                      styles.deptChip,
                      {
                        backgroundColor: department === d ? colors.tint + '20' : colors.surfaceElevated,
                        borderColor: department === d ? colors.tint : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.deptText, { color: department === d ? colors.tint : colors.text }]}>{d}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={[styles.input, styles.bioInput, { backgroundColor: colors.surfaceElevated, color: colors.text, borderColor: colors.border }]}
                placeholder="Short bio (optional)"
                placeholderTextColor={colors.textTertiary}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </Animated.View>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + webBottomInset + 16 }]}>
          {step > 0 && (
            <Pressable onPress={() => setStep(step - 1)} style={styles.backBtn} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color={colors.textSecondary} />
            </Pressable>
          )}
          <Pressable
            onPress={handleNext}
            disabled={!canProceed || isSubmitting}
            style={({ pressed }) => [
              styles.nextBtn,
              { backgroundColor: canProceed ? colors.tint : colors.border },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.nextText, { color: canProceed ? '#fff' : colors.textTertiary }]}>
              {step === 2 ? (isSubmitting ? 'Setting up...' : 'Get Started') : 'Continue'}
            </Text>
            {step < 2 && <Ionicons name="arrow-forward" size={18} color={canProceed ? '#fff' : colors.textTertiary} />}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressBar: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  progressDot: { width: 32, height: 4, borderRadius: 2 },
  scrollContent: { flex: 1 },
  scrollInner: { paddingBottom: 40 },
  stepContent: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 40 },
  title: { fontSize: 26, fontWeight: '800', marginTop: 20, textAlign: 'center' },
  subtitle: { fontSize: 15, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  input: {
    width: '100%', borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, marginTop: 24,
  },
  bioInput: { minHeight: 80, paddingTop: 14 },
  rolesGrid: { width: '100%', gap: 12, marginTop: 24 },
  roleCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14,
    borderWidth: 1.5, gap: 12,
  },
  roleLabel: { fontSize: 17, fontWeight: '700', flex: 1 },
  roleDesc: { fontSize: 13 },
  deptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20, justifyContent: 'center' },
  deptChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  deptText: { fontSize: 14, fontWeight: '500' },
  footer: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, gap: 12,
  },
  backBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  nextBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 14, gap: 8,
  },
  nextText: { fontSize: 16, fontWeight: '700' },
});
