-- ============================================================================
-- 106: Fix account_deletion_audit schema
--
-- The handle_user_deletion trigger (016, updated in 083) inserts into
-- columns deletion_reason and deleted_at, but those columns were never
-- added to the table (created in 002 with: id, user_id, email, source,
-- created_at). The trigger silently failed due to its EXCEPTION handler,
-- causing audit records to be written only by the edge function, not by
-- the DB-level trigger.
--
-- This migration adds the missing columns so the trigger works correctly
-- and both the edge function and the trigger produce valid audit rows.
-- ============================================================================

BEGIN;

-- Add missing columns (idempotent via IF NOT EXISTS style with DO blocks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'account_deletion_audit'
      AND column_name = 'deletion_reason'
  ) THEN
    ALTER TABLE public.account_deletion_audit
      ADD COLUMN deletion_reason text DEFAULT 'User account deleted';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'account_deletion_audit'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.account_deletion_audit
      ADD COLUMN deleted_at timestamptz DEFAULT now();
  END IF;
END;
$$;

-- Back-fill existing rows that were created by the edge function
-- (they have source but no deletion_reason / deleted_at).
UPDATE public.account_deletion_audit
SET deletion_reason = COALESCE(deletion_reason, 'User account deleted (edge fn)'),
    deleted_at      = COALESCE(deleted_at, created_at)
WHERE deletion_reason IS NULL;

COMMIT;
