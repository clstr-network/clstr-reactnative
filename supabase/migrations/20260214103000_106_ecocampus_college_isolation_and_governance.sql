-- ============================================================================
-- 106_ecocampus_college_isolation_and_governance.sql
-- Enforce same-college visibility and mutation governance for EcoCampus.
-- - Scope shared items and item requests SELECT to user's college community
-- - Enforce manager read-only posture for EcoCampus mutations
-- - Enforce same-college constraints for intents and responses at policy level
-- ============================================================================

BEGIN;

-- Shared items: same-college visibility only
DROP POLICY IF EXISTS "Available items viewable by everyone" ON public.shared_items;
DROP POLICY IF EXISTS "Users can share items" ON public.shared_items;
DROP POLICY IF EXISTS "Users can manage their shared items" ON public.shared_items;

CREATE POLICY "Users can view shared items in their college" ON public.shared_items
  FOR SELECT USING (
    college_domain IS NOT NULL
    AND college_domain = (
      SELECT p.college_domain
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can create shared items in their college" ON public.shared_items
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND lower(coalesce((SELECT p.role::text FROM public.profiles p WHERE p.id = auth.uid()), '')) <> 'manager'
    AND college_domain = (
      SELECT p.college_domain
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can update own shared items" ON public.shared_items
  FOR UPDATE USING (
    auth.uid() = user_id
    AND lower(coalesce((SELECT p.role::text FROM public.profiles p WHERE p.id = auth.uid()), '')) <> 'manager'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND lower(coalesce((SELECT p.role::text FROM public.profiles p WHERE p.id = auth.uid()), '')) <> 'manager'
    AND college_domain = (
      SELECT p.college_domain
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own shared items" ON public.shared_items
  FOR DELETE USING (
    auth.uid() = user_id
    AND lower(coalesce((SELECT p.role::text FROM public.profiles p WHERE p.id = auth.uid()), '')) <> 'manager'
  );

-- Item requests: same-college visibility only
DROP POLICY IF EXISTS "Item requests viewable by everyone" ON public.item_requests;
DROP POLICY IF EXISTS "Users can create item requests" ON public.item_requests;
DROP POLICY IF EXISTS "Users can manage their item requests" ON public.item_requests;

CREATE POLICY "Users can view item requests in their college" ON public.item_requests
  FOR SELECT USING (
    college_domain IS NOT NULL
    AND college_domain = (
      SELECT p.college_domain
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can create item requests in their college" ON public.item_requests
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND lower(coalesce((SELECT p.role::text FROM public.profiles p WHERE p.id = auth.uid()), '')) <> 'manager'
    AND college_domain = (
      SELECT p.college_domain
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can update own item requests" ON public.item_requests
  FOR UPDATE USING (
    auth.uid() = user_id
    AND lower(coalesce((SELECT p.role::text FROM public.profiles p WHERE p.id = auth.uid()), '')) <> 'manager'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND lower(coalesce((SELECT p.role::text FROM public.profiles p WHERE p.id = auth.uid()), '')) <> 'manager'
    AND college_domain = (
      SELECT p.college_domain
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own item requests" ON public.item_requests
  FOR DELETE USING (
    auth.uid() = user_id
    AND lower(coalesce((SELECT p.role::text FROM public.profiles p WHERE p.id = auth.uid()), '')) <> 'manager'
  );

-- Shared item intents: enforce same-college and manager read-only
DROP POLICY IF EXISTS "Users can create shared item intents" ON public.shared_item_intents;

CREATE POLICY "Users can create shared item intents" ON public.shared_item_intents
  FOR INSERT WITH CHECK (
    auth.uid() = requester_id
    AND lower(coalesce((SELECT p.role::text FROM public.profiles p WHERE p.id = auth.uid()), '')) <> 'manager'
    AND requester_id <> seller_id
    AND seller_id = (SELECT si.user_id FROM public.shared_items si WHERE si.id = item_id)
    AND EXISTS (
      SELECT 1
      FROM public.shared_items si
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE si.id = item_id
        AND si.college_domain IS NOT NULL
        AND si.college_domain = p.college_domain
    )
  );

-- Item request responses: enforce same-college and manager read-only
DROP POLICY IF EXISTS "Users can create request responses" ON public.item_request_responses;

CREATE POLICY "Users can create request responses" ON public.item_request_responses
  FOR INSERT WITH CHECK (
    auth.uid() = responder_id
    AND lower(coalesce((SELECT p.role::text FROM public.profiles p WHERE p.id = auth.uid()), '')) <> 'manager'
    AND responder_id <> requester_id
    AND requester_id = (SELECT ir.user_id FROM public.item_requests ir WHERE ir.id = request_id)
    AND EXISTS (
      SELECT 1
      FROM public.item_requests ir
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE ir.id = request_id
        AND ir.college_domain IS NOT NULL
        AND ir.college_domain = p.college_domain
    )
  );

COMMIT;
