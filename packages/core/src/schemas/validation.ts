import type { SupabaseClient } from '@supabase/supabase-js';
import universityDomains from '../data/university-domains-india.json';

/**
 * Validates if an email is from an educational institution
 */
export function isValidAcademicEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;

  const whitelistedDomains = [
    'raghuenggcollege.in',
    'raghuinstech.com',
  ];

  if (whitelistedDomains.includes(domain)) {
    return true;
  }

  const allowedPatterns = [
    /\.edu$/,
    /\.ac\.[a-z]{2,3}$/,
    /\.edu\.[a-z]{2,3}$/,
    /\.university$/,
    /\.college$/,
    /\.school$/,
    /university\.[a-z]{2,3}$/,
    /college\.[a-z]{2,3}$/,
    /school\.[a-z]{2,3}$/,
  ];

  const isIndianUniversity = universityDomains.some((uni: { domains?: string[] }) =>
    uni.domains && uni.domains.includes(domain)
  );

  const containsEducationalKeywords =
    domain.includes('college') ||
    domain.includes('university') ||
    domain.includes('edu') ||
    domain.includes('academic') ||
    domain.includes('school') ||
    domain.includes('iit') ||
    domain.includes('nit') ||
    domain.includes('iiit') ||
    domain.includes('iim') ||
    domain.includes('bits');

  const isValidPattern = allowedPatterns.some(pattern => pattern.test(domain));

  return isValidPattern || isIndianUniversity || containsEducationalKeywords;
}

/**
 * Gets the domain from an email address
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

  if (normalized === 'raghuinstech.com' || normalized === 'raghuenggcollege.in') {
    return 'raghuenggcollege.in';
  }

  return normalized;
}

/**
 * Authoritative server-side domain normalization via DB RPC.
 * Resolves aliases from the college_domain_aliases table.
 * Falls back to the client-side normalizeCollegeDomain() on error.
 *
 * @param client - SupabaseClient instance (injected, not singleton)
 * @param domain - raw email domain
 */
export async function normalizeCollegeDomainServer(
  client: SupabaseClient,
  domain: string,
): Promise<string> {
  const normalized = (domain || '').trim().toLowerCase();
  if (!normalized) return '';

  try {
    const { data, error } = await client.rpc("normalize_college_domain", {
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
 *
 * @param client - SupabaseClient instance (injected, not singleton)
 * @param email - full email address
 */
export async function getCollegeDomainFromEmailServer(
  client: SupabaseClient,
  email: string,
): Promise<string> {
  return normalizeCollegeDomainServer(client, getDomainFromEmail(email));
}

/**
 * Checks if two users belong to the same academic institution
 */
export function isSameInstitution(email1: string, email2: string): boolean {
  return getCollegeDomainFromEmail(email1) === getCollegeDomainFromEmail(email2);
}
