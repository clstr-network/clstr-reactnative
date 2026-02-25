/**
 * Test setup for mobile-scope unit tests (Phase 8).
 *
 * Mocks React Native, Expo modules, and Supabase to enable testing
 * pure-logic modules (deep-link-queue, subscription-manager, native-intent)
 * in a Node/Vitest environment without a real RN runtime.
 */

import { vi, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// React Native core mocks
// ---------------------------------------------------------------------------

vi.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (obj: any) => obj.ios ?? obj.default },
  AppState: {
    currentState: 'active',
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
  Linking: {
    openURL: vi.fn().mockResolvedValue(undefined),
    getInitialURL: vi.fn().mockResolvedValue(null),
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
    canOpenURL: vi.fn().mockResolvedValue(true),
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

// ---------------------------------------------------------------------------
// Expo module mocks
// ---------------------------------------------------------------------------

vi.mock('expo-linking', () => ({
  openURL: vi.fn().mockResolvedValue(undefined),
  useURL: vi.fn(() => null),
  createURL: vi.fn((path: string) => `clstr://${path}`),
  parse: vi.fn((url: string) => ({ path: url })),
}));

vi.mock('expo-router', () => ({
  router: {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    navigate: vi.fn(),
  },
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    navigate: vi.fn(),
  })),
  useLocalSearchParams: vi.fn(() => ({})),
  useSegments: vi.fn(() => []),
  Stack: { Screen: vi.fn() },
}));

vi.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: vi.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    // Expose internal store for test assertions
    __store: store,
  };
});

vi.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: vi.fn(),
  openAuthSessionAsync: vi.fn().mockResolvedValue({ type: 'dismiss' }),
}));

vi.mock('expo-auth-session', () => ({
  makeRedirectUri: vi.fn(() => 'clstr://'),
}));

vi.mock('expo-auth-session/build/QueryParams', () => ({
  getQueryParams: vi.fn((url: string) => ({
    params: Object.fromEntries(new URLSearchParams(url.split('?')[1] || '')),
    errorCode: null,
  })),
}));

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn(),
};

const mockSupabase = {
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: {
        session: {
          user: { id: 'test-user-id', email: 'test@example.com' },
          access_token: 'test-access-token-12345678901234567890',
          refresh_token: 'test-refresh-token',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      error: null,
    }),
    refreshSession: vi.fn().mockResolvedValue({
      data: {
        session: {
          user: { id: 'test-user-id', email: 'test@example.com' },
          access_token: 'refreshed-token-12345678901234567890',
          refresh_token: 'refreshed-refresh-token',
          expires_at: Math.floor(Date.now() / 1000) + 7200,
        },
      },
      error: null,
    }),
    setSession: vi.fn().mockResolvedValue({
      data: { session: { user: { id: 'test-user-id' } } },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn(),
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
};

vi.mock('@/lib/adapters/core-client', () => ({
  supabase: mockSupabase,
}));

vi.mock('@clstr/core', () => ({
  createSupabaseClient: vi.fn(() => mockSupabase),
}));

// ---------------------------------------------------------------------------
// React Query mock
// ---------------------------------------------------------------------------

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
  })),
  useQuery: vi.fn(() => ({ data: null, isLoading: false })),
  useMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

// ---------------------------------------------------------------------------
// Global __DEV__ flag (for subscription-manager / app-state logs)
// ---------------------------------------------------------------------------

(globalThis as any).__DEV__ = false;

// ---------------------------------------------------------------------------
// Cleanup between tests
// ---------------------------------------------------------------------------

afterEach(() => {
  vi.clearAllMocks();
});
