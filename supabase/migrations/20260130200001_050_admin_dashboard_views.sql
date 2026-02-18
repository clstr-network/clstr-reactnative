-- ============================================================================
-- 050_admin_dashboard_views.sql - Admin Dashboard Analytics Views
-- Aggregated views for KPIs, analytics, and reports
-- ============================================================================

BEGIN;

-- ============================================================================
-- ADMIN DASHBOARD KPIs VIEW
-- Aggregated metrics for the overview dashboard
-- ============================================================================
CREATE OR REPLACE VIEW public.admin_dashboard_kpis AS
SELECT
  -- Total Users
  (SELECT COUNT(*) FROM public.profiles WHERE role != 'Club') AS total_users,
  
  -- Active Users (Last 7 Days)
  (SELECT COUNT(*) FROM public.profiles 
   WHERE updated_at > NOW() - INTERVAL '7 days' 
   AND role != 'Club') AS active_users_7d,
  
  -- Active Users (Last 30 Days)
  (SELECT COUNT(*) FROM public.profiles 
   WHERE updated_at > NOW() - INTERVAL '30 days' 
   AND role != 'Club') AS active_users_30d,
  
  -- Total Students
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'Student') AS total_students,
  
  -- Total Alumni
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'Alumni') AS total_alumni,
  
  -- Total Faculty
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'Faculty') AS total_faculty,
  
  -- Total Clubs
  (SELECT COUNT(*) FROM public.clubs) AS total_clubs,
  
  -- Total Verified Clubs
  (SELECT COUNT(*) FROM public.clubs WHERE is_verified = true) AS verified_clubs,
  
  -- Total Colleges (unique domains)
  (SELECT COUNT(DISTINCT college_domain) FROM public.profiles WHERE college_domain IS NOT NULL) AS total_colleges,
  
  -- Total Posts
  (SELECT COUNT(*) FROM public.posts) AS total_posts,
  
  -- Posts This Week
  (SELECT COUNT(*) FROM public.posts WHERE created_at > NOW() - INTERVAL '7 days') AS posts_this_week,
  
  -- Total Events
  (SELECT COUNT(*) FROM public.events) AS total_events,
  
  -- Upcoming Events
  (SELECT COUNT(*) FROM public.events WHERE event_date > CURRENT_DATE) AS upcoming_events,
  
  -- Total Projects
  (SELECT COUNT(*) FROM public.collab_projects) AS total_projects,
  
  -- Active Projects
  (SELECT COUNT(*) FROM public.collab_projects WHERE status = 'active') AS active_projects,
  
  -- Total Connections
  (SELECT COUNT(*) FROM public.connections WHERE status = 'accepted') AS total_connections,
  
  -- Total Recruiter Accounts
  (SELECT COUNT(*) FROM public.recruiter_accounts) AS total_recruiters,
  
  -- Active Recruiter Accounts
  (SELECT COUNT(*) FROM public.recruiter_accounts WHERE status = 'active') AS active_recruiters,
  
  -- Timestamp
  NOW() AS generated_at;

-- ============================================================================
-- COLLEGE STATISTICS VIEW
-- Per-college aggregated statistics
-- ============================================================================
CREATE OR REPLACE VIEW public.admin_college_stats AS
SELECT 
  p.college_domain,
  COUNT(DISTINCT p.id) AS total_users,
  COUNT(DISTINCT CASE WHEN p.role = 'Student' THEN p.id END) AS student_count,
  COUNT(DISTINCT CASE WHEN p.role = 'Alumni' THEN p.id END) AS alumni_count,
  COUNT(DISTINCT CASE WHEN p.role = 'Faculty' THEN p.id END) AS faculty_count,
  COUNT(DISTINCT c.id) AS club_count,
  COUNT(DISTINCT e.id) AS event_count,
  COUNT(DISTINCT po.id) AS post_count,
  COUNT(DISTINCT CASE WHEN p.updated_at > NOW() - INTERVAL '7 days' THEN p.id END) AS active_users_7d,
  MIN(p.created_at) AS first_user_at,
  MAX(p.created_at) AS latest_user_at
FROM public.profiles p
LEFT JOIN public.clubs c ON c.college_domain = p.college_domain
LEFT JOIN public.events e ON e.college_domain = p.college_domain
LEFT JOIN public.posts po ON po.college_domain = p.college_domain
WHERE p.college_domain IS NOT NULL
GROUP BY p.college_domain
ORDER BY total_users DESC;

-- ============================================================================
-- DOMAIN STATISTICS VIEW
-- Email domain analysis
-- ============================================================================
CREATE OR REPLACE VIEW public.admin_domain_stats AS
SELECT 
  p.domain,
  p.college_domain AS canonical_domain,
  COUNT(DISTINCT p.id) AS user_count,
  MIN(p.created_at) AS first_seen,
  MAX(p.created_at) AS last_seen,
  CASE 
    WHEN cda.domain IS NOT NULL THEN 'aliased'
    WHEN p.is_verified THEN 'verified'
    ELSE 'unknown'
  END AS status
FROM public.profiles p
LEFT JOIN public.college_domain_aliases cda ON cda.domain = p.domain
WHERE p.domain IS NOT NULL
GROUP BY p.domain, p.college_domain, cda.domain, p.is_verified
ORDER BY user_count DESC;

-- ============================================================================
-- USER GROWTH VIEW
-- Daily user signups for growth charts
-- ============================================================================
CREATE OR REPLACE VIEW public.admin_user_growth AS
SELECT 
  DATE(created_at) AS date,
  COUNT(*) AS signups,
  COUNT(CASE WHEN role = 'Student' THEN 1 END) AS student_signups,
  COUNT(CASE WHEN role = 'Alumni' THEN 1 END) AS alumni_signups,
  COUNT(CASE WHEN role = 'Faculty' THEN 1 END) AS faculty_signups
FROM public.profiles
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================================================
-- ENGAGEMENT METRICS VIEW
-- Feature usage and engagement statistics
-- ============================================================================
CREATE OR REPLACE VIEW public.admin_engagement_metrics AS
SELECT
  DATE(created_at) AS date,
  'posts' AS metric_type,
  COUNT(*) AS count
FROM public.posts
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
UNION ALL
SELECT
  DATE(created_at) AS date,
  'comments' AS metric_type,
  COUNT(*) AS count
FROM public.comments
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
UNION ALL
SELECT
  DATE(created_at) AS date,
  'connections' AS metric_type,
  COUNT(*) AS count
FROM public.connections
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
UNION ALL
SELECT
  DATE(created_at) AS date,
  'events' AS metric_type,
  COUNT(*) AS count
FROM public.events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC, metric_type;

-- ============================================================================
-- TALENT GRAPH EDGES VIEW
-- Relationships for talent graph visualization
-- ============================================================================
CREATE OR REPLACE VIEW public.admin_talent_edges AS
-- Mentorship relationships (using mentorship_requests table which has mentor_id and mentee_id)
SELECT 
  mr.mentor_id AS source_id,
  'user' AS source_type,
  mr.mentee_id AS target_id,
  'user' AS target_type,
  'mentorship' AS edge_type,
  1 AS weight
FROM public.mentorship_requests mr
WHERE mr.status = 'accepted'
UNION ALL
-- Club leadership
SELECT 
  cm.user_id AS source_id,
  'user' AS source_type,
  cm.club_id AS target_id,
  'club' AS target_type,
  'leadership' AS edge_type,
  CASE WHEN cm.role IN ('leader', 'president', 'admin') THEN 2 ELSE 1 END AS weight
FROM public.club_members cm
WHERE cm.status = 'active'
UNION ALL
-- Project collaboration
SELECT 
  ctm.user_id AS source_id,
  'user' AS source_type,
  ctm.project_id AS target_id,
  'project' AS target_type,
  'collaboration' AS edge_type,
  CASE WHEN ctm.is_owner THEN 2 ELSE 1 END AS weight
FROM public.collab_team_members ctm
WHERE ctm.status = 'active';

-- ============================================================================
-- GRANT ACCESS TO VIEWS (only for authenticated users who are admins)
-- ============================================================================
-- Note: RLS on views uses underlying table policies, but we restrict function access

CREATE OR REPLACE FUNCTION public.get_admin_kpis()
RETURNS TABLE (
  total_users bigint,
  active_users_7d bigint,
  active_users_30d bigint,
  total_students bigint,
  total_alumni bigint,
  total_faculty bigint,
  total_clubs bigint,
  verified_clubs bigint,
  total_colleges bigint,
  total_posts bigint,
  posts_this_week bigint,
  total_events bigint,
  upcoming_events bigint,
  total_projects bigint,
  active_projects bigint,
  total_connections bigint,
  total_recruiters bigint,
  active_recruiters bigint,
  generated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;
  
  RETURN QUERY SELECT * FROM public.admin_dashboard_kpis;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_college_stats()
RETURNS TABLE (
  college_domain text,
  total_users bigint,
  student_count bigint,
  alumni_count bigint,
  faculty_count bigint,
  club_count bigint,
  event_count bigint,
  post_count bigint,
  active_users_7d bigint,
  first_user_at timestamptz,
  latest_user_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;
  
  RETURN QUERY SELECT * FROM public.admin_college_stats;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_domain_stats()
RETURNS TABLE (
  domain text,
  canonical_domain text,
  user_count bigint,
  first_seen timestamptz,
  last_seen timestamptz,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;
  
  RETURN QUERY SELECT * FROM public.admin_domain_stats;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_user_growth(days_back integer DEFAULT 90)
RETURNS TABLE (
  date date,
  signups bigint,
  student_signups bigint,
  alumni_signups bigint,
  faculty_signups bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;
  
  RETURN QUERY 
  SELECT 
    DATE(p.created_at) AS date,
    COUNT(*)::bigint AS signups,
    COUNT(CASE WHEN p.role = 'Student' THEN 1 END)::bigint AS student_signups,
    COUNT(CASE WHEN p.role = 'Alumni' THEN 1 END)::bigint AS alumni_signups,
    COUNT(CASE WHEN p.role = 'Faculty' THEN 1 END)::bigint AS faculty_signups
  FROM public.profiles p
  WHERE p.created_at > NOW() - (days_back || ' days')::interval
  GROUP BY DATE(p.created_at)
  ORDER BY date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_users(
  p_role text DEFAULT NULL,
  p_college_domain text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  role text,
  college_domain text,
  graduation_year integer,
  is_verified boolean,
  created_at timestamptz,
  updated_at timestamptz,
  skills text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;
  
  RETURN QUERY 
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.role::text,
    p.college_domain,
    sp.graduation_year,
    p.is_verified,
    p.created_at,
    p.updated_at,
    ps.skills
  FROM public.profiles p
  LEFT JOIN public.student_profiles sp ON sp.user_id = p.id
  LEFT JOIN (
    SELECT user_id, array_agg(skill) AS skills
    FROM public.profile_skills
    GROUP BY user_id
  ) ps ON ps.user_id = p.id
  WHERE 
    (p_role IS NULL OR p.role::text = p_role)
    AND (p_college_domain IS NULL OR p.college_domain = p_college_domain)
    AND p.role != 'Club'
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_college_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_domain_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_user_growth(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_users(text, text, text, integer, integer) TO authenticated;

COMMIT;
