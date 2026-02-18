-- ============================================================================
-- 005_collabhub.sql - CollabHub project collaboration tables
-- U-Hub Platform Database Baseline
-- ============================================================================

BEGIN;

-- ============================================================================
-- COLLAB PROJECTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.collab_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  college_domain text,
  title text NOT NULL,
  slug text UNIQUE,
  summary text,
  description text,
  project_type text NOT NULL CHECK (project_type IN ('startup', 'hackathon', 'research', 'app', 'club', 'other')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'in_progress', 'closed', 'archived')),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'campus', 'private')),
  campus text,
  location text,
  is_remote boolean DEFAULT true,
  hero_image_url text,
  tags text[] DEFAULT '{}'::text[],
  skills text[] DEFAULT '{}'::text[],
  ai_match_summary text,
  ai_confidence numeric(5,2),
  ai_recommended boolean DEFAULT false,
  team_size_target integer DEFAULT 5 CHECK (team_size_target >= 1),
  team_size_current integer DEFAULT 0 CHECK (team_size_current >= 0),
  open_role_count integer DEFAULT 0 CHECK (open_role_count >= 0),
  engagement_score numeric(10,2) DEFAULT 0,
  starts_on date,
  ends_on date,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collab_projects_owner_idx ON public.collab_projects(owner_id);
CREATE INDEX IF NOT EXISTS collab_projects_college_domain_idx ON public.collab_projects(college_domain);
CREATE INDEX IF NOT EXISTS collab_projects_type_idx ON public.collab_projects(project_type);
CREATE INDEX IF NOT EXISTS collab_projects_status_idx ON public.collab_projects(status);
CREATE INDEX IF NOT EXISTS collab_projects_created_idx ON public.collab_projects(created_at DESC);

-- ============================================================================
-- COLLAB PROJECT ROLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.collab_project_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.collab_projects(id) ON DELETE CASCADE,
  college_domain text,
  title text NOT NULL,
  description text,
  responsibilities text,
  requirements text,
  skills text[] DEFAULT '{}'::text[],
  experience_level text,
  time_commitment text,
  is_remote boolean DEFAULT true,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'interviewing', 'filled', 'closed')),
  spots_total integer NOT NULL DEFAULT 1 CHECK (spots_total >= 1),
  spots_filled integer NOT NULL DEFAULT 0 CHECK (spots_filled >= 0),
  priority integer DEFAULT 0,
  ai_match_score numeric(5,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collab_project_roles_project_idx ON public.collab_project_roles(project_id);
CREATE INDEX IF NOT EXISTS collab_project_roles_status_idx ON public.collab_project_roles(status);

-- ============================================================================
-- COLLAB TEAM MEMBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.collab_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.collab_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.collab_project_roles(id) ON DELETE SET NULL,
  college_domain text,
  role_name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'left', 'removed')),
  is_owner boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS collab_team_members_project_idx ON public.collab_team_members(project_id);
CREATE INDEX IF NOT EXISTS collab_team_members_user_idx ON public.collab_team_members(user_id);

-- ============================================================================
-- COLLAB PROJECT APPLICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.collab_project_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.collab_projects(id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.collab_project_roles(id) ON DELETE SET NULL,
  applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  college_domain text,
  message text,
  portfolio_url text,
  resume_url text,
  status text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'reviewing', 'interview', 'accepted', 'rejected', 'withdrawn')),
  availability text,
  skills text[] DEFAULT '{}'::text[],
  match_score numeric(5,2),
  is_recommended boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, applicant_id, role_id)
);

CREATE INDEX IF NOT EXISTS collab_project_applications_project_idx ON public.collab_project_applications(project_id);
CREATE INDEX IF NOT EXISTS collab_project_applications_role_idx ON public.collab_project_applications(role_id);
CREATE INDEX IF NOT EXISTS collab_project_applications_applicant_idx ON public.collab_project_applications(applicant_id);

-- ============================================================================
-- COLLAB PROJECT UPDATES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.collab_project_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.collab_projects(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  college_domain text,
  title text,
  content text NOT NULL,
  attachments text[] DEFAULT '{}'::text[],
  visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'team', 'applicants')),
  pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collab_project_updates_project_idx ON public.collab_project_updates(project_id);

COMMIT;
