-- ============================================================================
-- Migration 092: AI System Tables
--
-- Creates tables for:
-- 1. ai_chat_sessions — persisted career assistant chat sessions
-- 2. ai_chat_messages — individual messages within sessions
-- 3. ai_review_results — audit trail for AI Excel upload reviews
--
-- AI is advisory only. These tables store conversations and review audit
-- data. AI NEVER modifies identity, invites, or auth data.
-- ============================================================================

-- ─── 1. AI Chat Sessions ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user
  ON public.ai_chat_sessions (user_id, updated_at DESC);

COMMENT ON TABLE public.ai_chat_sessions IS
  'Persisted AI career assistant chat sessions. One session = one conversation thread.';

-- ─── 2. AI Chat Messages ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  error BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session
  ON public.ai_chat_messages (session_id, created_at ASC);

COMMENT ON TABLE public.ai_chat_messages IS
  'Individual messages within AI chat sessions. Ordered by created_at.';

-- ─── 3. AI Review Results (Audit Trail) ──────────────────────

CREATE TABLE IF NOT EXISTS public.ai_review_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_context TEXT NOT NULL,
  review_input_hash TEXT NOT NULL,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  admin_decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  reviewed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_review_results_reviewer
  ON public.ai_review_results (reviewed_by, created_at DESC);

COMMENT ON TABLE public.ai_review_results IS
  'Audit trail for AI-reviewed alumni invite Excel uploads. Stores warnings, summary, and admin per-row decisions.';

-- ─── 4. RLS Policies ─────────────────────────────────────────

ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_review_results ENABLE ROW LEVEL SECURITY;

-- Chat sessions: users can only see/modify their own
CREATE POLICY ai_chat_sessions_select ON public.ai_chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY ai_chat_sessions_insert ON public.ai_chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY ai_chat_sessions_update ON public.ai_chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY ai_chat_sessions_delete ON public.ai_chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Chat messages: users can see/insert messages in their own sessions
CREATE POLICY ai_chat_messages_select ON public.ai_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ai_chat_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY ai_chat_messages_insert ON public.ai_chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_chat_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

-- AI review results: only platform admins can see/insert
CREATE POLICY ai_review_results_select ON public.ai_review_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND pa.is_active = true
    )
  );

CREATE POLICY ai_review_results_insert ON public.ai_review_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND pa.is_active = true
    )
  );

-- ─── 5. Realtime ─────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_messages;
