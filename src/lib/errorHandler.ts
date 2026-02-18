import { toast } from "@/hooks/use-toast";
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
 * Checks if an error is a Supabase PostgrestError
 */
const isPostgrestError = (error: unknown): error is PostgrestError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'code' in error
  );
};

/**
 * Checks if an error is a standard Error object
 */
const isError = (error: unknown): error is Error => {
  return error instanceof Error;
};

/**
 * Checks if an error is an auth error
 */
const isAuthError = (error: unknown): boolean => {
  if (!isError(error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('not authenticated') ||
    message.includes('session') ||
    message.includes('unauthorized') ||
    message.includes('jwt')
  );
};

/**
 * Normalizes different error types into a consistent structure
 */
export const normalizeError = (error: unknown): NormalizedError => {
  // Handle Supabase PostgrestError
  if (isPostgrestError(error)) {
    return {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    };
  }

  // Handle standard Error objects
  if (isError(error)) {
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
};

/**
 * Generates a user-friendly error message based on the error and context
 */
const getUserFriendlyMessage = (
  normalizedError: NormalizedError,
  context?: ErrorContext
): string => {
  // Preserve validation errors and specific error messages
  if (normalizedError.message.includes('cannot be empty') ||
      normalizedError.message === 'Not authenticated' ||
      normalizedError.message.startsWith('Unauthorized:') ||
      normalizedError.message === 'Item not found or not accessible') {
    return normalizedError.message;
  }

  // Use custom message if provided
  if (context?.userMessage) {
    return context.userMessage;
  }

  // Check for authentication errors
  if (
    normalizedError.message.toLowerCase().includes('not authenticated') ||
    normalizedError.message.toLowerCase().includes('session') ||
    normalizedError.code === 'PGRST301'
  ) {
    return 'You need to be logged in to perform this action.';
  }

  // Check for permission errors
  if (
    normalizedError.code === 'PGRST401' ||
    normalizedError.message.toLowerCase().includes('permission')
  ) {
    return 'You don\'t have permission to perform this action.';
  }

  // Check for network errors
  if (
    normalizedError.message.toLowerCase().includes('network') ||
    normalizedError.message.toLowerCase().includes('fetch')
  ) {
    return 'Network error. Unable to load data. Please check your connection and try again.';
  }

  // Generate context-specific messages
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

  // Return the original message if it's already user-friendly
  if (normalizedError.message.length < 100 && !normalizedError.message.includes('_')) {
    return normalizedError.message;
  }

  // Default fallback message
  return 'Something went wrong. Please try again.';
};

/**
 * Main error handler function that normalizes errors, shows toasts, and logs appropriately
 * 
 * @param error - The error to handle (can be any type)
 * @param context - Additional context about the error
 * @returns A normalized Error instance
 * 
 * @example
 * ```typescript
 * try {
 *   const data = await supabase.from('posts').select('*');
 * } catch (error) {
 *   handleApiError(error, {
 *     operation: 'fetchPosts',
 *     userMessage: 'Failed to load posts. Try again.',
 *   });
 * }
 * ```
 */
export const handleApiError = (
  error: unknown,
  context?: ErrorContext
): Error => {
  const normalizedError = normalizeError(error);
  const userMessage = getUserFriendlyMessage(normalizedError, context);

  // Show toast notification (unless explicitly disabled)
  if (context?.showToast !== false) {
    toast({
      title: "Error",
      description: userMessage,
      variant: "destructive",
    });
  }

  // Log to console in development
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

  // Return a normalized Error instance
  const returnError = new Error(userMessage);
  returnError.name = normalizedError.code || 'ApiError';
  
  // Attach additional properties for debugging
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
 * Async wrapper for API calls that automatically handles errors
 * 
 * @param operation - The async operation to execute
 * @param context - Error context
 * @returns The result of the operation or throws a normalized error
 * 
 * @example
 * ```typescript
 * const posts = await withErrorHandler(
 *   async () => {
 *     const { data, error } = await supabase.from('posts').select('*');
 *     if (error) throw error;
 *     return data;
 *   },
 *   { operation: 'fetchPosts' }
 * );
 * ```
 */
export const withErrorHandler = async <T>(
  operation: () => Promise<T>,
  context?: ErrorContext
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    throw handleApiError(error, context);
  }
};
