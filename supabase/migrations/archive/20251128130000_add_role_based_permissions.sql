-- Add role-based permissions to existing feature tables
BEGIN;

-- ============================================================================
-- EVENTS TABLE - Add role-based creation permissions
-- ============================================================================
-- First check if the table exists, if not create it
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
    CREATE TABLE public.events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      title text NOT NULL,
      description text,
      event_date date NOT NULL,
      event_time text,
      location text,
      is_virtual boolean DEFAULT false,
      virtual_link text,
      max_attendees integer,
      category text,
      tags text[] DEFAULT '{}',
      cover_image_url text,
      registration_required boolean DEFAULT true,
      registration_deadline date,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  ELSE
    -- If table exists, ensure all required columns exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'creator_id'
    ) THEN
      ALTER TABLE public.events ADD COLUMN creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'title'
    ) THEN
      ALTER TABLE public.events ADD COLUMN title text;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'event_date'
    ) THEN
      ALTER TABLE public.events ADD COLUMN event_date date;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'description'
    ) THEN
      ALTER TABLE public.events ADD COLUMN description text;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'event_time'
    ) THEN
      ALTER TABLE public.events ADD COLUMN event_time text;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'location'
    ) THEN
      ALTER TABLE public.events ADD COLUMN location text;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'is_virtual'
    ) THEN
      ALTER TABLE public.events ADD COLUMN is_virtual boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'virtual_link'
    ) THEN
      ALTER TABLE public.events ADD COLUMN virtual_link text;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'max_attendees'
    ) THEN
      ALTER TABLE public.events ADD COLUMN max_attendees integer;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'category'
    ) THEN
      ALTER TABLE public.events ADD COLUMN category text;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'tags'
    ) THEN
      ALTER TABLE public.events ADD COLUMN tags text[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'cover_image_url'
    ) THEN
      ALTER TABLE public.events ADD COLUMN cover_image_url text;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'registration_required'
    ) THEN
      ALTER TABLE public.events ADD COLUMN registration_required boolean DEFAULT true;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'registration_deadline'
    ) THEN
      ALTER TABLE public.events ADD COLUMN registration_deadline date;
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'created_at'
    ) THEN
      ALTER TABLE public.events ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE public.events ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
    
    -- Update existing rows to have a creator_id if null
    UPDATE public.events SET creator_id = (SELECT id FROM public.profiles LIMIT 1) WHERE creator_id IS NULL;
    
    -- Set NOT NULL constraints after populating
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'creator_id' AND is_nullable = 'YES') THEN
      ALTER TABLE public.events ALTER COLUMN creator_id SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'title' AND is_nullable = 'YES') THEN
      UPDATE public.events SET title = 'Untitled Event' WHERE title IS NULL;
      ALTER TABLE public.events ALTER COLUMN title SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'event_date' AND is_nullable = 'YES') THEN
      UPDATE public.events SET event_date = CURRENT_DATE WHERE event_date IS NULL;
      ALTER TABLE public.events ALTER COLUMN event_date SET NOT NULL;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- JOBS TABLE - Add role-based posting permissions
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jobs') THEN
    CREATE TABLE public.jobs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      poster_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      company_name text NOT NULL,
      job_title text NOT NULL,
      job_type text CHECK (job_type IN ('Full-time', 'Part-time', 'Internship', 'Contract', 'Freelance')),
      experience_level text CHECK (experience_level IN ('Entry', 'Mid', 'Senior', 'Executive')),
      location text,
      is_remote boolean DEFAULT false,
      salary_min numeric(12,2),
      salary_max numeric(12,2),
      description text NOT NULL,
      requirements text,
      responsibilities text,
      benefits text,
      skills_required text[] DEFAULT '{}',
      application_url text,
      application_email text,
      application_deadline date,
      is_active boolean DEFAULT true,
      views_count integer DEFAULT 0,
      applications_count integer DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  ELSE
    -- If table exists, ensure all required columns exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'poster_id') THEN
      ALTER TABLE public.jobs ADD COLUMN poster_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'company_name') THEN
      ALTER TABLE public.jobs ADD COLUMN company_name text;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'job_title') THEN
      ALTER TABLE public.jobs ADD COLUMN job_title text;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'job_type') THEN
      ALTER TABLE public.jobs ADD COLUMN job_type text CHECK (job_type IN ('Full-time', 'Part-time', 'Internship', 'Contract', 'Freelance'));
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'experience_level') THEN
      ALTER TABLE public.jobs ADD COLUMN experience_level text CHECK (experience_level IN ('Entry', 'Mid', 'Senior', 'Executive'));
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'location') THEN
      ALTER TABLE public.jobs ADD COLUMN location text;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'is_remote') THEN
      ALTER TABLE public.jobs ADD COLUMN is_remote boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'salary_min') THEN
      ALTER TABLE public.jobs ADD COLUMN salary_min numeric(12,2);
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'salary_max') THEN
      ALTER TABLE public.jobs ADD COLUMN salary_max numeric(12,2);
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'description') THEN
      ALTER TABLE public.jobs ADD COLUMN description text;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'requirements') THEN
      ALTER TABLE public.jobs ADD COLUMN requirements text;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'responsibilities') THEN
      ALTER TABLE public.jobs ADD COLUMN responsibilities text;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'benefits') THEN
      ALTER TABLE public.jobs ADD COLUMN benefits text;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'skills_required') THEN
      ALTER TABLE public.jobs ADD COLUMN skills_required text[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'application_url') THEN
      ALTER TABLE public.jobs ADD COLUMN application_url text;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'application_email') THEN
      ALTER TABLE public.jobs ADD COLUMN application_email text;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'application_deadline') THEN
      ALTER TABLE public.jobs ADD COLUMN application_deadline date;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'is_active') THEN
      ALTER TABLE public.jobs ADD COLUMN is_active boolean DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'views_count') THEN
      ALTER TABLE public.jobs ADD COLUMN views_count integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'applications_count') THEN
      ALTER TABLE public.jobs ADD COLUMN applications_count integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'created_at') THEN
      ALTER TABLE public.jobs ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'updated_at') THEN
      ALTER TABLE public.jobs ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
    
    -- Update existing rows to populate required fields
    UPDATE public.jobs SET poster_id = (SELECT id FROM public.profiles LIMIT 1) WHERE poster_id IS NULL;
    UPDATE public.jobs SET company_name = 'Unknown Company' WHERE company_name IS NULL;
    UPDATE public.jobs SET job_title = 'Untitled Position' WHERE job_title IS NULL;
    UPDATE public.jobs SET description = 'No description provided' WHERE description IS NULL;
    
    -- Set NOT NULL constraints after populating
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'poster_id' AND is_nullable = 'YES') THEN
      ALTER TABLE public.jobs ALTER COLUMN poster_id SET NOT NULL;
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'company_name' AND is_nullable = 'YES') THEN
      ALTER TABLE public.jobs ALTER COLUMN company_name SET NOT NULL;
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'job_title' AND is_nullable = 'YES') THEN
      ALTER TABLE public.jobs ALTER COLUMN job_title SET NOT NULL;
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'description' AND is_nullable = 'YES') THEN
      ALTER TABLE public.jobs ALTER COLUMN description SET NOT NULL;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- MENTORSHIP OFFERS TABLE
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mentorship_offers') THEN
    CREATE TABLE public.mentorship_offers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      mentor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      expertise_areas text[] DEFAULT '{}',
      available_slots integer DEFAULT 5,
      current_mentees integer DEFAULT 0,
      availability_schedule text,
      mentorship_type text CHECK (mentorship_type IN ('One-on-One', 'Group', 'Both')),
      preferred_communication text[] DEFAULT '{}', -- ['Video Call', 'Chat', 'Email']
      session_duration text, -- '30 minutes', '1 hour'
      is_active boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  ELSE
    -- If table exists, ensure all required columns exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mentorship_offers' AND column_name = 'mentor_id') THEN
      ALTER TABLE public.mentorship_offers ADD COLUMN mentor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mentorship_offers' AND column_name = 'expertise_areas') THEN
      ALTER TABLE public.mentorship_offers ADD COLUMN expertise_areas text[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mentorship_offers' AND column_name = 'available_slots') THEN
      ALTER TABLE public.mentorship_offers ADD COLUMN available_slots integer DEFAULT 5;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mentorship_offers' AND column_name = 'current_mentees') THEN
      ALTER TABLE public.mentorship_offers ADD COLUMN current_mentees integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mentorship_offers' AND column_name = 'availability_schedule') THEN
      ALTER TABLE public.mentorship_offers ADD COLUMN availability_schedule text;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mentorship_offers' AND column_name = 'mentorship_type') THEN
      ALTER TABLE public.mentorship_offers ADD COLUMN mentorship_type text CHECK (mentorship_type IN ('One-on-One', 'Group', 'Both'));
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mentorship_offers' AND column_name = 'preferred_communication') THEN
      ALTER TABLE public.mentorship_offers ADD COLUMN preferred_communication text[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mentorship_offers' AND column_name = 'session_duration') THEN
      ALTER TABLE public.mentorship_offers ADD COLUMN session_duration text;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mentorship_offers' AND column_name = 'is_active') THEN
      ALTER TABLE public.mentorship_offers ADD COLUMN is_active boolean DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mentorship_offers' AND column_name = 'created_at') THEN
      ALTER TABLE public.mentorship_offers ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mentorship_offers' AND column_name = 'updated_at') THEN
      ALTER TABLE public.mentorship_offers ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
    
    -- Update existing rows to populate required fields
    UPDATE public.mentorship_offers SET mentor_id = (SELECT id FROM public.profiles LIMIT 1) WHERE mentor_id IS NULL;
    
    -- Set NOT NULL constraints after populating
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mentorship_offers' AND column_name = 'mentor_id' AND is_nullable = 'YES') THEN
      ALTER TABLE public.mentorship_offers ALTER COLUMN mentor_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS events_creator_id_idx ON public.events(creator_id);
CREATE INDEX IF NOT EXISTS events_event_date_idx ON public.events(event_date);
CREATE INDEX IF NOT EXISTS jobs_poster_id_idx ON public.jobs(poster_id);
CREATE INDEX IF NOT EXISTS jobs_is_active_idx ON public.jobs(is_active);
CREATE INDEX IF NOT EXISTS mentorship_offers_mentor_id_idx ON public.mentorship_offers(mentor_id);
CREATE INDEX IF NOT EXISTS mentorship_offers_is_active_idx ON public.mentorship_offers(is_active);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_offers ENABLE ROW LEVEL SECURITY;

-- Everyone can view events
CREATE POLICY "Events are viewable by everyone" ON public.events
  FOR SELECT USING (true);

-- Only Alumni, Faculty, Clubs, and Organizations can create events
CREATE POLICY "Only certain roles can create events" ON public.events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('Alumni', 'Faculty', 'Club', 'Organization')
    )
  );

-- Users can update their own events
CREATE POLICY "Users can update their own events" ON public.events
  FOR UPDATE USING (auth.uid() = creator_id);

-- Users can delete their own events
CREATE POLICY "Users can delete their own events" ON public.events
  FOR DELETE USING (auth.uid() = creator_id);

-- Everyone can view active jobs
CREATE POLICY "Active jobs are viewable by everyone" ON public.jobs
  FOR SELECT USING (is_active = true OR auth.uid() = poster_id);

-- Only Alumni, Faculty, and Organizations can post jobs
CREATE POLICY "Only certain roles can post jobs" ON public.jobs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('Alumni', 'Faculty', 'Organization')
    )
  );

-- Users can update their own job posts
CREATE POLICY "Users can update their own jobs" ON public.jobs
  FOR UPDATE USING (auth.uid() = poster_id);

-- Users can delete their own job posts
CREATE POLICY "Users can delete their own jobs" ON public.jobs
  FOR DELETE USING (auth.uid() = poster_id);

-- Everyone can view active mentorship offers
CREATE POLICY "Mentorship offers are viewable by everyone" ON public.mentorship_offers
  FOR SELECT USING (is_active = true OR auth.uid() = mentor_id);

-- Only Alumni and Faculty can offer mentorship
CREATE POLICY "Only Alumni and Faculty can offer mentorship" ON public.mentorship_offers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('Alumni', 'Faculty')
      AND is_verified = true
    )
  );

-- Mentors can update their own offers
CREATE POLICY "Mentors can update their own offers" ON public.mentorship_offers
  FOR UPDATE USING (auth.uid() = mentor_id);

-- Mentors can delete their own offers
CREATE POLICY "Mentors can delete their own offers" ON public.mentorship_offers
  FOR DELETE USING (auth.uid() = mentor_id);

-- ============================================================================
-- Add role-based policies to existing posts table
-- ============================================================================

-- Drop existing policies to recreate with role checks
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;

-- Recreate with role-specific visibility rules
CREATE POLICY "Posts are viewable by everyone" ON public.posts
  FOR SELECT USING (true);

-- All roles can create posts
CREATE POLICY "Authenticated users can create posts" ON public.posts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
  );

COMMIT;
