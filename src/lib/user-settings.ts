/**
 * user-settings - Web adapter.
 * Thin binding layer over @clstr/core.
 */

// Re-export types, interfaces, constants, and pure functions
export * from '@clstr/core/api/user-settings';

// Bind client-taking functions (auto-inject web Supabase client)
import * as _core from '@clstr/core/api/user-settings';
import { withClient } from '@/adapters/bind';

export const getUserSettings = withClient(_core.getUserSettings);
export const updateUserSettings = withClient(_core.updateUserSettings);

// Web-only: DOM theme application (not in core — uses document API)
import type { ThemeMode } from '@clstr/core/api/user-settings';

export function applyThemeToDOM(themeMode: ThemeMode): void {
  const effective = _core.getEffectiveTheme(themeMode);
  const root = document.documentElement;
  if (effective === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
