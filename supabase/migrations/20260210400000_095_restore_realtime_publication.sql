-- Migration 095: Restore supabase_realtime publication tables
--
-- Migration 094 accidentally emptied the publication. This migration re-adds
-- every table that should have realtime enabled (matching all prior migrations).
-- Views are excluded — they cannot be added to publications.
--
-- This is idempotent: duplicate_object exceptions are silently ignored.

BEGIN;

DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    -- 014: Core realtime
    'posts', 'comments', 'post_likes', 'notifications', 'messages', 'connections', 'event_registrations',
    -- 020: Jobs/profiles
    'profiles', 'jobs', 'saved_jobs', 'job_applications',
    -- 021: Post shares
    'post_shares',
    -- 025/030: Saved items
    'saved_items',
    -- 028: Comment likes
    'comment_likes',
    -- 031: Collab projects
    'collab_projects', 'collab_project_roles', 'collab_project_applications', 'collab_team_members', 'collab_project_updates',
    -- 032/033: EcoCampus
    'shared_items', 'item_requests', 'shared_item_intents', 'item_request_responses',
    -- 035: Clubs/events
    'events', 'clubs', 'club_members',
    -- 037: Hashtags
    'post_hashtags',
    -- 038: Job match / poll votes
    'job_match_scores', 'poll_votes',
    -- 041: Profile views
    'profile_views',
    -- 042: Push subscriptions
    'push_subscriptions',
    -- 043: Skill analysis
    'skill_analysis',
    -- 048: Role profiles
    'student_profiles', 'alumni_profiles', 'faculty_profiles', 'club_profiles',
    -- 049: Platform admins
    'platform_admins', 'system_alerts', 'recruiter_accounts',
    -- 051: Colleges/domains
    'colleges', 'college_domain_aliases',
    -- 052: Admin reports
    'admin_reports',
    -- 053: Admin college stats (table version)
    'admin_college_stats',
    -- 054: Admin dashboard tables
    'admin_dashboard_kpis', 'admin_domain_stats', 'admin_engagement_metrics',
    -- 055: Admin stats v2 tables + talent/user growth
    'admin_domain_stats_v2', 'admin_college_stats_v2', 'admin_talent_edges', 'admin_user_growth',
    -- 056: Statistics tables
    'domain_statistics', 'profile_completion_stats', 'user_activity_summary', 'platform_stats',
    -- 058: Event funnel analytics (table)
    'event_funnel_analytics',
    -- 059: Admin settings + activity logs
    'admin_settings', 'admin_activity_logs',
    -- 065: Team ups
    'team_ups', 'team_up_members', 'team_up_requests',
    -- 070: Reposts
    'reposts',
    -- 071: User settings
    'user_settings',
    -- 087: Alumni invites
    'alumni_invites',
    -- 092: AI system
    'ai_chat_sessions', 'ai_chat_messages',
    -- Other tables from the platform
    'verification_requests', 'support_tickets', 'role_change_history',
    'profile_skills', 'profile_projects', 'profile_experience', 'profile_education',
    'profile_certifications', 'profile_achievements', 'post_reports',
    'organization_profiles', 'notes', 'moderation_reports', 'moderation_actions',
    'mentorship_requests', 'mentorship_offers',
    'club_access_tokens', 'hidden_posts',
    'account_deletion_audit', 'admin_roles'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    BEGIN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
        v_table
      );
    EXCEPTION
      WHEN duplicate_object THEN NULL;  -- already present
      WHEN undefined_table THEN NULL;   -- table doesn't exist
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not add table % to publication: %', v_table, SQLERRM;
    END;
  END LOOP;
END $$;

-- Verify count
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime';

  RAISE NOTICE 'supabase_realtime now contains % table(s)', v_count;
END $$;

COMMIT;
