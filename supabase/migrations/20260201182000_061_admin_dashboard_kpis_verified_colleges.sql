-- ============================================================================
-- 061_admin_dashboard_kpis_verified_colleges.sql
-- Add verified_colleges to admin_dashboard_kpis and refresh logic
-- ============================================================================

BEGIN;

ALTER TABLE public.admin_dashboard_kpis
  ADD COLUMN IF NOT EXISTS verified_colleges bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.refresh_admin_dashboard_kpis()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.admin_dashboard_kpis (
    id,
    total_users,
    active_users_7d,
    active_users_30d,
    total_students,
    total_alumni,
    total_faculty,
    total_clubs,
    verified_clubs,
    total_colleges,
    verified_colleges,
    total_posts,
    posts_this_week,
    total_events,
    upcoming_events,
    total_projects,
    active_projects,
    total_connections,
    total_recruiters,
    active_recruiters,
    generated_at
  )
  SELECT
    1,
    (SELECT COUNT(*) FROM public.profiles WHERE role != 'Club'),
    (SELECT COUNT(*) FROM public.profiles WHERE updated_at > NOW() - INTERVAL '7 days' AND role != 'Club'),
    (SELECT COUNT(*) FROM public.profiles WHERE updated_at > NOW() - INTERVAL '30 days' AND role != 'Club'),
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'Student'),
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'Alumni'),
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'Faculty'),
    (SELECT COUNT(*) FROM public.clubs),
    (SELECT COUNT(*) FROM public.clubs WHERE is_verified = true),
    (SELECT COUNT(DISTINCT college_domain) FROM public.profiles WHERE college_domain IS NOT NULL),
    (SELECT COUNT(*) FROM public.colleges WHERE status = 'verified'),
    (SELECT COUNT(*) FROM public.posts),
    (SELECT COUNT(*) FROM public.posts WHERE created_at > NOW() - INTERVAL '7 days'),
    (SELECT COUNT(*) FROM public.events),
    (SELECT COUNT(*) FROM public.events WHERE event_date > CURRENT_DATE),
    (SELECT COUNT(*) FROM public.collab_projects),
    (SELECT COUNT(*) FROM public.collab_projects WHERE status = 'active'),
    (SELECT COUNT(*) FROM public.connections WHERE status = 'accepted'),
    (SELECT COUNT(*) FROM public.recruiter_accounts),
    (SELECT COUNT(*) FROM public.recruiter_accounts WHERE status = 'active'),
    NOW()
  ON CONFLICT (id) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    active_users_7d = EXCLUDED.active_users_7d,
    active_users_30d = EXCLUDED.active_users_30d,
    total_students = EXCLUDED.total_students,
    total_alumni = EXCLUDED.total_alumni,
    total_faculty = EXCLUDED.total_faculty,
    total_clubs = EXCLUDED.total_clubs,
    verified_clubs = EXCLUDED.verified_clubs,
    total_colleges = EXCLUDED.total_colleges,
    verified_colleges = EXCLUDED.verified_colleges,
    total_posts = EXCLUDED.total_posts,
    posts_this_week = EXCLUDED.posts_this_week,
    total_events = EXCLUDED.total_events,
    upcoming_events = EXCLUDED.upcoming_events,
    total_projects = EXCLUDED.total_projects,
    active_projects = EXCLUDED.active_projects,
    total_connections = EXCLUDED.total_connections,
    total_recruiters = EXCLUDED.total_recruiters,
    active_recruiters = EXCLUDED.active_recruiters,
    generated_at = EXCLUDED.generated_at;
END;
$$;

SELECT public.refresh_admin_dashboard_kpis();

COMMIT;
