/**
 * Web Adapter — Error display bridge.
 *
 * Platform-specific error display for the web app.
 * Core API functions return `AppError` objects with no UI side-effects.
 * This module provides the web-specific display (toast notifications).
 *
 * Mobile adapter will use RN Alert / Toast-message instead.
 */
import type { AppError, NormalizedError } from '@clstr/core';
import { normalizeError } from '@clstr/core';
import { toast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// User-friendly message mapping (ported from src/lib/errorHandler.ts)
// ---------------------------------------------------------------------------

function getUserFriendlyMessage(
  normalized: NormalizedError | AppError,
  operation?: string,
): string {
  const message = normalized.message;

  // Preserve explicit validation / auth messages
  if (
    message.includes('cannot be empty') ||
    message === 'Not authenticated' ||
    message.startsWith('Unauthorized:') ||
    message === 'Item not found or not accessible'
  ) {
    return message;
  }

  // Auth errors
  if (
    message.toLowerCase().includes('not authenticated') ||
    message.toLowerCase().includes('session') ||
    ('code' in normalized && normalized.code === 'PGRST301')
  ) {
    return 'You need to be logged in to perform this action.';
  }

  // Permission errors
  if (
    ('code' in normalized && normalized.code === 'PGRST401') ||
    message.toLowerCase().includes('permission')
  ) {
    return "You don't have permission to perform this action.";
  }

  // Network errors
  if (
    message.toLowerCase().includes('network') ||
    message.toLowerCase().includes('fetch')
  ) {
    return 'Network error. Unable to load data. Please check your connection and try again.';
  }

  // Context-specific messages
  if (operation) {
    const op = operation.toLowerCase();
    if (op.includes('fetch') || op.includes('load') || op.includes('get')) {
      return 'Failed to load data. Please try again.';
    }
    if (op.includes('create') || op.includes('add')) {
      return 'Failed to create item. Please try again.';
    }
    if (op.includes('update') || op.includes('edit') || op.includes('modify')) {
      return 'Failed to update item. Please try again.';
    }
    if (op.includes('delete') || op.includes('remove')) {
      return 'Failed to delete item. Please try again.';
    }
  }

  // Short, clean messages pass through
  if (message.length < 100 && !message.includes('_')) {
    return message;
  }

  return 'Something went wrong. Please try again.';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface DisplayErrorOptions {
  /** The operation context (e.g. 'fetchPosts') */
  operation?: string;
  /** Override the displayed message */
  userMessage?: string;
  /** Suppress the toast (default: false) */
  silent?: boolean;
}

/**
 * Displays an AppError (or unknown error) as a toast notification.
 *
 * ```ts
 * const result = await getProfileById(supabase, id);
 * if (!result) displayError(createAppError('NOT_FOUND', 'Profile not found'));
 * ```
 */
export function displayError(
  error: AppError | unknown,
  opts?: DisplayErrorOptions,
): void {
  // Normalize if not already an AppError
  const normalized: NormalizedError | AppError =
    error && typeof error === 'object' && 'code' in error && 'retryable' in error
      ? (error as AppError)
      : normalizeError(error);

  const message = opts?.userMessage ?? getUserFriendlyMessage(normalized, opts?.operation);

  if (!opts?.silent) {
    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    });
  }

  // Dev-mode logging
  if (import.meta.env.DEV) {
    console.group('🔴 API Error');
    console.error('Operation:', opts?.operation ?? 'Unknown');
    console.error('Message:', normalized.message);
    if ('code' in normalized && normalized.code) console.error('Code:', normalized.code);
    if ('details' in normalized && normalized.details) console.error('Details:', normalized.details);
    console.groupEnd();
  }
}

/**
 * Wraps an async operation with automatic error display on failure.
 *
 * ```ts
 * const posts = await withDisplayError(
 *   () => getPosts(supabase, domain),
 *   { operation: 'fetchPosts' },
 * );
 * ```
 */
export async function withDisplayError<T>(
  operation: () => Promise<T>,
  opts?: DisplayErrorOptions,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    displayError(error, opts);
    throw error;
  }
}
