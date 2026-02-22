import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, Platform,
  Alert, Switch, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { createEvent } from '@/lib/api/events';
import { QUERY_KEYS } from '@/lib/query-keys';

// ── Category chips ──────────────────────────────────────────────────
type CategoryValue = 'Academic' | 'Career' | 'Social' | 'Workshop' | 'Sports';

const CATEGORIES: { value: CategoryValue; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'Academic', label: 'Academic', icon: 'school-outline' },
  { value: 'Career', label: 'Career', icon: 'briefcase-outline' },
  { value: 'Social', label: 'Social', icon: 'people-outline' },
  { value: 'Workshop', label: 'Workshop', icon: 'construct-outline' },
  { value: 'Sports', label: 'Sports', icon: 'basketball-outline' },
];

// ── Date / Time helpers ─────────────────────────────────────────────
function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CreateEventScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(todayString());
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);
  const [virtualLink, setVirtualLink] = useState('');
  const [category, setCategory] = useState<CategoryValue>('Social');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [registrationRequired, setRegistrationRequired] = useState(false);
  const [externalLink, setExternalLink] = useState('');

  // Inline date editor state
  const [showDateEditor, setShowDateEditor] = useState(false);
  const [dateYear, setDateYear] = useState(() => String(new Date().getFullYear()));
  const [dateMonth, setDateMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [dateDay, setDateDay] = useState(() => String(new Date().getDate()).padStart(2, '0'));

  const isValid = title.trim().length > 0 && eventDate.length > 0;

  const createMutation = useMutation({
    mutationFn: () =>
      createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        event_date: eventDate,
        event_time: eventTime.trim() || undefined,
        location: location.trim() || undefined,
        is_virtual: isVirtual,
        virtual_link: isVirtual && virtualLink.trim() ? virtualLink.trim() : undefined,
        category,
        max_attendees: maxAttendees ? parseInt(maxAttendees, 10) || undefined : undefined,
        registration_required: registrationRequired,
        external_registration_link: externalLink.trim() || undefined,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events });
      router.back();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to create event. Please try again.');
    },
  });

  const handleCreate = useCallback(() => {
    if (!isValid || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createMutation.mutate();
  }, [isValid, user, createMutation]);

  const applyDate = useCallback(() => {
    const y = parseInt(dateYear, 10);
    const m = parseInt(dateMonth, 10);
    const d = parseInt(dateDay, 10);
    if (y >= 2024 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      setEventDate(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    setShowDateEditor(false);
  }, [dateYear, dateMonth, dateDay]);

  const isBusy = createMutation.isPending;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Event</Text>
        <Pressable
          onPress={handleCreate}
          disabled={!isValid || isBusy}
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: isValid ? colors.tint : colors.surfaceSecondary },
            pressed && { opacity: 0.85 },
          ]}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.submitBtnText, { color: isValid ? '#fff' : colors.textTertiary }]}>Create</Text>
          )}
        </Pressable>
      </View>

      {/* Form */}
      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        bottomOffset={20}
      >
        {/* Title */}
        <Text style={[styles.label, { color: colors.text }]}>Event Title *</Text>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
          placeholder="e.g. AI Workshop, Career Fair…"
          placeholderTextColor={colors.textTertiary}
          value={title}
          onChangeText={setTitle}
          maxLength={120}
          autoFocus
        />

        {/* Category */}
        <Text style={[styles.label, { color: colors.text }]}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map(c => (
            <Pressable
              key={c.value}
              onPress={() => { setCategory(c.value); Haptics.selectionAsync(); }}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: category === c.value ? colors.tint + '15' : colors.surfaceSecondary,
                  borderColor: category === c.value ? colors.tint : colors.border,
                },
              ]}
            >
              <Ionicons name={c.icon} size={16} color={category === c.value ? colors.tint : colors.textSecondary} />
              <Text style={[styles.categoryLabel, { color: category === c.value ? colors.tint : colors.textSecondary }]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Date */}
        <Text style={[styles.label, { color: colors.text }]}>Date *</Text>
        <Pressable
          onPress={() => setShowDateEditor(!showDateEditor)}
          style={[styles.dateBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.tint} />
          <Text style={[styles.dateBtnText, { color: colors.text }]}>
            {formatDisplayDate(eventDate) || 'Select date'}
          </Text>
          <Ionicons name={showDateEditor ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
        </Pressable>

        {showDateEditor && (
          <View style={[styles.dateEditorRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <View style={styles.dateFieldGroup}>
              <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>Year</Text>
              <TextInput
                style={[styles.dateField, { color: colors.text, borderColor: colors.border }]}
                value={dateYear}
                onChangeText={setDateYear}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
            <View style={styles.dateFieldGroup}>
              <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>Month</Text>
              <TextInput
                style={[styles.dateField, { color: colors.text, borderColor: colors.border }]}
                value={dateMonth}
                onChangeText={setDateMonth}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <View style={styles.dateFieldGroup}>
              <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>Day</Text>
              <TextInput
                style={[styles.dateField, { color: colors.text, borderColor: colors.border }]}
                value={dateDay}
                onChangeText={setDateDay}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <Pressable
              onPress={applyDate}
              style={[styles.dateApplyBtn, { backgroundColor: colors.tint }]}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
            </Pressable>
          </View>
        )}

        {/* Time */}
        <Text style={[styles.label, { color: colors.text }]}>Time</Text>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
          placeholder="e.g. 2:00 PM - 4:00 PM"
          placeholderTextColor={colors.textTertiary}
          value={eventTime}
          onChangeText={setEventTime}
          maxLength={50}
        />

        {/* Virtual toggle */}
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Ionicons name="videocam-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.switchText, { color: colors.text }]}>Virtual Event</Text>
          </View>
          <Switch
            value={isVirtual}
            onValueChange={setIsVirtual}
            trackColor={{ false: colors.border, true: colors.tint + '60' }}
            thumbColor={isVirtual ? colors.tint : colors.textTertiary}
          />
        </View>

        {/* Location or Virtual Link */}
        {isVirtual ? (
          <>
            <Text style={[styles.label, { color: colors.text }]}>Virtual Meeting Link</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              placeholder="https://meet.google.com/..."
              placeholderTextColor={colors.textTertiary}
              value={virtualLink}
              onChangeText={setVirtualLink}
              autoCapitalize="none"
              keyboardType="url"
            />
          </>
        ) : (
          <>
            <Text style={[styles.label, { color: colors.text }]}>Location</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              placeholder="e.g. Room 204, Engineering Building"
              placeholderTextColor={colors.textTertiary}
              value={location}
              onChangeText={setLocation}
            />
          </>
        )}

        {/* Max Attendees */}
        <Text style={[styles.label, { color: colors.text }]}>Max Attendees</Text>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
          placeholder="Leave empty for unlimited"
          placeholderTextColor={colors.textTertiary}
          value={maxAttendees}
          onChangeText={setMaxAttendees}
          keyboardType="number-pad"
          maxLength={5}
        />

        {/* Registration required toggle */}
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Ionicons name="clipboard-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.switchText, { color: colors.text }]}>Registration Required</Text>
          </View>
          <Switch
            value={registrationRequired}
            onValueChange={setRegistrationRequired}
            trackColor={{ false: colors.border, true: colors.tint + '60' }}
            thumbColor={registrationRequired ? colors.tint : colors.textTertiary}
          />
        </View>

        {/* External Registration Link */}
        {registrationRequired && (
          <>
            <Text style={[styles.label, { color: colors.text }]}>External Registration URL</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              placeholder="https://forms.google.com/..."
              placeholderTextColor={colors.textTertiary}
              value={externalLink}
              onChangeText={setExternalLink}
              autoCapitalize="none"
              keyboardType="url"
            />
          </>
        )}

        {/* Description */}
        <Text style={[styles.label, { color: colors.text }]}>Description</Text>
        <TextInput
          style={[styles.textarea, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
          placeholder="Tell people what this event is about…"
          placeholderTextColor={colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={2000}
          textAlignVertical="top"
        />
        <Text style={[styles.charCount, { color: description.length > 1800 ? colors.warning : colors.textTertiary }]}>
          {description.length}/2000
        </Text>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  cancelText: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  headerTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  submitBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18, minWidth: 70, alignItems: 'center' },
  submitBtnText: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 100 },
  label: { fontSize: 14, fontWeight: '700', marginTop: 4, fontFamily: 'Inter_700Bold' },
  input: {
    fontSize: 15, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, fontFamily: 'Inter_400Regular',
  },
  textarea: {
    fontSize: 15, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, minHeight: 120, fontFamily: 'Inter_400Regular',
  },
  charCount: { fontSize: 12, textAlign: 'right', fontFamily: 'Inter_400Regular' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 16, borderWidth: 1, gap: 5,
  },
  categoryLabel: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, gap: 8,
  },
  dateBtnText: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  dateEditorRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  dateFieldGroup: { flex: 1, gap: 4 },
  dateFieldLabel: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  dateField: {
    fontSize: 15, textAlign: 'center', paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, fontFamily: 'Inter_400Regular',
  },
  dateApplyBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchText: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
