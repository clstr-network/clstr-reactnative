-- ============================================================================
-- 080: Fix Realtime Publication — Remove Views
--
-- BUG: The Supabase dashboard generates a bulk ALTER PUBLICATION that includes
-- ALL public relations (tables + views). PostgreSQL does not support adding
-- views to logical replication publications, causing:
--
--   ERROR 22023: cannot add relation "post_reaction_summary" to publication
--   DETAIL: This operation is not supported for views.
--
-- FIX: Drop all views from the publication (they can't be there anyway),
-- and ensure only actual tables are included. Views like post_reaction_summary,
-- admin_dashboard_kpis, domain_statistics, etc. never needed realtime —
-- their underlying tables already have it.
--
-- AFFECTED VIEWS (cannot be in supabase_realtime publication):
--   - post_reaction_summary      (aggregation of post_likes)
--   - admin_dashboard_kpis       (admin dashboard)
--   - admin_college_stats        (admin stats — old view, v2 is now a table)
--   - admin_domain_stats         (admin stats — old view, v2 is now a table)
--   - admin_user_growth          (admin dashboard)
--   - admin_engagement_metrics   (admin dashboard)
--   - admin_talent_edges         (admin dashboard)
--   - domain_statistics          (statistics view)
--   - profile_completion_stats   (statistics view)
--   - user_activity_summary      (statistics view)
--   - platform_stats             (statistics view)
-- ============================================================================

-- Step 1: Remove any views that might have been accidentally added to the
-- publication. PostgreSQL will error if we try to DROP a view that isn't
-- in the publication, so we use a safe DO block that catches exceptions.
DO $$
DECLARE
  v_view text;
  v_views text[] := ARRAY[
    'post_reaction_summary',
    'admin_dashboard_kpis',
    'admin_college_stats',
    'admin_domain_stats',
    'admin_user_growth',
    'admin_engagement_metrics',
    'admin_talent_edges',
    'domain_statistics',
    'profile_completion_stats',
    'user_activity_summary',
    'platform_stats'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH v_view IN ARRAY v_views LOOP
      BEGIN
        EXECUTE format(
          'ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.%I',
          v_view
        );
      EXCEPTION WHEN OTHERS THEN
        -- View wasn't in the publication (expected) — ignore
        NULL;
      END;
    END LOOP;
  END IF;
END $$;

-- Step 2: Convert post_reaction_summary from a VIEW to a MATERIALIZED TABLE
-- so that (a) it can participate in realtime if ever needed, and (b) the
-- Supabase dashboard doesn't choke when toggling realtime for other tables.
--
-- Actually: post_reaction_summary does NOT need realtime. The post_likes table
-- already has realtime, and the client computes reaction summaries from the
-- likes data. Keeping it as a view is fine — we just need to make sure the
-- dashboard doesn't try to add it.
--
-- The root cause is the Supabase dashboard's "Enable Realtime" toggle generating
-- a single ALTER PUBLICATION statement that includes ALL public schema objects.
-- This is a dashboard bug. Our migration-level publication statements are correct
-- (they only add tables, with EXCEPTION handlers).
--
-- The real fix from our side: ensure the publication is set to NOT include
-- all tables by default (FOR TABLE mode, not FOR ALL TABLES).
-- Supabase projects use FOR TABLE mode by default, so this is already correct.
-- The dashboard bug is that it includes view names in its generated SQL.
--
-- No schema changes needed. This migration serves as documentation and as a
-- safety net that removes any accidentally-added views from the publication.

-- Step 3: Verify the publication only contains tables (not views)
-- This is a diagnostic query — it won't fail, just logs.
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime';
  
  RAISE NOTICE 'supabase_realtime publication contains % table(s)', v_count;
END $$;
