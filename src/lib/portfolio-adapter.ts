/**
 * portfolio-adapter.ts
 *
 * Pure-function adapter that maps the app's UserProfile (Supabase-backed)
 * into the showcase repo's ProfileData shape consumed by portfolio templates.
 *
 * No DB calls — just data mapping.
 */

import type { UserProfile } from "@/types/profile";
import type {
  ProfileData,
  PortfolioEducation,
  PortfolioExperience,
  PortfolioProject,
  PortfolioPost,
  PortfolioSettings,
  TemplateId,
} from "@/types/portfolio";
import { DEFAULT_PORTFOLIO_SETTINGS } from "@/types/portfolio";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a URL-safe slug from a name + short id suffix */
export function generateSlug(name: string, id: string): string {
  const base = (name || "user")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = id.slice(0, 8);
  return `${base}-${suffix}`;
}

/** Pick the default template based on user role */
export function defaultTemplateForRole(role?: string | null): TemplateId {
  switch (role?.toLowerCase()) {
    case "alumni":
      return "typefolio";
    case "faculty":
      return "eliana";
    case "club":
    case "organization":
      return "geeky";
    default:
      return "minimal";
  }
}

/** Extract a social-link value from the social_links jsonb blob */
function socialValue(links: Record<string, string> | null | undefined, key: string): string {
  if (!links) return "";
  const raw = links[key] ?? "";
  // Strip protocol prefix so templates can add https:// themselves
  return raw.replace(/^https?:\/\//, "");
}

// ---------------------------------------------------------------------------
// Main adapter
// ---------------------------------------------------------------------------

export function userProfileToProfileData(
  profile: UserProfile,
  overrideSettings?: Partial<PortfolioSettings>
): ProfileData {
  const social = (profile.social_links ?? {}) as Record<string, string>;

  // Build settings: stored settings → role defaults → overrides
  const stored = extractPortfolioSettings(social);
  const settings: PortfolioSettings = {
    ...DEFAULT_PORTFOLIO_SETTINGS,
    template: defaultTemplateForRole(profile.role),
    slug: generateSlug(profile.full_name || "", profile.id),
    ...stored,
    ...overrideSettings,
  };

  const education: PortfolioEducation[] = (profile.education ?? []).map((edu, i) => ({
    id: edu.id ?? String(i),
    institution: edu.school || edu.institution || "",
    degree: edu.degree || "",
    field: edu.field_of_study ?? edu.description ?? "",
    startYear: edu.start_date ? edu.start_date.slice(0, 4) : "",
    endYear: edu.end_date ? edu.end_date.slice(0, 4) : "Present",
  }));

  const experience: PortfolioExperience[] = (profile.experience ?? []).map((exp, i) => ({
    id: exp.id ?? String(i),
    company: exp.company || "",
    role: exp.title || "",
    description: exp.description || "",
    startDate: exp.start_date || "",
    endDate: exp.end_date || "",
    current: !exp.end_date,
  }));

  const skills: string[] = (profile.skills ?? []).map((s) =>
    typeof s === "string" ? s : s.name || s.skill_name || ""
  ).filter(Boolean);

  const projects: PortfolioProject[] = (profile.projects ?? []).map((p, i) => ({
    id: p.id ?? String(i),
    title: p.name || "",
    description: p.description || "",
    link: p.url || "",
    tags: p.skills ?? [],
  }));

  const posts: PortfolioPost[] = (profile.posts ?? []).map((post, i) => ({
    id: post.id ?? String(i),
    title: (post.content || "").slice(0, 80),
    content: post.content || "",
    date: post.created_at ?? "",
  }));

  return {
    name: profile.full_name || "Anonymous",
    photo: profile.avatar_url || "",
    role: profile.headline || profile.role || "",
    about: profile.bio || "",
    location: profile.location || "",
    email: profile.email || "",
    linkedin: socialValue(social, "linkedin"),
    github: socialValue(social, "github"),
    website: socialValue(social, "website"),
    education,
    experience,
    skills,
    projects,
    posts,
    settings,
  };
}

// ---------------------------------------------------------------------------
// Portfolio Settings persistence helpers  (stored in social_links._portfolio)
// ---------------------------------------------------------------------------

const PORTFOLIO_KEY = "_portfolio";

/** Read portfolio settings from the social_links jsonb */
export function extractPortfolioSettings(
  socialLinks: Record<string, unknown> | null | undefined
): Partial<PortfolioSettings> {
  if (!socialLinks) return {};
  const raw = socialLinks[PORTFOLIO_KEY];
  if (!raw || typeof raw !== "string") return {};
  try {
    return JSON.parse(raw) as Partial<PortfolioSettings>;
  } catch {
    return {};
  }
}

/** Merge portfolio settings into social_links for persistence */
export function embedPortfolioSettings(
  socialLinks: Record<string, string> | null | undefined,
  settings: Partial<PortfolioSettings>
): Record<string, string> {
  const current = { ...(socialLinks ?? {}) };
  const existing = extractPortfolioSettings(current);
  current[PORTFOLIO_KEY] = JSON.stringify({ ...existing, ...settings });
  return current;
}
