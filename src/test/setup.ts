import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

// Silence noisy console output during tests to keep runs clean
vi.spyOn(console, 'warn').mockImplementation(() => undefined);
vi.spyOn(console, 'error').mockImplementation(() => undefined);
vi.spyOn(console, 'log').mockImplementation(() => undefined);

if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  // jsdom test environment shim for components relying on ResizeObserver
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
}

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = vi.fn();
}
