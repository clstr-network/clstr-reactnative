
// Import Indian university domains
import universityDomains from '../../external/university-domains-india.json';
import { supabase } from '@/integrations/supabase/client';

/**
 * Validates if an email is from an educational institution
 * @param email The email address to validate
 * @returns boolean indicating if the email is from a valid academic domain
 */
export function isValidAcademicEmail(email: string): boolean {
  // Extract the domain part after @
  const domain = email.split('@')[1]?.toLowerCase();

  if (!domain) return false;

  // Explicitly whitelisted college domains
  // These are verified educational institutions that don't follow standard .edu patterns
  const whitelistedDomains = [
    'raghuenggcollege.in',
    'raghuinstech.com',
  ];

  if (whitelistedDomains.includes(domain)) {
    return true;
  }

  // Standard educational domain patterns
  const allowedPatterns = [
    /\.edu$/,                      // U.S. .edu
    /\.ac\.[a-z]{2,3}$/,           // .ac.[country code] (UK, IN, ZA, etc.)
    /\.edu\.[a-z]{2,3}$/,          // .edu.[country code] (AU, SG, NG, etc.)
    /\.university$/,               // .university domains
    /\.college$/,                  // .college domains
    /\.school$/,                   // .school domains
    /university\.[a-z]{2,3}$/,     // university.[country code]
    /college\.[a-z]{2,3}$/,        // college.[country code]
    /school\.[a-z]{2,3}$/,         // school.[country code]
  ];

  // Check if domain is in Indian university domains list
  const isIndianUniversity = universityDomains.some((uni: { domains?: string[] }) =>
    uni.domains && uni.domains.includes(domain)
  );

  // Check if domain contains college or university keywords
  const containsEducationalKeywords =
    domain.includes('college') ||
    domain.includes('university') ||
    domain.includes('edu') ||
    domain.includes('academic') ||
    domain.includes('school') ||
    domain.includes('iit') ||        // Indian Institutes of Technology
    domain.includes('nit') ||        // National Institutes of Technology
    domain.includes('iiit') ||       // Indian Institutes of Information Technology
    domain.includes('iim') ||        // Indian Institutes of Management
    domain.includes('bits');         // BITS Pilani

  // Check if domain matches any of the allowed patterns
  const isValidPattern = allowedPatterns.some(pattern => pattern.test(domain));

  return isValidPattern || isIndianUniversity || containsEducationalKeywords;
}

/**
 * Gets the domain from an email address
 * @param email The email address
 * @returns The domain part of the email
 */
export function getDomainFromEmail(email: string): string {
  const parts = email.split('@');
  return parts.length > 1 ? parts[1].toLowerCase() : '';
}

/**
 * Normalizes a raw email domain into the canonical college identity.
 *
 * Sync client-side fallback only — hardcodes known aliases.
 * For authoritative operations, use `normalizeCollegeDomainServer()`.
 */
export function normalizeCollegeDomain(domain: string): string {
  const normalized = (domain || '').trim().toLowerCase();
  if (!normalized) return '';

  // Raghu domains should be treated as one college identity
  if (normalized === 'raghuinstech.com' || normalized === 'raghuenggcollege.in') {
    return 'raghuenggcollege.in';
  }

  return normalized;
}

/**
 * Authoritative server-side domain normalization via DB RPC.
 * Resolves aliases from the college_domain_aliases table.
 * Falls back to the client-side normalizeCollegeDomain() on error.
 */
export async function normalizeCollegeDomainServer(domain: string): Promise<string> {
  const normalized = (domain || '').trim().toLowerCase();
  if (!normalized) return '';

  try {
    const { data, error } = await supabase.rpc("normalize_college_domain", {
      p_domain: normalized,
    });
    if (error) {
      console.error("normalize_college_domain RPC error, falling back to client:", error);
      return normalizeCollegeDomain(normalized);
    }
    return data || normalized;
  } catch (err) {
    console.error("normalize_college_domain RPC failed, falling back to client:", err);
    return normalizeCollegeDomain(normalized);
  }
}

/**
 * Gets the canonical college identity from an email address.
 * Sync client-side version — for authoritative operations, use `getCollegeDomainFromEmailServer()`.
 */
export function getCollegeDomainFromEmail(email: string): string {
  return normalizeCollegeDomain(getDomainFromEmail(email));
}

/**
 * Authoritative server-side version: gets the canonical college identity from an email address.
 */
export async function getCollegeDomainFromEmailServer(email: string): Promise<string> {
  return normalizeCollegeDomainServer(getDomainFromEmail(email));
}

/**
 * Checks if two users belong to the same academic institution
 * @param email1 First user's email
 * @param email2 Second user's email
 * @returns Boolean indicating if users belong to the same institution
 */
export function isSameInstitution(email1: string, email2: string): boolean {
  return getCollegeDomainFromEmail(email1) === getCollegeDomainFromEmail(email2);
}
