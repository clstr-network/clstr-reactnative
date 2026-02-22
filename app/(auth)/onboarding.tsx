/**
 * OnboardingScreen — Multi-step profile setup after signup.
 *
 * Step 0: Full name
 * Step 1: Role selection (Student / Faculty / Alumni)
 * Step 2: Department / Major selection
 * Step 3: Bio (optional)
 *
 * Calls completeOnboarding() from auth-context which creates the
 * profile record via @clstr/core. Identity context then reflects
 * needsOnboarding = false automatically.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useThemeColors } from '@/constants/colors';
import { useAuth, type UserRole } from '@/lib/auth-context';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLES: { value: UserRole; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { value: 'Student', label: 'Student', icon: 'school-outline', desc: 'Currently enrolled at the university' },
  { value: 'Faculty', label: 'Faculty', icon: 'library-outline', desc: 'Teaching or researching at the university' },
  { value: 'Alumni', label: 'Alumni', icon: 'ribbon-outline', desc: 'Graduated from the university' },
];

const DEPARTMENTS = [
  'Computer Science', 'Engineering', 'Business', 'Mathematics', 'Physics',
  'Biology', 'Design', 'Psychology', 'Economics', 'Communications',
];

const TOTAL_STEPS = 4;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function OnboardingScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useAuth();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [department, setDepartment] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Validation per step
  const canProceed =
    (step === 0 && name.trim().length >= 2) ||
    (step === 1 && !!role) ||
    (step === 2 && !!department) ||
    step === 3;

  async function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (step === 0 && name.trim().length < 2) {
      Alert.alert('Name Required', 'Please enter your full name');
      return;
    }
    if (step === 1 && !role) {
      Alert.alert('Role Required', 'Please select your role');
      return;
    }
    if (step === 2 && !department) {
      Alert.alert('Department Required', 'Please select your department');
      return;
    }

    // Not on the last step — just advance
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
      return;
    }

    // Last step — submit
    setIsLoading(true);
    try {
      await completeOnboarding({
        fullName: name.trim(),
        role: role!,
        department,
        bio: bio.trim(),
      });
      // Auth guard in root layout will redirect to main automatically
      // once identity.needsOnboarding flips to false.
      router.replace('/');
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      console.error('[Onboarding]', e);
    } finally {
      setIsLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + webTopInset + 40,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 24,
        }}
        bottomOffset={20}
      >
        {/* Progress bar */}
        <View style={styles.progressRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                { backgroundColor: i <= step ? colors.tint : colors.border },
              ]}
            />
          ))}
        </View>

        {/* Step 0 — Name */}
        {step === 0 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>What's your name?</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
              This will be shown on your profile
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              placeholder="Full name"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoFocus
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={handleNext}
            />
          </View>
        )}

        {/* Step 1 — Role */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>What's your role?</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
              This helps us personalize your experience
            </Text>
            <View style={styles.roleList}>
              {ROLES.map((r) => {
                const isSelected = role === r.value;
                const accent = isSelected ? colors.tint : colors.textTertiary;
                return (
                  <Pressable
                    key={r.value}
                    onPress={() => { setRole(r.value); Haptics.selectionAsync(); }}
                    style={[
                      styles.roleCard,
                      {
                        backgroundColor: isSelected ? colors.tint + '12' : colors.surface,
                        borderColor: isSelected ? colors.tint : colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.roleIcon, { backgroundColor: accent + '15' }]}>
                      <Ionicons name={r.icon} size={24} color={accent} />
                    </View>
                    <View style={styles.roleInfo}>
                      <Text style={[styles.roleLabel, { color: colors.text }]}>{r.label}</Text>
                      <Text style={[styles.roleDesc, { color: colors.textSecondary }]}>{r.desc}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.tint} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Step 2 — Department */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Your department?</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
              Select your primary department
            </Text>
            <View style={styles.deptGrid}>
              {DEPARTMENTS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => { setDepartment(d); Haptics.selectionAsync(); }}
                  style={[
                    styles.deptChip,
                    {
                      backgroundColor: department === d ? colors.tint : colors.surface,
                      borderColor: department === d ? colors.tint : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.deptText, { color: department === d ? '#fff' : colors.textSecondary }]}>
                    {d}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Step 3 — Bio */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Tell us about yourself</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
              Optional — you can always update this later
            </Text>
            <TextInput
              style={[styles.input, styles.bioInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              placeholder="A brief bio about you..."
              placeholderTextColor={colors.textTertiary}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        )}
      </KeyboardAwareScrollViewCompat>

      {/* Bottom action bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16), backgroundColor: colors.background }]}>
        <View style={styles.bottomActions}>
          {step > 0 && (
            <Pressable
              onPress={() => { setStep(step - 1); Haptics.selectionAsync(); }}
              style={[styles.backBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>
          )}
          <Pressable
            onPress={handleNext}
            disabled={!canProceed || isLoading}
            style={({ pressed }) => [
              styles.nextBtn,
              { backgroundColor: canProceed ? colors.tint : colors.surface, flex: 1 },
              pressed && canProceed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.nextText, { color: canProceed ? '#fff' : colors.textTertiary }]}>
              {isLoading ? 'Setting up...' : step === TOTAL_STEPS - 1 ? 'Get Started' : 'Continue'}
            </Text>
            {!isLoading && <Ionicons name="arrow-forward" size={18} color={canProceed ? '#fff' : colors.textTertiary} />}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  progressRow: { flexDirection: 'row', gap: 8, marginBottom: 40 },
  progressDot: { flex: 1, height: 4, borderRadius: 2 },
  stepContent: { gap: 12 },
  stepTitle: { fontSize: 28, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  stepDesc: { fontSize: 15, lineHeight: 22, marginBottom: 8, fontFamily: 'Inter_400Regular' },
  input: { fontSize: 16, padding: 16, borderRadius: 14, borderWidth: 1, fontFamily: 'Inter_400Regular' },
  bioInput: { minHeight: 120 },
  roleList: { gap: 12 },
  roleCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1.5, gap: 14,
  },
  roleIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  roleInfo: { flex: 1, gap: 2 },
  roleLabel: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  roleDesc: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  deptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  deptChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, borderWidth: 1 },
  deptText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  bottomBar: { paddingHorizontal: 24, paddingTop: 12 },
  bottomActions: { flexDirection: 'row', gap: 12 },
  backBtn: {
    width: 48, height: 48, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  nextBtn: {
    height: 48, borderRadius: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  nextText: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});
