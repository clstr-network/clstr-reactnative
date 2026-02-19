/**
 * api - Web adapter.
 * Thin binding layer over @clstr/core.
 */

// Re-export types, interfaces, constants, and pure functions
export * from '@clstr/core/api/api';

// Bind client-taking functions (auto-inject web Supabase client)
import * as _core from '@clstr/core/api/api';
import { withClient } from '@/adapters/bind';

export const fetchNotes = withClient(_core.fetchNotes);
export const createNote = withClient(_core.createNote);
export const updateNote = withClient(_core.updateNote);
export const deleteNote = withClient(_core.deleteNote);
