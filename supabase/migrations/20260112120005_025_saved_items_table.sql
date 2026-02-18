-- Saved items table, policies, and realtime publication
BEGIN;

CREATE TABLE IF NOT EXISTS public.saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('post', 'project', 'club', 'event')),
  item_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, type, item_id)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS saved_items_user_id_idx ON public.saved_items(user_id);
CREATE INDEX IF NOT EXISTS saved_items_type_idx ON public.saved_items(type);
CREATE INDEX IF NOT EXISTS saved_items_item_id_idx ON public.saved_items(item_id);
CREATE INDEX IF NOT EXISTS saved_items_created_at_idx ON public.saved_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_items_user ON public.saved_items (user_id, type, created_at DESC);

-- RLS policies
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own saved items" ON public.saved_items;
CREATE POLICY "Users can view their own saved items"
  ON public.saved_items
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can save items" ON public.saved_items;
CREATE POLICY "Users can save items"
  ON public.saved_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their saved items" ON public.saved_items;
CREATE POLICY "Users can remove their saved items"
  ON public.saved_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- Realtime publication
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
