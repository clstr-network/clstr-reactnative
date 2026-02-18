-- ============================================================================
-- 071_user_settings_realtime.sql - Enable realtime for user_settings
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings;
  END IF;
END $$;

COMMIT;
