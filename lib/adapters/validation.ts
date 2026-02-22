/**
 * validation.ts — Mobile adapter stub
 *
 * Re-exports pure functions from @clstr/shared, pre-binds the mobile
 * Supabase client for server functions.
 *
 * Mirrors the web's `src/lib/validation.ts` adapter pattern.
 */
import { supabase } from './core-client';
import * as shared from '@clstr/shared/schemas/validation';

// Pure functions — direct re-export
export {
  isValidAcademicEmail,
  getDomainFromEmail,
  normalizeCollegeDomain,
  getCollegeDomainFromEmail,
  isSameInstitution,
} from '@clstr/shared/schemas/validation';

// Server functions — pre-bind mobile supabase client
export const normalizeCollegeDomainServer = (domain: string) =>
  shared.normalizeCollegeDomainServer(supabase, domain);

export const getCollegeDomainFromEmailServer = (email: string) =>
  shared.getCollegeDomainFromEmailServer(supabase, email);
