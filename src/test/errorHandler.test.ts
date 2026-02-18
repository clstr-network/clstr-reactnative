import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleApiError, normalizeError, withErrorHandler } from '@/lib/errorHandler';
import { toast } from '@/hooks/use-toast';
import { PostgrestError } from '@supabase/supabase-js';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizeError', () => {
    it('should normalize PostgrestError', () => {
      const pgError: PostgrestError = {
        name: 'PostgrestError',
        message: 'Database error',
        code: 'PGRST301',
        details: 'Connection refused',
        hint: 'Check your connection',
      };

      const result = normalizeError(pgError);

      expect(result).toEqual({
        message: 'Database error',
        code: 'PGRST301',
        details: 'Connection refused',
        hint: 'Check your connection',
      });
    });

    it('should normalize standard Error objects', () => {
      const error = new Error('Something went wrong');
      error.name = 'CustomError';

      const result = normalizeError(error);

      expect(result).toEqual({
        message: 'Something went wrong',
        code: 'CustomError',
      });
    });

    it('should normalize string errors', () => {
      const error = 'String error message';

      const result = normalizeError(error);

      expect(result).toEqual({
        message: 'String error message',
      });
    });

    it('should handle unknown error types', () => {
      const error = { unknown: 'error type' };

      const result = normalizeError(error);

      expect(result).toEqual({
        message: 'An unexpected error occurred',
        details: JSON.stringify(error),
      });
    });
  });

  describe('handleApiError', () => {
    it('should call toast with error message', () => {
      const error = new Error('Test error');

      handleApiError(error, {
        operation: 'testOperation',
      });

      expect(toast).toHaveBeenCalledWith({
        title: 'Error',
        description: expect.any(String),
        variant: 'destructive',
      });
    });

    it('should not call toast when showToast is false', () => {
      const error = new Error('Test error');

      handleApiError(error, {
        operation: 'testOperation',
        showToast: false,
      });

      expect(toast).not.toHaveBeenCalled();
    });

    it('should use custom user message when provided', () => {
      const error = new Error('Technical error message');

      handleApiError(error, {
        operation: 'testOperation',
        userMessage: 'Custom friendly message',
      });

      expect(toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Custom friendly message',
        variant: 'destructive',
      });
    });

    it('should return normalized Error instance', () => {
      const error = new Error('Test error');

      const result = handleApiError(error, {
        operation: 'testOperation',
        showToast: false,
      });

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBeDefined();
    });

    it('should generate user-friendly message for authentication errors', () => {
      const error = new Error('User not authenticated');

      const result = handleApiError(error, {
        operation: 'fetchData',
        showToast: false,
      });

      expect(result.message).toContain('logged in');
    });

    it('should generate user-friendly message for fetch operations', () => {
      const error = new Error('Network error');

      const result = handleApiError(error, {
        operation: 'fetchPosts',
        showToast: false,
      });

      expect(result.message).toContain('load');
    });

    it('should generate user-friendly message for create operations', () => {
      const error = new Error('Database constraint violation');

      const result = handleApiError(error, {
        operation: 'createPost',
        showToast: false,
      });

      expect(result.message).toContain('create');
    });

    it('should generate user-friendly message for update operations', () => {
      const error = new Error('Update failed');

      const result = handleApiError(error, {
        operation: 'updateProfile',
        showToast: false,
      });

      expect(result.message).toContain('update');
    });

    it('should generate user-friendly message for delete operations', () => {
      const error = new Error('Delete failed');

      const result = handleApiError(error, {
        operation: 'deletePost',
        showToast: false,
      });

      expect(result.message).toContain('delete');
    });

    it('should handle PostgrestError with specific codes', () => {
      const pgError: PostgrestError = {
        name: 'PostgrestError',
        message: 'Permission denied',
        code: 'PGRST401',
        details: '',
        hint: '',
      };

      const result = handleApiError(pgError, {
        operation: 'testOperation',
        showToast: false,
      });

      expect(result.message).toContain('permission');
    });

    it('should attach additional properties to returned error', () => {
      const originalError = new Error('Original message');
      const context = {
        operation: 'testOperation',
        details: { userId: '123' },
      };

      const result = handleApiError(originalError, context);

      expect((result as any).originalMessage).toBe('Original message');
      expect((result as any).context).toEqual(context);
    });
  });

  describe('withErrorHandler', () => {
    it('should return result on successful operation', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withErrorHandler(operation, {
        operation: 'testOperation',
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should throw normalized error on failed operation', async () => {
      const error = new Error('Operation failed');
      const operation = vi.fn().mockRejectedValue(error);

      await expect(
        withErrorHandler(operation, {
          operation: 'testOperation',
          showToast: false,
        })
      ).rejects.toThrow(Error);

      expect(operation).toHaveBeenCalled();
    });

    it('should call handleApiError with correct context', async () => {
      const error = new Error('Operation failed');
      const operation = vi.fn().mockRejectedValue(error);
      const context = {
        operation: 'testOperation',
        userMessage: 'Custom error message',
      };

      try {
        await withErrorHandler(operation, context);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
      }

      expect(toast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Custom error message',
        variant: 'destructive',
      });
    });
  });

  describe('error message generation', () => {
    it('should detect network errors', () => {
      const error = new Error('Failed to fetch');

      const result = handleApiError(error, {
        operation: 'testOperation',
        showToast: false,
      });

      expect(result.message.toLowerCase()).toContain('network');
    });

    it('should provide fallback for generic errors', () => {
      const error = new Error('Some_technical_error_with_underscores_and_long_message_that_is_not_user_friendly_at_all');

      const result = handleApiError(error, {
        operation: 'unknownOperation',
        showToast: false,
      });

      expect(result.message).toBe('Something went wrong. Please try again.');
    });

    it('should preserve short user-friendly messages', () => {
      const error = new Error('Invalid credentials');

      const result = handleApiError(error, {
        showToast: false,
      });

      expect(result.message).toBe('Invalid credentials');
    });
  });
});
