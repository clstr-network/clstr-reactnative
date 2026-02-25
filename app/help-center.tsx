/**
 * Help Center Screen â€” Phase 4.4
 *
 * FAQ accordion + category filters + contact support form.
 * Inserts support tickets into Supabase.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize as typeFontSize } from '@/constants/typography';
import { supabase } from '@/lib/adapters/core-client';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';

/* ------------------------------------------------------------------ */
/*  Static FAQ data                                                    */
/* ------------------------------------------------------------------ */

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    category: 'Account',
    question: 'How do I update my profile information?',
    answer:
      "Go to your Profile page and tap 'Edit Profile'. You can update your name, headline, bio, skills, and other information from there.",
  },
  {
    category: 'Account',
    question: 'How do I change my password?',
    answer:
      "Navigate to Settings > Account and tap 'Change Password'. You'll receive an email with instructions to reset your password.",
  },
  {
    category: 'Connections',
    question: 'How do I connect with other alumni?',
    answer:
      "Visit a user's profile and tap the 'Connect' button. They'll receive a connection request and can accept or decline it.",
  },
  {
    category: 'Connections',
    question: 'How do I message someone?',
    answer:
      "You can message any user by visiting their profile and tapping the 'Message' button, or by going to the Chat tab directly.",
  },
  {
    category: 'Jobs',
    question: 'How do I post a job listing?',
    answer:
      "Go to the Jobs page and tap 'Post a Job'. Fill in the job details including title, description, requirements, and location.",
  },
  {
    category: 'Events',
    question: 'How do I create an event?',
    answer:
      "Navigate to the Events page and tap 'Create Event'. You can set up virtual or in-person events with custom details and RSVP options.",
  },
  {
    category: 'Clubs',
    question: 'How do I join a club?',
    answer:
      "Browse the Clubs page to find clubs that interest you. Tap on a club to view details, then tap 'Join Club' to become a member.",
  },
  {
    category: 'Privacy',
    question: 'Who can see my profile?',
    answer:
      'By default, your profile is visible to all platform users. You can change this in Settings > Privacy to limit visibility to connections only or make it private.',
  },
];

const categories = [
  { name: 'Account', icon: 'person-outline' as const },
  { name: 'Connections', icon: 'people-outline' as const },
  { name: 'Jobs', icon: 'briefcase-outline' as const },
  { name: 'Events', icon: 'calendar-outline' as const },
];

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */

export default function HelpCenterScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { identity } = useIdentityContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Contact form
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* Filtered FAQs -------------------------------------------------- */
  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q);
      const matchesCat =
        !selectedCategory || faq.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCat;
    });
  }, [searchQuery, selectedCategory]);

  /* Category toggle ------------------------------------------------- */
  const toggleCategory = useCallback(
    (cat: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedCategory((prev) => (prev === cat ? null : cat));
    },
    [],
  );

  /* Contact submit -------------------------------------------------- */
  const handleContactSubmit = useCallback(async () => {
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      Alert.alert('Missing information', 'Please fill in all fields before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from('support_tickets')
        .insert({
          user_id: identity?.user_id ?? null,
          name: contactName.trim(),
          email: contactEmail.trim(),
          message: contactMessage.trim(),
          status: 'open',
        });
      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Message sent!', 'Our support team will get back to you within 24-48 hours.');
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    } catch (err) {
      console.error('Error submitting support ticket:', err);
      Alert.alert('Failed to send', 'Please try again later or contact support directly.');
    } finally {
      setIsSubmitting(false);
    }
  }, [contactName, contactEmail, contactMessage, identity?.user_id]);

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
          <Text style={styles.headerTitle}>Help Center</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Find answers to common questions or contact our support team
          </Text>

          {/* Search */}
          <View style={[styles.searchContainer, { borderColor: 'rgba(255,255,255,0.08)' }]}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search for help..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </Pressable>
            )}
          </View>

          {/* Category Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesRow}
            contentContainerStyle={{ gap: 8 }}
          >
            {categories.map((cat) => {
              const active = selectedCategory === cat.name;
              return (
                <Pressable
                  key={cat.name}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: active
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(255,255,255,0.04)',
                      borderColor: active
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(255,255,255,0.06)',
                    },
                  ]}
                  onPress={() => toggleCategory(cat.name)}
                >
                  <Ionicons
                    name={cat.icon}
                    size={16}
                    color={active ? 'white' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.categoryPillText,
                      { color: active ? 'white' : colors.textSecondary },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Active filter chip */}
          {selectedCategory && (
            <View style={styles.filterChipRow}>
              <Text style={[styles.filterLabel, { color: colors.textTertiary }]}>
                Filtering by:
              </Text>
              <Pressable
                style={[styles.filterChip, { borderColor: 'rgba(255,255,255,0.1)' }]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.filterChipText, { color: colors.textSecondary }]}>
                  {selectedCategory} âœ•
                </Text>
              </Pressable>
            </View>
          )}

          {/* FAQ Section */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Frequently Asked Questions
          </Text>

          {filteredFaqs.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No questions found matching your search.
            </Text>
          ) : (
            filteredFaqs.map((faq, index) => {
              const expanded = expandedFaq === index;
              return (
                <Pressable
                  key={index}
                  style={[styles.faqItem, { borderColor: 'rgba(255,255,255,0.06)' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setExpandedFaq(expanded ? null : index);
                  }}
                >
                  <View style={styles.faqHeader}>
                    <Text style={[styles.faqQuestion, { color: colors.text }]} numberOfLines={expanded ? undefined : 2}>
                      {faq.question}
                    </Text>
                    <Ionicons
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.textTertiary}
                    />
                  </View>
                  {expanded && (
                    <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
                      {faq.answer}
                    </Text>
                  )}
                </Pressable>
              );
            })
          )}

          {/* Contact Support */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 32 }]}>
            Contact Support
          </Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            {"Can't find what you're looking for? Send us a message."}
          </Text>

          <View style={[styles.formCard, { borderColor: 'rgba(255,255,255,0.06)' }]}>
            {/* Name */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Name</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: 'rgba(255,255,255,0.08)' }]}
              placeholder="Your name"
              placeholderTextColor={colors.textTertiary}
              value={contactName}
              onChangeText={setContactName}
            />

            {/* Email */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: 'rgba(255,255,255,0.08)' }]}
              placeholder="your.email@example.com"
              placeholderTextColor={colors.textTertiary}
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Message */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Message</Text>
            <TextInput
              style={[
                styles.textInput,
                styles.textArea,
                { color: colors.text, borderColor: 'rgba(255,255,255,0.08)' },
              ]}
              placeholder="Describe your issue or question..."
              placeholderTextColor={colors.textTertiary}
              value={contactMessage}
              onChangeText={setContactMessage}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            {/* Submit */}
            <Pressable
              style={[
                styles.submitButton,
                {
                  opacity: isSubmitting ? 0.6 : 1,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderColor: 'rgba(255,255,255,0.1)',
                },
              ]}
              onPress={handleContactSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Send Message</Text>
              )}
            </Pressable>
          </View>

          {/* Additional resources */}
          <View style={[styles.resourcesCard, { borderColor: 'rgba(255,255,255,0.06)' }]}>
            <Text style={[styles.resourcesTitle, { color: colors.text }]}>Need more help?</Text>
            <Text style={[styles.resourcesDesc, { color: colors.textSecondary }]}>
              Our support team is available Monday to Friday, 9 AM â€“ 6 PM IST
            </Text>
            <View style={[styles.emailBadge, { borderColor: 'rgba(255,255,255,0.1)' }]}>
              <Ionicons name="mail-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.emailText, { color: colors.textSecondary }]}>
                support@clstr.network
              </Text>
            </View>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: {
    fontSize: typeFontSize.xl,
    fontFamily: fontFamily.semiBold,
    color: 'white',
  },
  scrollView: { flex: 1, paddingHorizontal: 16 },
  subtitle: {
    fontSize: typeFontSize.base,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  /* Search */
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: typeFontSize.body,
  },
  /* Categories */
  categoriesRow: { marginBottom: 12 },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillText: { fontSize: typeFontSize.md, fontFamily: fontFamily.medium },
  /* Filter chip */
  filterChipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  filterLabel: { fontSize: typeFontSize.sm, fontFamily: fontFamily.regular },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  filterChipText: { fontSize: typeFontSize.sm, fontFamily: fontFamily.medium },
  /* FAQ */
  sectionTitle: { fontSize: typeFontSize.xl, fontFamily: fontFamily.semiBold, marginBottom: 12 },
  sectionDesc: { fontSize: typeFontSize.md, fontFamily: fontFamily.regular, marginBottom: 16 },
  emptyText: { fontSize: typeFontSize.base, fontFamily: fontFamily.regular, textAlign: 'center', paddingVertical: 20 },
  faqItem: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  faqQuestion: { flex: 1, fontSize: typeFontSize.base, fontFamily: fontFamily.medium, marginRight: 8 },
  faqAnswer: { fontSize: typeFontSize.md, fontFamily: fontFamily.regular, paddingHorizontal: 14, paddingBottom: 14 },
  /* Contact form */
  formCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  inputLabel: { fontSize: typeFontSize.md, fontFamily: fontFamily.medium, marginBottom: 6, marginTop: 12 },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fontFamily.regular,
    fontSize: typeFontSize.base,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  textArea: { minHeight: 110 },
  submitButton: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  submitButtonText: { fontSize: typeFontSize.body, fontFamily: fontFamily.semiBold, color: 'white' },
  /* Resources */
  resourcesCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  resourcesTitle: { fontSize: typeFontSize.lg, fontFamily: fontFamily.semiBold, marginBottom: 4 },
  resourcesDesc: { fontSize: typeFontSize.md, fontFamily: fontFamily.regular, textAlign: 'center', marginBottom: 12 },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  emailText: { fontSize: typeFontSize.md, fontFamily: fontFamily.medium },
});
