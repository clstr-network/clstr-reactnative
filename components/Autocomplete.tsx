/**
 * Autocomplete — Searchable dropdown for React Native.
 *
 * Used in onboarding for university/major selection.
 * Renders a TextInput + FlatList dropdown filtered by search text.
 *
 * Phase 2.4a: Onboarding Parity
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AutocompleteOption {
  value: string;
  label: string;
}

interface AutocompleteProps {
  /** Available options. */
  options: AutocompleteOption[];
  /** Current input value. */
  value: string;
  /** Called when a value is selected. */
  onSelect: (value: string, label: string) => void;
  /** Called when input text changes. */
  onChangeText?: (text: string) => void;
  /** Placeholder text. */
  placeholder?: string;
  /** Max visible items in dropdown. */
  maxItems?: number;
  /** Color tokens. */
  colors: {
    text: string;
    textSecondary: string;
    textTertiary: string;
    surface: string;
    border: string;
    tint: string;
    background: string;
  };
}

export function Autocomplete({
  options,
  value,
  onSelect,
  onChangeText,
  placeholder = 'Search...',
  maxItems = 6,
  colors,
}: AutocompleteProps) {
  const [query, setQuery] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options.slice(0, maxItems);
    const normalized = query.toLowerCase().trim();
    return options
      .filter((opt) => opt.label.toLowerCase().includes(normalized))
      .slice(0, maxItems);
  }, [query, options, maxItems]);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const showDropdown = isFocused && filteredOptions.length > 0;

  const handleSelect = useCallback(
    (item: AutocompleteOption) => {
      setQuery(item.label);
      onSelect(item.value, item.label);
      onChangeText?.(item.label);
      setIsFocused(false);
      Keyboard.dismiss();
    },
    [onSelect, onChangeText],
  );

  const handleClear = useCallback(() => {
    setQuery('');
    onSelect('', '');
    onChangeText?.('');
    inputRef.current?.focus();
  }, [onSelect, onChangeText]);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: isFocused ? colors.tint : colors.border,
          },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={18}
          color={colors.textTertiary}
          style={styles.searchIcon}
        />
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.text }]}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            onChangeText?.(text);
            if (!isFocused) setIsFocused(true);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay to allow tap on dropdown item
            setTimeout(() => setIsFocused(false), 200);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable onPress={handleClear} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {showDropdown && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              ...(Platform.OS === 'ios'
                ? {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                  }
                : { elevation: 6 }),
            },
          ]}
        >
          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => item.value}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            style={styles.list}
            renderItem={({ item }) => (
              <Pressable
                onPressIn={() => handleSelect(item)}
                style={({ pressed }) => [
                  styles.option,
                  { backgroundColor: pressed ? colors.border : 'transparent' },
                ]}
              >
                <Text
                  style={[styles.optionText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  dropdown: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 12,
    maxHeight: 240,
    overflow: 'hidden',
    zIndex: 999,
  },
  list: {
    maxHeight: 240,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
});
