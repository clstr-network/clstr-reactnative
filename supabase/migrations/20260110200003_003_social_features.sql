-- ============================================================================
-- 003_social_features.sql - Posts, comments, connections, messages
-- U-Hub Platform Database Baseline
-- ============================================================================

BEGIN;

-- ============================================================================
-- POSTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  college_domain text,
  content text NOT NULL,
  images text[] DEFAULT '{}',
  video text,
  poll jsonb,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS posts_college_domain_idx ON public.posts(college_domain);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts(created_at DESC);

-- ============================================================================
-- POST LIKES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  college_domain text,
  reaction_type text DEFAULT 'like',
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS post_likes_user_id_idx ON public.post_likes(user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  college_domain text,
  content text NOT NULL,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_post_id_idx ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON public.comments(parent_id);

-- ============================================================================
-- COMMENT LIKES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  college_domain text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS comment_likes_user_id_idx ON public.comment_likes(user_id);

-- ============================================================================
-- POST REPORTS (Moderation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending',
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS post_reports_post_id_idx ON public.post_reports(post_id);
CREATE INDEX IF NOT EXISTS post_reports_status_idx ON public.post_reports(status);

-- ============================================================================
-- HIDDEN POSTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.hidden_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS hidden_posts_user_id_idx ON public.hidden_posts(user_id);

-- ============================================================================
-- CONNECTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  college_domain text,
  status text DEFAULT 'pending',
  message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(requester_id, receiver_id),
  CHECK (requester_id != receiver_id)
);

CREATE INDEX IF NOT EXISTS connections_requester_id_idx ON public.connections(requester_id);
CREATE INDEX IF NOT EXISTS connections_receiver_id_idx ON public.connections(receiver_id);
CREATE INDEX IF NOT EXISTS connections_status_idx ON public.connections(status);
CREATE INDEX IF NOT EXISTS connections_college_domain_idx ON public.connections(college_domain);

-- ============================================================================
-- MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  college_domain text,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at DESC);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  college_domain text,
  type text NOT NULL,
  related_id uuid,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_type_idx ON public.notifications(type);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON public.notifications(read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);

-- ============================================================================
-- SAVED ITEMS (Bookmarks)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id uuid NOT NULL,
  type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_id, type)
);

CREATE INDEX IF NOT EXISTS saved_items_user_id_idx ON public.saved_items(user_id);
CREATE INDEX IF NOT EXISTS saved_items_item_id_idx ON public.saved_items(item_id);
CREATE INDEX IF NOT EXISTS saved_items_type_idx ON public.saved_items(type);

COMMIT;
