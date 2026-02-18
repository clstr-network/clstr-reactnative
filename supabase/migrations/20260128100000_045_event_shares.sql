-- ============================================================================
-- 045_event_shares.sql - Event Shares Table for Analytics
-- Tracks event sharing activity (DM shares and link copies)
-- ============================================================================

BEGIN;

-- ============================================================================
-- EVENT SHARES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  share_type text NOT NULL CHECK (share_type IN ('dm', 'link')),
  receiver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS event_shares_event_id_idx ON public.event_shares(event_id);
CREATE INDEX IF NOT EXISTS event_shares_user_id_idx ON public.event_shares(user_id);
CREATE INDEX IF NOT EXISTS event_shares_created_at_idx ON public.event_shares(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.event_shares ENABLE ROW LEVEL SECURITY;

-- Users can insert their own shares
CREATE POLICY "Users can insert own event shares"
ON public.event_shares
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own shares
CREATE POLICY "Users can view own event shares"
ON public.event_shares
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Event creators can view shares of their events
CREATE POLICY "Event creators can view shares of their events"
ON public.event_shares
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_shares.event_id
    AND events.creator_id = auth.uid()
  )
);

-- ============================================================================
-- FUNCTION: Get share count for an event
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_event_share_count(p_event_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM public.event_shares
    WHERE event_id = p_event_id
  );
END;
$$;

COMMIT;
