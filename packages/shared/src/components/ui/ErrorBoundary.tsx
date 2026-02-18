/**
 * ErrorBoundary — cross-platform
 *
 * React error boundary that renders a fallback on crash.
 */
import React from 'react';
import { StyleSheet, View as RNView } from 'react-native';
import { tokens } from '../../design/tokens';
import { Text } from './primitives/Text';
import { Pressable } from './primitives/Pressable';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <RNView style={styles.root}>
          <Text weight="semibold" size="lg" style={{ color: '#ff4d4f', textAlign: 'center' }}>
            Something went wrong
          </Text>
          <Text size="sm" style={{ color: '#999', textAlign: 'center', marginTop: tokens.spacing.xs }}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </Text>
          <Pressable onPress={this.reset} style={styles.btn}>
            <Text size="sm" weight="medium" style={{ color: '#fff' }}>
              Try again
            </Text>
          </Pressable>
        </RNView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.xl,
  },
  btn: {
    marginTop: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.sm,
    backgroundColor: '#1890ff',
  },
});
