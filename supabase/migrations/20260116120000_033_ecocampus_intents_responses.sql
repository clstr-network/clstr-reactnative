-- ============================================================================
-- 033_ecocampus_intents_responses.sql
-- Persist shared item contact/buy intents and request responses
-- ============================================================================

BEGIN;

-- Shared item intents (contact/buy)
CREATE TABLE IF NOT EXISTS public.shared_item_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.shared_items(id) ON DELETE CASCADE NOT NULL,
  requester_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  seller_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  intent_type text NOT NULL CHECK (intent_type IN ('contact', 'buy')),
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS shared_item_intents_unique_idx
  ON public.shared_item_intents(item_id, requester_id, intent_type);
CREATE INDEX IF NOT EXISTS shared_item_intents_requester_idx
  ON public.shared_item_intents(requester_id);
CREATE INDEX IF NOT EXISTS shared_item_intents_seller_idx
  ON public.shared_item_intents(seller_id);

-- Item request responses ("I have this")
CREATE TABLE IF NOT EXISTS public.item_request_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.item_requests(id) ON DELETE CASCADE NOT NULL,
  responder_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  requester_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS item_request_responses_unique_idx
  ON public.item_request_responses(request_id, responder_id);
CREATE INDEX IF NOT EXISTS item_request_responses_responder_idx
  ON public.item_request_responses(responder_id);
CREATE INDEX IF NOT EXISTS item_request_responses_requester_idx
  ON public.item_request_responses(requester_id);

-- RLS policies
ALTER TABLE public.shared_item_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_request_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their shared item intents" ON public.shared_item_intents;
CREATE POLICY "Users can view their shared item intents" ON public.shared_item_intents
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Users can create shared item intents" ON public.shared_item_intents;
CREATE POLICY "Users can create shared item intents" ON public.shared_item_intents
  FOR INSERT WITH CHECK (
    auth.uid() = requester_id
    AND requester_id <> seller_id
    AND seller_id = (SELECT user_id FROM public.shared_items WHERE id = item_id)
  );

DROP POLICY IF EXISTS "Users can delete their shared item intents" ON public.shared_item_intents;
CREATE POLICY "Users can delete their shared item intents" ON public.shared_item_intents
  FOR DELETE USING (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can view request responses" ON public.item_request_responses;
CREATE POLICY "Users can view request responses" ON public.item_request_responses
  FOR SELECT USING (auth.uid() = responder_id OR auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can create request responses" ON public.item_request_responses;
CREATE POLICY "Users can create request responses" ON public.item_request_responses
  FOR INSERT WITH CHECK (
    auth.uid() = responder_id
    AND responder_id <> requester_id
    AND requester_id = (SELECT user_id FROM public.item_requests WHERE id = request_id)
  );

DROP POLICY IF EXISTS "Users can delete their request responses" ON public.item_request_responses;
CREATE POLICY "Users can delete their request responses" ON public.item_request_responses
  FOR DELETE USING (auth.uid() = responder_id);

-- Realtime publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_item_intents;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.item_request_responses;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
