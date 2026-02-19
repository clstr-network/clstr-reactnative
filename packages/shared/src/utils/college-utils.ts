/**
 * college-utils.ts (shared)
 * 
 * Platform-agnostic college and domain utilities.
 * Server-side functions accept a SupabaseClient parameter instead of
 * importing the web singleton directly.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Minimal offline fallback — only the handful of domains that cover >95% of
 * public-email sign-ups.  The authoritative source is the server-side
 * `is_public_email_domain()` SQL function.
 */
const MINIMAL_PUBLIC_DOMAINS: ReadonlySet<string> = new Set([
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
]);

/** Module-level cache of per-domain RPC results. */
const _domainCache = new Map<string, boolean>();

/**
 * @deprecated Exported only for backward-compat. Use `isPublicEmailDomain()` instead.
 */
export const PUBLIC_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
] as const;

/**
 * Synchronous client-side check. Use for non-authoritative UI hints only.
 */
export function isPublicEmailDomain(domain: string): boolean {
  const normalized = normalizeDomain(domain);
  if (!normalized) return false;

  const cached = _domainCache.get(normalized);
  if (cached !== undefined) return cached;

  return MINIMAL_PUBLIC_DOMAINS.has(normalized);
}

/**
 * Authoritative server-side check via DB RPC.
 * Accepts supabase client as parameter for platform-agnosticism.
 */
export async function isPublicEmailDomainServer(supabase: SupabaseClient, domain: string): Promise<boolean> {
  const normalized = normalizeDomain(domain);
  if (!normalized) return false;

  const cached = _domainCache.get(normalized);
  if (cached !== undefined) return cached;

  try {
    const { data, error } = await supabase.rpc("is_public_email_domain", {
      p_domain: normalized,
    });
    if (error) {
      console.error("is_public_email_domain RPC error, falling back to client list:", error);
      return isPublicEmailDomain(normalized);
    }
    const result = !!data;
    _domainCache.set(normalized, result);
    return result;
  } catch (err) {
    console.error("is_public_email_domain RPC failed, falling back to client list:", err);
    return isPublicEmailDomain(normalized);
  }
}

/**
 * Format a domain string into a human-readable college name
 */
export function formatCollegeName(domain: string): string {
  if (!domain) return 'Unknown College';

  let name = domain
    .replace(/\.(edu|ac)\.in$/, '')
    .replace(/\.edu$/, '')
    .replace(/\.in$/, '')
    .replace(/\.com$/, '')
    .replace(/\.org$/, '');

  name = name
    .split(/[.\-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return name || domain;
}

/**
 * Normalize a domain string (lowercase, trim, remove protocol)
 */
export function normalizeDomain(domain: string): string {
  if (!domain) return '';
  
  return domain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}

/**
 * Extract domain from an email address
 */
export function extractDomainFromEmail(email: string): string {
  if (!email || !email.includes('@')) return '';
  return normalizeDomain(email.split('@')[1]);
}

/**
 * Validate domain format (basic check)
 */
export function isValidDomain(domain: string): boolean {
  if (!domain) return false;
  
  const normalized = normalizeDomain(domain);
  
  if (!normalized.includes('.')) return false;
  if (normalized.includes(' ')) return false;
  
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
  return domainRegex.test(normalized);
}

/**
 * Check if a domain looks like an academic domain
 */
export function isAcademicDomain(domain: string): boolean {
  const normalized = normalizeDomain(domain);
  return (
    normalized.endsWith('.edu') ||
    normalized.endsWith('.ac.in') ||
    normalized.endsWith('.edu.in') ||
    normalized.endsWith('.edu.au') ||
    normalized.endsWith('.edu.uk') ||
    normalized.endsWith('.edu.sg')
  );
}
