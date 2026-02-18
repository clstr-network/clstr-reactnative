-- ============================================================================
-- Add missing club_type column to clubs table
-- ============================================================================

BEGIN;

ALTER TABLE IF EXISTS public.clubs
  ADD COLUMN IF NOT EXISTS club_type text;

COMMIT;
