-- ============================================================================
-- 017_additional_indexes.sql - Performance Indexes
-- U-Hub Platform Database Baseline
-- ============================================================================

BEGIN;

-- ============================================================================
-- PROFILES INDEXES (Performance)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_profiles_university_lower ON public.profiles (LOWER(university)) WHERE university IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm ON public.profiles USING gin (full_name gin_trgm_ops) WHERE full_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_headline_trgm ON public.profiles USING gin (headline gin_trgm_ops) WHERE headline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON public.profiles (last_seen DESC) WHERE last_seen IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_interests ON public.profiles USING gin (interests) WHERE interests IS NOT NULL;

-- ============================================================================
-- POSTS INDEXES (Feed Performance)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_posts_content_trgm ON public.posts USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON public.posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_likes_count ON public.posts (likes_count DESC) WHERE likes_count > 0;

-- ============================================================================
-- CONNECTIONS INDEXES (Network Performance)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_connections_requester ON public.connections (requester_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_receiver ON public.connections (receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_accepted ON public.connections (requester_id, receiver_id) 
  WHERE status = 'accepted';

-- ============================================================================
-- MESSAGES INDEXES (Chat Performance)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages (receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages (receiver_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages (
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  created_at DESC
);

-- ============================================================================
-- NOTIFICATIONS INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, read, created_at DESC) 
  WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications (user_id, type, created_at DESC);

-- ============================================================================
-- EVENTS INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events (event_date);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events (category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_title_trgm ON public.events USING gin (title gin_trgm_ops);

-- ============================================================================
-- JOBS INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_jobs_active ON public.jobs (created_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_jobs_company ON public.jobs (company_name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON public.jobs USING gin (job_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON public.jobs (location) WHERE is_active = true;

-- ============================================================================
-- COLLAB PROJECTS INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_collab_projects_status ON public.collab_projects (status);
CREATE INDEX IF NOT EXISTS idx_collab_projects_title_trgm ON public.collab_projects USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_collab_projects_owner ON public.collab_projects (owner_id, created_at DESC);

-- ============================================================================
-- COMMENTS INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments (post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments (parent_id) WHERE parent_id IS NOT NULL;

-- ============================================================================
-- POST LIKES INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_post ON public.post_likes (user_id, post_id);

-- ============================================================================
-- SAVED ITEMS INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_saved_items_user ON public.saved_items (user_id, type, created_at DESC);

-- ============================================================================
-- VERIFICATION INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON public.verification_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user ON public.verification_requests (user_id, created_at DESC);

COMMIT;
