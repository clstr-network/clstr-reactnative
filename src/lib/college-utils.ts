/**
 * college-utils.ts — Web adapter stub
 * Re-exports pure functions from shared, pre-binds supabase for server functions.
 */
import { supabase } from '@/integrations/supabase/client';
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

// Server function — pre-bind web supabase client
export const isPublicEmailDomainServer = (domain: string) =>
  shared.isPublicEmailDomainServer(supabase, domain);