/**
 * Platform-specific auth storage adapter for Supabase.
 *
 * - Web: uses window.localStorage
 * - Native (iOS/Android): uses expo-secure-store (encrypted on device)
 *
 * S4 enforcement: Do NOT override `storageKey`. Let Supabase use its
 * default "supabase.auth.token" so both platforms share session semantics.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

interface StorageAdapter {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

export const authStorage: StorageAdapter =
  Platform.OS === 'web'
    ? {
        getItem: (key: string) => globalThis.localStorage?.getItem(key) ?? null,
        setItem: (key: string, value: string) =>
          globalThis.localStorage?.setItem(key, value),
        removeItem: (key: string) =>
          globalThis.localStorage?.removeItem(key),
      }
    : {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) =>
          SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      };
