/**
 * Platform-agnostic error types and factories.
 *
 * Rules:
 * - NEVER call toast(), Alert.alert(), or console.error() here.
 * - The platform (web adapter or mobile adapter) decides how to display errors.
 * - API functions return { data, error } tuples where error is AppError | null.
 */

export type AppError = {
  code: string;
  message: string;
  details?: unknown;
  retryable: boolean;
};

export function createAppError(
  code: string,
  message: string,
  opts?: { details?: unknown; retryable?: boolean }
): AppError {
  return {
    code,
    message,
    details: opts?.details,
    retryable: opts?.retryable ?? false,
  };
}

/**
 * Normalized error structure — pure extraction from errorHandler.ts.
 * No UI dependencies.
 */
export interface NormalizedError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

/**
 * Normalizes different error types into a consistent structure.
 * Handles PostgrestError, standard Error, string errors, and unknown types.
 */
export function normalizeError(error: unknown): NormalizedError {
  // Handle Supabase PostgrestError (duck-typed)
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'code' in error
  ) {
    const pgError = error as { message: string; code: string; details?: string; hint?: string };
    return {
      message: pgError.message,
      code: pgError.code,
      details: pgError.details,
      hint: pgError.hint,
    };
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      message: error.message,
      code: error.name,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
    };
  }

  // Handle unknown error types
  return {
    message: 'An unexpected error occurred',
    details: JSON.stringify(error),
  };
}
