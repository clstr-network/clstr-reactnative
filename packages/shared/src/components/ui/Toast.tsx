/**
 * Toast — cross-platform
 *
 * Wraps react-native-toast-message for native,
 * provides compatible API for web (sonner/toaster).
 */
import React from 'react';
import { Platform } from 'react-native';

/** Show a toast notification (imperative API). */
export function showToast(opts: {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}) {
  // React-native-toast-message integration
  try {
    // Dynamic import avoids bundling issues on web
    const ToastLib = require('react-native-toast-message').default;
    ToastLib.show({
      type: opts.variant === 'destructive' ? 'error' : opts.variant === 'success' ? 'success' : 'info',
      text1: opts.title,
      text2: opts.description,
    });
  } catch {
    // Fallback for environments where toast-message is not available
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      console.log(`[Toast] ${opts.title}: ${opts.description}`);
    }
  }
}

/** Compatibility with shadcn/ui toast hook pattern */
export function useToast() {
  return {
    toast: showToast,
    dismiss: () => {
      try {
        const ToastLib = require('react-native-toast-message').default;
        ToastLib.hide();
      } catch {}
    },
    toasts: [] as any[],
  };
}

/**
 * Toaster component — place once at root.
 * On native, renders react-native-toast-message's Toast component.
 */
export function Toaster() {
  try {
    const ToastComponent = require('react-native-toast-message').default;
    return <ToastComponent />;
  } catch {
    return null;
  }
}

/** Sonner compatibility alias */
export const Sonner = Toaster;
