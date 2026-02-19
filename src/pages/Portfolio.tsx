/**
 * Portfolio.tsx â€” Public portfolio page at /portfolio/:slug
 *
 * - Resolves slug â†’ profile ID via Supabase
 * - Fetches full profile data
 * - Converts to ProfileData via adapter
 * - Renders via PortfolioRenderer (template-based)
 * - SEO: injects Person JSON-LD + OG tags
 *
 * No auth required. Public page.
 */

import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from '@clstr/shared/query-keys';
import { resolvePortfolioSlug } from "@/lib/portfolio-api";
import { getProfileById } from "@/lib/profile";
import { userProfileToProfileData } from "@/lib/portfolio-adapter";
import PortfolioRenderer from "@/components/profile/portfolio/PortfolioRenderer";
import { SEO } from "@/components/SEO";

export default function Portfolio() {
  const { slug } = useParams<{ slug: string }>();

  // Step 1: Resolve slug â†’ profile ID
  const {
    data: profileId,
    isLoading: slugLoading,
    error: slugError,
  } = useQuery({
    queryKey: QUERY_KEYS.portfolio.resolve(slug),
    queryFn: () => resolvePortfolioSlug(slug ?? ""),
    enabled: Boolean(slug),
    staleTime: 60_000,
    retry: 1,
  });

  // Step 2: Fetch full profile
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: QUERY_KEYS.portfolio.profile(profileId),
    queryFn: () => getProfileById(profileId!),
    enabled: Boolean(profileId),
    staleTime: 30_000,
  });

  const isLoading = slugLoading || profileLoading;
  const error = slugError || profileError;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-white/30 text-sm">Loading portfolioâ€¦</div>
      </div>
    );
  }

  if (!profileId || !profile) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-white/40 text-sm">
          {error ? "Something went wrong loading this portfolio." : "Portfolio not found."}
        </p>
        <Link to="/" className="text-white/20 text-xs hover:text-white/40 transition-colors">
          â† Back to Clstr
        </Link>
      </div>
    );
  }

  const portfolioData = userProfileToProfileData(profile);

  // If portfolio is not live, show hidden message
  if (!portfolioData.settings.isLive) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-white/40 text-sm">This portfolio is currently hidden.</p>
        <Link to="/" className="text-white/20 text-xs hover:text-white/40 transition-colors">
          â† Back to Clstr
        </Link>
      </div>
    );
  }

  // JSON-LD Person structured data (per .github/copilot-instructions.md)
  const personJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: portfolioData.name,
    url: typeof window !== "undefined" ? window.location.href : "",
    jobTitle: portfolioData.role,
    description: portfolioData.about,
    ...(portfolioData.location && { address: { "@type": "PostalAddress", addressLocality: portfolioData.location } }),
    ...(portfolioData.email && { email: portfolioData.email }),
    ...(portfolioData.linkedin && { sameAs: [`https://${portfolioData.linkedin}`] }),
    ...(portfolioData.github && {
      sameAs: [
        ...(portfolioData.linkedin ? [`https://${portfolioData.linkedin}`] : []),
        `https://${portfolioData.github}`,
      ],
    }),
    ...(profile.university && {
      memberOf: {
        "@type": "CollegeOrUniversity",
        name: profile.university,
      },
    }),
  };

  return (
    <>
      <SEO
        title={`${portfolioData.name} â€” Portfolio`}
        description={portfolioData.about?.slice(0, 155) || `${portfolioData.name}'s portfolio on Clstr.`}
        type="profile"
        image={portfolioData.photo || undefined}
        jsonLd={personJsonLd}
      />
      <PortfolioRenderer profile={portfolioData} />
    </>
  );
}
