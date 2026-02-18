/**
 * Platform-agnostic Supabase client.
 *
 * Works across Vite (web) and Expo (mobile) by using the
 * platform-agnostic env resolver and auth storage adapter.
 */
import { createClient } from '@supabase/supabase-js';
import { getEnvVariable } from '../../platform/env';
import { authStorage } from '../../platform/storage';
import type { Database } from './types';

const SUPABASE_URL = getEnvVariable('SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVariable('SUPABASE_ANON_KEY');

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: authStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    // Disable URL-based session detection on native (no browser URL bar)
    detectSessionInUrl: typeof window !== 'undefined' && 'location' in window,
  },
});
