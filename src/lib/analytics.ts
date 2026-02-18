import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// ANALYTICS - Lightweight event tracking for conversion funnel
// ============================================================================

export type AnalyticsEvent = 
  | "public_event_view"
  | "explore_events_cta_click"
  | "signup_started"
  | "signup_completed"
  | "redirect_success"
  | "event_share_dm"
  | "event_share_link"
  | "event_register";

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  properties?: Record<string, unknown>;
}

/**
 * Track an analytics event
 * Non-blocking, fire-and-forget - never throws
 */
export async function trackEvent(payload: AnalyticsPayload): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const eventData = {
      event_type: payload.event,
      user_id: user?.id || null,
      properties: payload.properties || {},
      created_at: new Date().toISOString(),
      source_url: typeof window !== "undefined" ? window.location.pathname : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    };

    // Insert into analytics_events table (non-blocking)
    const { error } = await supabase
      .from("analytics_events")
      .insert(eventData);

    if (error) {
      // Table might not exist yet - silent fail
      if (error.code !== "42P01") {
        console.debug("[Analytics] Track event failed:", error.message);
      }
    }
  } catch {
    // Never throw - analytics should not break the app
    console.debug("[Analytics] Silent fail");
  }
}

/**
 * Track public event page view
 */
export function trackPublicEventView(eventId: string): void {
  trackEvent({
    event: "public_event_view",
    properties: { event_id: eventId },
  });
}

/**
 * Track "Explore more events" CTA click
 */
export function trackExploreEventsCTAClick(params: {
  source: "public_event" | "authenticated_event";
  event_id: string;
  is_authenticated: boolean;
}): void {
  trackEvent({
    event: "explore_events_cta_click",
    properties: params,
  });
}

/**
 * Track signup started (user arrived at signup page)
 */
export function trackSignupStarted(params: {
  redirect_target?: string;
  source?: string;
}): void {
  trackEvent({
    event: "signup_started",
    properties: params,
  });
}

/**
 * Track signup completed
 */
export function trackSignupCompleted(params: {
  redirect_target?: string;
  method: "google" | "magic_link";
}): void {
  trackEvent({
    event: "signup_completed",
    properties: params,
  });
}

/**
 * Track successful redirect after auth
 */
export function trackRedirectSuccess(params: {
  redirect_target: string;
  source: "auth_callback";
}): void {
  trackEvent({
    event: "redirect_success",
    properties: params,
  });
}

/**
 * Validate redirect URL - prevent open-redirect abuse
 * Only allows internal paths starting with /
 * Never allows absolute URLs or external redirects
 */
export function validateRedirectUrl(url: string | null | undefined): string {
  const defaultRedirect = "/events";
  
  if (!url) return defaultRedirect;
  
  // Trim whitespace
  const trimmed = url.trim();
  
  // Must start with / (internal path)
  if (!trimmed.startsWith("/")) return defaultRedirect;
  
  // Block protocol-relative URLs (//evil.com)
  if (trimmed.startsWith("//")) return defaultRedirect;
  
  // Block javascript: URLs
  if (trimmed.toLowerCase().includes("javascript:")) return defaultRedirect;
  
  // Block data: URLs
  if (trimmed.toLowerCase().includes("data:")) return defaultRedirect;
  
  // Whitelist allowed paths
  const allowedPaths = [
    "/events",
    "/home",
    "/clubs",
    "/mentorship",
    "/projects",
    "/jobs",
    "/ecocampus",
    "/network",
    "/saved",
    "/settings",
    "/profile",
    "/messages",
    "/alumni-directory",
    "/team-ups",
  ];
  
  // Check if path starts with any allowed path
  const isAllowed = allowedPaths.some(
    (path) => trimmed === path || trimmed.startsWith(`${path}/`) || trimmed.startsWith(`${path}?`)
  );
  
  // Also allow /event/:id and /post/:id patterns
  const eventPattern = /^\/event\/[a-f0-9-]+$/i;
  const postPattern = /^\/post\/[a-f0-9-]+$/i;
  
  if (isAllowed || eventPattern.test(trimmed) || postPattern.test(trimmed)) {
    return trimmed;
  }
  
  return defaultRedirect;
}
