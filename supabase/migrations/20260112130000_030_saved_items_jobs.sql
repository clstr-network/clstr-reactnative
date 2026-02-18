-- Allow jobs to be saved via unified saved_items table and migrate legacy saved_jobs data
BEGIN;

-- Expand type constraint to include job bookmarks
ALTER TABLE public.saved_items
  DROP CONSTRAINT IF EXISTS saved_items_type_check;
ALTER TABLE public.saved_items
  ADD CONSTRAINT saved_items_type_check
    CHECK (type IN ('post', 'project', 'club', 'event', 'job'));

-- Backfill existing saved_jobs rows into saved_items as type 'job'
INSERT INTO public.saved_items (id, user_id, type, item_id, created_at)
SELECT
  COALESCE(id, gen_random_uuid()),
  user_id,
  'job' AS type,
  job_id AS item_id,
  created_at
FROM public.saved_jobs
ON CONFLICT (user_id, type, item_id) DO NOTHING;

-- Ensure realtime publication still tracks saved_items
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_items;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

COMMIT;
