/**
 * Form — cross-platform
 *
 * Thin wrappers around react-hook-form providing a compound component API.
 * Mirrors shadcn/ui Form + FormField + FormItem + FormLabel + FormControl +
 * FormDescription + FormMessage patterns.
 */
import React, { createContext, useContext } from 'react';
import {
  StyleSheet,
  View as RNView,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { tokens } from '../../design/tokens';
import { useTheme } from '../../design/useTheme';
import { Text } from './primitives/Text';

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

interface FormFieldCtx {
  error?: string;
  name: string;
}

const FormFieldContext = createContext<FormFieldCtx>({ error: undefined, name: '' });

/* ------------------------------------------------------------------ */
/*  Components                                                        */
/* ------------------------------------------------------------------ */

/** Root container — simply wraps children */
export function Form({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={style}>{children}</RNView>;
}

export interface FormFieldProps {
  name: string;
  error?: string;
  children: React.ReactNode;
}

/** Provides field-level context (name + error) */
export function FormField({ name, error, children }: FormFieldProps) {
  return (
    <FormFieldContext.Provider value={{ name, error }}>
      {children}
    </FormFieldContext.Provider>
  );
}

export function FormItem({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <RNView style={[styles.item, style]}>{children}</RNView>;
}

export function FormLabel({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text
      size="sm"
      weight="medium"
      style={{ color: colors.foreground, marginBottom: tokens.spacing.xs }}
    >
      {children}
    </Text>
  );
}

/** Passthrough — exists for API parity */
export function FormControl({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function FormDescription({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text size="xs" style={{ color: colors.mutedForeground, marginTop: tokens.spacing.xs }}>
      {children}
    </Text>
  );
}

export function FormMessage({ children }: { children?: React.ReactNode }) {
  const { error } = useContext(FormFieldContext);
  const { colors } = useTheme();

  const message = children ?? error;
  if (!message) return null;

  return (
    <Text size="xs" style={{ color: colors.destructive, marginTop: tokens.spacing.xs }}>
      {message}
    </Text>
  );
}

export function useFormField() {
  return useContext(FormFieldContext);
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  item: {
    marginBottom: tokens.spacing.md,
  },
});
