/**
 * errorHandler.ts (shared)
 *
 * Platform-agnostic error handling utilities.
 * Toast/notification callbacks are injected rather than imported from web hooks.
 */

import { PostgrestError } from "@supabase/supabase-js";

/**
 * Error context for better error tracking and debugging
 */
export interface ErrorContext {
  /** The operation being performed (e.g., 'fetchPosts', 'createComment') */
  operation?: string;
  /** Additional context about the error */
  details?: Record<string, unknown>;
  /** Whether to show a toast notification to the user */
  showToast?: boolean;
  /** Custom user-friendly message to display */
  userMessage?: string;
}

/**
 * Normalized error structure
 */
export interface NormalizedError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

/**
 * Toast callback shape — injected by platform adapters
 */
export type ToastFn = (opts: { title: string; description: string; variant?: 'default' | 'destructive' }) => void;

const isPostgrestError = (error: unknown): error is PostgrestError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'code' in error
  );
};

const isError = (error: unknown): error is Error => {
  return error instanceof Error;
};

/**
 * Normalizes different error types into a consistent structure
 */
export const normalizeError = (error: unknown): NormalizedError => {
  if (isPostgrestError(error)) {
    return {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    };
  }

  if (isError(error)) {
    return {
      message: error.message,
      code: error.name,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return {
    message: 'An unexpected error occurred',
    details: JSON.stringify(error),
  };
};

/**
 * Generates a user-friendly error message based on the error and context
 */
export const getUserFriendlyMessage = (
  normalizedError: NormalizedError,
  context?: ErrorContext
): string => {
  if (normalizedError.message.includes('cannot be empty') ||
      normalizedError.message === 'Not authenticated' ||
      normalizedError.message.startsWith('Unauthorized:') ||
      normalizedError.message === 'Item not found or not accessible') {
    return normalizedError.message;
  }

  if (context?.userMessage) {
    return context.userMessage;
  }

  if (
    normalizedError.message.toLowerCase().includes('not authenticated') ||
    normalizedError.message.toLowerCase().includes('session') ||
    normalizedError.code === 'PGRST301'
  ) {
    return 'You need to be logged in to perform this action.';
  }

  if (
    normalizedError.code === 'PGRST401' ||
    normalizedError.message.toLowerCase().includes('permission')
  ) {
    return 'You don\'t have permission to perform this action.';
  }

  if (
    normalizedError.message.toLowerCase().includes('network') ||
    normalizedError.message.toLowerCase().includes('fetch')
  ) {
    return 'Network error. Unable to load data. Please check your connection and try again.';
  }

  if (context?.operation) {
    const operation = context.operation.toLowerCase();
    
    if (operation.includes('fetch') || operation.includes('load') || operation.includes('get')) {
      return `Failed to load data. Please try again.`;
    }
    
    if (operation.includes('create') || operation.includes('add')) {
      return `Failed to create item. Please try again.`;
    }
    
    if (operation.includes('update') || operation.includes('edit') || operation.includes('modify')) {
      return `Failed to update item. Please try again.`;
    }
    
    if (operation.includes('delete') || operation.includes('remove')) {
      return `Failed to delete item. Please try again.`;
    }
  }

  if (normalizedError.message.length < 100 && !normalizedError.message.includes('_')) {
    return normalizedError.message;
  }

  return 'Something went wrong. Please try again.';
};

/**
 * Platform-agnostic error handler.
 * Accepts an optional toastFn for UI notifications.
 */
export const createHandleApiError = (toastFn?: ToastFn) => (
  error: unknown,
  context?: ErrorContext
): Error => {
  const normalizedError = normalizeError(error);
  const userMessage = getUserFriendlyMessage(normalizedError, context);

  if (context?.showToast !== false && toastFn) {
    toastFn({
      title: "Error",
      description: userMessage,
      variant: "destructive",
    });
  }

  if (process.env.NODE_ENV === 'development') {
    console.group('🔴 API Error');
    console.error('Operation:', context?.operation || 'Unknown');
    console.error('Message:', normalizedError.message);
    if (normalizedError.code) console.error('Code:', normalizedError.code);
    if (normalizedError.details) console.error('Details:', normalizedError.details);
    if (normalizedError.hint) console.error('Hint:', normalizedError.hint);
    if (context?.details) console.error('Context:', context.details);
    console.groupEnd();
  }

  const returnError = new Error(userMessage);
  returnError.name = normalizedError.code || 'ApiError';
  
  Object.assign(returnError, {
    originalMessage: normalizedError.message,
    code: normalizedError.code,
    details: normalizedError.details,
    hint: normalizedError.hint,
    context,
  });

  return returnError;
};

/**
 * Convenience: handleApiError with no toast (for non-UI contexts).
 * Web adapter will re-export with toast pre-bound.
 */
export const handleApiError = createHandleApiError();

/**
 * Async wrapper for API calls that automatically handles errors
 */
export const withErrorHandler = async <T>(
  operation: () => Promise<T>,
  context?: ErrorContext,
  toastFn?: ToastFn
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    throw createHandleApiError(toastFn)(error, context);
  }
};
