/**
 * InputOTP — cross-platform
 *
 * Replaces shadcn/ui InputOTP with individual digit inputs.
 */
import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View as RNView,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { tokens } from '../../design/tokens';

export interface InputOTPProps {
  maxLength?: number;
  value?: string;
  onChange?: (value: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function InputOTP({
  maxLength = 6,
  value = '',
  onChange,
  style,
}: InputOTPProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const handleChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, maxLength);
    onChange?.(cleaned);
  };

  return (
    <RNView style={[styles.container, style]}>
      {/* Hidden input for keyboard */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={maxLength}
        style={styles.hiddenInput}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        caretHidden
      />
      {/* Digit cells */}
      <RNView style={styles.cells}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <RNView
            key={i}
            style={[
              styles.cell,
              focused && i === value.length && styles.cellFocused,
              value[i] && styles.cellFilled,
            ]}
            onTouchEnd={() => inputRef.current?.focus()}
          >
            {value[i] ? (
              <RNView>
                <TextInput
                  editable={false}
                  value={value[i]}
                  style={styles.cellText}
                />
              </RNView>
            ) : null}
          </RNView>
        ))}
      </RNView>
    </RNView>
  );
}

export function InputOTPGroup({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={[styles.group, style]}>{children}</RNView>;
}

export function InputOTPSlot({ index, style }: { index: number; style?: StyleProp<ViewStyle> }) {
  return <RNView style={[styles.cell, style]} />;
}

export function InputOTPSeparator() {
  return <RNView style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  cells: {
    flexDirection: 'row',
    gap: 8,
  },
  group: {
    flexDirection: 'row',
    gap: 4,
  },
  cell: {
    width: 40,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: tokens.radius.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFocused: {
    borderColor: 'rgba(255,255,255,0.30)',
  },
  cellFilled: {
    borderColor: 'rgba(255,255,255,0.20)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cellText: {
    color: '#FFFFFF',
    fontSize: tokens.typography.fontSize.xl,
    fontFamily: tokens.typography.fontFamily.sans,
    textAlign: 'center',
  },
  separator: {
    width: 8,
  },
});
