-- ============================================================================
-- 042_push_subscriptions.sql - Push Notifications Infrastructure
-- Creates table for storing browser push subscriptions (Web Push API)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Create push_subscriptions table
-- Stores Web Push API subscription data for each user/device
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  user_agent text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now(),
  
  -- Unique constraint: one subscription per endpoint per user
  CONSTRAINT push_subscriptions_user_endpoint_unique UNIQUE (user_id, endpoint)
);

-- ============================================================================
-- 2. Create indexes for common queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx 
  ON public.push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_active_idx 
  ON public.push_subscriptions(user_id, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS push_subscriptions_endpoint_idx 
  ON public.push_subscriptions(endpoint);

-- ============================================================================
-- 3. Enable RLS
-- ============================================================================
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS Policies
-- ============================================================================

-- Users can view their own subscriptions
DROP POLICY IF EXISTS "push_subscriptions_select_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_select_own"
  ON public.push_subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own subscriptions
DROP POLICY IF EXISTS "push_subscriptions_insert_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_insert_own"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own subscriptions
DROP POLICY IF EXISTS "push_subscriptions_update_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_update_own"
  ON public.push_subscriptions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own subscriptions
DROP POLICY IF EXISTS "push_subscriptions_delete_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_delete_own"
  ON public.push_subscriptions
  FOR DELETE
  USING (user_id = auth.uid());

-- Service role can read all subscriptions (for sending notifications)
DROP POLICY IF EXISTS "push_subscriptions_service_select" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_service_select"
  ON public.push_subscriptions
  FOR SELECT
  TO service_role
  USING (true);

-- ============================================================================
-- 5. Function to update last_used_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_push_subscription_last_used()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_used_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS push_subscription_update_last_used ON public.push_subscriptions;
CREATE TRIGGER push_subscription_update_last_used
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_push_subscription_last_used();

-- ============================================================================
-- 6. Function to get active subscriptions for a user (for sending notifications)
-- Uses SECURITY DEFINER to bypass RLS for server-side notification sending
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_push_subscriptions(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  endpoint text,
  p256dh_key text,
  auth_key text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.endpoint,
    ps.p256dh_key,
    ps.auth_key
  FROM public.push_subscriptions ps
  WHERE ps.user_id = p_user_id
    AND ps.is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_push_subscriptions(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_push_subscriptions(uuid) TO authenticated;

-- ============================================================================
-- 7. Function to upsert a push subscription (for frontend use)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_push_subscription(
  p_user_id uuid,
  p_endpoint text,
  p_p256dh_key text,
  p_auth_key text,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate that user is upserting their own subscription
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Can only manage your own push subscriptions';
  END IF;
  
  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh_key, auth_key, user_agent, is_active, last_used_at)
  VALUES (p_user_id, p_endpoint, p_p256dh_key, p_auth_key, p_user_agent, true, now())
  ON CONFLICT (user_id, endpoint)
  DO UPDATE SET
    p256dh_key = EXCLUDED.p256dh_key,
    auth_key = EXCLUDED.auth_key,
    user_agent = EXCLUDED.user_agent,
    is_active = true,
    last_used_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_push_subscription(uuid, text, text, text, text) TO authenticated;

-- ============================================================================
-- 8. Function to delete a push subscription
-- ============================================================================
CREATE OR REPLACE FUNCTION public.delete_push_subscription(
  p_user_id uuid,
  p_endpoint text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate that user is deleting their own subscription
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Can only manage your own push subscriptions';
  END IF;
  
  IF p_endpoint IS NOT NULL THEN
    DELETE FROM public.push_subscriptions WHERE user_id = p_user_id AND endpoint = p_endpoint;
  ELSE
    DELETE FROM public.push_subscriptions WHERE user_id = p_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_push_subscription(uuid, text) TO authenticated;

-- ============================================================================
-- 9. Function to deactivate a user's push subscription(s)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.deactivate_user_push_subscription(
  p_user_id uuid,
  p_endpoint text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate that user is deactivating their own subscription
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Can only manage your own push subscriptions';
  END IF;
  
  IF p_endpoint IS NOT NULL THEN
    UPDATE public.push_subscriptions SET is_active = false WHERE user_id = p_user_id AND endpoint = p_endpoint;
  ELSE
    UPDATE public.push_subscriptions SET is_active = false WHERE user_id = p_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deactivate_user_push_subscription(uuid, text) TO authenticated;

-- ============================================================================
-- 10. Function to check if user has active push subscription
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_active_push_subscription(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_count integer;
BEGIN
  SELECT COUNT(*) INTO sub_count
  FROM public.push_subscriptions
  WHERE user_id = p_user_id AND is_active = true;
  
  RETURN sub_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_active_push_subscription(uuid) TO authenticated;

-- ============================================================================
-- 11. Function to mark subscriptions as inactive (cleanup stale subscriptions)
-- Called when a push fails with a 410 Gone status
-- ============================================================================
CREATE OR REPLACE FUNCTION public.deactivate_push_subscription(p_endpoint text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.push_subscriptions
  SET is_active = false
  WHERE endpoint = p_endpoint;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deactivate_push_subscription(text) TO service_role;

-- ============================================================================
-- 12. Enable realtime for push_subscriptions
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'push_subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;
  END IF;
END;
$$;

-- ============================================================================
-- 13. Cleanup function for expired/inactive subscriptions
-- Run periodically via cron or manually
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_stale_push_subscriptions(days_inactive integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.push_subscriptions
  WHERE is_active = false
    OR last_used_at < now() - (days_inactive || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_stale_push_subscriptions(integer) TO service_role;

COMMIT;
