/**
 * OnboardingScreen — Multi-step profile setup after signup.
 *
 * 8-step flow matching web's Onboarding.tsx:
 *   Step 0: Full Name (auto-filled from Google metadata)
 *   Step 1: Profile Picture (via AvatarPicker + useFileUpload)
 *   Step 2: University (autocomplete from @clstr/shared)
 *   Step 3: Major / Field (autocomplete from @clstr/shared)
 *   Step 4: Academic Timeline (enrollment year + course duration → auto graduation)
 *   Step 5: Interests (multi-select chips)
 *   Step 6: Social Links (collapsible section)
 *   Step 7: Bio (optional)
 *
 * Calls completeOnboarding() from auth-context which creates the profile
 * record + role-specific records. Identity context then reflects
 * needsOnboarding = false automatically.
 *
 * Phase 2.4d: Onboarding Parity Rewrite
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { useAuth, type UserRole } from '@/lib/auth-context';
import { useFileUpload } from '@/lib/hooks/useFileUpload';
import { Autocomplete } from '@/components/Autocomplete';
import { ChipPicker } from '@/components/ChipPicker';
import { AvatarPicker } from '@/components/AvatarPicker';
import { getUniversityOptions, getMajorOptions } from '@clstr/shared/utils/university-data';
import {
  determineUserRoleFromGraduation,
  calculateGraduationYear,
} from '@clstr/core/api/alumni-identification';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 8;

const PRESET_INTERESTS = [
  'Technology', 'Business', 'Design', 'Science', 'Arts',
  'Sports', 'Music', 'Photography', 'Writing', 'Cooking',
  'Travel', 'Volunteering',
];

const COURSE_DURATIONS = [1, 2, 3, 4, 5, 6, 7, 8];

const currentYear = new Date().getFullYear();
const ENROLLMENT_YEARS = Array.from({ length: 61 }, (_, i) => currentYear - i);

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function OnboardingScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { completeOnboarding, user } = useAuth();
  const { uploadImage, isUploading } = useFileUpload();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  // --- Form state ---
  const [step, setStep] = useState(0);
  const [name, setName] = useState(
    user?.user_metadata?.full_name ||
    `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim() ||
    '',
  );
  const [avatarUri, setAvatarUri] = useState<string | null>(
    user?.user_metadata?.avatar_url || null,
  );
  const [university, setUniversity] = useState('');
  const [universityLabel, setUniversityLabel] = useState('');
  const [major, setMajor] = useState('');
  const [majorLabel, setMajorLabel] = useState('');
  const [enrollmentYear, setEnrollmentYear] = useState('');
  const [courseDuration, setCourseDuration] = useState('4');
  const [interests, setInterests] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState({
    website: '',
    linkedin: '',
    twitter: '',
    facebook: '',
    instagram: '',
    googleScholar: '',
  });
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Memoized data ---
  const universityOptions = useMemo(() => getUniversityOptions(), []);
  const majorOptions = useMemo(() => getMajorOptions(), []);

  // Auto-calculate graduation year
  const calculatedGradYear = useMemo(() => {
    if (!enrollmentYear) return null;
    const dur = parseInt(courseDuration, 10) || 4;
    return calculateGraduationYear(parseInt(enrollmentYear, 10), dur);
  }, [enrollmentYear, courseDuration]);

  // Auto-determine role
  const autoRole = useMemo(() => {
    const gradYear = calculatedGradYear?.toString() || null;
    return determineUserRoleFromGraduation(gradYear);
  }, [calculatedGradYear]);

  // --- Validation per step ---
  const canProceed = useMemo(() => {
    switch (step) {
      case 0: return name.trim().length >= 2;
      case 1: return true; // Avatar is optional
      case 2: return universityLabel.length > 0;
      case 3: return majorLabel.length > 0;
      case 4: return !!enrollmentYear;
      case 5: return interests.length >= 1;
      case 6: return true; // Social links optional
      case 7: return true; // Bio optional
      default: return false;
    }
  }, [step, name, universityLabel, majorLabel, enrollmentYear, interests]);

  // --- Handlers ---
  const handleNext = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (step === 0 && name.trim().length < 2) {
      Alert.alert('Name Required', 'Please enter your full name');
      return;
    }
    if (step === 2 && !universityLabel) {
      Alert.alert('University Required', 'Please select your university');
      return;
    }
    if (step === 3 && !majorLabel) {
      Alert.alert('Major Required', 'Please select your major or field of study');
      return;
    }
    if (step === 4 && !enrollmentYear) {
      Alert.alert('Enrollment Year Required', 'Please select when you started');
      return;
    }
    if (step === 5 && interests.length < 1) {
      Alert.alert('Interests Required', 'Please select at least 1 interest');
      return;
    }

    // Not on the last step — advance
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
      return;
    }

    // Last step — submit
    setIsLoading(true);
    try {
      // Upload avatar to Supabase Storage if a local URI was picked
      let finalAvatarUrl: string | null = null;
      if (avatarUri && user?.id) {
        // Only upload if it's a local file (not already a remote URL)
        if (avatarUri.startsWith('file://') || avatarUri.startsWith('content://') || avatarUri.startsWith('data:') || avatarUri.startsWith('ph://')) {
          finalAvatarUrl = await uploadImage(avatarUri, user.id);
        } else {
          // Already a remote URL (e.g., from Google OAuth metadata)
          finalAvatarUrl = avatarUri;
        }
      }

      await completeOnboarding({
        fullName: name.trim(),
        role: autoRole,
        department: majorLabel,
        university: universityLabel,
        major: majorLabel,
        enrollmentYear,
        courseDurationYears: courseDuration,
        graduationYear: calculatedGradYear?.toString(),
        interests,
        socialLinks,
        bio: bio.trim(),
        avatarUrl: finalAvatarUrl,
      });

      router.replace('/');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong. Please try again.');
      console.error('[Onboarding]', e);
    } finally {
      setIsLoading(false);
    }
  }, [
    step, name, universityLabel, majorLabel, enrollmentYear, interests,
    avatarUri, user, uploadImage, completeOnboarding, autoRole,
    courseDuration, calculatedGradYear, socialLinks, bio,
  ]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (step > 0) setStep(step - 1);
  }, [step]);

  const updateSocialLink = useCallback((key: keyof typeof socialLinks, value: string) => {
    setSocialLinks((prev) => ({ ...prev, [key]: value }));
  }, []);

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

        {/* Step 0 — Full Name */}
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

        {/* Step 1 — Profile Picture */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Add a profile photo</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
              Help others recognize you — you can always change this later
            </Text>
            <View style={styles.avatarCenter}>
              <AvatarPicker
                avatarUrl={avatarUri}
                onImagePicked={setAvatarUri}
                onRemove={() => setAvatarUri(null)}
                size={140}
                colors={colors}
              />
            </View>
          </View>
        )}

        {/* Step 2 — University */}
        {step === 2 && (
          <View style={[styles.stepContent, { zIndex: 10 }]}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Your university?</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
              Start typing to search
            </Text>
            <Autocomplete
              options={universityOptions}
              value={universityLabel}
              onSelect={(val, label) => {
                setUniversity(val);
                setUniversityLabel(label);
              }}
              placeholder="Search universities..."
              colors={colors}
            />
          </View>
        )}

        {/* Step 3 — Major / Field */}
        {step === 3 && (
          <View style={[styles.stepContent, { zIndex: 10 }]}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Your major or field?</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
              Select your primary area of study
            </Text>
            <Autocomplete
              options={majorOptions}
              value={majorLabel}
              onSelect={(val, label) => {
                setMajor(val);
                setMajorLabel(label);
              }}
              placeholder="Search majors..."
              colors={colors}
            />
          </View>
        )}

        {/* Step 4 — Academic Timeline */}
        {step === 4 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Academic timeline</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
              Your enrollment year and course duration
            </Text>

            {/* Enrollment Year */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Enrollment Year
            </Text>
            <View style={styles.yearGrid}>
              {ENROLLMENT_YEARS.slice(0, 12).map((yr) => (
                <Pressable
                  key={yr}
                  onPress={() => { setEnrollmentYear(String(yr)); Haptics.selectionAsync(); }}
                  style={[
                    styles.yearChip,
                    {
                      backgroundColor: enrollmentYear === String(yr) ? colors.tint : colors.surface,
                      borderColor: enrollmentYear === String(yr) ? colors.tint : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.yearText,
                      { color: enrollmentYear === String(yr) ? colors.primaryForeground : colors.textSecondary },
                    ]}
                  >
                    {yr}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Course Duration */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 20 }]}>
              Course Duration (years)
            </Text>
            <View style={styles.durationRow}>
              {COURSE_DURATIONS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => { setCourseDuration(String(d)); Haptics.selectionAsync(); }}
                  style={[
                    styles.durationChip,
                    {
                      backgroundColor: courseDuration === String(d) ? colors.tint : colors.surface,
                      borderColor: courseDuration === String(d) ? colors.tint : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.durationText,
                      { color: courseDuration === String(d) ? colors.primaryForeground : colors.textSecondary },
                    ]}
                  >
                    {d}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Auto-calculated graduation + role badge */}
            {calculatedGradYear && (
              <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                    Expected Graduation
                  </Text>
                  <Text style={[styles.resultValue, { color: colors.text }]}>
                    {calculatedGradYear}
                  </Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                    Auto-determined Role
                  </Text>
                  <View
                    style={[
                      styles.roleBadge,
                      {
                        backgroundColor:
                          autoRole === 'Alumni'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(59, 130, 246, 0.15)',
                      },
                    ]}
                  >
                    <Ionicons
                      name={autoRole === 'Alumni' ? 'ribbon-outline' : 'school-outline'}
                      size={14}
                      color={autoRole === 'Alumni' ? '#10B981' : '#3B82F6'}
                    />
                    <Text
                      style={[
                        styles.roleBadgeText,
                        { color: autoRole === 'Alumni' ? '#10B981' : '#3B82F6' },
                      ]}
                    >
                      {autoRole}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Step 5 — Interests */}
        {step === 5 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Choose your interests</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
              Select topics you're passionate about (you can add custom ones too)
            </Text>
            <ChipPicker
              presets={PRESET_INTERESTS}
              selected={interests}
              onSelectionChange={setInterests}
              maxSelections={12}
              allowCustom
              customPlaceholder="Add a custom interest..."
              colors={colors}
            />
          </View>
        )}

        {/* Step 6 — Social Links */}
        {step === 6 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Social profiles</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
              Optional — connect your other profiles
            </Text>

            {([
              { key: 'linkedin' as const, label: 'LinkedIn', icon: 'logo-linkedin' as const, placeholder: 'https://linkedin.com/in/...' },
              { key: 'twitter' as const, label: 'Twitter / X', icon: 'logo-twitter' as const, placeholder: 'https://x.com/...' },
              { key: 'website' as const, label: 'Website', icon: 'globe-outline' as const, placeholder: 'https://...' },
              { key: 'instagram' as const, label: 'Instagram', icon: 'logo-instagram' as const, placeholder: 'https://instagram.com/...' },
              { key: 'facebook' as const, label: 'Facebook', icon: 'logo-facebook' as const, placeholder: 'https://facebook.com/...' },
              { key: 'googleScholar' as const, label: 'Google Scholar', icon: 'school-outline' as const, placeholder: 'https://scholar.google.com/...' },
            ] as const).map((link) => (
              <View key={link.key} style={styles.socialRow}>
                <Ionicons name={link.icon} size={20} color={colors.textSecondary} style={styles.socialIcon} />
                <TextInput
                  style={[
                    styles.socialInput,
                    { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  value={socialLinks[link.key]}
                  onChangeText={(v) => updateSocialLink(link.key, v)}
                  placeholder={link.placeholder}
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
            ))}
          </View>
        )}

        {/* Step 7 — Bio */}
        {step === 7 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Tell us about yourself</Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
              Optional — you can always update this later
            </Text>

            {/* Summary card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.summaryName, { color: colors.text }]}>{name}</Text>
              {universityLabel ? (
                <Text style={[styles.summaryDetail, { color: colors.textSecondary }]}>
                  {majorLabel} · {universityLabel}
                </Text>
              ) : null}
              {calculatedGradYear ? (
                <View style={[styles.roleBadgeSmall, {
                  backgroundColor: autoRole === 'Alumni' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                }]}>
                  <Text style={[styles.roleBadgeSmallText, {
                    color: autoRole === 'Alumni' ? '#10B981' : '#3B82F6',
                  }]}>
                    {autoRole} · Class of {calculatedGradYear}
                  </Text>
                </View>
              ) : null}
            </View>

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
              onPress={handleBack}
              style={[styles.backBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>
          )}
          <Pressable
            onPress={handleNext}
            disabled={!canProceed || isLoading || isUploading}
            style={({ pressed }) => [
              styles.nextBtn,
              { backgroundColor: canProceed ? colors.tint : colors.surface, flex: 1 },
              pressed && canProceed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.nextText, { color: canProceed ? colors.primaryForeground : colors.textTertiary }]}>
              {isLoading || isUploading
                ? 'Setting up...'
                : step === TOTAL_STEPS - 1
                  ? 'Get Started'
                  : step === 1
                    ? (avatarUri ? 'Continue' : 'Skip for now')
                    : 'Continue'}
            </Text>
            {!isLoading && !isUploading && (
              <Ionicons name="arrow-forward" size={18} color={canProceed ? colors.primaryForeground : colors.textTertiary} />
            )}
          </Pressable>
        </View>

        {/* Step indicator */}
        <Text style={[styles.stepIndicator, { color: colors.textTertiary }]}>
          Step {step + 1} of {TOTAL_STEPS}
        </Text>
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
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: 40 },
  progressDot: { flex: 1, height: 4, borderRadius: 2 },
  stepContent: { gap: 12 },
  stepTitle: { fontSize: fontSize['4xl'], fontWeight: '800', fontFamily: fontFamily.extraBold },
  stepDesc: { fontSize: fontSize.body, lineHeight: 22, marginBottom: 8, fontFamily: fontFamily.regular },
  input: { fontSize: fontSize.lg, padding: 16, borderRadius: 14, borderWidth: 1, fontFamily: fontFamily.regular },
  bioInput: { minHeight: 120 },
  fieldLabel: { fontSize: fontSize.base, fontWeight: '600', fontFamily: fontFamily.semiBold, marginBottom: 4 },

  // Year / Duration selectors
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  yearChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, minWidth: 68, alignItems: 'center' },
  yearText: { fontSize: fontSize.base, fontWeight: '600', fontFamily: fontFamily.semiBold },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durationChip: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  durationText: { fontSize: fontSize.body, fontWeight: '700', fontFamily: fontFamily.bold },

  // Result card (graduation + role)
  resultCard: { marginTop: 16, borderRadius: 12, borderWidth: 1, padding: 16, gap: 12 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultLabel: { fontSize: fontSize.base, fontFamily: fontFamily.regular },
  resultValue: { fontSize: fontSize.lg, fontWeight: '700', fontFamily: fontFamily.bold },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleBadgeText: { fontSize: fontSize.md, fontWeight: '600', fontFamily: fontFamily.semiBold },

  // Avatar center
  avatarCenter: { alignItems: 'center', marginTop: 20, marginBottom: 10 },

  // Social links
  socialRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  socialIcon: { width: 24 },
  socialInput: { flex: 1, fontSize: fontSize.body, padding: 14, borderRadius: 12, borderWidth: 1, fontFamily: fontFamily.regular },

  // Summary card
  summaryCard: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 6, marginBottom: 8 },
  summaryName: { fontSize: fontSize.xl, fontWeight: '700', fontFamily: fontFamily.bold },
  summaryDetail: { fontSize: fontSize.base, fontFamily: fontFamily.regular },
  roleBadgeSmall: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
  roleBadgeSmallText: { fontSize: fontSize.sm, fontWeight: '600', fontFamily: fontFamily.semiBold },

  // Bottom bar
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
  nextText: { fontSize: fontSize.lg, fontWeight: '700', fontFamily: fontFamily.bold },
  stepIndicator: {
    textAlign: 'center', fontSize: fontSize.sm, fontFamily: fontFamily.regular,
    marginTop: 8,
  },
});
