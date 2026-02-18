-- CollabHub project collaboration schema for team formation and role matching
BEGIN;

-- Projects
CREATE TABLE IF NOT EXISTS public.collab_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Roles within a project
CREATE TABLE IF NOT EXISTS public.collab_project_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.collab_projects(id) ON DELETE CASCADE,
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

-- Team members assigned to a project
CREATE TABLE IF NOT EXISTS public.collab_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.collab_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.collab_project_roles(id) ON DELETE SET NULL,
  role_name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'left', 'removed')),
  is_owner boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Applications to project roles
CREATE TABLE IF NOT EXISTS public.collab_project_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.collab_projects(id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.collab_project_roles(id) ON DELETE SET NULL,
  applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Project update feed similar to LinkedIn posts
CREATE TABLE IF NOT EXISTS public.collab_project_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.collab_projects(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text,
  content text NOT NULL,
  attachments text[] DEFAULT '{}'::text[],
  visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'team', 'applicants')),
  pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Helpful indexes for feed queries and filters
CREATE INDEX IF NOT EXISTS collab_projects_owner_idx ON public.collab_projects(owner_id);
CREATE INDEX IF NOT EXISTS collab_projects_type_idx ON public.collab_projects(project_type);
CREATE INDEX IF NOT EXISTS collab_projects_status_idx ON public.collab_projects(status);
CREATE INDEX IF NOT EXISTS collab_projects_created_idx ON public.collab_projects(created_at DESC);
CREATE INDEX IF NOT EXISTS collab_project_roles_project_idx ON public.collab_project_roles(project_id);
CREATE INDEX IF NOT EXISTS collab_project_roles_status_idx ON public.collab_project_roles(status);
CREATE INDEX IF NOT EXISTS collab_team_members_project_idx ON public.collab_team_members(project_id);
CREATE INDEX IF NOT EXISTS collab_team_members_user_idx ON public.collab_team_members(user_id);
CREATE INDEX IF NOT EXISTS collab_project_applications_project_idx ON public.collab_project_applications(project_id);
CREATE INDEX IF NOT EXISTS collab_project_applications_role_idx ON public.collab_project_applications(role_id);
CREATE INDEX IF NOT EXISTS collab_project_applications_applicant_idx ON public.collab_project_applications(applicant_id);
CREATE INDEX IF NOT EXISTS collab_project_updates_project_idx ON public.collab_project_updates(project_id);

-- Updated_at utility function for this module
CREATE OR REPLACE FUNCTION public.touch_collab_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_collab_projects_updated_at
BEFORE UPDATE ON public.collab_projects
FOR EACH ROW EXECUTE PROCEDURE public.touch_collab_updated_at();

CREATE TRIGGER set_collab_project_roles_updated_at
BEFORE UPDATE ON public.collab_project_roles
FOR EACH ROW EXECUTE PROCEDURE public.touch_collab_updated_at();

CREATE TRIGGER set_collab_team_members_updated_at
BEFORE UPDATE ON public.collab_team_members
FOR EACH ROW EXECUTE PROCEDURE public.touch_collab_updated_at();

CREATE TRIGGER set_collab_project_applications_updated_at
BEFORE UPDATE ON public.collab_project_applications
FOR EACH ROW EXECUTE PROCEDURE public.touch_collab_updated_at();

CREATE TRIGGER set_collab_project_updates_updated_at
BEFORE UPDATE ON public.collab_project_updates
FOR EACH ROW EXECUTE PROCEDURE public.touch_collab_updated_at();

-- Helper functions to keep aggregate counts in sync
CREATE OR REPLACE FUNCTION public.recalculate_collab_team_size(target_project uuid)
RETURNS void AS $$
DECLARE
  active_members integer;
BEGIN
  SELECT COALESCE(COUNT(*), 0) INTO active_members
  FROM public.collab_team_members
  WHERE project_id = target_project AND status = 'active';

  UPDATE public.collab_projects
  SET team_size_current = active_members
  WHERE id = target_project;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.recalculate_collab_role_fill(target_role uuid)
RETURNS void AS $$
DECLARE
  active_members integer;
BEGIN
  SELECT COALESCE(COUNT(*), 0) INTO active_members
  FROM public.collab_team_members
  WHERE role_id = target_role AND status = 'active';

  UPDATE public.collab_project_roles
  SET spots_filled = active_members
  WHERE id = target_role;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.recalculate_collab_open_roles(target_project uuid)
RETURNS void AS $$
DECLARE
  open_slots integer;
BEGIN
  SELECT COALESCE(SUM(GREATEST(r.spots_total - r.spots_filled, 0)), 0) INTO open_slots
  FROM public.collab_project_roles r
  WHERE r.project_id = target_project AND r.status = 'open';

  UPDATE public.collab_projects
  SET open_role_count = open_slots
  WHERE id = target_project;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.on_collab_project_role_change()
RETURNS trigger AS $$
DECLARE
  target_project uuid;
BEGIN
  target_project := COALESCE(NEW.project_id, OLD.project_id);
  IF target_project IS NOT NULL THEN
    PERFORM public.recalculate_collab_open_roles(target_project);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_open_role_count
AFTER INSERT OR UPDATE OR DELETE ON public.collab_project_roles
FOR EACH ROW EXECUTE PROCEDURE public.on_collab_project_role_change();

CREATE OR REPLACE FUNCTION public.on_collab_team_members_change()
RETURNS trigger AS $$
DECLARE
  target_project uuid;
  old_role uuid;
  new_role uuid;
BEGIN
  target_project := COALESCE(NEW.project_id, OLD.project_id);
  old_role := OLD.role_id;
  new_role := NEW.role_id;

  IF target_project IS NOT NULL THEN
    PERFORM public.recalculate_collab_team_size(target_project);
    PERFORM public.recalculate_collab_open_roles(target_project);
  END IF;

  IF old_role IS NOT NULL AND old_role <> new_role THEN
    PERFORM public.recalculate_collab_role_fill(old_role);
  END IF;
  IF new_role IS NOT NULL THEN
    PERFORM public.recalculate_collab_role_fill(new_role);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_collab_team_counts
AFTER INSERT OR UPDATE OR DELETE ON public.collab_team_members
FOR EACH ROW EXECUTE PROCEDURE public.on_collab_team_members_change();

-- Row Level Security policies
ALTER TABLE public.collab_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_project_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_project_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_project_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collab projects viewable if not private" ON public.collab_projects
FOR SELECT USING (visibility != 'private' OR auth.uid() = owner_id);

CREATE POLICY "Users manage their collab projects" ON public.collab_projects
FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Collab roles follow project visibility" ON public.collab_project_roles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.collab_projects p
    WHERE p.id = project_id AND (p.visibility != 'private' OR auth.uid() = p.owner_id)
  )
);

CREATE POLICY "Project owners manage roles" ON public.collab_project_roles
FOR ALL USING (
  auth.uid() = (
    SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
  )
) WITH CHECK (
  auth.uid() = (
    SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
  )
);

CREATE POLICY "Team membership visible to owner and members" ON public.collab_team_members
FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() = (
    SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
  )
);

CREATE POLICY "Owners manage team membership" ON public.collab_team_members
FOR ALL USING (
  auth.uid() = (
    SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
  )
) WITH CHECK (
  auth.uid() = (
    SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
  )
);

CREATE POLICY "Applications are visible to applicant or owner" ON public.collab_project_applications
FOR SELECT USING (
  auth.uid() = applicant_id OR auth.uid() = (
    SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
  )
);

CREATE POLICY "Applicants can apply" ON public.collab_project_applications
FOR INSERT WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Owners or applicants can update applications" ON public.collab_project_applications
FOR UPDATE USING (
  auth.uid() = applicant_id OR auth.uid() = (
    SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
  )
);

CREATE POLICY "Owners or applicants can delete applications" ON public.collab_project_applications
FOR DELETE USING (
  auth.uid() = applicant_id OR auth.uid() = (
    SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
  )
);

CREATE POLICY "Project updates follow visibility" ON public.collab_project_updates
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.collab_projects p
    LEFT JOIN public.collab_team_members tm ON tm.project_id = p.id AND tm.user_id = auth.uid()
    WHERE p.id = project_id AND (
      p.visibility != 'private'
      OR auth.uid() = p.owner_id
      OR tm.status = 'active'
    )
  )
);

CREATE POLICY "Owners or team members can post updates" ON public.collab_project_updates
FOR INSERT WITH CHECK (
  auth.uid() = (
    SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
  ) OR EXISTS (
    SELECT 1 FROM public.collab_team_members tm
    WHERE tm.project_id = project_id AND tm.user_id = auth.uid() AND tm.status = 'active'
  )
);

CREATE POLICY "Owners manage updates" ON public.collab_project_updates
FOR UPDATE USING (
  auth.uid() = (
    SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
  )
);

CREATE POLICY "Owners delete updates" ON public.collab_project_updates
FOR DELETE USING (
  auth.uid() = (
    SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
  )
);

COMMIT;
