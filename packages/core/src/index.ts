// Core package barrel export
// @clstr/core — pure TypeScript shared layer

// Supabase factory
export { createSupabaseClient } from './supabase';
export type { Database, Json } from './supabase';

// Cross-platform contracts
export { QUERY_KEYS } from './query-keys';
export { CHANNELS } from './channels';
export { createAppError, normalizeError } from './errors';
export type { AppError, NormalizedError } from './errors';

// Types — canonical source for shared interfaces/types.
export * from './types';

// Utils
export * from './utils';

// Schemas / Validation
export * from './schemas';

// API modules — re-exported as a namespace to avoid collisions with ./types.
// For individual API function imports, use subpath: @clstr/core/api/events-api
export * as api from './api';
