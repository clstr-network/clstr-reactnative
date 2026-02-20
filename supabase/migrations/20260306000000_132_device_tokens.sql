-- ============================================================================
-- Migration 132: Device Tokens for Expo Push Notifications
-- ============================================================================
-- Adds a device_tokens table for Expo Push tokens (mobile-native push).
-- The existing push_subscriptions table handles Web Push (VAPID). This table
-- supplements it for iOS/Android native push via Expo's push service.
-- ============================================================================

-- ── Table ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  expo_push_token text NOT NULL,
  device_type text NOT NULL CHECK (device_type IN ('ios', 'android')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now(),
  CONSTRAINT device_tokens_user_token_unique UNIQUE (user_id, expo_push_token)
);

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_active
  ON public.device_tokens (user_id)
  WHERE is_active = true;

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read their own tokens
CREATE POLICY "device_tokens_select_own"
  ON public.device_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tokens
CREATE POLICY "device_tokens_insert_own"
  ON public.device_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens (e.g., deactivate)
CREATE POLICY "device_tokens_update_own"
  ON public.device_tokens FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "device_tokens_delete_own"
  ON public.device_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- ── RPC: upsert_device_token ───────────────────────────────────────────────
-- Upserts a device token for the current user. On conflict (same user+token),
-- reactivates and updates last_used_at.
CREATE OR REPLACE FUNCTION public.upsert_device_token(
  p_expo_push_token text,
  p_device_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.device_tokens (user_id, expo_push_token, device_type, is_active, last_used_at)
  VALUES (auth.uid(), p_expo_push_token, p_device_type, true, now())
  ON CONFLICT (user_id, expo_push_token)
  DO UPDATE SET
    is_active = true,
    last_used_at = now(),
    device_type = EXCLUDED.device_type
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ── RPC: deactivate_device_token ───────────────────────────────────────────
-- Deactivates a specific push token (e.g., on sign-out or token refresh).
CREATE OR REPLACE FUNCTION public.deactivate_device_token(
  p_expo_push_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.device_tokens
  SET is_active = false
  WHERE user_id = auth.uid()
    AND expo_push_token = p_expo_push_token;
END;
$$;

-- ── RPC: get_user_device_tokens (service_role) ─────────────────────────────
-- Returns all active device tokens for a given user. Used by the edge function
-- to send push notifications. Requires service_role (no auth.uid() check).
CREATE OR REPLACE FUNCTION public.get_user_device_tokens(
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  expo_push_token text,
  device_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT dt.id, dt.expo_push_token, dt.device_type
  FROM public.device_tokens dt
  WHERE dt.user_id = p_user_id
    AND dt.is_active = true;
END;
$$;

-- Grant execute on RPCs
GRANT EXECUTE ON FUNCTION public.upsert_device_token(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_device_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_device_tokens(uuid) TO service_role;
