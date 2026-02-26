import React, { useState, useCallback, useEffect } from 'react';
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
import { fontFamily, fontSize } from '@/constants/typography';
import { useAuth } from '@/lib/auth-context';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { createEvent } from '@/lib/api/events';
import { QUERY_KEYS } from '@/lib/query-keys';

type DateTimePickerProps = {
  value: Date;
  mode: 'date' | 'time';
  display?: 'default' | 'spinner' | 'inline' | 'calendar' | 'clock';
  onChange: (_event: unknown, selected?: Date) => void;
  minimumDate?: Date;
  themeVariant?: 'light' | 'dark';
};

type DateTimePickerComponent = React.ComponentType<DateTimePickerProps>;

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
  const { canCreateEvents } = useFeatureAccess();
  const queryClient = useQueryClient();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const [NativeDateTimePicker, setNativeDateTimePicker] = useState<DateTimePickerComponent | null>(null);

  useEffect(() => {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      import('@react-native-community/datetimepicker')
        .then((module) => {
          if (module.default) {
            setNativeDateTimePicker(() => module.default as DateTimePickerComponent);
          }
        })
        .catch(() => {
          setNativeDateTimePicker(null);
        });
    }
  }, []);

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
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Native date/time picker state
  const [dateObj, setDateObj] = useState(() => new Date());
  const [timeObj, setTimeObj] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const isValid = title.trim().length > 0 && eventDate.length > 0;

  // Tag helpers
  const addTag = useCallback(() => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags(prev => [...prev, t]);
      setTagInput('');
      Haptics.selectionAsync();
    }
  }, [tagInput, tags]);

  const removeTag = useCallback((tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
    Haptics.selectionAsync();
  }, []);

  // Date/time picker handlers
  const onDateChange = useCallback((_event: unknown, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) {
      setDateObj(selected);
      const y = selected.getFullYear();
      const m = String(selected.getMonth() + 1).padStart(2, '0');
      const d = String(selected.getDate()).padStart(2, '0');
      setEventDate(`${y}-${m}-${d}`);
    }
  }, []);

  const onTimeChange = useCallback((_event: unknown, selected?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selected) {
      setTimeObj(selected);
      const timeStr = selected.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      setEventTime(timeStr);
    }
  }, []);

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
        tags: tags.length > 0 ? tags : undefined,
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

  const isBusy = createMutation.isPending;

  // Phase 5 — Role gate: only Faculty & Club can create events (placed after all hooks)
  if (!canCreateEvents) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, paddingTop: insets.top }}>
        <Ionicons name="lock-closed-outline" size={56} color={colors.textTertiary} />
        <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: '600', marginTop: 16 }}>Access Restricted</Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.base, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>Only Faculty and Club accounts can create events.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

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

        {/* Date — Native Picker */}
        <Text style={[styles.label, { color: colors.text }]}>Date *</Text>
        <Pressable
          onPress={() => { setShowDatePicker(prev => !prev); Haptics.selectionAsync(); }}
          style={[styles.dateBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.tint} />
          <Text style={[styles.dateBtnText, { color: colors.text }]}>
            {formatDisplayDate(eventDate) || 'Select date'}
          </Text>
          <Ionicons name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
        </Pressable>

        {showDatePicker && NativeDateTimePicker && (
          <View style={[styles.pickerContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <NativeDateTimePicker
              value={dateObj}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
              themeVariant="dark"
            />
          </View>
        )}

        {/* Time — Native Picker */}
        <Text style={[styles.label, { color: colors.text }]}>Time</Text>
        <Pressable
          onPress={() => { setShowTimePicker(prev => !prev); Haptics.selectionAsync(); }}
          style={[styles.dateBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="time-outline" size={18} color={colors.tint} />
          <Text style={[styles.dateBtnText, { color: eventTime ? colors.text : colors.textTertiary }]}>
            {eventTime || 'Select time'}
          </Text>
          <Ionicons name={showTimePicker ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
        </Pressable>

        {showTimePicker && NativeDateTimePicker && (
          <View style={[styles.pickerContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <NativeDateTimePicker
              value={timeObj ?? new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
              themeVariant="dark"
            />
          </View>
        )}

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

        {/* Tags */}
        <Text style={[styles.label, { color: colors.text }]}>Tags</Text>
        <View style={styles.tagInputRow}>
          <TextInput
            style={[styles.tagInputField, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            placeholder="Add tag…"
            placeholderTextColor={colors.textTertiary}
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={addTag}
            returnKeyType="done"
            maxLength={30}
          />
          <Pressable
            onPress={addTag}
            style={[styles.tagAddBtn, { backgroundColor: tagInput.trim() ? colors.tint : colors.surfaceSecondary }]}
          >
            <Ionicons name="add" size={18} color={tagInput.trim() ? '#fff' : colors.textTertiary} />
          </Pressable>
        </View>
        {tags.length > 0 && (
          <View style={styles.tagChipRow}>
            {tags.map(tag => (
              <Pressable
                key={tag}
                onPress={() => removeTag(tag)}
                style={[styles.tagChip, { backgroundColor: colors.tint + '15', borderColor: colors.tint }]}
              >
                <Text style={[styles.tagChipText, { color: colors.tint }]}>#{tag}</Text>
                <Ionicons name="close-circle" size={14} color={colors.tint} />
              </Pressable>
            ))}
          </View>
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
  cancelText: { fontSize: fontSize.lg, fontFamily: fontFamily.regular },
  headerTitle: { fontSize: fontSize.xl, fontWeight: '700', fontFamily: fontFamily.bold },
  submitBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18, minWidth: 70, alignItems: 'center' },
  submitBtnText: { fontSize: fontSize.body, fontWeight: '700', fontFamily: fontFamily.bold },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 100 },
  label: { fontSize: fontSize.base, fontWeight: '700', marginTop: 4, fontFamily: fontFamily.bold },
  input: {
    fontSize: fontSize.body, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, fontFamily: fontFamily.regular,
  },
  textarea: {
    fontSize: fontSize.body, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, minHeight: 120, fontFamily: fontFamily.regular,
  },
  charCount: { fontSize: fontSize.sm, textAlign: 'right', fontFamily: fontFamily.regular },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 16, borderWidth: 1, gap: 5,
  },
  categoryLabel: { fontSize: fontSize.md, fontWeight: '600', fontFamily: fontFamily.semiBold },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, gap: 8,
  },
  dateBtnText: { flex: 1, fontSize: fontSize.body, fontFamily: fontFamily.regular },
  pickerContainer: {
    borderRadius: 12, borderWidth: 1, overflow: 'hidden', padding: 4,
  },
  tagInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  tagInputField: {
    flex: 1, fontSize: fontSize.body, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, fontFamily: fontFamily.regular,
  },
  tagAddBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  tagChipRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 14, borderWidth: 1, gap: 4,
  },
  tagChipText: { fontSize: fontSize.md, fontWeight: '600', fontFamily: fontFamily.semiBold },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchText: { fontSize: fontSize.body, fontWeight: '600', fontFamily: fontFamily.semiBold },
});
