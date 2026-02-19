/**
 * typeahead-search - Web adapter.
 * Thin binding layer over @clstr/core.
 */

// Re-export types, interfaces, constants, and pure functions
export * from '@clstr/core/api/typeahead-search';

// Bind client-taking functions (auto-inject web Supabase client)
import * as _core from '@clstr/core/api/typeahead-search';
import { withClient } from '@/adapters/bind';

export const typeaheadSearch = withClient(_core.typeaheadSearch);
