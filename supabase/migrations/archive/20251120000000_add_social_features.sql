-- Add social features: posts, comments, connections, messages
BEGIN;

-- Posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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

-- Post likes table
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reaction_type text DEFAULT 'like',
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Comment likes table
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Connections table
CREATE TABLE IF NOT EXISTS public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending', -- pending, accepted, rejected, blocked
  message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(requester_id, receiver_id),
  CHECK (requester_id != receiver_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL, -- like, comment, connection, message
  related_id uuid,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS connections_requester_id_idx ON public.connections(requester_id);
CREATE INDEX IF NOT EXISTS connections_receiver_id_idx ON public.connections(receiver_id);
CREATE INDEX IF NOT EXISTS connections_status_idx ON public.connections(status);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON public.comments;
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_connections_updated_at ON public.connections;
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to update post counts
CREATE OR REPLACE FUNCTION update_post_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'post_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'comments' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_likes_count ON public.post_likes;
CREATE TRIGGER update_likes_count AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE PROCEDURE update_post_counts();

DROP TRIGGER IF EXISTS update_comments_count ON public.comments;
CREATE TRIGGER update_comments_count AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE PROCEDURE update_post_counts();

-- RLS Policies
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Posts policies
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
CREATE POLICY "Users can create their own posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- Post likes policies
DROP POLICY IF EXISTS "Post likes are viewable by everyone" ON public.post_likes;
CREATE POLICY "Post likes are viewable by everyone" ON public.post_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
CREATE POLICY "Users can like posts" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unlike posts" ON public.post_likes;
CREATE POLICY "Users can unlike posts" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
CREATE POLICY "Users can create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
CREATE POLICY "Users can delete their own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Comment likes policies
DROP POLICY IF EXISTS "Comment likes are viewable by everyone" ON public.comment_likes;
CREATE POLICY "Comment likes are viewable by everyone" ON public.comment_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can like comments" ON public.comment_likes;
CREATE POLICY "Users can like comments" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unlike comments" ON public.comment_likes;
CREATE POLICY "Users can unlike comments" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Connections policies
DROP POLICY IF EXISTS "Connections are viewable by involved users" ON public.connections;
CREATE POLICY "Connections are viewable by involved users" ON public.connections FOR SELECT 
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Users can send connection requests" ON public.connections;
CREATE POLICY "Users can send connection requests" ON public.connections FOR INSERT 
  WITH CHECK (auth.uid() = requester_id);
DROP POLICY IF EXISTS "Users can update their received connections" ON public.connections;
CREATE POLICY "Users can update their received connections" ON public.connections FOR UPDATE 
  USING (auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Users can delete their connections" ON public.connections;
CREATE POLICY "Users can delete their connections" ON public.connections FOR DELETE 
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Messages policies
DROP POLICY IF EXISTS "Messages are viewable by sender and receiver" ON public.messages;
CREATE POLICY "Messages are viewable by sender and receiver" ON public.messages FOR SELECT 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Receivers can update read status" ON public.messages;
CREATE POLICY "Receivers can update read status" ON public.messages FOR UPDATE 
  USING (auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Users can delete their messages" ON public.messages;
CREATE POLICY "Users can delete their messages" ON public.messages FOR DELETE 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT 
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE 
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE 
  USING (auth.uid() = user_id);

COMMIT;
