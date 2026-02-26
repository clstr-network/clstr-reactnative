/**
 * Mobile Supabase client — wired through @clstr/core factory.
 *
 * This is the mobile equivalent of the web's `src/adapters/core-client.ts`.
 * Uses SecureStore on native, localStorage on web.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createSupabaseClient } from '@clstr/core';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Platform-aware auth storage.
 * Native → expo-secure-store (encrypted keychain / keystore).
 * Web    → localStorage (for Expo Web dev).
 */
const authStorage =
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

/**
 * Singleton Supabase client created via @clstr/core factory.
 * detectSessionInUrl: false — mobile doesn't have URL session detection.
 * flowType: 'implicit' — PKCE causes bad_oauth_state on mobile because the
 *   code verifier stored in the browser's session storage is lost when the
 *   system browser redirects back to the app via deep link.
 */
export const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'implicit',
  },
});
