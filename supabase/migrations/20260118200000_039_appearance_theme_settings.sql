-- ============================================================================
-- APPEARANCE / THEME SETTINGS
-- Add theme_mode column to user_settings for persisted theme preference
-- ============================================================================

BEGIN;

-- 1) Add theme_mode column with CHECK constraint
-- Values: 'light' | 'dark' | 'system' (default)
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS theme_mode text DEFAULT 'system';

-- Add constraint only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_settings_theme_mode_check'
  ) THEN
    ALTER TABLE public.user_settings
      ADD CONSTRAINT user_settings_theme_mode_check
      CHECK (theme_mode IN ('light', 'dark', 'system'));
  END IF;
END $$;

-- 2) Create index for potential theme-based queries
CREATE INDEX IF NOT EXISTS idx_user_settings_theme_mode
  ON public.user_settings(theme_mode);

-- 3) Backfill existing rows with default 'system'
UPDATE public.user_settings
  SET theme_mode = 'system'
  WHERE theme_mode IS NULL;

-- 4) Add NOT NULL constraint after backfill
ALTER TABLE public.user_settings
  ALTER COLUMN theme_mode SET NOT NULL;

COMMIT;
