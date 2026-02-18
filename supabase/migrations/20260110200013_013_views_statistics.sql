-- ============================================================================
-- 013_views_statistics.sql - Views and Statistics
-- U-Hub Platform Database Baseline
-- ============================================================================

BEGIN;

-- ============================================================================
-- DOMAIN STATISTICS VIEW
-- Analytics view for email domain verification statistics
-- ============================================================================
DROP VIEW IF EXISTS public.domain_statistics CASCADE;
CREATE OR REPLACE VIEW public.domain_statistics AS
SELECT 
  LOWER(SUBSTRING(p.email FROM '@(.+)$')) AS domain,
  COUNT(*) AS user_count,
  COUNT(*) FILTER (WHERE p.is_verified = true) AS verified_count,
  COUNT(*) FILTER (WHERE p.role = 'Student') AS student_count,
  COUNT(*) FILTER (WHERE p.role = 'Alumni') AS alumni_count,
  COUNT(*) FILTER (WHERE p.role = 'Faculty') AS faculty_count,
  COUNT(*) FILTER (WHERE p.role = 'Organization') AS industry_count,
  MIN(p.created_at) AS first_user_at,
  MAX(p.created_at) AS last_user_at
FROM public.profiles p
WHERE p.email IS NOT NULL
GROUP BY LOWER(SUBSTRING(p.email FROM '@(.+)$'))
ORDER BY user_count DESC;

-- ============================================================================
-- PROFILE COMPLETION STATS VIEW
-- ============================================================================
DROP VIEW IF EXISTS public.profile_completion_stats CASCADE;
CREATE OR REPLACE VIEW public.profile_completion_stats AS
SELECT 
  p.id,
  p.full_name,
  p.role,
  p.onboarding_complete,
  CASE
    WHEN p.full_name IS NOT NULL THEN 10 ELSE 0
  END +
  CASE
    WHEN p.avatar_url IS NOT NULL THEN 15 ELSE 0
  END +
  CASE
    WHEN p.headline IS NOT NULL THEN 10 ELSE 0
  END +
  CASE
    WHEN p.bio IS NOT NULL THEN 15 ELSE 0
  END +
  CASE
    WHEN p.interests IS NOT NULL AND array_length(p.interests, 1) > 0 THEN 15 ELSE 0
  END +
  CASE
    WHEN p.university IS NOT NULL THEN 10 ELSE 0
  END +
  CASE
    WHEN p.location IS NOT NULL THEN 5 ELSE 0
  END +
  CASE
    WHEN p.social_links IS NOT NULL AND (p.social_links->>'linkedin') IS NOT NULL THEN 5 ELSE 0
  END +
  CASE
    WHEN p.social_links IS NOT NULL AND (p.social_links->>'github') IS NOT NULL THEN 5 ELSE 0
  END +
  CASE
    WHEN p.social_links IS NOT NULL AND (p.social_links->>'website') IS NOT NULL THEN 5 ELSE 0
  END +
  CASE
    WHEN p.major IS NOT NULL THEN 5 ELSE 0
  END AS completion_percentage
FROM public.profiles p;

-- ============================================================================
-- USER ACTIVITY SUMMARY VIEW
-- ============================================================================
DROP VIEW IF EXISTS public.user_activity_summary CASCADE;
CREATE OR REPLACE VIEW public.user_activity_summary AS
SELECT 
  p.id AS user_id,
  p.full_name,
  (SELECT COUNT(*) FROM public.posts WHERE user_id = p.id) AS posts_count,
  (SELECT COUNT(*) FROM public.comments WHERE user_id = p.id) AS comments_count,
  (SELECT COUNT(*) FROM public.post_likes WHERE user_id = p.id) AS likes_given,
  (SELECT COUNT(*) FROM public.post_likes l JOIN public.posts po ON l.post_id = po.id WHERE po.user_id = p.id) AS likes_received,
  (SELECT COUNT(*) FROM public.connections WHERE (requester_id = p.id OR receiver_id = p.id) AND status = 'accepted') AS connections_count,
  (SELECT COUNT(*) FROM public.event_registrations WHERE user_id = p.id) AS events_registered,
  (SELECT COUNT(*) FROM public.job_applications WHERE user_id = p.id) AS job_applications,
  (SELECT COUNT(*) FROM public.collab_team_members WHERE user_id = p.id) AS projects_joined,
  p.last_seen AS last_active_at
FROM public.profiles p;

-- ============================================================================
-- PLATFORM STATS VIEW (for admin dashboard)
-- ============================================================================
DROP VIEW IF EXISTS public.platform_stats CASCADE;
CREATE OR REPLACE VIEW public.platform_stats AS
SELECT 
  (SELECT COUNT(*) FROM public.profiles) AS total_users,
  (SELECT COUNT(*) FROM public.profiles WHERE is_verified = true) AS verified_users,
  (SELECT COUNT(*) FROM public.profiles WHERE created_at > NOW() - INTERVAL '7 days') AS new_users_last_week,
  (SELECT COUNT(*) FROM public.profiles WHERE last_seen > NOW() - INTERVAL '24 hours') AS active_users_24h,
  (SELECT COUNT(*) FROM public.posts) AS total_posts,
  (SELECT COUNT(*) FROM public.posts WHERE created_at > NOW() - INTERVAL '24 hours') AS posts_last_24h,
  (SELECT COUNT(*) FROM public.events WHERE event_date > NOW()) AS upcoming_events,
  (SELECT COUNT(*) FROM public.jobs WHERE is_active = true) AS active_jobs,
  (SELECT COUNT(*) FROM public.collab_projects WHERE status = 'active') AS active_projects,
  (SELECT COUNT(*) FROM public.connections WHERE status = 'accepted') AS total_connections,
  (SELECT COUNT(*) FROM public.messages) AS total_messages;

-- ============================================================================
-- GRANT VIEW ACCESS
-- ============================================================================
GRANT SELECT ON public.domain_statistics TO authenticated;
GRANT SELECT ON public.profile_completion_stats TO authenticated;
GRANT SELECT ON public.user_activity_summary TO authenticated;
GRANT SELECT ON public.platform_stats TO authenticated;

COMMIT;
