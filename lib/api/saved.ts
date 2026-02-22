/**
 * Saved Items API adapter — Phase 8.2
 * Binds @clstr/core saved-api functions to the mobile Supabase client.
 */

import { withClient } from '../adapters/bind';
import {
  getSavedItems as _getSavedItems,
} from '@clstr/core/api/saved-api';

export type {
  SavedItem,
  SavedItemType,
  SavedPost,
  SavedProject,
  SavedClub,
  GetSavedItemsResult,
} from '@clstr/core/api/saved-api';

export const getSavedItems = withClient(_getSavedItems);
