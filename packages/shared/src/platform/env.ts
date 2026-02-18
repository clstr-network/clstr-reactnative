/**
 * Platform-agnostic environment variable resolver.
 *
 * Supports:
 * - Vite: import.meta.env.VITE_*
 * - Expo: process.env.EXPO_PUBLIC_*
 * - Node.js: process.env.*
 */
export function getEnvVariable(name: string): string {
  let value: string | undefined;

  // Expo: EXPO_PUBLIC_* prefix (available via babel transform)
  const expoKey = `EXPO_PUBLIC_${name}`;
  if (typeof process !== 'undefined' && process.env?.[expoKey]) {
    value = process.env[expoKey];
  }

  // Vite: VITE_* prefix (available via import.meta.env)
  if (!value) {
    const viteKey = `VITE_${name}`;
    try {
      // import.meta.env is statically replaced by Vite at build time
      const meta = import.meta as any;
      if (meta?.env?.[viteKey]) {
        value = meta.env[viteKey];
      }
    } catch {
      // import.meta not available in this runtime — skip
    }
  }

  // Fallback: plain process.env (Node.js scripts, CI)
  if (!value && typeof process !== 'undefined' && process.env?.[name]) {
    value = process.env[name];
  }

  if (!value) {
    throw new Error(
      `Missing env variable: ${name}. ` +
      `Set VITE_${name} (web) or EXPO_PUBLIC_${name} (mobile).`
    );
  }

  return value;
}
