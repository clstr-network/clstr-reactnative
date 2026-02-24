/**
 * ═══════════════════════════════════════════════════════════════
 * toast — Imperative toast API for the mobile app
 * ═══════════════════════════════════════════════════════════════
 *
 * Convenience wrappers around react-native-toast-message.
 * Matches the web app's `useToast()` pattern with typed variants.
 *
 * Usage:
 *   import { toast } from '@/lib/toast';
 *   toast.success('Saved!');
 *   toast.error('Something went wrong', 'Please try again');
 *   toast.undo('Post hidden', onUndo);
 */

import ToastLib from 'react-native-toast-message';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  /** Auto-dismiss duration in ms (default: 3000) */
  duration?: number;
  /** Callback when toast is tapped */
  onPress?: () => void;
}

function show(
  type: string,
  title: string,
  description?: string,
  options?: ToastOptions,
) {
  ToastLib.show({
    type,
    text1: title,
    text2: description,
    visibilityTime: options?.duration ?? 3000,
    onPress: options?.onPress,
  });
}

export const toast = {
  /** Green checkmark — saved, sent, updated, etc. */
  success(title: string, description?: string, options?: ToastOptions) {
    show('success', title, description, options);
  },

  /** Red alert — failed action, network error, etc. */
  error(title: string, description?: string, options?: ToastOptions) {
    show('error', title, description, options);
  },

  /** Orange warning — rate limit, incomplete data, etc. */
  warning(title: string, description?: string, options?: ToastOptions) {
    show('warning', title, description, options);
  },

  /** Blue info — general notification, tip, etc. */
  info(title: string, description?: string, options?: ToastOptions) {
    show('info', title, description, options);
  },

  /**
   * Undo toast — shows an action toast with "Undo" tap support.
   * Use for hide post, unsave, disconnect, etc.
   */
  undo(title: string, onUndo: () => void, duration = 5000) {
    ToastLib.show({
      type: 'undo',
      text1: title,
      text2: 'Tap to undo',
      visibilityTime: duration,
      onPress: () => {
        onUndo();
        ToastLib.hide();
      },
    });
  },

  /** Dismiss current toast */
  dismiss() {
    ToastLib.hide();
  },
};

export default toast;
