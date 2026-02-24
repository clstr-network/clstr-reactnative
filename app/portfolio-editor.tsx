/**
 * Portfolio Editor Screen â€” Phase 4.6
 *
 * Full WYSIWYG portfolio editor for mobile. Maps every section from
 * the web PortfolioEditor.tsx to native components.
 *
 * Sections: Basic Info, About, Education, Experience, Skills, Projects, Posts (read-only), Settings
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Switch as RNSwitch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import { useThemeColors } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { usePortfolioEditor } from '@/lib/hooks/usePortfolioEditor';

/* ------------------------------------------------------------------ */
/*  Shared sub-components                                              */
/* ------------------------------------------------------------------ */

function SectionCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function SectionHeader({
  icon,
  title,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  colors: any;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconBadge}>
        <Ionicons name={icon} size={18} color="rgba(255,255,255,0.6)" />
      </View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

function FieldLabel({ text, colors }: { text: string; colors: any }) {
  return <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{text}</Text>;
}

function Field({
  value,
  onChangeText,
  placeholder,
  colors,
  multiline,
  editable,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  colors: any;
  multiline?: boolean;
  editable?: boolean;
}) {
  return (
    <TextInput
      style={[
        styles.input,
        multiline && styles.multilineInput,
        { color: colors.text, borderColor: 'rgba(255,255,255,0.08)' },
        editable === false && { opacity: 0.5 },
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      editable={editable}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function PortfolioEditorScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { identity } = useIdentityContext();

  const {
    profile,
    isLoading,
    isDirty,
    isSaving,
    updateProfile,
    updateSettings,
    saveProfile,
  } = usePortfolioEditor(identity?.user_id ?? undefined);

  const [newSkill, setNewSkill] = useState('');

  /* â”€â”€ Redirect if not logged in â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  if (!identity?.user_id) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Please log in to edit your portfolio.
        </Text>
        <Pressable style={styles.ghostAction} onPress={() => router.replace('/(auth)' as any)}>
          <Text style={[styles.ghostActionText, { color: colors.textSecondary }]}>Log In</Text>
        </Pressable>
      </View>
    );
  }

  /* â”€â”€ Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  if (isLoading || !profile) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textTertiary, marginTop: 12 }]}>
          Loading editorâ€¦
        </Text>
      </View>
    );
  }

  /* â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const addSkill = () => {
    const s = newSkill.trim();
    if (s && !profile.skills.includes(s)) {
      updateProfile({ skills: [...profile.skills, s] });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    updateProfile({ skills: profile.skills.filter((s: string) => s !== skill) });
  };

  const addEducation = () => {
    updateProfile({
      education: [
        ...profile.education,
        { id: Date.now().toString(), institution: '', degree: '', field: '', startYear: '', endYear: '' },
      ],
    });
  };

  const updateEducation = (id: string, updates: Record<string, any>) => {
    updateProfile({
      education: profile.education.map((e: any) => (e.id === id ? { ...e, ...updates } : e)),
    });
  };

  const removeEducation = (id: string) => {
    updateProfile({ education: profile.education.filter((e: any) => e.id !== id) });
  };

  const addExperience = () => {
    updateProfile({
      experience: [
        ...profile.experience,
        { id: Date.now().toString(), company: '', role: '', description: '', startDate: '', endDate: '', current: false },
      ],
    });
  };

  const updateExperience = (id: string, updates: Record<string, any>) => {
    updateProfile({
      experience: profile.experience.map((e: any) => (e.id === id ? { ...e, ...updates } : e)),
    });
  };

  const removeExperience = (id: string) => {
    updateProfile({ experience: profile.experience.filter((e: any) => e.id !== id) });
  };

  const addProject = () => {
    updateProfile({
      projects: [
        ...profile.projects,
        { id: Date.now().toString(), title: '', description: '', link: '', tags: [] },
      ],
    });
  };

  const updateProject = (id: string, updates: Record<string, any>) => {
    updateProfile({
      projects: profile.projects.map((p: any) => (p.id === id ? { ...p, ...updates } : p)),
    });
  };

  const removeProject = (id: string) => {
    updateProfile({ projects: profile.projects.filter((p: any) => p.id !== id) });
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await saveProfile();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Saved', 'Your portfolio has been updated.');
  };

  const copyShareLink = async () => {
    const link = `clstr.in/${profile.settings?.slug ?? ''}`;
    await Clipboard.setStringAsync(link);
    Alert.alert('Copied!', link);
  };

  /* â”€â”€ Visibility toggle helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const visibilityItems: { key: string; label: string }[] = [
    { key: 'showAbout', label: 'About Section' },
    { key: 'showEducation', label: 'Education' },
    { key: 'showExperience', label: 'Experience' },
    { key: 'showSkills', label: 'Skills' },
    { key: 'showProjects', label: 'Projects' },
    { key: 'showPosts', label: 'Posts & Activity' },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Portfolio</Text>
          {isDirty ? (
            <Pressable
              style={[styles.saveBtn, { opacity: isSaving ? 0.5 : 1 }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={14} color="#000" />
                  <Text style={styles.saveBtnText}>Save</Text>
                </>
              )}
            </Pressable>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* â”€â”€ Basic Information â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <SectionCard>
            <SectionHeader icon="person-outline" title="Basic Information" colors={colors} />
            <FieldLabel text="Full Name" colors={colors} />
            <Field value={profile.name} onChangeText={(v) => updateProfile({ name: v })} placeholder="Your full name" colors={colors} />
            <FieldLabel text="Role / Title" colors={colors} />
            <Field value={profile.role} onChangeText={(v) => updateProfile({ role: v })} placeholder="e.g. Full-Stack Developer" colors={colors} />
            <FieldLabel text="Location" colors={colors} />
            <Field value={profile.location} onChangeText={(v) => updateProfile({ location: v })} placeholder="City, Country" colors={colors} />
            <FieldLabel text="Email" colors={colors} />
            <Field value={profile.email} onChangeText={(v) => updateProfile({ email: v })} placeholder="you@example.com" colors={colors} />
            <FieldLabel text="LinkedIn" colors={colors} />
            <Field value={profile.linkedin} onChangeText={(v) => updateProfile({ linkedin: v })} placeholder="linkedin.com/in/yourname" colors={colors} />
            <FieldLabel text="GitHub" colors={colors} />
            <Field value={profile.github} onChangeText={(v) => updateProfile({ github: v })} placeholder="github.com/yourname" colors={colors} />

            <FieldLabel text="Portfolio Slug" colors={colors} />
            <View style={styles.slugRow}>
              <Text style={[styles.slugPrefix, { color: colors.textTertiary }]}>clstr.in/</Text>
              <TextInput
                style={[styles.slugInput, { color: colors.text, borderColor: 'rgba(255,255,255,0.08)' }]}
                value={profile.settings?.slug ?? ''}
                onChangeText={(v) =>
                  updateSettings({ slug: v.toLowerCase().replace(/\s+/g, '-') })
                }
                placeholder="your-name"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
              />
            </View>
          </SectionCard>

          {/* â”€â”€ About â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <SectionCard>
            <SectionHeader icon="information-circle-outline" title="About" colors={colors} />
            <Field
              value={profile.about}
              onChangeText={(v) => updateProfile({ about: v })}
              placeholder="Tell people about yourself..."
              colors={colors}
              multiline
            />
          </SectionCard>

          {/* â”€â”€ Education â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <SectionCard>
            <SectionHeader icon="school-outline" title="Education" colors={colors} />
            {profile.education.map((edu: any) => (
              <View key={edu.id} style={styles.subCard}>
                <View style={styles.subCardHeader}>
                  <TextInput
                    style={[styles.inlineTitle, { color: colors.text }]}
                    value={edu.institution}
                    onChangeText={(v) => updateEducation(edu.id, { institution: v })}
                    placeholder="Institution name"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <Pressable onPress={() => removeEducation(edu.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                  </Pressable>
                </View>
                <View style={styles.row2}>
                  <Field value={edu.degree} onChangeText={(v) => updateEducation(edu.id, { degree: v })} placeholder="Degree" colors={colors} />
                  <Field value={edu.field} onChangeText={(v) => updateEducation(edu.id, { field: v })} placeholder="Field of study" colors={colors} />
                </View>
                <View style={styles.row2}>
                  <Field value={edu.startYear} onChangeText={(v) => updateEducation(edu.id, { startYear: v })} placeholder="Start year" colors={colors} />
                  <Field value={edu.endYear} onChangeText={(v) => updateEducation(edu.id, { endYear: v })} placeholder="End year" colors={colors} />
                </View>
              </View>
            ))}
            <Pressable style={styles.addBtn} onPress={addEducation}>
              <Ionicons name="add" size={16} color="rgba(255,255,255,0.6)" />
              <Text style={styles.addBtnText}>Add Education</Text>
            </Pressable>
          </SectionCard>

          {/* â”€â”€ Experience â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <SectionCard>
            <SectionHeader icon="briefcase-outline" title="Experience" colors={colors} />
            {profile.experience.map((exp: any) => (
              <View key={exp.id} style={styles.subCard}>
                <View style={styles.subCardHeader}>
                  <TextInput
                    style={[styles.inlineTitle, { color: colors.text }]}
                    value={exp.role}
                    onChangeText={(v) => updateExperience(exp.id, { role: v })}
                    placeholder="Role / Title"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <Pressable onPress={() => removeExperience(exp.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                  </Pressable>
                </View>
                <Field value={exp.company} onChangeText={(v) => updateExperience(exp.id, { company: v })} placeholder="Company" colors={colors} />
                <Field value={exp.description} onChangeText={(v) => updateExperience(exp.id, { description: v })} placeholder="What did you do?" colors={colors} multiline />
                <View style={styles.row2}>
                  <Field value={exp.startDate} onChangeText={(v) => updateExperience(exp.id, { startDate: v })} placeholder="Start date" colors={colors} />
                  <Field
                    value={exp.endDate}
                    onChangeText={(v) => updateExperience(exp.id, { endDate: v })}
                    placeholder="End date"
                    colors={colors}
                    editable={!exp.current}
                  />
                </View>
                <View style={styles.switchRow}>
                  <RNSwitch
                    value={exp.current}
                    onValueChange={(v) => updateExperience(exp.id, { current: v, endDate: v ? '' : exp.endDate })}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,255,255,0.3)' }}
                    thumbColor="white"
                  />
                  <Text style={[styles.switchLabel, { color: colors.textSecondary }]}>
                    Currently working here
                  </Text>
                </View>
              </View>
            ))}
            <Pressable style={styles.addBtn} onPress={addExperience}>
              <Ionicons name="add" size={16} color="rgba(255,255,255,0.6)" />
              <Text style={styles.addBtnText}>Add Experience</Text>
            </Pressable>
          </SectionCard>

          {/* â”€â”€ Skills â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <SectionCard>
            <SectionHeader icon="code-slash-outline" title="Skills" colors={colors} />
            <View style={styles.skillsWrap}>
              {profile.skills.map((skill: string) => (
                <Pressable
                  key={skill}
                  style={styles.skillBadge}
                  onPress={() => removeSkill(skill)}
                >
                  <Text style={styles.skillBadgeText}>{skill}</Text>
                  <Text style={styles.skillX}>Ã—</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.addSkillRow}>
              <TextInput
                style={[styles.input, { flex: 1, color: colors.text, borderColor: 'rgba(255,255,255,0.08)' }]}
                value={newSkill}
                onChangeText={setNewSkill}
                onSubmitEditing={addSkill}
                placeholder="Add a skill..."
                placeholderTextColor={colors.textTertiary}
                returnKeyType="done"
              />
              <Pressable style={styles.addSkillBtn} onPress={addSkill}>
                <Text style={styles.addSkillBtnText}>Add</Text>
              </Pressable>
            </View>
          </SectionCard>

          {/* â”€â”€ Projects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <SectionCard>
            <SectionHeader icon="folder-open-outline" title="Projects & Achievements" colors={colors} />
            {profile.projects.map((proj: any) => (
              <View key={proj.id} style={styles.subCard}>
                <View style={styles.subCardHeader}>
                  <TextInput
                    style={[styles.inlineTitle, { color: colors.text }]}
                    value={proj.title}
                    onChangeText={(v) => updateProject(proj.id, { title: v })}
                    placeholder="Project title"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <Pressable onPress={() => removeProject(proj.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
                  </Pressable>
                </View>
                <Field value={proj.description} onChangeText={(v) => updateProject(proj.id, { description: v })} placeholder="Describe the project..." colors={colors} multiline />
                <Field value={proj.link} onChangeText={(v) => updateProject(proj.id, { link: v })} placeholder="Project link (optional)" colors={colors} />
              </View>
            ))}
            <Pressable style={styles.addBtn} onPress={addProject}>
              <Ionicons name="add" size={16} color="rgba(255,255,255,0.6)" />
              <Text style={styles.addBtnText}>Add Project</Text>
            </Pressable>
          </SectionCard>

          {/* â”€â”€ Posts (read-only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <SectionCard>
            <SectionHeader icon="chatbubble-outline" title="Posts & Activity" colors={colors} />
            {profile.posts.length === 0 ? (
              <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
                No persisted posts found.
              </Text>
            ) : (
              profile.posts.map((post: any) => (
                <View key={post.id} style={styles.postCard}>
                  <Text style={[styles.postTitle, { color: colors.text }]}>
                    {post.title || 'Untitled post'}
                  </Text>
                  <Text style={[styles.postContent, { color: colors.textSecondary }]} numberOfLines={4}>
                    {post.content}
                  </Text>
                  {post.date && (
                    <Text style={[styles.postDate, { color: colors.textTertiary }]}>
                      {new Date(post.date).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              ))
            )}
          </SectionCard>

          {/* â”€â”€ Portfolio Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <SectionCard>
            <SectionHeader icon="settings-outline" title="Portfolio Settings" colors={colors} />

            {/* Template */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Template</Text>
                <Text style={[styles.settingHint, { color: colors.textTertiary }]}>
                  Currently: {profile.settings?.template ?? 'minimal'}
                </Text>
              </View>
              <Pressable
                style={[styles.outlineBtn, { borderColor: 'rgba(255,255,255,0.1)' }]}
                onPress={() => router.push('/portfolio-template-picker' as any)}
              >
                <Ionicons name="color-palette-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.outlineBtnText, { color: colors.textSecondary }]}>Change</Text>
              </Pressable>
            </View>

            <View style={styles.divider} />

            {/* Portfolio Live */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Portfolio Live</Text>
                <Text style={[styles.settingHint, { color: colors.textTertiary }]}>
                  Make your portfolio visible to anyone with the link
                </Text>
              </View>
              <RNSwitch
                value={profile.settings?.isLive ?? false}
                onValueChange={(v) => updateSettings({ isLive: v })}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,255,255,0.3)' }}
                thumbColor="white"
              />
            </View>

            {/* Visibility toggles */}
            {visibilityItems.map(({ key, label }) => (
              <View key={key} style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.textSecondary, fontSize: 14 }]}>
                  {label}
                </Text>
                <RNSwitch
                  value={(profile.settings as any)?.[key] ?? true}
                  onValueChange={(v) => updateSettings({ [key]: v })}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,255,255,0.3)' }}
                  thumbColor="white"
                />
              </View>
            ))}
          </SectionCard>

          {/* â”€â”€ Share Link â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <SectionCard style={{ alignItems: 'center' as any }}>
            <View style={styles.shareLinkRow}>
              <Ionicons name="link-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.shareLinkLabel, { color: colors.textSecondary }]}>
                Your shareable link
              </Text>
            </View>
            <Pressable onPress={copyShareLink}>
              <Text style={styles.shareLinkUrl}>clstr.in/{profile.settings?.slug ?? ''}</Text>
            </Pressable>
            <Text style={[styles.shareLinkHint, { color: colors.textTertiary }]}>
              Tap to copy. Share on resumes, LinkedIn, anywhere.
            </Text>
          </SectionCard>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 14, fontFamily: fontFamily.regular, textAlign: 'center' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { fontSize: 17, fontFamily: fontFamily.semiBold, color: 'white' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'white',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveBtnText: { fontSize: 13, fontFamily: fontFamily.semiBold, color: '#000' },

  scrollView: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  /* Cards */
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    marginBottom: 12,
  },
  subCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 12,
    marginBottom: 10,
  },
  subCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  /* Section header */
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 16, fontFamily: fontFamily.semiBold },

  /* Form fields */
  fieldLabel: { fontSize: 12, fontFamily: fontFamily.medium, marginBottom: 4, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  multilineInput: { minHeight: 100, textAlignVertical: 'top' },
  inlineTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: fontFamily.medium,
    paddingVertical: 0,
  },
  row2: { flexDirection: 'row', gap: 8, marginTop: 6 },

  /* Slug */
  slugRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  slugPrefix: { fontSize: 14, fontFamily: fontFamily.regular },
  slugInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  /* Switch row */
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  switchLabel: { fontSize: 13, fontFamily: fontFamily.regular },

  /* Skills */
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  skillBadgeText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: fontFamily.regular },
  skillX: { color: 'rgba(255,255,255,0.35)', fontSize: 14 },
  addSkillRow: { flexDirection: 'row', gap: 8 },
  addSkillBtn: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSkillBtnText: { color: 'white', fontSize: 14, fontFamily: fontFamily.medium },

  /* Add button */
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginTop: 4,
  },
  addBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily: fontFamily.medium },

  /* Posts */
  postCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 12,
    marginBottom: 8,
  },
  postTitle: { fontSize: 14, fontFamily: fontFamily.medium, marginBottom: 4 },
  postContent: { fontSize: 13, fontFamily: fontFamily.regular },
  postDate: { fontSize: 11, fontFamily: fontFamily.regular, marginTop: 6 },
  emptyHint: { fontSize: 13, fontFamily: fontFamily.regular, padding: 12 },

  /* Settings */
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingLabel: { fontSize: 14, fontFamily: fontFamily.medium },
  settingHint: { fontSize: 11, fontFamily: fontFamily.regular, marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 4 },

  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  outlineBtnText: { fontSize: 13, fontFamily: fontFamily.medium },

  /* Share link */
  shareLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  shareLinkLabel: { fontSize: 13, fontFamily: fontFamily.regular },
  shareLinkUrl: { fontSize: 18, fontFamily: fontFamily.semiBold, color: 'white', marginBottom: 4 },
  shareLinkHint: { fontSize: 12, fontFamily: fontFamily.regular, textAlign: 'center' },

  /* Ghost action */
  ghostAction: { marginTop: 12, paddingVertical: 8 },
  ghostActionText: { fontSize: 15, fontFamily: fontFamily.medium },
});
