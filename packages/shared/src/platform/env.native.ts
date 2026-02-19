/**
 * Environment variable resolver for Expo / React Native.
 *
 * CRITICAL: Expo's babel plugin (`babel-preset-expo`) replaces
 * `process.env.EXPO_PUBLIC_*` references at compile time using
 * static AST analysis. This ONLY works with literal property
 * access — NOT dynamic bracket notation like `process.env[key]`.
 *
 * Every env variable consumed by the app must be listed here
 * with an explicit static `process.env.EXPO_PUBLIC_*` reference.
 *
 * Metro resolves this file on native platforms (iOS/Android) via
 * the `.native.ts` suffix; web continues to use `env.ts`.
 */

const EXPO_ENV: Record<string, string | undefined> = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
};

// Runtime validation — fires once on module load so Metro console
// shows actual resolved values (or 'undefined' if .env is misconfigured).
if (__DEV__) {
  console.log('[env.native] SUPABASE_URL =', EXPO_ENV.SUPABASE_URL ?? 'undefined');
  console.log(
    '[env.native] SUPABASE_ANON_KEY =',
    EXPO_ENV.SUPABASE_ANON_KEY?.slice(0, 12) ?? 'undefined',
    '…',
  );
}

export function getEnvVariable(name: string): string {
  const value = EXPO_ENV[name];

  if (!value) {
    throw new Error(
      `Missing env variable: ${name}. ` +
      `Set EXPO_PUBLIC_${name} in apps/mobile/.env. ` +
      `If this is a new variable, add a static entry to platform/env.native.ts.`
    );
  }

  return value;
}
