import { supabase } from "@/integrations/supabase/client";
import { assertValidUuid } from "@clstr/shared/utils/uuid";

export interface TypeaheadProfileResult {
  id: string;
  full_name: string | null;
  headline: string | null;
  avatar_url: string | null;
  role: string | null;
  branch: string | null;
  year_of_completion: string | number | null;
  university: string | null;
  created_at: string | null;
}

export interface TypeaheadEventResult {
  id: string;
  title: string | null;
  event_date: string | null;
  location: string | null;
  category: string | null;
  created_at: string | null;
}

export interface TypeaheadResults {
  profiles: TypeaheadProfileResult[];
  events: TypeaheadEventResult[];
}

interface TypeaheadParams {
  query: string;
  collegeDomain: string | null;
}

const sanitizeIlike = (value: string): string => value.replace(/%/g, "\\%").replace(/_/g, "\\_");

const getMatchRank = (text: string | null, query: string): number => {
  if (!text) return 3;
  const normalizedText = text.trim().toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedText || !normalizedQuery) return 3;
  if (normalizedText === normalizedQuery) return 0;
  if (normalizedText.startsWith(normalizedQuery)) return 1;
  if (normalizedText.includes(normalizedQuery)) return 2;
  return 3;
};

const compareRecencyDesc = (a?: string | null, b?: string | null): number => {
  const aTime = a ? new Date(a).getTime() : 0;
  const bTime = b ? new Date(b).getTime() : 0;
  return bTime - aTime;
};

const compareSoonestAsc = (a?: string | null, b?: string | null): number => {
  const aTime = a ? new Date(a).getTime() : Number.MAX_SAFE_INTEGER;
  const bTime = b ? new Date(b).getTime() : Number.MAX_SAFE_INTEGER;
  return aTime - bTime;
};

export const typeaheadSearch = async ({ query, collegeDomain }: TypeaheadParams): Promise<TypeaheadResults> => {
  const normalizedQuery = (query ?? '').trim();
  
  if (!collegeDomain || normalizedQuery.length < 2) {
    return { profiles: [], events: [] };
  }

  // Normalize college_domain to lowercase for consistent comparison
  const normalizedDomain = collegeDomain.trim().toLowerCase();
  const pattern = `%${sanitizeIlike(normalizedQuery)}%`;
  
  // Use date-only format (YYYY-MM-DD) for event_date comparison since column is type DATE
  const todayDate = new Date().toISOString().split('T')[0];

  const [profilesResponse, eventsResponse] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, headline, avatar_url, role, branch, year_of_completion, university, created_at"
      )
      .eq("college_domain", normalizedDomain)
      .or(`full_name.ilike.${pattern},headline.ilike.${pattern}`)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("events")
      .select("id, title, event_date, location, category, created_at")
      .eq("college_domain", normalizedDomain)
      .gte("event_date", todayDate)
      .ilike("title", pattern)
      .order("event_date", { ascending: true })
      .limit(10),
  ]);

  if (profilesResponse.error) throw profilesResponse.error;
  if (eventsResponse.error) throw eventsResponse.error;

  const profiles = (profilesResponse.data || []).map((profile) => {
    assertValidUuid(profile.id, "profile id");
    return profile;
  });

  const events = (eventsResponse.data || []).map((event) => {
    assertValidUuid(event.id, "event id");
    return event;
  });

  const sortedProfiles = profiles.sort((a, b) => {
    const rankDiff =
      Math.min(
        getMatchRank(a.full_name, normalizedQuery),
        getMatchRank(a.headline, normalizedQuery)
      ) -
      Math.min(
        getMatchRank(b.full_name, normalizedQuery),
        getMatchRank(b.headline, normalizedQuery)
      );

    if (rankDiff !== 0) return rankDiff;
    return compareRecencyDesc(a.created_at, b.created_at);
  });

  const sortedEvents = events.sort((a, b) => compareSoonestAsc(a.event_date, b.event_date));

  return {
    profiles: sortedProfiles.slice(0, 5),
    events: sortedEvents.slice(0, 3),
  };
};
