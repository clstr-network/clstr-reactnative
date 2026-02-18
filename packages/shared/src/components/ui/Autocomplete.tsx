/**
 * Autocomplete — cross-platform
 *
 * TextInput with filterable suggestion list via Modal/FlatList.
 */
import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View as RNView,
  TextInput,
  FlatList,
  Modal,
  Pressable as RNPressable,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { tokens } from '../../design/tokens';
import { useTheme } from '../../design/useTheme';
import { Text } from './primitives/Text';

export interface AutocompleteOption {
  label: string;
  value: string;
}

export interface AutocompleteProps {
  options: AutocompleteOption[];
  value?: string;
  onSelect?: (option: AutocompleteOption) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

export function Autocomplete({
  options,
  value = '',
  onSelect,
  placeholder = 'Search…',
  style,
}: AutocompleteProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  );

  return (
    <RNView style={[styles.root, style]}>
      <TextInput
        value={query}
        onChangeText={(t) => {
          setQuery(t);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          {
            color: colors.foreground,
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      />

      <Modal visible={open && filtered.length > 0} transparent animationType="fade">
        <RNPressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <RNView style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.value}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <RNPressable
                onPress={() => {
                  setQuery(item.label);
                  setOpen(false);
                  onSelect?.(item);
                }}
                style={styles.option}
              >
                <Text size="sm" style={{ color: colors.foreground }}>
                  {item.label}
                </Text>
              </RNPressable>
            )}
          />
        </RNView>
      </Modal>
    </RNView>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
  },
  input: {
    height: tokens.touchTarget.min,
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.sm,
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.sans,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dropdown: {
    position: 'absolute',
    top: '30%',
    left: tokens.spacing.md,
    right: tokens.spacing.md,
    maxHeight: 240,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  option: {
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
  },
});
