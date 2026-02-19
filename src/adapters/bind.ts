/**
 * Web Adapter — Binding utilities.
 *
 * Provides type-safe helpers for binding the web Supabase client
 * to @clstr/core API functions that accept `SupabaseClient` as
 * their first parameter.
 *
 * Two strategies:
 * 1. `withClient(fn)` — wraps a single function
 * 2. `bindModule(mod, clientFnNames)` — wraps selected functions in a module
 *
 * All bound functions drop the `client: SupabaseClient` first param from
 * their call signature; types/constants pass through untouched.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './core-client';

// ---------------------------------------------------------------------------
// Single-function binding
// ---------------------------------------------------------------------------

/**
 * Binds the web Supabase client as the first argument of `fn`.
 *
 * ```ts
 * import { getProfileById } from '@clstr/core/api/profile';
 * export const getProfile = withClient(getProfileById);
 * // getProfile(userId) — no client arg needed
 * ```
 */
export function withClient<A extends unknown[], R>(
  fn: (client: SupabaseClient<any>, ...args: A) => R,
): (...args: A) => R {
  return (...args) => fn(supabase, ...args);
}

// ---------------------------------------------------------------------------
// Module-level binding
// ---------------------------------------------------------------------------

/**
 * Conditional type: if `F` is a function whose first param is SupabaseClient,
 * return a version without that first param. Otherwise, pass through as-is.
 */
type ClientBound<F> = F extends (client: SupabaseClient<any>, ...args: infer A) => infer R
  ? (...args: A) => R
  : F;

/**
 * Maps a module object so that **only** the explicitly listed function names
 * get their `client: SupabaseClient` first param auto-supplied.
 * Everything else (types re-exported as values, constants, pure functions)
 * passes through verbatim.
 *
 * ```ts
 * import * as profileCore from '@clstr/core/api/profile';
 * const adapter = bindModule(profileCore, [
 *   'uploadProfileAvatar',
 *   'getProfileById',
 * ] as const);
 * adapter.getProfileById(userId); // client auto-injected
 * adapter.validateAvatarFile(file); // pure — untouched
 * ```
 */
export function bindModule<
  M extends Record<string, unknown>,
  K extends keyof M & string,
>(
  mod: M,
  clientFnNames: readonly K[],
): {
  [P in keyof M]: P extends K ? ClientBound<M[P]> : M[P];
} {
  const result = { ...mod } as any;
  const nameSet = new Set<string>(clientFnNames);

  for (const name of nameSet) {
    const fn = mod[name];
    if (typeof fn === 'function') {
      result[name] = (...args: unknown[]) => (fn as (...a: any[]) => unknown)(supabase, ...args);
    }
  }

  return result;
}

/**
 * Convenience: binds ALL functions in a module.
 * Use ONLY for modules where every exported function takes
 * `client: SupabaseClient` as its first parameter.
 *
 * Types and non-function exports pass through automatically.
 */
export function bindAll<M extends Record<string, unknown>>(
  mod: M,
): { [P in keyof M]: ClientBound<M[P]> } {
  const result = { ...mod } as any;

  for (const [key, value] of Object.entries(mod)) {
    if (typeof value === 'function') {
      result[key] = (...args: unknown[]) => (value as (...a: any[]) => unknown)(supabase, ...args);
    }
  }

  return result;
}
