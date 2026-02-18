-- ============================================================================
-- 004_events_jobs.sql - Events and Jobs tables
-- U-Hub Platform Database Baseline
-- ============================================================================

BEGIN;

-- ============================================================================
-- EVENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  college_domain text,
  title text NOT NULL,
  description text,
  category text,
  event_date date NOT NULL,
  event_time text,
  location text,
  is_virtual boolean DEFAULT false,
  virtual_link text,
  cover_image_url text,
  max_attendees integer,
  registration_required boolean DEFAULT false,
  registration_deadline date,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_creator_id_idx ON public.events(creator_id);
CREATE INDEX IF NOT EXISTS events_college_domain_idx ON public.events(college_domain);
CREATE INDEX IF NOT EXISTS events_event_date_idx ON public.events(event_date);
CREATE INDEX IF NOT EXISTS events_category_idx ON public.events(category);
CREATE INDEX IF NOT EXISTS events_created_at_idx ON public.events(created_at DESC);

-- ============================================================================
-- EVENT REGISTRATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  college_domain text,
  status public.event_registration_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_registrations_event_id_idx ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS event_registrations_user_id_idx ON public.event_registrations(user_id);
CREATE INDEX IF NOT EXISTS event_registrations_status_idx ON public.event_registrations(status);

-- ============================================================================
-- JOBS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  college_domain text,
  job_title text NOT NULL,
  company_name text NOT NULL,
  description text NOT NULL,
  location text,
  job_type text,
  experience_level text,
  salary_min numeric(12,2),
  salary_max numeric(12,2),
  skills_required text[] DEFAULT '{}',
  requirements text,
  responsibilities text,
  benefits text,
  is_remote boolean DEFAULT false,
  is_active boolean DEFAULT true,
  application_deadline date,
  application_url text,
  application_email text,
  views_count integer DEFAULT 0,
  applications_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jobs_poster_id_idx ON public.jobs(poster_id);
CREATE INDEX IF NOT EXISTS jobs_college_domain_idx ON public.jobs(college_domain);
CREATE INDEX IF NOT EXISTS jobs_is_active_idx ON public.jobs(is_active);
CREATE INDEX IF NOT EXISTS jobs_job_type_idx ON public.jobs(job_type);
CREATE INDEX IF NOT EXISTS jobs_created_at_idx ON public.jobs(created_at DESC);

-- ============================================================================
-- JOB APPLICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  college_domain text,
  resume_url text,
  cover_letter text,
  portfolio_url text,
  status text DEFAULT 'pending',
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_id, user_id)
);

CREATE INDEX IF NOT EXISTS job_applications_job_id_idx ON public.job_applications(job_id);
CREATE INDEX IF NOT EXISTS job_applications_user_id_idx ON public.job_applications(user_id);
CREATE INDEX IF NOT EXISTS job_applications_status_idx ON public.job_applications(status);

-- ============================================================================
-- SAVED JOBS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_id, user_id)
);

CREATE INDEX IF NOT EXISTS saved_jobs_job_id_idx ON public.saved_jobs(job_id);
CREATE INDEX IF NOT EXISTS saved_jobs_user_id_idx ON public.saved_jobs(user_id);

COMMIT;
