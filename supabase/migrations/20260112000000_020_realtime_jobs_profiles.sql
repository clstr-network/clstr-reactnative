-- =========================================================================
-- 020_realtime_jobs_profiles.sql - Enable realtime for jobs & profiles
-- January 12, 2026
--
-- Ensures client-side Realtime subscriptions used by:
-- - Jobs / JobDetail (jobs, saved_jobs, job_applications)
-- - ProfileContext (profiles)
-- actually receive postgres_changes events.
--
-- NOTE: RLS still applies to replication; enabling publication does not bypass policies.
-- =========================================================================

BEGIN;

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_applications;

COMMIT;
