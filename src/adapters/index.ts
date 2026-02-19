/**
 * Web Adapter Bridge — barrel export.
 *
 * The adapter bridge connects the platform-agnostic @clstr/core package
 * to the web application. It provides:
 *
 * 1. `supabase` — Web-specific Supabase client (via core factory)
 * 2. `displayError` / `withDisplayError` — Web-specific error display (toast)
 * 3. `withClient` / `bindModule` / `bindAll` — Binding utilities
 * 4. `compressImageWeb` / `webShare` — Web platform dependencies
 *
 * ## Migration Guide
 *
 * **Before** (direct lib import with implicit singleton):
 * ```ts
 * import { supabase } from '@/integrations/supabase/client';
 * import { getProfileById } from '@/lib/profile';
 * const profile = await getProfileById(userId);
 * ```
 *
 * **After** (core + adapter):
 * ```ts
 * import { supabase } from '@/adapters/core-client';
 * import { getProfileById } from '@clstr/core/api/profile';
 * const profile = await getProfileById(supabase, userId);
 * ```
 *
 * **Or use `withClient` for backward-compatible wrappers:**
 * ```ts
 * import { withClient } from '@/adapters/bind';
 * import { getProfileById as _getProfileById } from '@clstr/core/api/profile';
 * export const getProfileById = withClient(_getProfileById);
 * ```
 */

// Platform client
export { supabase } from './core-client';

// Error display
export { displayError, withDisplayError } from './error-display';
export type { DisplayErrorOptions } from './error-display';

// Binding utilities
export { withClient, bindModule, bindAll } from './bind';

// Web platform deps
export { compressImageWeb, webShare, getWebAppUrl } from './web-deps';
