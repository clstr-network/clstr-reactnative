/**
 * errorHandler.ts — Web adapter stub
 * Re-exports shared error utilities with web toast pre-bound.
 */
import { toast } from '@/hooks/use-toast';
import {
  normalizeError,
  getUserFriendlyMessage,
  createHandleApiError,
  withErrorHandler as sharedWithErrorHandler,
} from '@clstr/shared/utils/errorHandler';

// Re-export pure types and functions
export type { ErrorContext, NormalizedError, ToastFn } from '@clstr/shared/utils/errorHandler';
export { normalizeError, getUserFriendlyMessage } from '@clstr/shared/utils/errorHandler';

// Pre-bind toast for web
export const handleApiError = createHandleApiError(toast);

// withErrorHandler with toast pre-bound
export const withErrorHandler = async <T>(
  operation: () => Promise<T>,
  context?: import('@clstr/shared/utils/errorHandler').ErrorContext
): Promise<T> => sharedWithErrorHandler(operation, context, toast);