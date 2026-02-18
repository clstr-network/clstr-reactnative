/**
 * Textarea — cross-platform
 *
 * Replaces shadcn/ui Textarea with RN multiline TextInput.
 */
import React, { forwardRef } from 'react';
import {
  TextInput,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { tokens } from '../../design/tokens';

export interface TextareaProps extends Omit<TextInputProps, 'multiline'> {
  error?: boolean;
  rows?: number;
}

export const Textarea = forwardRef<TextInput, TextareaProps>(
  ({ style, error, rows = 4, ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        multiline
        numberOfLines={rows}
        textAlignVertical="top"
        placeholderTextColor="rgba(255,255,255,0.40)"
        style={[
          styles.textarea,
          { minHeight: rows * 24 },
          error && styles.error,
          style,
        ]}
        {...props}
      />
    );
  },
);

Textarea.displayName = 'Textarea';

const styles = StyleSheet.create({
  textarea: {
    width: '100%',
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: tokens.typography.fontSize.base,
    fontFamily: tokens.typography.fontFamily.sans,
  },
  error: {
    borderColor: tokens.colors.signal.red,
  },
});
