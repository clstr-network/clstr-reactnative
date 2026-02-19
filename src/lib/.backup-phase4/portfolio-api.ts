/**
 * portfolio-api.ts
 *
 * Supabase-backed persistence for portfolio settings.
 *
 * Phase 1: Uses profiles.social_links jsonb to store settings (no schema change).
 * Phase 2 (future): Dedicated portfolio_settings table.
 *
 * All reads/writes go through Supabase — no local state pretending to be persisted.
 */

import { supabase } from "@/integrations/supabase/client";
import { handleApiError } from "@/lib/errorHandler";
import { assertValidUuid } from "@clstr/shared/utils/uuid";
import type { PortfolioSettings, TemplateId } from "@clstr/shared/types/portfolio";
import type { UserProfile } from "@clstr/shared/types/profile";
import {
  embedPortfolioSettings,
  extractPortfolioSettings,
  generateSlug,
  defaultTemplateForRole,
} from "@/lib/portfolio-adapter";
import { DEFAULT_PORTFOLIO_SETTINGS } from "@clstr/shared/types/portfolio";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** Fetch portfolio settings for a given profile id */
export async function getPortfolioSettings(profileId: string): Promise<PortfolioSettings> {
  assertValidUuid(profileId, "profileId");

  const { data, error } = await supabase
    .from("profiles")
    .select("social_links, full_name, role")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    throw handleApiError(error, {
      operation: "getPortfolioSettings",
      userMessage: "Failed to load portfolio settings",
      details: { profileId },
    });
  }

  if (!data) return { ...DEFAULT_PORTFOLIO_SETTINGS };

  const social = (data.social_links as Record<string, unknown>) ?? {};
  const stored = extractPortfolioSettings(social);

  return {
    ...DEFAULT_PORTFOLIO_SETTINGS,
    template: defaultTemplateForRole(data.role),
    slug: generateSlug(data.full_name || "", profileId),
    ...stored,
  };
}

/** Resolve a portfolio slug to a profile id */
export async function resolvePortfolioSlug(slug: string): Promise<string | null> {
  if (!slug) return null;

  // Strategy 1: Extract UUID fragment from slug suffix (default format: "name-<8-char-uuid>")
  const idFragment = slug.split("-").pop();

  if (idFragment && idFragment.length >= 8) {
    // Pattern-match the first 8 chars of UUID
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, social_links")
      .ilike("id", `${idFragment}%`)
      .limit(10);

    if (!error && data && data.length > 0) {
      // Check both the auto-generated slug AND any user-customised slug stored
      // in portfolio settings so edited slugs still resolve correctly.
      for (const row of data) {
        // 1. Match auto-generated slug (default path)
        const expectedSlug = generateSlug(row.full_name || "", row.id);
        if (expectedSlug === slug) return row.id;

        // 2. Match user-customised slug persisted in social_links._portfolio
        const stored = extractPortfolioSettings(
          row.social_links as Record<string, unknown> | null
        );
        if (stored.slug && stored.slug === slug) return row.id;
      }
    }
  }

  // Strategy 2: Scan all profiles for a custom slug match in social_links._portfolio
  // This handles fully custom slugs with no UUID suffix
  const { data: allProfiles, error: allErr } = await supabase
    .from("profiles")
    .select("id, social_links")
    .not("social_links", "is", null);

  if (!allErr && allProfiles) {
    for (const row of allProfiles) {
      const stored = extractPortfolioSettings(
        row.social_links as Record<string, unknown> | null
      );
      if (stored.slug && stored.slug === slug) return row.id;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/** Update one or more portfolio settings for the current user */
export async function updatePortfolioSettings(
  profileId: string,
  updates: Partial<PortfolioSettings>
): Promise<void> {
  assertValidUuid(profileId, "profileId");

  // Read current social_links
  const { data, error: fetchError } = await supabase
    .from("profiles")
    .select("social_links")
    .eq("id", profileId)
    .single();

  if (fetchError) {
    throw handleApiError(fetchError, {
      operation: "updatePortfolioSettings:read",
      userMessage: "Failed to read current settings",
      details: { profileId },
    });
  }

  const currentLinks = (data?.social_links as Record<string, string>) ?? {};
  const merged = embedPortfolioSettings(currentLinks, updates);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ social_links: merged as unknown as Record<string, unknown> })
    .eq("id", profileId);

  if (updateError) {
    throw handleApiError(updateError, {
      operation: "updatePortfolioSettings:write",
      userMessage: "Failed to save portfolio settings",
      details: { profileId },
    });
  }
}

/** Activate portfolio: set isLive = true, ensure slug exists */
export async function activatePortfolio(
  profileId: string,
  profile: Pick<UserProfile, "full_name" | "role">
): Promise<string> {
  const slug = generateSlug(profile.full_name || "", profileId);
  await updatePortfolioSettings(profileId, {
    isLive: true,
    slug,
    template: defaultTemplateForRole(profile.role),
  });
  return slug;
}
