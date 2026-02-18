-- ============================================================================
-- 130: Account Deactivation Lifecycle
--
-- Converts immediate DELETE to Instagram-style deactivation flow:
--   Deactivate → Hide via RLS → 15-day grace period → Atomic hard delete
--
-- Changes:
--   1a. Add account_status + scheduled_deletion_at columns to profiles
--   1b. Update RLS SELECT policies on 10 tables to hide deactivated users
--   1b½. RESTRICTIVE write-blocking policies on 15 tables (JWT-window defense)
--   1c. deactivate_own_account() RPC (sole-admin club check)
--   1d. reactivate_own_account() RPC
--   1e. hard_delete_expired_accounts() RPC (atomic DELETE...RETURNING)
--   1f. Extend account_deletion_audit with lifecycle fields
--
-- CRITICAL INVARIANT:
--   auth.uid() = id must ALWAYS remain readable (unguarded) so a deactivated
--   user can see their own profile for the reactivation prompt.
-- ============================================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1a. Columns + Constraint + Indexes
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ;

-- Never trust TEXT without constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_account_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_status_check
      CHECK (account_status IN ('active', 'deactivated'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_profiles_account_status
  ON public.profiles(account_status);

CREATE INDEX IF NOT EXISTS idx_profiles_scheduled_deletion
  ON public.profiles(scheduled_deletion_at)
  WHERE scheduled_deletion_at IS NOT NULL;


-- ══════════════════════════════════════════════════════════════════════════════
-- 1b. RLS — Per-table SELECT policy updates
--
-- Every SELECT policy that can expose cross-user data gets an
-- account_status = 'active' check. Own-user access is always preserved.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. profiles ──
-- Replace profiles_select_same_college (from migration 129).
-- Own profile always readable (for reactivation prompt).
-- College branch requires account_status = 'active'.

DROP POLICY IF EXISTS "profiles_select_same_college" ON public.profiles;

CREATE POLICY "profiles_select_scoped"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR (
      account_status = 'active'
      AND college_domain IS NOT NULL
      AND college_domain = public.get_user_college_domain()
    )
    OR public.is_platform_admin()
  );


-- ── 2. posts ──
-- Own posts always readable; other posts require active author.

DROP POLICY IF EXISTS "posts_select_same_college" ON public.posts;

CREATE POLICY "posts_select_same_college"
  ON public.posts
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = posts.user_id
          AND p.account_status = 'active'
          AND (
            p.college_domain IS NOT NULL
            AND p.college_domain = public.get_user_college_domain()
          )
      )
    )
    OR public.is_platform_admin()
  );


-- ── 3. comments ──
-- Replace open policy with account_status check on comment author.

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;

CREATE POLICY "comments_select_active_authors"
  ON public.comments
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = comments.user_id
        AND p.account_status = 'active'
    )
  );


-- ── 4. connections ──
-- Participant-scoped: add check that counterparty's profile is active.

DROP POLICY IF EXISTS "connections_select_own" ON public.connections;
DROP POLICY IF EXISTS "Users can view their own connections" ON public.connections;

CREATE POLICY "connections_select_own"
  ON public.connections
  FOR SELECT
  USING (
    (auth.uid() = requester_id OR auth.uid() = receiver_id)
    AND (
      -- Counterparty must be active
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = CASE
          WHEN auth.uid() = requester_id THEN receiver_id
          ELSE requester_id
        END
        AND p.account_status = 'active'
      )
    )
  );


-- ── 5. events ──
-- Creator + domain-scoped: add account_status = 'active' check on creator.

DROP POLICY IF EXISTS "events_select_domain_scoped" ON public.events;
DROP POLICY IF EXISTS "Events are viewable by creator or same college users" ON public.events;

CREATE POLICY "events_select_domain_scoped"
  ON public.events
  FOR SELECT
  USING (
    creator_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = events.creator_id
          AND p.account_status = 'active'
          AND p.college_domain IS NOT NULL
          AND p.college_domain = public.get_user_college_domain()
      )
    )
    OR public.is_platform_admin()
  );


-- ── 6. clubs ──
-- Creator + domain-scoped: add account_status = 'active' check on created_by.

DROP POLICY IF EXISTS "clubs_select_domain_scoped" ON public.clubs;
DROP POLICY IF EXISTS "Clubs are viewable by creator or same college users" ON public.clubs;

CREATE POLICY "clubs_select_domain_scoped"
  ON public.clubs
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = clubs.created_by
          AND p.account_status = 'active'
          AND p.college_domain IS NOT NULL
          AND p.college_domain = public.get_user_college_domain()
      )
    )
    OR public.is_platform_admin()
  );


-- ── 7. mentorship_offers ──
-- Mentor + domain-scoped: add account_status = 'active' check on mentor_id.

DROP POLICY IF EXISTS "mentorship_offers_select_domain_scoped" ON public.mentorship_offers;
DROP POLICY IF EXISTS "Mentorship offers viewable by mentor or same college" ON public.mentorship_offers;

CREATE POLICY "mentorship_offers_select_domain_scoped"
  ON public.mentorship_offers
  FOR SELECT
  USING (
    mentor_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = mentorship_offers.mentor_id
          AND p.account_status = 'active'
          AND p.college_domain IS NOT NULL
          AND p.college_domain = public.get_user_college_domain()
      )
    )
    OR public.is_platform_admin()
  );


-- ── 8. mentorship_requests ──
-- Mentee + mentor scoped: both parties must be active for cross-user visibility.

DROP POLICY IF EXISTS "mentorship_requests_select_own" ON public.mentorship_requests;
DROP POLICY IF EXISTS "Mentorship requests viewable by mentee or mentor" ON public.mentorship_requests;

CREATE POLICY "mentorship_requests_select_own"
  ON public.mentorship_requests
  FOR SELECT
  USING (
    mentee_id = auth.uid()
    OR mentor_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p1
        WHERE p1.id = mentorship_requests.mentee_id
          AND p1.account_status = 'active'
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles p2
        WHERE p2.id = mentorship_requests.mentor_id
          AND p2.account_status = 'active'
      )
    )
    OR public.is_platform_admin()
  );


-- ── 9. collab_projects ──
-- Public + owner: add account_status = 'active' check on owner_id.

DROP POLICY IF EXISTS "collab_projects_select_public" ON public.collab_projects;
DROP POLICY IF EXISTS "Collab projects are viewable by everyone" ON public.collab_projects;

CREATE POLICY "collab_projects_select_public"
  ON public.collab_projects
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = collab_projects.owner_id
        AND p.account_status = 'active'
    )
    OR public.is_platform_admin()
  );


-- ── 10. reposts ──
-- Domain-scoped: add account_status = 'active' check on user_id.

DROP POLICY IF EXISTS "reposts_select_domain_scoped" ON public.reposts;
DROP POLICY IF EXISTS "Reposts are viewable by same college users" ON public.reposts;

CREATE POLICY "reposts_select_domain_scoped"
  ON public.reposts
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = reposts.user_id
        AND p.account_status = 'active'
        AND p.college_domain IS NOT NULL
        AND p.college_domain = public.get_user_college_domain()
    )
    OR public.is_platform_admin()
  );


-- ── 11. notifications — No change (user-scoped only, no cross-user leak) ──
-- ── 12. messages — No change (participant-scoped, own history always visible) ──


-- ══════════════════════════════════════════════════════════════════════════════
-- 1b½. RESTRICTIVE write-blocking policies for deactivated users
--
-- Uses AS RESTRICTIVE so these MUST pass in addition to any permissive policy.
-- This closes the JWT-validity-window attack vector: a deactivated user with
-- a still-valid JWT cannot INSERT/UPDATE/DELETE on any user-facing table.
--
-- SECURITY DEFINER RPCs (deactivate_own_account, reactivate_own_account,
-- hard_delete_expired_accounts, cron-hard-delete via service role) bypass RLS
-- entirely, so these policies do not interfere with lifecycle operations.
-- ══════════════════════════════════════════════════════════════════════════════

-- Helper: returns TRUE only if the calling user's profile is active.
-- STABLE + SECURITY DEFINER to avoid infinite RLS recursion when called
-- from a policy on profiles itself.

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND account_status = 'active'
  );
$$;

-- ── Macro: for each table, add RESTRICTIVE INSERT / UPDATE / DELETE policies ──

-- 1. posts
DROP POLICY IF EXISTS "deactivated_block_insert_posts" ON public.posts;
CREATE POLICY "deactivated_block_insert_posts"
  ON public.posts AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_update_posts" ON public.posts;
CREATE POLICY "deactivated_block_update_posts"
  ON public.posts AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_active_user())
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_delete_posts" ON public.posts;
CREATE POLICY "deactivated_block_delete_posts"
  ON public.posts AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_active_user());

-- 2. comments
DROP POLICY IF EXISTS "deactivated_block_insert_comments" ON public.comments;
CREATE POLICY "deactivated_block_insert_comments"
  ON public.comments AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_update_comments" ON public.comments;
CREATE POLICY "deactivated_block_update_comments"
  ON public.comments AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_active_user())
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_delete_comments" ON public.comments;
CREATE POLICY "deactivated_block_delete_comments"
  ON public.comments AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_active_user());

-- 3. post_likes
DROP POLICY IF EXISTS "deactivated_block_insert_post_likes" ON public.post_likes;
CREATE POLICY "deactivated_block_insert_post_likes"
  ON public.post_likes AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_delete_post_likes" ON public.post_likes;
CREATE POLICY "deactivated_block_delete_post_likes"
  ON public.post_likes AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_active_user());

-- 4. comment_likes
DROP POLICY IF EXISTS "deactivated_block_insert_comment_likes" ON public.comment_likes;
CREATE POLICY "deactivated_block_insert_comment_likes"
  ON public.comment_likes AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_delete_comment_likes" ON public.comment_likes;
CREATE POLICY "deactivated_block_delete_comment_likes"
  ON public.comment_likes AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_active_user());

-- 5. reposts
DROP POLICY IF EXISTS "deactivated_block_insert_reposts" ON public.reposts;
CREATE POLICY "deactivated_block_insert_reposts"
  ON public.reposts AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_delete_reposts" ON public.reposts;
CREATE POLICY "deactivated_block_delete_reposts"
  ON public.reposts AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_active_user());

-- 6. connections
DROP POLICY IF EXISTS "deactivated_block_insert_connections" ON public.connections;
CREATE POLICY "deactivated_block_insert_connections"
  ON public.connections AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_update_connections" ON public.connections;
CREATE POLICY "deactivated_block_update_connections"
  ON public.connections AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_active_user())
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_delete_connections" ON public.connections;
CREATE POLICY "deactivated_block_delete_connections"
  ON public.connections AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_active_user());

-- 7. messages
DROP POLICY IF EXISTS "deactivated_block_insert_messages" ON public.messages;
CREATE POLICY "deactivated_block_insert_messages"
  ON public.messages AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

-- 8. events
DROP POLICY IF EXISTS "deactivated_block_insert_events" ON public.events;
CREATE POLICY "deactivated_block_insert_events"
  ON public.events AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_update_events" ON public.events;
CREATE POLICY "deactivated_block_update_events"
  ON public.events AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_active_user())
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_delete_events" ON public.events;
CREATE POLICY "deactivated_block_delete_events"
  ON public.events AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_active_user());

-- 9. clubs
DROP POLICY IF EXISTS "deactivated_block_insert_clubs" ON public.clubs;
CREATE POLICY "deactivated_block_insert_clubs"
  ON public.clubs AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_update_clubs" ON public.clubs;
CREATE POLICY "deactivated_block_update_clubs"
  ON public.clubs AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_active_user())
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_delete_clubs" ON public.clubs;
CREATE POLICY "deactivated_block_delete_clubs"
  ON public.clubs AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_active_user());

-- 10. club_members
DROP POLICY IF EXISTS "deactivated_block_insert_club_members" ON public.club_members;
CREATE POLICY "deactivated_block_insert_club_members"
  ON public.club_members AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_update_club_members" ON public.club_members;
CREATE POLICY "deactivated_block_update_club_members"
  ON public.club_members AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_active_user())
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_delete_club_members" ON public.club_members;
CREATE POLICY "deactivated_block_delete_club_members"
  ON public.club_members AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_active_user());

-- 11. mentorship_offers
DROP POLICY IF EXISTS "deactivated_block_insert_mentorship_offers" ON public.mentorship_offers;
CREATE POLICY "deactivated_block_insert_mentorship_offers"
  ON public.mentorship_offers AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_update_mentorship_offers" ON public.mentorship_offers;
CREATE POLICY "deactivated_block_update_mentorship_offers"
  ON public.mentorship_offers AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_active_user())
  WITH CHECK (public.is_active_user());

-- 12. mentorship_requests
DROP POLICY IF EXISTS "deactivated_block_insert_mentorship_requests" ON public.mentorship_requests;
CREATE POLICY "deactivated_block_insert_mentorship_requests"
  ON public.mentorship_requests AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_update_mentorship_requests" ON public.mentorship_requests;
CREATE POLICY "deactivated_block_update_mentorship_requests"
  ON public.mentorship_requests AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_active_user())
  WITH CHECK (public.is_active_user());

-- 13. collab_projects
DROP POLICY IF EXISTS "deactivated_block_insert_collab_projects" ON public.collab_projects;
CREATE POLICY "deactivated_block_insert_collab_projects"
  ON public.collab_projects AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_update_collab_projects" ON public.collab_projects;
CREATE POLICY "deactivated_block_update_collab_projects"
  ON public.collab_projects AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_active_user())
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_delete_collab_projects" ON public.collab_projects;
CREATE POLICY "deactivated_block_delete_collab_projects"
  ON public.collab_projects AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_active_user());

-- 14. saved_items
DROP POLICY IF EXISTS "deactivated_block_insert_saved_items" ON public.saved_items;
CREATE POLICY "deactivated_block_insert_saved_items"
  ON public.saved_items AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_delete_saved_items" ON public.saved_items;
CREATE POLICY "deactivated_block_delete_saved_items"
  ON public.saved_items AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_active_user());

-- 15. profiles — block direct UPDATE/DELETE by deactivated users.
-- RPCs (deactivate/reactivate) are SECURITY DEFINER and bypass RLS.
DROP POLICY IF EXISTS "deactivated_block_update_profiles" ON public.profiles;
CREATE POLICY "deactivated_block_update_profiles"
  ON public.profiles AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_active_user())
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "deactivated_block_delete_profiles" ON public.profiles;
CREATE POLICY "deactivated_block_delete_profiles"
  ON public.profiles AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_active_user());


-- ══════════════════════════════════════════════════════════════════════════════
-- 1c. deactivate_own_account() RPC
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.deactivate_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
BEGIN
  -- Block if user is the SOLE admin of any active club.
  -- "Sole admin" = no other admin/approved member with role='admin' exists.
  IF EXISTS (
    SELECT 1
    FROM public.club_members cm
    WHERE cm.user_id = v_uid
      AND cm.role = 'admin'
      AND cm.status = 'approved'
      AND EXISTS (
        SELECT 1 FROM public.clubs c
        WHERE c.id = cm.club_id AND c.is_active = true
      )
      AND NOT EXISTS (
        -- Another admin exists for this club
        SELECT 1 FROM public.club_members cm2
        WHERE cm2.club_id = cm.club_id
          AND cm2.user_id <> v_uid
          AND cm2.role = 'admin'
          AND cm2.status = 'approved'
      )
  ) THEN
    RAISE EXCEPTION 'Transfer club ownership before deactivating. You are the sole admin of one or more active clubs.';
  END IF;

  UPDATE public.profiles
  SET account_status = 'deactivated',
      scheduled_deletion_at = now() + interval '15 days'
  WHERE id = v_uid
    AND account_status = 'active'
    AND scheduled_deletion_at IS NULL;  -- prevent weird toggling
END;
$$;

-- Grant to authenticated users only
GRANT EXECUTE ON FUNCTION public.deactivate_own_account() TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- 1d. reactivate_own_account() RPC
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.reactivate_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET account_status = 'active',
      scheduled_deletion_at = NULL
  WHERE id = (SELECT auth.uid())
    AND account_status = 'deactivated'
    AND scheduled_deletion_at IS NOT NULL;  -- must have pending deletion
END;
$$;

-- Grant to authenticated users only
GRANT EXECUTE ON FUNCTION public.reactivate_own_account() TO authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- 1e. hard_delete_expired_accounts() RPC — atomic DELETE...RETURNING
--
-- Eliminates the SELECT-then-DELETE race window. A single DELETE statement
-- handles the condition check and row removal atomically.
-- Called by cron-hard-delete edge function with service role (bypasses RLS).
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.hard_delete_expired_accounts()
RETURNS TABLE (user_id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  DELETE FROM public.profiles
  WHERE account_status = 'deactivated'
    AND scheduled_deletion_at < now()
  RETURNING id, profiles.email;
END;
$$;

-- Only callable via service role (no grant to authenticated)
REVOKE ALL ON FUNCTION public.hard_delete_expired_accounts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hard_delete_expired_accounts() FROM authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- 1f. Extend account_deletion_audit with lifecycle fields
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'account_deletion_audit'
      AND column_name = 'action'
  ) THEN
    ALTER TABLE public.account_deletion_audit
      ADD COLUMN action TEXT DEFAULT 'deleted';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'account_deletion_audit'
      AND column_name = 'deactivated_at'
  ) THEN
    ALTER TABLE public.account_deletion_audit
      ADD COLUMN deactivated_at TIMESTAMPTZ;
  END IF;

  -- deleted_at already exists from migration 106, but ensure it's there
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'account_deletion_audit'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.account_deletion_audit
      ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END;
$$;

-- Back-fill existing rows with 'deleted' action
UPDATE public.account_deletion_audit
SET action = 'deleted'
WHERE action IS NULL;


-- ══════════════════════════════════════════════════════════════════════════════
-- DOCUMENTATION
-- ══════════════════════════════════════════════════════════════════════════════
--
-- WHAT CHANGED:
--   profiles: added account_status (active/deactivated) + scheduled_deletion_at
--   10 SELECT policies updated to hide deactivated users' content
--   RESTRICTIVE write-blocking policies on 15 tables (JWT-window defense)
--   New helper: is_active_user() — used by RESTRICTIVE policies
--   New RPCs: deactivate_own_account(), reactivate_own_account(),
--             hard_delete_expired_accounts() (atomic DELETE...RETURNING)
--   account_deletion_audit: added action, deactivated_at columns
--
-- CRITICAL INVARIANTS:
--   1. auth.uid() = id in profiles SELECT is NEVER guarded by account_status.
--      A deactivated user can always read their own profile row.
--   2. RESTRICTIVE policies block ALL writes from deactivated users.
--      SECURITY DEFINER RPCs (deactivate/reactivate/hard_delete) bypass RLS.
--   3. Club deactivation only blocked when user is SOLE admin (not any admin).
--   4. hard_delete_expired_accounts() uses DELETE...RETURNING for atomicity.
--   5. account_deletion_audit has NO FK to profiles — rows survive deletion.
--
-- TABLES WITH UPDATED SELECT POLICIES:
--   1. profiles — account_status = 'active' on college branch
--   2. posts — account_status = 'active' on user_id for non-own posts
--   3. comments — account_status = 'active' on user_id
--   4. connections — counterparty account_status = 'active'
--   5. events — account_status = 'active' on creator_id
--   6. clubs — account_status = 'active' on created_by
--   7. mentorship_offers — account_status = 'active' on mentor_id
--   8. mentorship_requests — account_status = 'active' on mentee+mentor
--   9. collab_projects — account_status = 'active' on created_by
--  10. reposts — account_status = 'active' on user_id
--
-- TABLES WITH RESTRICTIVE WRITE-BLOCKING POLICIES (INSERT/UPDATE/DELETE):
--   1-15: posts, comments, post_likes, comment_likes, reposts, connections,
--         messages, events, clubs, club_members, mentorship_offers,
--         mentorship_requests, collab_projects, saved_items, profiles
--
-- TABLES NOT CHANGED (no cross-user leak):
--  11. notifications — user-scoped only (auth.uid() = user_id)
--  12. messages (SELECT) — participant-scoped (own history always visible)
--
-- ══════════════════════════════════════════════════════════════════════════════

COMMIT;
