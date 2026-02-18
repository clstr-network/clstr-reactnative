/**
 * Input — cross-platform
 *
 * Replaces shadcn/ui Input with RN TextInput.
 */
import React, { forwardRef } from 'react';
import {
  TextInput,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { tokens } from '../../design/tokens';
import { useTheme } from '../../design/useTheme';

export interface InputProps extends TextInputProps {
  error?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ style, error, placeholderTextColor, ...props }, ref) => {
    const { colors } = useTheme();
    return (
      <TextInput
        ref={ref}
        placeholderTextColor={placeholderTextColor ?? 'rgba(255,255,255,0.40)'}
        style={[
          styles.input,
          error && styles.error,
          style,
        ]}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  input: {
    height: 40,
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
