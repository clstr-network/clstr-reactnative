/**
 * saved-api - Web adapter.
 * Thin binding layer over @clstr/core.
 */

// Re-export types, interfaces, constants, and pure functions
export * from '@clstr/core/api/saved-api';

// Bind client-taking functions (auto-inject web Supabase client)
import * as _core from '@clstr/core/api/saved-api';
import { withClient } from '@/adapters/bind';

export const getSavedItems = withClient(_core.getSavedItems);
export const getSavedProjectIds = withClient(_core.getSavedProjectIds);
export const toggleSaveItem = withClient(_core.toggleSaveItem);
export const removeSavedItem = withClient(_core.removeSavedItem);
export const checkIfItemSaved = withClient(_core.checkIfItemSaved);
