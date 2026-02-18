/**
 * Platform-specific auth storage adapter for Supabase.
 *
 * - Web: uses window.localStorage
 * - Native (iOS/Android): uses @react-native-async-storage/async-storage
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        getItem: (key: string) => AsyncStorage.getItem(key),
        setItem: (key: string, value: string) =>
          AsyncStorage.setItem(key, value),
        removeItem: (key: string) => AsyncStorage.removeItem(key),
      };
