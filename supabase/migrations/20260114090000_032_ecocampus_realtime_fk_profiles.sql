-- ============================================================================
-- 032_ecocampus_realtime_fk_profiles.sql
-- Make EcoCampus PostgREST joins work and enable realtime publications.
-- - Switch shared_items/item_requests user_id FKs to public.profiles
-- - Add tables to supabase_realtime publication (idempotent)
-- ============================================================================

BEGIN;

-- Ensure PostgREST can join shared_items.user_id -> profiles.id
ALTER TABLE public.shared_items
  DROP CONSTRAINT IF EXISTS shared_items_user_id_fkey;

ALTER TABLE public.shared_items
  ADD CONSTRAINT shared_items_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Ensure PostgREST can join item_requests.user_id -> profiles.id
ALTER TABLE public.item_requests
  DROP CONSTRAINT IF EXISTS item_requests_user_id_fkey;

ALTER TABLE public.item_requests
  ADD CONSTRAINT item_requests_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Enable realtime for EcoCampus tables (safe if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_items;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.item_requests;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
