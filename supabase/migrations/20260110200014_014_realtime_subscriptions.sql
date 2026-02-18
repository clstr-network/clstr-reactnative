-- ============================================================================
-- 014_realtime_subscriptions.sql - Realtime Subscriptions Setup
-- U-Hub Platform Database Baseline
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENABLE REALTIME FOR KEY TABLES
-- ============================================================================

-- Enable realtime for posts (feed updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- Enable realtime for post_likes
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable realtime for connections
ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;

-- Enable realtime for event registrations
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_registrations;

COMMIT;
