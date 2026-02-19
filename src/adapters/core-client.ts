/**
 * Web Adapter — Supabase client singleton.
 *
 * Creates the web-specific Supabase client using the @clstr/core factory.
 * This is the single source of truth for the web platform's DB client.
 *
 * Mobile will have its own adapter that passes SecureStore-backed auth storage.
 *
 * Usage:
 * ```ts
 * import { supabase } from '@/adapters/core-client';
 * import { getProfileById } from '@clstr/core/api/profile';
 * const profile = await getProfileById(supabase, userId);
 * ```
 */
import { createSupabaseClient } from '@clstr/core';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase configuration. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.',
  );
}

/**
 * Platform-bound Supabase client for the web app.
 * Uses browser localStorage for session persistence and
 * URL-based session detection for OAuth redirects.
 */
export const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
