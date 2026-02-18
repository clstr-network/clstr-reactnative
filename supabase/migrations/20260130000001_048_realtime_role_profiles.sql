-- =========================================================================
-- 048_realtime_role_profiles.sql - Enable realtime for role-specific tables
-- January 30, 2026
--
-- Ensures client-side subscriptions for role-specific profiles receive
-- postgres_changes events.
-- =========================================================================

BEGIN;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime'
			AND schemaname = 'public'
			AND tablename = 'student_profiles'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE public.student_profiles;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime'
			AND schemaname = 'public'
			AND tablename = 'alumni_profiles'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE public.alumni_profiles;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime'
			AND schemaname = 'public'
			AND tablename = 'faculty_profiles'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE public.faculty_profiles;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime'
			AND schemaname = 'public'
			AND tablename = 'club_profiles'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE public.club_profiles;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime'
			AND schemaname = 'public'
			AND tablename = 'clubs'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE public.clubs;
	END IF;
END $$;

COMMIT;
