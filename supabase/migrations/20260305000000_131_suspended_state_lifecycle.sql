-- ============================================================================
-- 131: Suspended State — Unified Account Lifecycle
--
-- PROBLEM:
--   Migration 059's admin_set_user_status() stores suspension in role_data
--   JSONB, but migration 130's is_active_user() only checks account_status.
--   Result: admin-suspended users can STILL write data through all 15 tables
--   and their content remains visible. The two systems are disconnected.
--
-- FIX:
--   1. Extend account_status CHECK to include 'suspended'
--   2. Add suspension metadata columns (suspended_at, suspended_by,
--      suspension_reason) — not buried in JSONB
--   3. Rewrite admin_set_user_status() to set account_status = 'suspended'
--   4. New admin_lift_suspension() RPC for admin-only un-suspend
--   5. is_active_user() already returns false for non-'active' — no change
--   6. reactivate_own_account() already only allows from 'deactivated' — safe
--   7. hard_delete_expired_accounts() only targets 'deactivated' — safe
--
-- RESULT:
--   A suspended user gets the EXACT same RLS wall as a deactivated user:
--   - All writes blocked (15-table RESTRICTIVE policies)
--   - Content hidden from other users (10-table SELECT policies)
--   - But NO auto-deletion timer (unlike deactivation)
--   - User CANNOT self-reactivate (only admin can lift)
--
-- STATE MACHINE:
--   active ─── deactivate_own_account() ──→ deactivated (15-day timer)
--   active ─── admin_set_user_status()  ──→ suspended   (no timer)
--   deactivated ── reactivate_own_account() ──→ active   (user-initiated)
--   suspended ──── admin_lift_suspension()  ──→ active   (admin-only)
--   deactivated ── hard_delete_expired()    ──→ deleted   (cron)
--   suspended ──── (never auto-deleted, requires explicit admin action)
--
-- CRITICAL INVARIANT:
--   auth.uid() = id in profiles SELECT is NEVER guarded by account_status.
--   A suspended user can always read their own profile row to see the
--   suspension notice/reason.
-- ============================================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Extend CHECK constraint to include 'suspended'
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop the old 2-value constraint and add the 3-value one
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_status_check
  CHECK (account_status IN ('active', 'deactivated', 'suspended'));


-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Add suspension metadata columns
--
-- These are first-class columns, not JSONB blobs, because:
--   - They participate in RLS (indexed, typed, queryable)
--   - Audit trail requires them to be non-lossy
--   - admin_roles FK on suspended_by enables governance tracking
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_by UUID;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Index for admin dashboards: "show me all suspended users"
CREATE INDEX IF NOT EXISTS idx_profiles_suspended_at
  ON public.profiles(suspended_at)
  WHERE suspended_at IS NOT NULL;


-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Rewrite admin_set_user_status() — use account_status, not JSONB
--
-- Now sets account_status = 'suspended' so is_active_user() returns false,
-- which activates the entire RLS wall from migration 130 automatically.
--
-- Also migrates any existing role_data suspension flags out of JSONB for
-- consistency with the new column-based approach.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_set_user_status(
  p_user_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  IF p_status NOT IN ('active', 'suspended', 'pending') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  -- Verify target user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF p_status = 'suspended' THEN
    UPDATE public.profiles
    SET
      account_status   = 'suspended',
      suspended_at     = now(),
      suspended_by     = (SELECT auth.uid()),
      suspension_reason = p_reason,
      -- Clear any deactivation timer (admin action overrides voluntary deactivation)
      scheduled_deletion_at = NULL,
      -- Clean legacy JSONB flags
      role_data = (COALESCE(role_data, '{}'::jsonb)
                    - 'suspended' - 'suspended_at' - 'suspended_reason'),
      updated_at = now()
    WHERE id = p_user_id;

  ELSIF p_status = 'active' THEN
    UPDATE public.profiles
    SET
      account_status    = 'active',
      is_verified       = true,
      -- Clear suspension metadata
      suspended_at      = NULL,
      suspended_by      = NULL,
      suspension_reason = NULL,
      -- Clear any deactivation timer
      scheduled_deletion_at = NULL,
      -- Clean legacy JSONB flags
      role_data = (COALESCE(role_data, '{}'::jsonb)
                    - 'suspended' - 'suspended_at' - 'suspended_reason'),
      updated_at = now()
    WHERE id = p_user_id;

  ELSE -- 'pending'
    UPDATE public.profiles
    SET
      is_verified       = false,
      -- Clear suspension metadata
      suspended_at      = NULL,
      suspended_by      = NULL,
      suspension_reason = NULL,
      -- Clean legacy JSONB flags
      role_data = (COALESCE(role_data, '{}'::jsonb)
                    - 'suspended' - 'suspended_at' - 'suspended_reason'),
      updated_at = now()
    WHERE id = p_user_id;
  END IF;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- 4. admin_lift_suspension() — dedicated RPC for governance clarity
--
-- Separate from admin_set_user_status() because:
--   - Audit trail distinguishes "lifted suspension" from "set active"
--   - Can enforce additional checks (e.g., require reason for lifting)
--   - Maps cleanly to admin UI actions
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.admin_lift_suspension(
  p_user_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  -- Only lift from suspended state — not from deactivated
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND account_status = 'suspended'
  ) THEN
    RAISE EXCEPTION 'User is not suspended';
  END IF;

  UPDATE public.profiles
  SET
    account_status    = 'active',
    suspended_at      = NULL,
    suspended_by      = NULL,
    suspension_reason = NULL,
    updated_at        = now()
  WHERE id = p_user_id
    AND account_status = 'suspended';

  -- Write audit trail
  INSERT INTO public.account_deletion_audit (user_id, action, deleted_at, source)
  VALUES (
    p_user_id,
    'suspension_lifted',
    now(),
    'admin:' || COALESCE((SELECT auth.uid())::text, 'unknown')
      || CASE WHEN p_reason IS NOT NULL THEN ' reason:' || p_reason ELSE '' END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_lift_suspension(uuid, text) TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Audit trail for suspension actions
--
-- Write audit row when admin suspends a user, so the trail survives
-- even if the profile is eventually deleted.
-- ══════════════════════════════════════════════════════════════════════════════

-- Trigger: auto-write audit on suspension
CREATE OR REPLACE FUNCTION public.trg_audit_suspension()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when transitioning INTO suspended
  IF NEW.account_status = 'suspended' AND
     (OLD.account_status IS DISTINCT FROM 'suspended') THEN
    INSERT INTO public.account_deletion_audit (user_id, email, action, deactivated_at, source)
    VALUES (
      NEW.id,
      NEW.email,
      'suspended',
      now(),
      'admin:' || COALESCE(NEW.suspended_by::text, 'unknown')
        || CASE WHEN NEW.suspension_reason IS NOT NULL
                THEN ' reason:' || NEW.suspension_reason
                ELSE '' END
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_suspension_trigger ON public.profiles;
CREATE TRIGGER audit_suspension_trigger
  AFTER UPDATE OF account_status ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_audit_suspension();


-- ══════════════════════════════════════════════════════════════════════════════
-- 6. Backfill: migrate existing JSONB-suspended users to account_status
--
-- Any user who was suspended via the old migration 059 pattern
-- (role_data->>'suspended' = 'true') but still has account_status = 'active'
-- gets corrected now.
-- ══════════════════════════════════════════════════════════════════════════════

UPDATE public.profiles
SET
  account_status    = 'suspended',
  suspended_at      = (role_data->>'suspended_at')::timestamptz,
  suspension_reason = role_data->>'suspended_reason',
  role_data         = role_data - 'suspended' - 'suspended_at' - 'suspended_reason'
WHERE account_status = 'active'
  AND role_data->>'suspended' = 'true';


-- ══════════════════════════════════════════════════════════════════════════════
-- 7. Extend account_deletion_audit.action CHECK (if one exists)
-- ══════════════════════════════════════════════════════════════════════════════

-- No CHECK on action column (it's just TEXT) — but document valid values:
-- Valid actions: 'deleted', 'hard_deleted', 'deactivated', 'reactivated',
--               'suspended', 'suspension_lifted'


-- ══════════════════════════════════════════════════════════════════════════════
-- DOCUMENTATION
-- ══════════════════════════════════════════════════════════════════════════════
--
-- WHAT CHANGED:
--   profiles.account_status CHECK: ('active','deactivated') → ('active','deactivated','suspended')
--   profiles: added suspended_at, suspended_by, suspension_reason columns
--   admin_set_user_status(): now sets account_status='suspended' (not JSONB)
--   New RPC: admin_lift_suspension() — admin-only un-suspend
--   New trigger: audit_suspension_trigger — auto-write audit on suspension
--   Backfill: migrated JSONB-suspended users to account_status
--
-- WHY THIS WORKS WITH ZERO RLS CHANGES:
--   is_active_user() returns: account_status = 'active'
--   'suspended' ≠ 'active' → function returns false
--   → All 15 RESTRICTIVE write-blocking policies from migration 130 fire
--   → All 10 SELECT-hiding policies from migration 130 fire
--   → The entire RLS wall activates for suspended users automatically
--
-- STATE TRANSITIONS:
--   active → deactivated:  deactivate_own_account()        [user-initiated]
--   active → suspended:    admin_set_user_status()          [admin-initiated]
--   deactivated → active:  reactivate_own_account()         [user-initiated, 15-day window]
--   suspended → active:    admin_lift_suspension()           [admin-only]
--   deactivated → deleted: hard_delete_expired_accounts()   [cron, 15-day expiry]
--   suspended → NEVER auto-deleted                          [requires explicit admin action]
--
-- GOVERNANCE USE CASES:
--   Admin forcible suspension:     admin_set_user_status(uid, 'suspended', 'TOS violation')
--   Legal hold / account freeze:   admin_set_user_status(uid, 'suspended', 'Legal hold #12345')
--   University temporary disable:  admin_set_user_status(uid, 'suspended', 'University request')
--   Lift after review:             admin_lift_suspension(uid, 'Review completed, no violation')
--

COMMIT;
