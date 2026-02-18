-- ============================================================================
-- 023_messages_fk_profiles.sql - Ensure messages join to profiles
-- Switch message sender/receiver FKs to public.profiles to enable PostgREST joins
-- ============================================================================

BEGIN;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_receiver_id_fkey
    FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

COMMIT;
