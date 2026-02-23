/**
 * PollCreator — Create polls with 2-6 options and a duration selector.
 * Phase 10, Task 10.4.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

export interface PollData {
  question: string;
  options: { text: string; votes: number }[];
  endDate: string; // ISO string
}

type DurationKey = '1d' | '3d' | '1w' | '2w';

const DURATIONS: { key: DurationKey; label: string; days: number }[] = [
  { key: '1d', label: '1 Day', days: 1 },
  { key: '3d', label: '3 Days', days: 3 },
  { key: '1w', label: '1 Week', days: 7 },
  { key: '2w', label: '2 Weeks', days: 14 },
];

interface PollCreatorProps {
  value: PollData | null;
  onChange: (poll: PollData | null) => void;
}

export default function PollCreator({ value, onChange }: PollCreatorProps) {
  const colors = useThemeColors();

  const [question, setQuestion] = useState(value?.question ?? '');
  const [options, setOptions] = useState<string[]>(
    value?.options?.map(o => o.text) ?? ['', ''],
  );
  const [duration, setDuration] = useState<DurationKey>('3d');

  const emit = useCallback(
    (q: string, opts: string[], dur: DurationKey) => {
      const endDate = new Date();
      const d = DURATIONS.find(d => d.key === dur)!;
      endDate.setDate(endDate.getDate() + d.days);

      const filledOptions = opts.filter(o => o.trim().length > 0);
      if (q.trim().length > 0 && filledOptions.length >= MIN_OPTIONS) {
        onChange({
          question: q.trim(),
          options: filledOptions.map(text => ({ text: text.trim(), votes: 0 })),
          endDate: endDate.toISOString(),
        });
      } else {
        onChange(null);
      }
    },
    [onChange],
  );

  const handleQuestionChange = (text: string) => {
    setQuestion(text);
    emit(text, options, duration);
  };

  const handleOptionChange = (text: string, index: number) => {
    const updated = [...options];
    updated[index] = text;
    setOptions(updated);
    emit(question, updated, duration);
  };

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    const updated = [...options, ''];
    setOptions(updated);
    Haptics.selectionAsync();
  };

  const removeOption = (index: number) => {
    if (options.length <= MIN_OPTIONS) return;
    const updated = options.filter((_, i) => i !== index);
    setOptions(updated);
    emit(question, updated, duration);
    Haptics.selectionAsync();
  };

  const selectDuration = (key: DurationKey) => {
    setDuration(key);
    emit(question, options, key);
    Haptics.selectionAsync();
  };

  const filledCount = options.filter(o => o.trim().length > 0).length;
  const isValid = question.trim().length > 0 && filledCount >= MIN_OPTIONS;

  return (
    <View style={styles.container}>
      {/* Question */}
      <Text style={[styles.label, { color: colors.text }]}>Poll Question</Text>
      <TextInput
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.inputBackground,
            borderColor: colors.inputBorder,
          },
        ]}
        placeholder="Ask a question..."
        placeholderTextColor={colors.textTertiary}
        value={question}
        onChangeText={handleQuestionChange}
        maxLength={200}
      />

      {/* Options */}
      <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>
        Options ({filledCount}/{options.length})
      </Text>
      {options.map((opt, i) => (
        <View key={i} style={styles.optionRow}>
          <TextInput
            style={[
              styles.input,
              styles.optionInput,
              {
                color: colors.text,
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
              },
            ]}
            placeholder={`Option ${i + 1}`}
            placeholderTextColor={colors.textTertiary}
            value={opt}
            onChangeText={t => handleOptionChange(t, i)}
            maxLength={80}
          />
          {options.length > MIN_OPTIONS && (
            <Pressable onPress={() => removeOption(i)} hitSlop={8} style={styles.removeBtn}>
              <Ionicons name="close-circle" size={22} color={colors.error ?? '#ef4444'} />
            </Pressable>
          )}
        </View>
      ))}

      {options.length < MAX_OPTIONS && (
        <Pressable
          onPress={addOption}
          style={[styles.addOptionBtn, { borderColor: colors.border }]}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.tint} />
          <Text style={[styles.addOptionText, { color: colors.tint }]}>Add Option</Text>
        </Pressable>
      )}

      {/* Duration */}
      <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Duration</Text>
      <View style={styles.durationRow}>
        {DURATIONS.map(d => {
          const active = d.key === duration;
          return (
            <Pressable
              key={d.key}
              onPress={() => selectDuration(d.key)}
              style={[
                styles.durationChip,
                {
                  backgroundColor: active ? colors.tint + '20' : colors.surfaceElevated,
                  borderColor: active ? colors.tint : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.durationText,
                  { color: active ? colors.tint : colors.textSecondary },
                ]}
              >
                {d.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Validation hint */}
      {!isValid && (question.length > 0 || filledCount > 0) && (
        <Text style={[styles.hint, { color: colors.warning }]}>
          A question and at least {MIN_OPTIONS} options are required.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  input: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionInput: { flex: 1 },
  removeBtn: { padding: 4 },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  addOptionText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  durationText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
});
