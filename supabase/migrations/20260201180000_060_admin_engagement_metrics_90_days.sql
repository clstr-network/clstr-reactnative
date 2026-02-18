-- ============================================================================
-- 060_admin_engagement_metrics_90_days.sql
-- Expand admin engagement metrics retention to 90 days
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.refresh_admin_engagement_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  TRUNCATE TABLE public.admin_engagement_metrics;

  INSERT INTO public.admin_engagement_metrics (date, metric_type, count, updated_at)
  SELECT DATE(created_at) AS date, 'posts' AS metric_type, COUNT(*) AS count, NOW() AS updated_at
  FROM public.posts
  WHERE created_at > NOW() - INTERVAL '90 days'
  GROUP BY DATE(created_at)

  UNION ALL

  SELECT DATE(created_at) AS date, 'comments' AS metric_type, COUNT(*) AS count, NOW() AS updated_at
  FROM public.comments
  WHERE created_at > NOW() - INTERVAL '90 days'
  GROUP BY DATE(created_at)

  UNION ALL

  SELECT DATE(created_at) AS date, 'connections' AS metric_type, COUNT(*) AS count, NOW() AS updated_at
  FROM public.connections
  WHERE created_at > NOW() - INTERVAL '90 days'
  GROUP BY DATE(created_at)

  UNION ALL

  SELECT DATE(created_at) AS date, 'events' AS metric_type, COUNT(*) AS count, NOW() AS updated_at
  FROM public.events
  WHERE created_at > NOW() - INTERVAL '90 days'
  GROUP BY DATE(created_at);
END;
$$;

SELECT public.refresh_admin_engagement_metrics();

COMMIT;
