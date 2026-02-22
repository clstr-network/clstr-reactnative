/**
 * Search API adapter — Typeahead search.
 * Binds @clstr/core typeahead-search to the mobile Supabase client.
 */

import { withClient } from '../adapters/bind';
import { typeaheadSearch as _typeaheadSearch } from '@clstr/core/api/typeahead-search';

export const typeaheadSearch = withClient(_typeaheadSearch);
