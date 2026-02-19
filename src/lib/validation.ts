/**
 * validation.ts — Web adapter stub
 * Re-exports pure functions from shared, pre-binds supabase for server functions.
 */
import { supabase } from '@/integrations/supabase/client';
import * as shared from '@clstr/shared/schemas/validation';

// Pure functions — direct re-export
export {
  isValidAcademicEmail,
  getDomainFromEmail,
  normalizeCollegeDomain,
  getCollegeDomainFromEmail,
  isSameInstitution,
} from '@clstr/shared/schemas/validation';

// Server functions — pre-bind web supabase client
export const normalizeCollegeDomainServer = (domain: string) =>
  shared.normalizeCollegeDomainServer(supabase, domain);

export const getCollegeDomainFromEmailServer = (email: string) =>
  shared.getCollegeDomainFromEmailServer(supabase, email);