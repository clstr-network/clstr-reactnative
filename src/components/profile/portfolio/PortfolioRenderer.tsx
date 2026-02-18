/**
 * PortfolioRenderer.tsx
 *
 * Thin component that picks the correct template based on settings.template
 * and renders it with the given ProfileData.
 */

import type { ProfileData } from "@/types/portfolio";
import MinimalTemplate from "./MinimalTemplate";
import ElianaTemplate from "./ElianaTemplate";
import TypefolioTemplate from "./TypefolioTemplate";
import GeekyTemplate from "./GeekyTemplate";

interface PortfolioRendererProps {
  profile: ProfileData;
}

export default function PortfolioRenderer({ profile }: PortfolioRendererProps) {
  switch (profile.settings.template) {
    case "eliana":
      return <ElianaTemplate profile={profile} />;
    case "typefolio":
      return <TypefolioTemplate profile={profile} />;
    case "geeky":
      return <GeekyTemplate profile={profile} />;
    default:
      return <MinimalTemplate profile={profile} />;
  }
}
