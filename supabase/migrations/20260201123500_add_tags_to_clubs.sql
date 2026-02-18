-- ============================================================================
-- 057_add_tags_to_clubs.sql - Ensure clubs.tags exists
-- U-Hub Platform - February 1, 2026
-- ============================================================================

BEGIN;

ALTER TABLE IF EXISTS public.clubs
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];

COMMIT;
