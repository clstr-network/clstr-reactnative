/**
 * Vitest configuration for mobile-scope unit tests (Phase 8).
 *
 * Covers: deep-link queue, native-intent routing, auth idempotency,
 * SecureStore persistence, subscription-manager reconnect, chat stress,
 * navigation queue flush, cold-start routing.
 *
 * Usage:  npx vitest --config vitest.config.mobile.ts
 */
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: './lib/__tests__/setup.ts',
    include: ['lib/__tests__/**/*.test.ts'],
    testTimeout: 15_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@clstr/core': path.resolve(__dirname, 'packages/core/src'),
      '@clstr/shared': path.resolve(__dirname, 'packages/shared/src'),
    },
  },
});
