/**
 * college-utils.ts
 * 
 * Shared utilities for college and domain management.
 * Used by useAdminColleges and useAdminDomains hooks.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Minimal offline fallback — only the handful of domains that cover >95% of
 * public-email sign-ups.  The authoritative source is the server-side
 * `is_public_email_domain()` SQL function.  Individual RPC results are cached
 * in `_domainCache` so the sync helper improves over the session lifetime.
 *
 * UC-3 FIX: Previous 60-entry list was a maintenance burden and drifted from
 * the DB list. Reduced to 5 entries; all real checks go through the RPC.
 */
const MINIMAL_PUBLIC_DOMAINS: ReadonlySet<string> = new Set([
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
]);

/** Module-level cache of per-domain RPC results (populated by `isPublicEmailDomainServer`). */
const _domainCache = new Map<string, boolean>();

/**
 * @deprecated Exported only for backward-compat. Use `isPublicEmailDomain()` instead.
 * Will be removed in a future release.
 */
export const PUBLIC_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
] as const;

/**
 * Synchronous client-side check. Use for non-authoritative UI hints only.
 * Checks the per-session RPC cache first, then falls back to the minimal list.
 * For authoritative decisions (signup, domain assignment), use `isPublicEmailDomainServer()`.
 */
export function isPublicEmailDomain(domain: string): boolean {
  const normalized = normalizeDomain(domain);
  if (!normalized) return false;

  // Check RPC cache first (populated by prior isPublicEmailDomainServer calls)
  const cached = _domainCache.get(normalized);
  if (cached !== undefined) return cached;

  // Fall back to minimal offline list
  return MINIMAL_PUBLIC_DOMAINS.has(normalized);
}

/**
 * Authoritative server-side check via DB RPC `is_public_email_domain()`.
 * Use this for signup flows, auth callbacks, and any domain-assignment decisions.
 * Results are cached in `_domainCache` so subsequent sync checks via
 * `isPublicEmailDomain()` benefit without another round-trip.
 */
export async function isPublicEmailDomainServer(domain: string): Promise<boolean> {
  const normalized = normalizeDomain(domain);
  if (!normalized) return false;

  // Return cached result if available
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
 * e.g., "raghuenggcollege.in" → "Raghu Engg College"
 */
export function formatCollegeName(domain: string): string {
  if (!domain) return 'Unknown College';

  // Remove common TLDs
  let name = domain
    .replace(/\.(edu|ac)\.in$/, '')
    .replace(/\.edu$/, '')
    .replace(/\.in$/, '')
    .replace(/\.com$/, '')
    .replace(/\.org$/, '');

  // Split on dots, dashes, underscores and capitalize
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
 * Returns true if the domain looks valid (has at least one dot, no spaces)
 */
export function isValidDomain(domain: string): boolean {
  if (!domain) return false;
  
  const normalized = normalizeDomain(domain);
  
  // Must have at least one dot
  if (!normalized.includes('.')) return false;
  
  // No spaces allowed
  if (normalized.includes(' ')) return false;
  
  // Basic domain pattern check
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
  return domainRegex.test(normalized);
}

/**
 * Check if a domain looks like an academic domain
 * (ends in .edu, .ac.in, .edu.in, etc.)
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
