-- ============================================================================
-- 058_analytics_events.sql - Analytics Events Table for Conversion Tracking
-- Tracks user journey through public event → signup → redirect funnel
-- ============================================================================

BEGIN;

-- ============================================================================
-- ANALYTICS EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  properties jsonb DEFAULT '{}',
  source_url text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS analytics_events_event_type_idx ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_properties_idx ON public.analytics_events USING gin(properties);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert analytics events (even unauthenticated users)
CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events
FOR INSERT
TO public
WITH CHECK (true);

-- Only platform admins can view analytics events
CREATE POLICY "Platform admins can view analytics events"
ON public.analytics_events
FOR SELECT
TO authenticated
USING (public.is_platform_admin());

-- ============================================================================
-- ANALYTICS VIEWS
-- ============================================================================

-- View: Public event funnel conversion
CREATE OR REPLACE VIEW public.event_funnel_analytics AS
SELECT
  date_trunc('day', created_at) AS day,
  COUNT(*) FILTER (WHERE event_type = 'public_event_view') AS public_views,
  COUNT(*) FILTER (WHERE event_type = 'explore_events_cta_click') AS cta_clicks,
  COUNT(*) FILTER (WHERE event_type = 'signup_started') AS signups_started,
  COUNT(*) FILTER (WHERE event_type = 'signup_completed') AS signups_completed,
  COUNT(*) FILTER (WHERE event_type = 'redirect_success') AS redirects_successful,
  ROUND(
    CASE 
      WHEN COUNT(*) FILTER (WHERE event_type = 'public_event_view') > 0 
      THEN COUNT(*) FILTER (WHERE event_type = 'signup_completed')::numeric / 
           COUNT(*) FILTER (WHERE event_type = 'public_event_view')::numeric * 100
      ELSE 0 
    END, 2
  ) AS conversion_rate_pct
FROM public.analytics_events
WHERE created_at > now() - interval '30 days'
GROUP BY date_trunc('day', created_at)
ORDER BY day DESC;

-- ============================================================================
-- FUNCTION: Get event funnel stats for admin dashboard
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_event_funnel_stats(p_days integer DEFAULT 30)
RETURNS TABLE (
  total_public_views bigint,
  total_cta_clicks bigint,
  total_signups_started bigint,
  total_signups_completed bigint,
  total_redirects_successful bigint,
  overall_conversion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'public_event_view'),
    COUNT(*) FILTER (WHERE event_type = 'explore_events_cta_click'),
    COUNT(*) FILTER (WHERE event_type = 'signup_started'),
    COUNT(*) FILTER (WHERE event_type = 'signup_completed'),
    COUNT(*) FILTER (WHERE event_type = 'redirect_success'),
    ROUND(
      CASE 
        WHEN COUNT(*) FILTER (WHERE event_type = 'public_event_view') > 0 
        THEN COUNT(*) FILTER (WHERE event_type = 'signup_completed')::numeric / 
             COUNT(*) FILTER (WHERE event_type = 'public_event_view')::numeric * 100
        ELSE 0 
      END, 2
    )
  FROM public.analytics_events
  WHERE created_at > now() - (p_days || ' days')::interval;
END;
$$;

COMMIT;
