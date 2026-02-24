/**
 * Toast — cross-platform
 *
 * Wraps react-native-toast-message for native,
 * provides compatible API for web (sonner/toaster).
 */
import React from 'react';
import { Platform } from 'react-native';
import ToastLib from 'react-native-toast-message';

/** Show a toast notification (imperative API). */
export function showToast(opts: {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}) {
  ToastLib.show({
    type: opts.variant === 'destructive' ? 'error' : opts.variant === 'success' ? 'success' : 'info',
    text1: opts.title,
    text2: opts.description,
  });
}

/** Compatibility with shadcn/ui toast hook pattern */
export function useToast() {
  return {
    toast: showToast,
    dismiss: () => {
      ToastLib.hide();
    },
    toasts: [] as any[],
  };
}

/**
 * Toaster component — place once at root.
 * On native, renders react-native-toast-message's Toast component.
 */
export function Toaster() {
  if (Platform.OS === 'web') return null;
  return <ToastLib />;
}

/** Sonner compatibility alias */
export const Sonner = Toaster;
