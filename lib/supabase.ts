/**
 * @deprecated — Use `import { supabase } from '@/lib/adapters/core-client'` instead.
 *
 * This file re-exports the canonical client so existing imports keep working
 * during the migration. Remove once all consumers point to core-client.
 */

export { supabase } from './adapters/core-client';
