/**
 * User Settings API adapter — Phase 8.3
 * Binds @clstr/core user-settings functions to the mobile Supabase client.
 */

import { withClient } from '../adapters/bind';
import {
  getUserSettings as _getUserSettings,
  updateUserSettings as _updateUserSettings,
} from '@clstr/core/api/user-settings';

export type {
  UserSettings,
  UserSettingsUpdate,
  ProfileVisibility,
  ThemeMode,
} from '@clstr/core/api/user-settings';

export { getEffectiveTheme } from '@clstr/core/api/user-settings';

export const getUserSettings = withClient(_getUserSettings);
export const updateUserSettings = withClient(_updateUserSettings);
