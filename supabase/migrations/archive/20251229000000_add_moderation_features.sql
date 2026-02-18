-- Add post moderation features: reports, hidden posts, and share tracking

-- Create post_reports table
CREATE TABLE IF NOT EXISTS public.post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(post_id, reporter_id)
);

-- Create hidden_posts table
CREATE TABLE IF NOT EXISTS public.hidden_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Indexes for post_reports
CREATE INDEX IF NOT EXISTS post_reports_post_id_idx ON public.post_reports(post_id);
CREATE INDEX IF NOT EXISTS post_reports_reporter_id_idx ON public.post_reports(reporter_id);
CREATE INDEX IF NOT EXISTS post_reports_status_idx ON public.post_reports(status);
CREATE INDEX IF NOT EXISTS post_reports_created_at_idx ON public.post_reports(created_at DESC);

-- Indexes for hidden_posts
CREATE INDEX IF NOT EXISTS hidden_posts_post_id_idx ON public.hidden_posts(post_id);
CREATE INDEX IF NOT EXISTS hidden_posts_user_id_idx ON public.hidden_posts(user_id);

-- RLS policies for post_reports
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
DROP POLICY IF EXISTS "Users can view their own reports" ON public.post_reports;
CREATE POLICY "Users can view their own reports"
  ON public.post_reports
  FOR SELECT
  USING (auth.uid() = reporter_id);

-- Users can create reports
DROP POLICY IF EXISTS "Users can create reports" ON public.post_reports;
CREATE POLICY "Users can create reports"
  ON public.post_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Admins can view all reports (TODO: add admin role check)
DROP POLICY IF EXISTS "Admins can view all reports" ON public.post_reports;
CREATE POLICY "Admins can view all reports"
  ON public.post_reports
  FOR SELECT
  USING (true);

-- RLS policies for hidden_posts
ALTER TABLE public.hidden_posts ENABLE ROW LEVEL SECURITY;

-- Users can view their own hidden posts
DROP POLICY IF EXISTS "Users can view their own hidden posts" ON public.hidden_posts;
CREATE POLICY "Users can view their own hidden posts"
  ON public.hidden_posts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can hide posts
DROP POLICY IF EXISTS "Users can hide posts" ON public.hidden_posts;
CREATE POLICY "Users can hide posts"
  ON public.hidden_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unhide posts
DROP POLICY IF EXISTS "Users can unhide posts" ON public.hidden_posts;
CREATE POLICY "Users can unhide posts"
  ON public.hidden_posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to increment post shares count
CREATE OR REPLACE FUNCTION increment_post_shares(post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.posts
  SET shares_count = shares_count + 1
  WHERE id = post_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION increment_post_shares(uuid) TO authenticated;

