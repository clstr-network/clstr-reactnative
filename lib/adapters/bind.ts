/**
 * Platform binding helper — same pattern as web's `src/adapters/bind.ts`.
 *
 * `withClient` takes any @clstr/core API function whose first argument is
 * `SupabaseClient` and returns a new function with the client pre-bound.
 *
 * Usage:
 *   import { getPosts } from '@clstr/core/api/social-api';
 *   const getPostsBound = withClient(getPosts);
 *   // getPostsBound(params) — no need to pass `client`
 */

import { supabase } from './core-client';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Pre-binds the mobile Supabase client to a @clstr/core API function.
 *
 * @example
 * ```ts
 * import { getPosts } from '@clstr/core/api/social-api';
 * export const getPostsBound = withClient(getPosts);
 * ```
 */
export function withClient<Args extends unknown[], R>(
  fn: (client: SupabaseClient, ...args: Args) => R,
): (...args: Args) => R {
  return (...args: Args) => fn(supabase, ...args);
}

export { supabase };
