-- ============================================================================
-- 086_comment_message_perf_indexes.sql
-- Performance indexes for comments, comment_likes, and messages.
-- Covers the primary query patterns used by social-api.ts and messages-api.ts.
-- All IF NOT EXISTS to be safely re-runnable.
-- ============================================================================

BEGIN;

-- Comments: composite index for fetching comments by post with ordering.
-- Covers getComments(postId) → .eq("post_id", ...).order("created_at", asc)
CREATE INDEX IF NOT EXISTS idx_comments_post_created
  ON public.comments (post_id, created_at ASC);

-- Comments: top-level comments only (parent_id IS NULL) for getTopComments.
-- Partial index avoids indexing replies.
CREATE INDEX IF NOT EXISTS idx_comments_toplevel_post
  ON public.comments (post_id, created_at DESC)
  WHERE parent_id IS NULL;

-- Comment likes: composite for checking if a user liked specific comments.
-- Covers toggleCommentLike + getComments liked check.
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_comment
  ON public.comment_likes (user_id, comment_id);

-- Messages: composite covering index for the get_conversations RPC.
-- Optimizes the "latest message per partner" CTE.
CREATE INDEX IF NOT EXISTS idx_messages_conversation_covering
  ON public.messages (sender_id, receiver_id, created_at DESC);

-- Messages: reverse direction for bidirectional queries.
CREATE INDEX IF NOT EXISTS idx_messages_conversation_reverse
  ON public.messages (receiver_id, sender_id, created_at DESC);

COMMIT;
