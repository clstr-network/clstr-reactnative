BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'comment_likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;
  END IF;
END $$;

COMMIT;
