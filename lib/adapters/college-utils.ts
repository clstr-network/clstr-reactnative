/**
 * college-utils.ts — Mobile adapter stub
 *
 * Re-exports pure functions from @clstr/shared, pre-binds the mobile
 * Supabase client for server functions.
 *
 * Mirrors the web's `src/lib/college-utils.ts` adapter pattern.
 */
import { supabase } from './core-client';
import * as shared from '@clstr/shared/utils/college-utils';

// Pure functions — direct re-export
export {
  PUBLIC_EMAIL_DOMAINS,
  isPublicEmailDomain,
  formatCollegeName,
  normalizeDomain,
  extractDomainFromEmail,
  isValidDomain,
  isAcademicDomain,
} from '@clstr/shared/utils/college-utils';

// Server function — pre-bind mobile supabase client
export const isPublicEmailDomainServer = (domain: string) =>
  shared.isPublicEmailDomainServer(supabase, domain);
