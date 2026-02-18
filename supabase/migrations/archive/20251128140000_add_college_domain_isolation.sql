-- Add college domain isolation to the entire system
-- This ensures users only see content from their own college domain
BEGIN;

-- ============================================================================
-- STEP 1: Add college_domain column to profiles table
-- ============================================================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS college_domain text;

-- Create index for fast domain-based queries
CREATE INDEX IF NOT EXISTS profiles_college_domain_idx ON public.profiles(college_domain);

-- ============================================================================
-- STEP 2: Create function to extract domain from email
-- ============================================================================
CREATE OR REPLACE FUNCTION extract_domain_from_email(email text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Extract everything after the @ symbol
  RETURN lower(split_part(email, '@', 2));
END;
$$;

-- ============================================================================
-- STEP 3: Create trigger to auto-populate college_domain
-- ============================================================================
CREATE OR REPLACE FUNCTION set_college_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Extract domain from email and set it
  NEW.college_domain := extract_domain_from_email(NEW.email);
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS set_college_domain_on_profile ON public.profiles;
CREATE TRIGGER set_college_domain_on_profile
  BEFORE INSERT OR UPDATE OF email ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_college_domain();

-- ============================================================================
-- STEP 4: Backfill existing profiles with college_domain
-- ============================================================================
UPDATE public.profiles
SET college_domain = extract_domain_from_email(email)
WHERE college_domain IS NULL AND email IS NOT NULL;

-- ============================================================================
-- STEP 5: Add college_domain to other tables
-- ============================================================================

-- Add to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS college_domain text;

CREATE INDEX IF NOT EXISTS posts_college_domain_idx ON public.posts(college_domain);

-- Add to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS college_domain text;

CREATE INDEX IF NOT EXISTS events_college_domain_idx ON public.events(college_domain);

-- Add to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS college_domain text;

CREATE INDEX IF NOT EXISTS jobs_college_domain_idx ON public.jobs(college_domain);

-- Add to mentorship_offers table
ALTER TABLE public.mentorship_offers 
ADD COLUMN IF NOT EXISTS college_domain text;

CREATE INDEX IF NOT EXISTS mentorship_offers_college_domain_idx ON public.mentorship_offers(college_domain);

-- ============================================================================
-- STEP 6: Create trigger function to auto-set college_domain on content creation
-- ============================================================================
CREATE OR REPLACE FUNCTION set_content_college_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Get the college_domain from the creator's profile
  SELECT college_domain INTO NEW.college_domain
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN NEW;
END;
$$;

-- Helper to ensure both users belong to the same college domain
CREATE OR REPLACE FUNCTION ensure_same_college_domain(user_a uuid, user_b uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  domain_a text;
  domain_b text;
BEGIN
  SELECT college_domain INTO domain_a FROM public.profiles WHERE id = user_a;
  SELECT college_domain INTO domain_b FROM public.profiles WHERE id = user_b;

  IF domain_a IS NULL OR domain_b IS NULL THEN
    RAISE EXCEPTION 'Both users must have a college domain assigned before sharing data';
  END IF;

  IF domain_a <> domain_b THEN
    RAISE EXCEPTION 'Cross-college interactions are not permitted';
  END IF;

  RETURN domain_a;
END;
$$;

-- Trigger helpers that reuse ensure_same_college_domain for different tables
CREATE OR REPLACE FUNCTION enforce_connection_college_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.college_domain := ensure_same_college_domain(NEW.requester_id, NEW.receiver_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_message_college_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.college_domain := ensure_same_college_domain(NEW.sender_id, NEW.receiver_id);
  RETURN NEW;
END;
$$;

-- Apply triggers to all content tables
DROP TRIGGER IF EXISTS set_posts_college_domain ON public.posts;
CREATE TRIGGER set_posts_college_domain
  BEFORE INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION set_content_college_domain();

DROP TRIGGER IF EXISTS set_events_college_domain ON public.events;
CREATE TRIGGER set_events_college_domain
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION set_content_college_domain();

DROP TRIGGER IF EXISTS set_jobs_college_domain ON public.jobs;
CREATE TRIGGER set_jobs_college_domain
  BEFORE INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_content_college_domain();

DROP TRIGGER IF EXISTS set_mentorship_college_domain ON public.mentorship_offers;
CREATE TRIGGER set_mentorship_college_domain
  BEFORE INSERT ON public.mentorship_offers
  FOR EACH ROW
  EXECUTE FUNCTION set_content_college_domain();

-- ============================================================================
-- STEP 7: Update RLS policies to enforce domain isolation
-- ============================================================================

-- ============================================================================
-- PROFILES TABLE - Only see users from same college
-- ============================================================================
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by same college only" ON public.profiles
  FOR SELECT USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- POSTS TABLE - Only see posts from same college
-- ============================================================================
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts viewable by same college only" ON public.posts
  FOR SELECT USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Update insert policy to ensure college_domain is set
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;
CREATE POLICY "Users can create posts in their college" ON public.posts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- EVENTS TABLE - Only see events from same college
-- ============================================================================
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
CREATE POLICY "Events viewable by same college only" ON public.events
  FOR SELECT USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Only certain roles can create events" ON public.events;
CREATE POLICY "Only certain roles can create events in their college" ON public.events
  FOR INSERT WITH CHECK (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('Alumni', 'Faculty', 'Club', 'Organization')
    )
  );

-- ============================================================================
-- JOBS TABLE - Only see jobs from same college
-- ============================================================================
DROP POLICY IF EXISTS "Active jobs are viewable by everyone" ON public.jobs;
CREATE POLICY "Jobs viewable by same college only" ON public.jobs
  FOR SELECT USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    ) AND
    (is_active = true OR auth.uid() = poster_id)
  );

DROP POLICY IF EXISTS "Only certain roles can post jobs" ON public.jobs;
CREATE POLICY "Only certain roles can post jobs in their college" ON public.jobs
  FOR INSERT WITH CHECK (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('Alumni', 'Faculty', 'Organization')
    )
  );

-- ============================================================================
-- MENTORSHIP TABLE - Only see mentorship from same college
-- ============================================================================
DROP POLICY IF EXISTS "Mentorship offers are viewable by everyone" ON public.mentorship_offers;
CREATE POLICY "Mentorship offers viewable by same college only" ON public.mentorship_offers
  FOR SELECT USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    ) AND
    (is_active = true OR auth.uid() = mentor_id)
  );

DROP POLICY IF EXISTS "Only Alumni and Faculty can offer mentorship" ON public.mentorship_offers;
CREATE POLICY "Only Alumni and Faculty can offer mentorship in their college" ON public.mentorship_offers
  FOR INSERT WITH CHECK (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('Alumni', 'Faculty')
      AND is_verified = true
    )
  );

-- ============================================================================
-- CONNECTIONS TABLE - Only connect within same college
-- ============================================================================
-- Check if connections table exists, if so add domain isolation
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'connections') THEN
    -- Add college_domain check to connections
    ALTER TABLE public.connections 
    ADD COLUMN IF NOT EXISTS college_domain text;
    
    CREATE INDEX IF NOT EXISTS connections_college_domain_idx ON public.connections(college_domain);
    
    -- Backfill existing rows where both participants already share a domain
    UPDATE public.connections
    SET college_domain = requester.college_domain
    FROM public.profiles requester, public.profiles receiver
    WHERE requester.id = public.connections.requester_id
      AND receiver.id = public.connections.receiver_id
      AND requester.college_domain IS NOT NULL
      AND requester.college_domain = receiver.college_domain
      AND public.connections.college_domain IS NULL;
    
    -- Create trigger for connections
    DROP TRIGGER IF EXISTS set_connections_college_domain ON public.connections;
    CREATE TRIGGER set_connections_college_domain
      BEFORE INSERT ON public.connections
      FOR EACH ROW
      EXECUTE FUNCTION enforce_connection_college_domain();
    
    -- Update RLS policies
    DROP POLICY IF EXISTS "Connections visible within same college" ON public.connections;
    DROP POLICY IF EXISTS "Users can view connections in their college" ON public.connections;
    DROP POLICY IF EXISTS "Users can view their own connections" ON public.connections;
    CREATE POLICY "Connections visible within same college" ON public.connections
      FOR SELECT USING (
        college_domain = (
          SELECT college_domain FROM public.profiles WHERE id = auth.uid()
        ) AND
        (requester_id = auth.uid() OR receiver_id = auth.uid())
      );
    
    DROP POLICY IF EXISTS "Users can create connections" ON public.connections;
    DROP POLICY IF EXISTS "Users can create connections in their college" ON public.connections;
    DROP POLICY IF EXISTS "Users can send connection requests" ON public.connections;
    CREATE POLICY "Users can create connections in their college" ON public.connections
      FOR INSERT WITH CHECK (
        auth.uid() = requester_id AND
        EXISTS (
          SELECT 1 FROM public.profiles target
          WHERE target.id = receiver_id 
            AND target.college_domain = (
              SELECT college_domain FROM public.profiles WHERE id = auth.uid()
            )
        )
      );

    DROP POLICY IF EXISTS "Receivers can update connection status" ON public.connections;
    CREATE POLICY "Receivers can update connection status in their college" ON public.connections
      FOR UPDATE USING (
        auth.uid() = receiver_id AND
        college_domain = (
          SELECT college_domain FROM public.profiles WHERE id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "Users can delete their own connections" ON public.connections;
    CREATE POLICY "Users can delete connections in their college" ON public.connections
      FOR DELETE USING (
        college_domain = (
          SELECT college_domain FROM public.profiles WHERE id = auth.uid()
        ) AND
        (auth.uid() = requester_id OR auth.uid() = receiver_id)
      );
  END IF;
END $$;

-- ============================================================================
-- MESSAGES TABLE - Only message users in same college
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    ALTER TABLE public.messages 
    ADD COLUMN IF NOT EXISTS college_domain text;
    
    CREATE INDEX IF NOT EXISTS messages_college_domain_idx ON public.messages(college_domain);
    
    -- Backfill message domains using sender profile
    UPDATE public.messages
    SET college_domain = sender.college_domain
    FROM public.profiles sender
    WHERE sender.id = public.messages.sender_id
      AND sender.college_domain IS NOT NULL
      AND public.messages.college_domain IS NULL;
    
    DROP TRIGGER IF EXISTS set_messages_college_domain ON public.messages;
    CREATE TRIGGER set_messages_college_domain
      BEFORE INSERT ON public.messages
      FOR EACH ROW
      EXECUTE FUNCTION enforce_message_college_domain();
    
    -- RLS for messages
    DROP POLICY IF EXISTS "Users can view messages in their college" ON public.messages;
    DROP POLICY IF EXISTS "Users can view messages they're part of" ON public.messages;
    CREATE POLICY "Users can view messages in their college" ON public.messages
      FOR SELECT USING (
        college_domain = (
          SELECT college_domain FROM public.profiles WHERE id = auth.uid()
        ) AND
        (sender_id = auth.uid() OR receiver_id = auth.uid())
      );

    DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
    CREATE POLICY "Users can send same-college messages" ON public.messages
      FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
          SELECT 1 FROM public.profiles receiver_profile
          WHERE receiver_profile.id = receiver_id
            AND receiver_profile.college_domain = (
              SELECT college_domain FROM public.profiles WHERE id = auth.uid()
            )
        )
      );

    DROP POLICY IF EXISTS "Receivers can mark messages as read" ON public.messages;
    CREATE POLICY "Receivers can mark messages as read in their college" ON public.messages
      FOR UPDATE USING (
        auth.uid() = receiver_id AND
        college_domain = (
          SELECT college_domain FROM public.profiles WHERE id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "Senders can delete their messages" ON public.messages;
    CREATE POLICY "Senders can delete their messages in their college" ON public.messages
      FOR DELETE USING (
        auth.uid() = sender_id AND
        college_domain = (
          SELECT college_domain FROM public.profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================================
-- CLUBS TABLE - Only see clubs from same college
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clubs') THEN
    ALTER TABLE public.clubs 
    ADD COLUMN IF NOT EXISTS college_domain text;
    
    CREATE INDEX IF NOT EXISTS clubs_college_domain_idx ON public.clubs(college_domain);
    
    DROP TRIGGER IF EXISTS set_clubs_college_domain ON public.clubs;
    CREATE TRIGGER set_clubs_college_domain
      BEFORE INSERT ON public.clubs
      FOR EACH ROW
      EXECUTE FUNCTION set_content_college_domain();
    
    -- RLS for clubs
    DROP POLICY IF EXISTS "Clubs are viewable by everyone" ON public.clubs;
    CREATE POLICY "Clubs viewable by same college only" ON public.clubs
      FOR SELECT USING (
        college_domain = (
          SELECT college_domain FROM public.profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

COMMIT;
