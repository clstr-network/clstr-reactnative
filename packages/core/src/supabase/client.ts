import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export type { SupabaseClient };

/**
 * Platform-agnostic Supabase client factory.
 * Web passes import.meta.env values; mobile passes Expo Constants.
 * Storage option allows SecureStore on mobile, localStorage on web.
 */
export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: {
    auth?: {
      storage?: {
        getItem: (key: string) => string | null | Promise<string | null>;
        setItem: (key: string, value: string) => void | Promise<void>;
        removeItem: (key: string) => void | Promise<void>;
      };
      autoRefreshToken?: boolean;
      persistSession?: boolean;
      detectSessionInUrl?: boolean;
      /** 'implicit' for mobile (avoids PKCE bad_oauth_state), 'pkce' for web. */
      flowType?: 'implicit' | 'pkce';
    };
  }
): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey, options);
}
