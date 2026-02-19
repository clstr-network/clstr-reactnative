/**
 * portfolio-api.ts
 *
 * Supabase-backed persistence for portfolio settings.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAppError } from '../errors';
import { assertValidUuid } from '../utils/uuid';
import type { PortfolioSettings } from '../types/portfolio';
import type { UserProfile } from '../types/profile';
import {
  embedPortfolioSettings,
  extractPortfolioSettings,
  generateSlug,
  defaultTemplateForRole,
} from './portfolio-adapter';
import { DEFAULT_PORTFOLIO_SETTINGS } from '../types/portfolio';

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** Fetch portfolio settings for a given profile id */
export async function getPortfolioSettings(
  client: SupabaseClient,
  profileId: string,
): Promise<PortfolioSettings> {
  assertValidUuid(profileId, "profileId");

  const { data, error } = await client
    .from("profiles")
    .select("social_links, full_name, role")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    throw createAppError(
      "Failed to load portfolio settings",
      "getPortfolioSettings",
      error,
    );
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
export async function resolvePortfolioSlug(
  client: SupabaseClient,
  slug: string,
): Promise<string | null> {
  if (!slug) return null;

  const idFragment = slug.split("-").pop();

  if (idFragment && idFragment.length >= 8) {
    const { data, error } = await client
      .from("profiles")
      .select("id, full_name, social_links")
      .ilike("id", `${idFragment}%`)
      .limit(10);

    if (!error && data && data.length > 0) {
      for (const row of data) {
        const expectedSlug = generateSlug(row.full_name || "", row.id);
        if (expectedSlug === slug) return row.id;

        const stored = extractPortfolioSettings(
          row.social_links as Record<string, unknown> | null
        );
        if (stored.slug && stored.slug === slug) return row.id;
      }
    }
  }

  const { data: allProfiles, error: allErr } = await client
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
  client: SupabaseClient,
  profileId: string,
  updates: Partial<PortfolioSettings>,
): Promise<void> {
  assertValidUuid(profileId, "profileId");

  const { data, error: fetchError } = await client
    .from("profiles")
    .select("social_links")
    .eq("id", profileId)
    .single();

  if (fetchError) {
    throw createAppError(
      "Failed to read current settings",
      "updatePortfolioSettings:read",
      fetchError,
    );
  }

  const currentLinks = (data?.social_links as Record<string, string>) ?? {};
  const merged = embedPortfolioSettings(currentLinks, updates);

  const { error: updateError } = await client
    .from("profiles")
    .update({ social_links: merged as unknown as Record<string, unknown> })
    .eq("id", profileId);

  if (updateError) {
    throw createAppError(
      "Failed to save portfolio settings",
      "updatePortfolioSettings:write",
      updateError,
    );
  }
}

/** Activate portfolio: set isLive = true, ensure slug exists */
export async function activatePortfolio(
  client: SupabaseClient,
  profileId: string,
  profile: Pick<UserProfile, "full_name" | "role">,
): Promise<string> {
  const slug = generateSlug(profile.full_name || "", profileId);
  await updatePortfolioSettings(client, profileId, {
    isLive: true,
    slug,
    template: defaultTemplateForRole(profile.role),
  });
  return slug;
}
