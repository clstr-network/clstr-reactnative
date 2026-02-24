/**
 * Edit Profile Screen — Phase F5
 *
 * Features:
 *   - Avatar upload via expo-image-picker
 *   - Edit name, headline, bio, major, university
 *   - Education CRUD (add / delete)
 *   - Experience CRUD (add / delete)
 *   - Skills CRUD (add / delete)
 *   - Profile completion indicator
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useThemeColors } from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/lib/auth-context';
import { QUERY_KEYS } from '@/lib/query-keys';
import {
  getProfileById,
  updateProfileRecord,
  uploadProfileAvatar,
  removeProfileAvatar,
  calculateProfileCompletion,
  getMissingProfileFields,
  getExperiences,
  addExperience,
  deleteExperience,
  getEducation,
  addEducation,
  deleteEducation,
  getSkills,
  addSkill,
  deleteSkill,
  type UserProfile,
  type ExperienceData,
  type EducationData,
  type SkillData,
  type SkillLevel,
} from '@/lib/api/profile';

// ─── Skill Level options ──────────────────────────────────────
const SKILL_LEVELS: SkillLevel[] = ['Beginner', 'Intermediate', 'Expert', 'Professional'];

export default function EditProfileScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  // ─── Form state ─────────────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [major, setMajor] = useState('');
  const [university, setUniversity] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  // Phase 12.3 — Social Links state
  const [socialWebsite, setSocialWebsite] = useState('');
  const [socialLinkedin, setSocialLinkedin] = useState('');
  const [socialTwitter, setSocialTwitter] = useState('');
  const [socialFacebook, setSocialFacebook] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');

  // Phase 12.3 — Interests state
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');

  // ─── Add-new-item form states ──────────────────────────────
  const [showAddEducation, setShowAddEducation] = useState(false);
  const [newEduSchool, setNewEduSchool] = useState('');
  const [newEduDegree, setNewEduDegree] = useState('');
  const [newEduStartDate, setNewEduStartDate] = useState('');
  const [newEduEndDate, setNewEduEndDate] = useState('');

  const [showAddExperience, setShowAddExperience] = useState(false);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpCompany, setNewExpCompany] = useState('');
  const [newExpStartDate, setNewExpStartDate] = useState('');
  const [newExpEndDate, setNewExpEndDate] = useState('');

  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState<SkillLevel>('Intermediate');

  // ─── Queries ────────────────────────────────────────────────
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile | null>({
    queryKey: QUERY_KEYS.profile(user?.id ?? ''),
    queryFn: () => getProfileById(user!.id),
    enabled: !!user?.id,
  });

  const { data: educationList = [], isLoading: eduLoading } = useQuery<EducationData[]>({
    queryKey: ['education', user?.id],
    queryFn: () => getEducation(user!.id),
    enabled: !!user?.id,
  });

  const { data: experienceList = [], isLoading: expLoading } = useQuery<ExperienceData[]>({
    queryKey: ['experience', user?.id],
    queryFn: () => getExperiences(user!.id),
    enabled: !!user?.id,
  });

  const { data: skillsList = [], isLoading: skillsLoading } = useQuery<SkillData[]>({
    queryKey: ['skills', user?.id],
    queryFn: () => getSkills(user!.id),
    enabled: !!user?.id,
  });

  // ─── Seed form state from profile ──────────────────────────
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setHeadline(profile.headline ?? '');
      setBio(profile.bio ?? '');
      setMajor(profile.major ?? '');
      setUniversity(profile.university ?? '');
      setLocation(profile.location ?? '');
      // Phase 12.3 — Seed social links
      const sl = profile.social_links ?? {};
      setSocialWebsite(sl.website ?? '');
      setSocialLinkedin(sl.linkedin ?? '');
      setSocialTwitter(sl.twitter ?? '');
      setSocialFacebook(sl.facebook ?? '');
      setSocialInstagram(sl.instagram ?? '');
      // Phase 12.3 — Seed interests
      setInterests(profile.interests ?? []);
    }
  }, [profile]);

  // ─── Profile completion ─────────────────────────────────────
  const completionPct = useMemo(() => {
    if (!profile) return 0;
    return calculateProfileCompletion(profile);
  }, [profile]);

  const missingFields = useMemo(() => {
    if (!profile) return [];
    return getMissingProfileFields(profile);
  }, [profile]);

  // ─── Mutations ──────────────────────────────────────────────
  const invalidateProfile = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile(user!.id) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profileStats(user!.id) });
  }, [queryClient, user]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      // Phase 12.3 — Collect social links (filter empty values)
      const socialLinks: Record<string, string> = {};
      if (socialWebsite.trim()) socialLinks.website = socialWebsite.trim();
      if (socialLinkedin.trim()) socialLinks.linkedin = socialLinkedin.trim();
      if (socialTwitter.trim()) socialLinks.twitter = socialTwitter.trim();
      if (socialFacebook.trim()) socialLinks.facebook = socialFacebook.trim();
      if (socialInstagram.trim()) socialLinks.instagram = socialInstagram.trim();

      await updateProfileRecord(user.id, {
        full_name: fullName.trim() || undefined,
        headline: headline.trim() || undefined,
        bio: bio.trim() || undefined,
        major: major.trim() || undefined,
        university: university.trim() || undefined,
        location: location.trim() || undefined,
        social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
        interests: interests.length > 0 ? interests : null,
      });
      invalidateProfile();
      Alert.alert('Saved', 'Profile updated successfully.');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }, [user, fullName, headline, bio, major, university, location, socialWebsite, socialLinkedin, socialTwitter, socialFacebook, socialInstagram, interests, invalidateProfile]);

  // ─── Avatar Upload ──────────────────────────────────────────
  const pickAvatar = useCallback(async () => {
    if (!user) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const asset = result.assets[0];
        const file = {
          uri: asset.uri,
          type: asset.mimeType ?? 'image/jpeg',
          name: `avatar-${Date.now()}.jpg`,
        };
        await uploadProfileAvatar(file, user.id);
        invalidateProfile();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'Failed to upload avatar.');
      }
    }
  }, [user, invalidateProfile]);

  const handleRemoveAvatar = useCallback(async () => {
    if (!user) return;
    Alert.alert('Remove Avatar', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await removeProfileAvatar(user.id);
            invalidateProfile();
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Failed to remove avatar.');
          }
        },
      },
    ]);
  }, [user, invalidateProfile]);

  // ─── Education mutations ────────────────────────────────────
  const addEducationMutation = useMutation({
    mutationFn: (data: EducationData) => addEducation(user!.id, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', user!.id] });
      invalidateProfile();
      setShowAddEducation(false);
      resetEducationForm();
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to add education.'),
  });

  const deleteEducationMutation = useMutation({
    mutationFn: (id: string) => deleteEducation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education', user!.id] });
      invalidateProfile();
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to delete education.'),
  });

  const resetEducationForm = () => {
    setNewEduSchool('');
    setNewEduDegree('');
    setNewEduStartDate('');
    setNewEduEndDate('');
  };

  const handleAddEducation = () => {
    if (!newEduSchool.trim() || !newEduDegree.trim() || !newEduStartDate.trim()) {
      Alert.alert('Missing Fields', 'Please fill in school, degree, and start date.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addEducationMutation.mutate({
      school: newEduSchool.trim(),
      degree: newEduDegree.trim(),
      start_date: newEduStartDate.trim(),
      end_date: newEduEndDate.trim() || undefined,
    } as EducationData);
  };

  const handleDeleteEducation = (id: string) => {
    Alert.alert('Delete Education', 'Remove this education entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEducationMutation.mutate(id) },
    ]);
  };

  // ─── Experience mutations ───────────────────────────────────
  const addExperienceMutation = useMutation({
    mutationFn: (data: ExperienceData) => addExperience(user!.id, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experience', user!.id] });
      invalidateProfile();
      setShowAddExperience(false);
      resetExperienceForm();
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to add experience.'),
  });

  const deleteExperienceMutation = useMutation({
    mutationFn: (id: string) => deleteExperience(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experience', user!.id] });
      invalidateProfile();
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to delete experience.'),
  });

  const resetExperienceForm = () => {
    setNewExpTitle('');
    setNewExpCompany('');
    setNewExpStartDate('');
    setNewExpEndDate('');
  };

  const handleAddExperience = () => {
    if (!newExpTitle.trim() || !newExpCompany.trim() || !newExpStartDate.trim()) {
      Alert.alert('Missing Fields', 'Please fill in title, company, and start date.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addExperienceMutation.mutate({
      title: newExpTitle.trim(),
      company: newExpCompany.trim(),
      start_date: newExpStartDate.trim(),
      end_date: newExpEndDate.trim() || undefined,
    } as ExperienceData);
  };

  const handleDeleteExperience = (id: string) => {
    Alert.alert('Delete Experience', 'Remove this experience entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteExperienceMutation.mutate(id) },
    ]);
  };

  // ─── Skills mutations ──────────────────────────────────────
  const addSkillMutation = useMutation({
    mutationFn: (data: SkillData) => addSkill(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', user!.id] });
      invalidateProfile();
      setShowAddSkill(false);
      setNewSkillName('');
      setNewSkillLevel('Intermediate');
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to add skill.'),
  });

  const deleteSkillMutation = useMutation({
    mutationFn: (id: string) => deleteSkill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', user!.id] });
      invalidateProfile();
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to delete skill.'),
  });

  const handleAddSkill = () => {
    if (!newSkillName.trim()) {
      Alert.alert('Missing Field', 'Please enter a skill name.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addSkillMutation.mutate({
      name: newSkillName.trim(),
      level: newSkillLevel,
    } as SkillData);
  };

  const handleDeleteSkill = (id: string) => {
    Alert.alert('Delete Skill', 'Remove this skill?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSkillMutation.mutate(id) },
    ]);
  };

  // ─── Loading state ──────────────────────────────────────────
  if (profileLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </View>
    );
  }

  // ─── Render ──────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
        <Pressable onPress={handleSave} disabled={saving} hitSlop={8}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.tint} />
          ) : (
            <Text style={[styles.saveBtn, { color: colors.tint }]}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Completion */}
        {completionPct < 100 && (
          <View style={[styles.completionBanner, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '30' }]}>
            <View style={styles.completionRow}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
              <Text style={[styles.completionText, { color: colors.text }]}>
                Profile {completionPct}% complete
              </Text>
            </View>
            {missingFields.length > 0 && (
              <Text style={[styles.completionHint, { color: colors.textSecondary }]}>
                Add {missingFields.slice(0, 3).join(', ')} to stand out
              </Text>
            )}
            {/* Progress bar */}
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${completionPct}%`, backgroundColor: colors.warning }]} />
            </View>
          </View>
        )}

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <Pressable onPress={pickAvatar}>
            <Avatar uri={profile?.avatar_url} name={profile?.full_name ?? 'User'} size={96} />
            <View style={[styles.cameraIcon, { backgroundColor: colors.tint }]}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </Pressable>
          <View style={styles.avatarActions}>
            <Pressable
              onPress={pickAvatar}
              style={[styles.avatarBtn, { backgroundColor: colors.tint + '15' }]}
            >
              <Text style={[styles.avatarBtnText, { color: colors.tint }]}>Change Photo</Text>
            </Pressable>
            {profile?.avatar_url && (
              <Pressable
                onPress={handleRemoveAvatar}
                style={[styles.avatarBtn, { backgroundColor: colors.error + '15' }]}
              >
                <Text style={[styles.avatarBtnText, { color: colors.error }]}>Remove</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Basic Info Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Headline</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={headline}
              onChangeText={setHeadline}
              placeholder="e.g. Computer Science Student at MIT"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={[styles.charCount, { color: colors.textTertiary }]}>{bio.length}/500</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Major</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={major}
              onChangeText={setMajor}
              placeholder="e.g. Computer Science"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>University</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={university}
              onChangeText={setUniversity}
              placeholder="e.g. MIT"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Location</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Cambridge, MA"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>

        {/* Phase 12.3 — Social Links Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Social Links</Text>

          {([
            { label: 'Website', icon: 'globe-outline' as const, value: socialWebsite, setter: setSocialWebsite, placeholder: 'https://yoursite.com' },
            { label: 'LinkedIn', icon: 'logo-linkedin' as const, value: socialLinkedin, setter: setSocialLinkedin, placeholder: 'https://linkedin.com/in/...' },
            { label: 'Twitter / X', icon: 'logo-twitter' as const, value: socialTwitter, setter: setSocialTwitter, placeholder: 'https://twitter.com/...' },
            { label: 'Facebook', icon: 'logo-facebook' as const, value: socialFacebook, setter: setSocialFacebook, placeholder: 'https://facebook.com/...' },
            { label: 'Instagram', icon: 'logo-instagram' as const, value: socialInstagram, setter: setSocialInstagram, placeholder: 'https://instagram.com/...' },
          ] as const).map((link) => (
            <View key={link.label} style={styles.fieldGroup}>
              <View style={styles.socialLabelRow}>
                <Ionicons name={link.icon as any} size={16} color={colors.textSecondary} />
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 0 }]}>{link.label}</Text>
              </View>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                value={link.value}
                onChangeText={link.setter}
                placeholder={link.placeholder}
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          ))}
        </View>

        {/* Phase 12.3 — Interests Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Interests</Text>
            <Text style={[styles.interestCount, { color: colors.textTertiary }]}>{interests.length}/20</Text>
          </View>
          <View style={styles.interestInputRow}>
            <TextInput
              style={[styles.input, { flex: 1, color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={newInterest}
              onChangeText={setNewInterest}
              placeholder="Add an interest..."
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={() => {
                const trimmed = newInterest.trim();
                if (trimmed && interests.length < 20 && !interests.includes(trimmed)) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setInterests([...interests, trimmed]);
                  setNewInterest('');
                }
              }}
              returnKeyType="done"
            />
            <Pressable
              onPress={() => {
                const trimmed = newInterest.trim();
                if (trimmed && interests.length < 20 && !interests.includes(trimmed)) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setInterests([...interests, trimmed]);
                  setNewInterest('');
                }
              }}
              style={[styles.addInterestBtn, { backgroundColor: colors.tint }]}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
          </View>
          {interests.length > 0 && (
            <View style={styles.interestChipsWrap}>
              {interests.map((interest) => (
                <View key={interest} style={[styles.interestChip, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '30' }]}>
                  <Text style={[styles.interestChipText, { color: colors.tint }]}>{interest}</Text>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setInterests(interests.filter((i) => i !== interest));
                    }}
                    hitSlop={6}
                  >
                    <Ionicons name="close-circle" size={16} color={colors.tint} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Education Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Education</Text>
            <Pressable
              onPress={() => setShowAddEducation(!showAddEducation)}
              style={[styles.addBtn, { backgroundColor: colors.tint + '15' }]}
              hitSlop={8}
            >
              <Ionicons name={showAddEducation ? 'close' : 'add'} size={18} color={colors.tint} />
              <Text style={[styles.addBtnText, { color: colors.tint }]}>{showAddEducation ? 'Cancel' : 'Add'}</Text>
            </Pressable>
          </View>

          {showAddEducation && (
            <View style={[styles.addForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                value={newEduSchool}
                onChangeText={setNewEduSchool}
                placeholder="School *"
                placeholderTextColor={colors.textTertiary}
              />
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                value={newEduDegree}
                onChangeText={setNewEduDegree}
                placeholder="Degree *"
                placeholderTextColor={colors.textTertiary}
              />
              <View style={styles.dateRow}>
                <TextInput
                  style={[styles.input, styles.dateInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                  value={newEduStartDate}
                  onChangeText={setNewEduStartDate}
                  placeholder="Start (YYYY-MM) *"
                  placeholderTextColor={colors.textTertiary}
                />
                <TextInput
                  style={[styles.input, styles.dateInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                  value={newEduEndDate}
                  onChangeText={setNewEduEndDate}
                  placeholder="End (YYYY-MM)"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <Pressable
                onPress={handleAddEducation}
                disabled={addEducationMutation.isPending}
                style={[styles.submitBtn, { backgroundColor: colors.tint }, addEducationMutation.isPending && { opacity: 0.6 }]}
              >
                {addEducationMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Add Education</Text>
                )}
              </Pressable>
            </View>
          )}

          {eduLoading ? (
            <ActivityIndicator size="small" color={colors.tint} style={{ marginVertical: 8 }} />
          ) : educationList.length === 0 ? (
            <Text style={[styles.emptyListText, { color: colors.textTertiary }]}>No education added yet</Text>
          ) : (
            educationList.map((edu) => (
              <View key={edu.id} style={[styles.listItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.listItemContent}>
                  <Ionicons name="school-outline" size={20} color={colors.tint} />
                  <View style={styles.listItemText}>
                    <Text style={[styles.listItemTitle, { color: colors.text }]}>{edu.degree}</Text>
                    <Text style={[styles.listItemSubtitle, { color: colors.textSecondary }]}>{edu.school}</Text>
                    <Text style={[styles.listItemDate, { color: colors.textTertiary }]}>
                      {edu.start_date}{edu.end_date ? ` — ${edu.end_date}` : ' — Present'}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => edu.id && handleDeleteEducation(edu.id)}
                  hitSlop={8}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </Pressable>
              </View>
            ))
          )}
        </View>

        {/* Experience Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Experience</Text>
            <Pressable
              onPress={() => setShowAddExperience(!showAddExperience)}
              style={[styles.addBtn, { backgroundColor: colors.tint + '15' }]}
              hitSlop={8}
            >
              <Ionicons name={showAddExperience ? 'close' : 'add'} size={18} color={colors.tint} />
              <Text style={[styles.addBtnText, { color: colors.tint }]}>{showAddExperience ? 'Cancel' : 'Add'}</Text>
            </Pressable>
          </View>

          {showAddExperience && (
            <View style={[styles.addForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                value={newExpTitle}
                onChangeText={setNewExpTitle}
                placeholder="Job Title *"
                placeholderTextColor={colors.textTertiary}
              />
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                value={newExpCompany}
                onChangeText={setNewExpCompany}
                placeholder="Company *"
                placeholderTextColor={colors.textTertiary}
              />
              <View style={styles.dateRow}>
                <TextInput
                  style={[styles.input, styles.dateInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                  value={newExpStartDate}
                  onChangeText={setNewExpStartDate}
                  placeholder="Start (YYYY-MM) *"
                  placeholderTextColor={colors.textTertiary}
                />
                <TextInput
                  style={[styles.input, styles.dateInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                  value={newExpEndDate}
                  onChangeText={setNewExpEndDate}
                  placeholder="End (YYYY-MM)"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <Pressable
                onPress={handleAddExperience}
                disabled={addExperienceMutation.isPending}
                style={[styles.submitBtn, { backgroundColor: colors.tint }, addExperienceMutation.isPending && { opacity: 0.6 }]}
              >
                {addExperienceMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Add Experience</Text>
                )}
              </Pressable>
            </View>
          )}

          {expLoading ? (
            <ActivityIndicator size="small" color={colors.tint} style={{ marginVertical: 8 }} />
          ) : experienceList.length === 0 ? (
            <Text style={[styles.emptyListText, { color: colors.textTertiary }]}>No experience added yet</Text>
          ) : (
            experienceList.map((exp) => (
              <View key={exp.id} style={[styles.listItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.listItemContent}>
                  <Ionicons name="briefcase-outline" size={20} color={colors.tint} />
                  <View style={styles.listItemText}>
                    <Text style={[styles.listItemTitle, { color: colors.text }]}>{exp.title}</Text>
                    <Text style={[styles.listItemSubtitle, { color: colors.textSecondary }]}>{exp.company}</Text>
                    <Text style={[styles.listItemDate, { color: colors.textTertiary }]}>
                      {exp.start_date}{exp.end_date ? ` — ${exp.end_date}` : ' — Present'}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => exp.id && handleDeleteExperience(exp.id)}
                  hitSlop={8}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </Pressable>
              </View>
            ))
          )}
        </View>

        {/* Skills Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Skills</Text>
            <Pressable
              onPress={() => setShowAddSkill(!showAddSkill)}
              style={[styles.addBtn, { backgroundColor: colors.tint + '15' }]}
              hitSlop={8}
            >
              <Ionicons name={showAddSkill ? 'close' : 'add'} size={18} color={colors.tint} />
              <Text style={[styles.addBtnText, { color: colors.tint }]}>{showAddSkill ? 'Cancel' : 'Add'}</Text>
            </Pressable>
          </View>

          {showAddSkill && (
            <View style={[styles.addForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                value={newSkillName}
                onChangeText={setNewSkillName}
                placeholder="Skill name *"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 6 }]}>Proficiency Level</Text>
              <View style={styles.skillLevelRow}>
                {SKILL_LEVELS.map((level) => (
                  <Pressable
                    key={level}
                    onPress={() => setNewSkillLevel(level)}
                    style={[
                      styles.skillLevelChip,
                      { borderColor: colors.border },
                      newSkillLevel === level && { backgroundColor: colors.tint, borderColor: colors.tint },
                    ]}
                  >
                    <Text style={[
                      styles.skillLevelText,
                      { color: colors.textSecondary },
                      newSkillLevel === level && { color: '#fff' },
                    ]}>
                      {level}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={handleAddSkill}
                disabled={addSkillMutation.isPending}
                style={[styles.submitBtn, { backgroundColor: colors.tint }, addSkillMutation.isPending && { opacity: 0.6 }]}
              >
                {addSkillMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Add Skill</Text>
                )}
              </Pressable>
            </View>
          )}

          {skillsLoading ? (
            <ActivityIndicator size="small" color={colors.tint} style={{ marginVertical: 8 }} />
          ) : skillsList.length === 0 ? (
            <Text style={[styles.emptyListText, { color: colors.textTertiary }]}>No skills added yet</Text>
          ) : (
            <View style={styles.skillsGrid}>
              {skillsList.map((skill) => (
                <View key={skill.id} style={[styles.skillChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.skillChipContent}>
                    <Text style={[styles.skillChipName, { color: colors.text }]}>
                      {skill.name ?? skill.skill_name}
                    </Text>
                    <Text style={[styles.skillChipLevel, { color: colors.textTertiary }]}>
                      {skill.level ?? skill.proficiency_level}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => skill.id && handleDeleteSkill(skill.id)}
                    hitSlop={6}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.error + '80'} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  saveBtn: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  scrollContent: { paddingBottom: 40 },

  // Completion banner
  completionBanner: {
    marginHorizontal: 16, marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1,
  },
  completionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  completionText: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  completionHint: { fontSize: 13, marginTop: 4, marginLeft: 28, fontFamily: 'Inter_400Regular' },
  progressBar: { height: 4, borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },

  // Avatar
  avatarSection: { alignItems: 'center', paddingTop: 24, paddingBottom: 16 },
  cameraIcon: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  avatarBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  avatarBtnText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  // Sections
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  // Form inputs
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, fontFamily: 'Inter_600SemiBold' },
  input: {
    fontSize: 15, padding: 12, borderRadius: 12, borderWidth: 1,
    fontFamily: 'Inter_400Regular',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 12, textAlign: 'right', marginTop: 4, fontFamily: 'Inter_400Regular' },

  // Add button
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  addBtnText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  // Add form
  addForm: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 10, marginBottom: 12 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateInput: { flex: 1 },
  submitBtn: { alignItems: 'center', paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  // List items
  listItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8,
  },
  listItemContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  listItemText: { flex: 1 },
  listItemTitle: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  listItemSubtitle: { fontSize: 14, marginTop: 2, fontFamily: 'Inter_400Regular' },
  listItemDate: { fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' },
  deleteBtn: { padding: 4 },
  emptyListText: { fontSize: 14, textAlign: 'center', paddingVertical: 12, fontFamily: 'Inter_400Regular' },

  // Skills grid
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  skillChipContent: { gap: 2 },
  skillChipName: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  skillChipLevel: { fontSize: 11, fontFamily: 'Inter_400Regular' },

  // Skill level selector
  skillLevelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  skillLevelChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  skillLevelText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  // Phase 12.3 — Social links
  socialLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },

  // Phase 12.3 — Interests
  interestCount: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  interestInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  addInterestBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  interestChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  interestChipText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
