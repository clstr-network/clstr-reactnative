/**
 * ChipPicker — Multi-select chip grid component.
 *
 * Used in onboarding for interests selection + custom input.
 * Renders preset chips in a flow-wrap layout with optional custom add.
 *
 * Phase 2.4b: Onboarding Parity
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

interface ChipPickerProps {
  /** Preset options to display as chips. */
  presets: string[];
  /** Currently selected values. */
  selected: string[];
  /** Called when selection changes. */
  onSelectionChange: (selected: string[]) => void;
  /** Minimum required selections. */
  minSelections?: number;
  /** Maximum allowed selections. */
  maxSelections?: number;
  /** Allow user to add custom chips. */
  allowCustom?: boolean;
  /** Placeholder for custom input. */
  customPlaceholder?: string;
  /** Color tokens. */
  colors: {
    text: string;
    textSecondary: string;
    textTertiary: string;
    surface: string;
    border: string;
    tint: string;
    primaryForeground?: string;
  };
}

export function ChipPicker({
  presets,
  selected,
  onSelectionChange,
  maxSelections = 12,
  allowCustom = true,
  customPlaceholder = 'Add your own...',
  colors,
}: ChipPickerProps) {
  const [customInput, setCustomInput] = useState('');

  const toggleChip = useCallback(
    (chip: string) => {
      Haptics.selectionAsync();
      if (selected.includes(chip)) {
        onSelectionChange(selected.filter((s) => s !== chip));
      } else if (selected.length < maxSelections) {
        onSelectionChange([...selected, chip]);
      }
    },
    [selected, onSelectionChange, maxSelections],
  );

  const addCustomChip = useCallback(() => {
    const cleaned = customInput.trim();
    if (!cleaned) return;
    if (selected.length >= maxSelections) return;

    const exists = selected.some(
      (s) => s.toLowerCase() === cleaned.toLowerCase(),
    );
    if (exists) {
      setCustomInput('');
      return;
    }

    Haptics.selectionAsync();
    onSelectionChange([...selected, cleaned]);
    setCustomInput('');
  }, [customInput, selected, onSelectionChange, maxSelections]);

  const removeChip = useCallback(
    (chip: string) => {
      Haptics.selectionAsync();
      onSelectionChange(selected.filter((s) => s !== chip));
    },
    [selected, onSelectionChange],
  );

  return (
    <View style={styles.container}>
      {/* Selected chips (custom ones that aren't in presets) */}
      {selected.filter((s) => !presets.includes(s)).length > 0 && (
        <View style={styles.chipGrid}>
          {selected
            .filter((s) => !presets.includes(s))
            .map((chip) => (
              <Pressable
                key={chip}
                onPress={() => removeChip(chip)}
                style={[
                  styles.chip,
                  styles.chipSelected,
                  { backgroundColor: colors.tint, borderColor: colors.tint },
                ]}
              >
                <Text style={[styles.chipText, { color: colors.primaryForeground ?? '#000' }]}>{chip}</Text>
                <Ionicons name="close" size={14} color={colors.primaryForeground ?? '#000'} style={{ marginLeft: 4 }} />
              </Pressable>
            ))}
        </View>
      )}

      {/* Preset chips */}
      <View style={styles.chipGrid}>
        {presets.map((chip) => {
          const isSelected = selected.includes(chip);
          return (
            <Pressable
              key={chip}
              onPress={() => toggleChip(chip)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? colors.tint : colors.surface,
                  borderColor: isSelected ? colors.tint : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: isSelected ? colors.primaryForeground ?? '#000' : colors.textSecondary },
                ]}
              >
                {chip}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark" size={14} color={colors.primaryForeground ?? '#000'} style={{ marginLeft: 4 }} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Custom input */}
      {allowCustom && (
        <View
          style={[
            styles.customInputRow,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <TextInput
            style={[styles.customInput, { color: colors.text }]}
            value={customInput}
            onChangeText={setCustomInput}
            placeholder={customPlaceholder}
            placeholderTextColor={colors.textTertiary}
            onSubmitEditing={addCustomChip}
            returnKeyType="done"
          />
          <Pressable
            onPress={addCustomChip}
            disabled={!customInput.trim()}
            style={[
              styles.addBtn,
              {
                backgroundColor: customInput.trim()
                  ? colors.tint
                  : colors.border,
              },
            ]}
          >
            <Ionicons name="add" size={18} color={colors.primaryForeground ?? '#000'} />
          </Pressable>
        </View>
      )}

      {/* Count indicator */}
      <Text style={[styles.countText, { color: colors.textTertiary }]}>
        {selected.length} selected{maxSelections ? ` (max ${maxSelections})` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  chipSelected: {},
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 4,
    height: 48,
    gap: 8,
  },
  customInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'right',
  },
});
