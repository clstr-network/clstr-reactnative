-- Complete college domain isolation for ALL remaining tables
-- This extends the domain isolation to cover every table that was missed
BEGIN;

-- ============================================================================
-- STEP 1: Add college_domain to CollabHub tables
-- ============================================================================

-- collab_projects
ALTER TABLE public.collab_projects 
ADD COLUMN IF NOT EXISTS college_domain text;

CREATE INDEX IF NOT EXISTS collab_projects_college_domain_idx ON public.collab_projects(college_domain);

-- Backfill existing projects with creator's college domain
UPDATE public.collab_projects p
SET college_domain = prof.college_domain
FROM public.profiles prof
WHERE p.owner_id = prof.id AND p.college_domain IS NULL;

-- collab_project_roles (inherit from project)
ALTER TABLE public.collab_project_roles 
ADD COLUMN IF NOT EXISTS college_domain text;

CREATE INDEX IF NOT EXISTS collab_project_roles_college_domain_idx ON public.collab_project_roles(college_domain);

-- Backfill roles with their project's college domain
UPDATE public.collab_project_roles r
SET college_domain = p.college_domain
FROM public.collab_projects p
WHERE r.project_id = p.id AND r.college_domain IS NULL;

-- collab_team_members (inherit from project)
ALTER TABLE public.collab_team_members 
ADD COLUMN IF NOT EXISTS college_domain text;

CREATE INDEX IF NOT EXISTS collab_team_members_college_domain_idx ON public.collab_team_members(college_domain);

-- Backfill team members with their project's college domain
UPDATE public.collab_team_members tm
SET college_domain = p.college_domain
FROM public.collab_projects p
WHERE tm.project_id = p.id AND tm.college_domain IS NULL;

-- collab_project_applications (inherit from project)
ALTER TABLE public.collab_project_applications 
ADD COLUMN IF NOT EXISTS college_domain text;

CREATE INDEX IF NOT EXISTS collab_project_applications_college_domain_idx ON public.collab_project_applications(college_domain);

-- Backfill applications with their project's college domain
UPDATE public.collab_project_applications a
SET college_domain = p.college_domain
FROM public.collab_projects p
WHERE a.project_id = p.id AND a.college_domain IS NULL;

-- collab_project_updates (inherit from project)
ALTER TABLE public.collab_project_updates 
ADD COLUMN IF NOT EXISTS college_domain text;

CREATE INDEX IF NOT EXISTS collab_project_updates_college_domain_idx ON public.collab_project_updates(college_domain);

-- Backfill updates with their project's college domain
UPDATE public.collab_project_updates u
SET college_domain = p.college_domain
FROM public.collab_projects p
WHERE u.project_id = p.id AND u.college_domain IS NULL;

-- ============================================================================
-- STEP 2: Add college_domain to social features tables
-- ============================================================================

-- Comments (inherit from post)
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS college_domain text;

CREATE INDEX IF NOT EXISTS comments_college_domain_idx ON public.comments(college_domain);

-- Backfill comments with their post's college domain
UPDATE public.comments c
SET college_domain = p.college_domain
FROM public.posts p
WHERE c.post_id = p.id AND c.college_domain IS NULL;

-- Post likes (inherit from post)
ALTER TABLE public.post_likes 
ADD COLUMN IF NOT EXISTS college_domain text;

CREATE INDEX IF NOT EXISTS post_likes_college_domain_idx ON public.post_likes(college_domain);

-- Backfill post likes with their post's college domain
UPDATE public.post_likes pl
SET college_domain = p.college_domain
FROM public.posts p
WHERE pl.post_id = p.id AND pl.college_domain IS NULL;

-- Comment likes (inherit from comment)
ALTER TABLE public.comment_likes 
ADD COLUMN IF NOT EXISTS college_domain text;

CREATE INDEX IF NOT EXISTS comment_likes_college_domain_idx ON public.comment_likes(college_domain);

-- Backfill comment likes with their comment's college domain
UPDATE public.comment_likes cl
SET college_domain = c.college_domain
FROM public.comments c
WHERE cl.comment_id = c.id AND cl.college_domain IS NULL;

-- Notifications
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS college_domain text;

CREATE INDEX IF NOT EXISTS notifications_college_domain_idx ON public.notifications(college_domain);

-- Backfill notifications with user's college domain
UPDATE public.notifications n
SET college_domain = prof.college_domain
FROM public.profiles prof
WHERE n.user_id = prof.id AND n.college_domain IS NULL;

-- ============================================================================
-- STEP 3: Add college_domain to role-specific profile tables
-- ============================================================================

-- Student profiles (inherit from main profile)
ALTER TABLE public.student_profiles 
ADD COLUMN IF NOT EXISTS college_domain text;

CREATE INDEX IF NOT EXISTS student_profiles_college_domain_idx ON public.student_profiles(college_domain);

UPDATE public.student_profiles sp
SET college_domain = p.college_domain
FROM public.profiles p
WHERE sp.user_id = p.id AND sp.college_domain IS NULL;

-- Alumni profiles (inherit from main profile)
ALTER TABLE public.alumni_profiles 
ADD COLUMN IF NOT EXISTS college_domain text;

CREATE INDEX IF NOT EXISTS alumni_profiles_college_domain_idx ON public.alumni_profiles(college_domain);

UPDATE public.alumni_profiles ap
SET college_domain = p.college_domain
FROM public.profiles p
WHERE ap.user_id = p.id AND ap.college_domain IS NULL;

-- Faculty profiles (inherit from main profile)
ALTER TABLE public.faculty_profiles 
ADD COLUMN IF NOT EXISTS college_domain text;

CREATE INDEX IF NOT EXISTS faculty_profiles_college_domain_idx ON public.faculty_profiles(college_domain);

UPDATE public.faculty_profiles fp
SET college_domain = p.college_domain
FROM public.profiles p
WHERE fp.user_id = p.id AND fp.college_domain IS NULL;

-- Club profiles (inherit from main profile)
ALTER TABLE public.club_profiles 
ADD COLUMN IF NOT EXISTS college_domain text;

CREATE INDEX IF NOT EXISTS club_profiles_college_domain_idx ON public.club_profiles(college_domain);

UPDATE public.club_profiles cp
SET college_domain = p.college_domain
FROM public.profiles p
WHERE cp.user_id = p.id AND cp.college_domain IS NULL;

-- Organization profiles (inherit from main profile)
ALTER TABLE public.organization_profiles 
ADD COLUMN IF NOT EXISTS college_domain text;

CREATE INDEX IF NOT EXISTS organization_profiles_college_domain_idx ON public.organization_profiles(college_domain);

UPDATE public.organization_profiles op
SET college_domain = p.college_domain
FROM public.profiles p
WHERE op.user_id = p.id AND op.college_domain IS NULL;

-- ============================================================================
-- STEP 4: Create triggers to auto-populate college_domain
-- ============================================================================

-- Function to set college_domain from user's profile
CREATE OR REPLACE FUNCTION set_user_college_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Get the college_domain from the user's profile
  SELECT college_domain INTO NEW.college_domain
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN NEW;
END;
$$;

-- Function to set college_domain from project
CREATE OR REPLACE FUNCTION set_project_college_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Get the college_domain from the project
  SELECT college_domain INTO NEW.college_domain
  FROM public.collab_projects
  WHERE id = NEW.project_id;
  
  RETURN NEW;
END;
$$;

-- Function to set college_domain from post
CREATE OR REPLACE FUNCTION set_post_college_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Get the college_domain from the post
  SELECT college_domain INTO NEW.college_domain
  FROM public.posts
  WHERE id = NEW.post_id;
  
  RETURN NEW;
END;
$$;

-- Function to set college_domain from comment
CREATE OR REPLACE FUNCTION set_comment_college_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Get the college_domain from the comment
  SELECT college_domain INTO NEW.college_domain
  FROM public.comments
  WHERE id = NEW.comment_id;
  
  RETURN NEW;
END;
$$;

-- Function to set college_domain from main profile for role-specific profiles
CREATE OR REPLACE FUNCTION set_role_profile_college_domain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Get the college_domain from the main profile
  SELECT college_domain INTO NEW.college_domain
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Apply triggers to CollabHub tables
-- ============================================================================

-- collab_projects: use existing set_content_college_domain
DROP TRIGGER IF EXISTS set_collab_projects_college_domain ON public.collab_projects;
CREATE TRIGGER set_collab_projects_college_domain
  BEFORE INSERT ON public.collab_projects
  FOR EACH ROW
  EXECUTE FUNCTION set_user_college_domain();

-- collab_project_roles: inherit from project
DROP TRIGGER IF EXISTS set_collab_project_roles_college_domain ON public.collab_project_roles;
CREATE TRIGGER set_collab_project_roles_college_domain
  BEFORE INSERT ON public.collab_project_roles
  FOR EACH ROW
  EXECUTE FUNCTION set_project_college_domain();

-- collab_team_members: inherit from project
DROP TRIGGER IF EXISTS set_collab_team_members_college_domain ON public.collab_team_members;
CREATE TRIGGER set_collab_team_members_college_domain
  BEFORE INSERT ON public.collab_team_members
  FOR EACH ROW
  EXECUTE FUNCTION set_project_college_domain();

-- collab_project_applications: inherit from project
DROP TRIGGER IF EXISTS set_collab_project_applications_college_domain ON public.collab_project_applications;
CREATE TRIGGER set_collab_project_applications_college_domain
  BEFORE INSERT ON public.collab_project_applications
  FOR EACH ROW
  EXECUTE FUNCTION set_project_college_domain();

-- collab_project_updates: inherit from project
DROP TRIGGER IF EXISTS set_collab_project_updates_college_domain ON public.collab_project_updates;
CREATE TRIGGER set_collab_project_updates_college_domain
  BEFORE INSERT ON public.collab_project_updates
  FOR EACH ROW
  EXECUTE FUNCTION set_project_college_domain();

-- ============================================================================
-- Apply triggers to social features
-- ============================================================================

-- Comments: inherit from post
DROP TRIGGER IF EXISTS set_comments_college_domain ON public.comments;
CREATE TRIGGER set_comments_college_domain
  BEFORE INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION set_post_college_domain();

-- Post likes: inherit from post
DROP TRIGGER IF EXISTS set_post_likes_college_domain ON public.post_likes;
CREATE TRIGGER set_post_likes_college_domain
  BEFORE INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION set_post_college_domain();

-- Comment likes: inherit from comment
DROP TRIGGER IF EXISTS set_comment_likes_college_domain ON public.comment_likes;
CREATE TRIGGER set_comment_likes_college_domain
  BEFORE INSERT ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION set_comment_college_domain();

-- Notifications: inherit from user
DROP TRIGGER IF EXISTS set_notifications_college_domain ON public.notifications;
CREATE TRIGGER set_notifications_college_domain
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION set_user_college_domain();

-- ============================================================================
-- Apply triggers to role-specific profiles
-- ============================================================================

DROP TRIGGER IF EXISTS set_student_profiles_college_domain ON public.student_profiles;
CREATE TRIGGER set_student_profiles_college_domain
  BEFORE INSERT ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_role_profile_college_domain();

DROP TRIGGER IF EXISTS set_alumni_profiles_college_domain ON public.alumni_profiles;
CREATE TRIGGER set_alumni_profiles_college_domain
  BEFORE INSERT ON public.alumni_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_role_profile_college_domain();

DROP TRIGGER IF EXISTS set_faculty_profiles_college_domain ON public.faculty_profiles;
CREATE TRIGGER set_faculty_profiles_college_domain
  BEFORE INSERT ON public.faculty_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_role_profile_college_domain();

DROP TRIGGER IF EXISTS set_club_profiles_college_domain ON public.club_profiles;
CREATE TRIGGER set_club_profiles_college_domain
  BEFORE INSERT ON public.club_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_role_profile_college_domain();

DROP TRIGGER IF EXISTS set_organization_profiles_college_domain ON public.organization_profiles;
CREATE TRIGGER set_organization_profiles_college_domain
  BEFORE INSERT ON public.organization_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_role_profile_college_domain();

-- ============================================================================
-- STEP 5: Update RLS policies for CollabHub
-- ============================================================================

-- collab_projects: only see projects from same college
DROP POLICY IF EXISTS "Collab projects viewable if not private" ON public.collab_projects;
DROP POLICY IF EXISTS "Collab projects viewable if not private and same college" ON public.collab_projects;
CREATE POLICY "Collab projects viewable if not private and same college" ON public.collab_projects
  FOR SELECT USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    ) AND
    (visibility != 'private' OR auth.uid() = owner_id)
  );

DROP POLICY IF EXISTS "Users manage their collab projects" ON public.collab_projects;
DROP POLICY IF EXISTS "Users manage their collab projects in same college" ON public.collab_projects;
CREATE POLICY "Users manage their collab projects in same college" ON public.collab_projects
  FOR ALL USING (
    auth.uid() = owner_id AND
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  ) WITH CHECK (
    auth.uid() = owner_id AND
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  );

-- collab_project_roles: only see roles from same college projects
DROP POLICY IF EXISTS "Collab roles follow project visibility" ON public.collab_project_roles;
DROP POLICY IF EXISTS "Collab roles follow project visibility and same college" ON public.collab_project_roles;
CREATE POLICY "Collab roles follow project visibility and same college" ON public.collab_project_roles
  FOR SELECT USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.collab_projects p
      WHERE p.id = project_id AND (p.visibility != 'private' OR auth.uid() = p.owner_id)
    )
  );

DROP POLICY IF EXISTS "Project owners manage roles" ON public.collab_project_roles;
DROP POLICY IF EXISTS "Project owners manage roles in same college" ON public.collab_project_roles;
CREATE POLICY "Project owners manage roles in same college" ON public.collab_project_roles
  FOR ALL USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    ) AND
    auth.uid() = (
      SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
    )
  ) WITH CHECK (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    ) AND
    auth.uid() = (
      SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
    )
  );

-- collab_team_members: only see team members from same college
DROP POLICY IF EXISTS "Team membership visible to owner and members" ON public.collab_team_members;
DROP POLICY IF EXISTS "Team membership visible to owner and members same college" ON public.collab_team_members;
CREATE POLICY "Team membership visible to owner and members same college" ON public.collab_team_members
  FOR SELECT USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    ) AND
    (auth.uid() = user_id OR auth.uid() = (
      SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
    ))
  );

DROP POLICY IF EXISTS "Owners manage team membership" ON public.collab_team_members;
DROP POLICY IF EXISTS "Owners manage team membership same college" ON public.collab_team_members;
CREATE POLICY "Owners manage team membership same college" ON public.collab_team_members
FOR ALL USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    ) AND
    auth.uid() = (
      SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
    )
  ) WITH CHECK (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    ) AND
    auth.uid() = (
      SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
    )
  );

-- collab_project_applications: only see applications from same college
DROP POLICY IF EXISTS "Applications are visible to applicant or owner" ON public.collab_project_applications;
DROP POLICY IF EXISTS "Applications visible to applicant or owner same college" ON public.collab_project_applications;
CREATE POLICY "Applications visible to applicant or owner same college" ON public.collab_project_applications
  FOR SELECT USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    ) AND
    (auth.uid() = applicant_id OR auth.uid() = (
      SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
    ))
  );

DROP POLICY IF EXISTS "Applicants can apply" ON public.collab_project_applications;
DROP POLICY IF EXISTS "Applicants can apply same college" ON public.collab_project_applications;
CREATE POLICY "Applicants can apply same college" ON public.collab_project_applications
  FOR INSERT WITH CHECK (
    auth.uid() = applicant_id AND
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners or applicants can update applications" ON public.collab_project_applications;
DROP POLICY IF EXISTS "Owners or applicants can update applications same college" ON public.collab_project_applications;
CREATE POLICY "Owners or applicants can update applications same college" ON public.collab_project_applications
  FOR UPDATE USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    ) AND
    (auth.uid() = applicant_id OR auth.uid() = (
      SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
    ))
  );

DROP POLICY IF EXISTS "Owners or applicants can delete applications" ON public.collab_project_applications;
DROP POLICY IF EXISTS "Owners or applicants can delete applications same college" ON public.collab_project_applications;
CREATE POLICY "Owners or applicants can delete applications same college" ON public.collab_project_applications
  FOR DELETE USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    ) AND
    (
      auth.uid() = applicant_id OR auth.uid() = (
        SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
      )
    )
  );

-- collab_project_updates: only see updates from same college
DROP POLICY IF EXISTS "Project updates follow visibility" ON public.collab_project_updates;
DROP POLICY IF EXISTS "Project updates follow visibility same college" ON public.collab_project_updates;
CREATE POLICY "Project updates follow visibility same college" ON public.collab_project_updates
  FOR SELECT USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    ) AND
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

DROP POLICY IF EXISTS "Owners or team members can post updates" ON public.collab_project_updates;
DROP POLICY IF EXISTS "Owners or team members can post updates same college" ON public.collab_project_updates;
CREATE POLICY "Owners or team members can post updates same college" ON public.collab_project_updates
  FOR INSERT WITH CHECK (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    ) AND
    (auth.uid() = (
      SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
    ) OR EXISTS (
      SELECT 1 FROM public.collab_team_members tm
      WHERE tm.project_id = project_id AND tm.user_id = auth.uid() AND tm.status = 'active'
    ))
  );

DROP POLICY IF EXISTS "Owners manage updates" ON public.collab_project_updates;
DROP POLICY IF EXISTS "Owners manage updates same college" ON public.collab_project_updates;
CREATE POLICY "Owners manage updates same college" ON public.collab_project_updates
  FOR UPDATE USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    ) AND
    auth.uid() = (
      SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
    )
  );

DROP POLICY IF EXISTS "Owners delete updates" ON public.collab_project_updates;
DROP POLICY IF EXISTS "Owners delete updates same college" ON public.collab_project_updates;
CREATE POLICY "Owners delete updates same college" ON public.collab_project_updates
  FOR DELETE USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    ) AND
    auth.uid() = (
      SELECT owner_id FROM public.collab_projects p WHERE p.id = project_id
    )
  );

-- ============================================================================
-- STEP 6: Update RLS policies for social features
-- ============================================================================

-- Comments: only see comments from same college
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Comments viewable by same college only" ON public.comments;
CREATE POLICY "Comments viewable by same college only" ON public.comments
  FOR SELECT USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments in same college" ON public.comments;
CREATE POLICY "Users can create comments in same college" ON public.comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Post likes: only see likes from same college
DROP POLICY IF EXISTS "Post likes are viewable by everyone" ON public.post_likes;
DROP POLICY IF EXISTS "Post likes viewable by same college only" ON public.post_likes;
CREATE POLICY "Post likes viewable by same college only" ON public.post_likes
  FOR SELECT USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
DROP POLICY IF EXISTS "Users can like posts in same college" ON public.post_likes;
CREATE POLICY "Users can like posts in same college" ON public.post_likes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Comment likes: only see likes from same college
DROP POLICY IF EXISTS "Comment likes are viewable by everyone" ON public.comment_likes;
DROP POLICY IF EXISTS "Comment likes viewable by same college only" ON public.comment_likes;
CREATE POLICY "Comment likes viewable by same college only" ON public.comment_likes
  FOR SELECT USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can like comments" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can like comments in same college" ON public.comment_likes;
CREATE POLICY "Users can like comments in same college" ON public.comment_likes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Notifications: only see notifications from same college
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications same college" ON public.notifications;
CREATE POLICY "Users can view their own notifications same college" ON public.notifications
  FOR SELECT USING (
    auth.uid() = user_id AND
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 7: Update RLS policies for role-specific profiles
-- ============================================================================

-- Student profiles: only see from same college
DROP POLICY IF EXISTS "Student profiles are viewable by everyone" ON public.student_profiles;
DROP POLICY IF EXISTS "Student profiles viewable by same college only" ON public.student_profiles;
CREATE POLICY "Student profiles viewable by same college only" ON public.student_profiles
  FOR SELECT USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Alumni profiles: only see from same college
DROP POLICY IF EXISTS "Alumni profiles are viewable by everyone" ON public.alumni_profiles;
DROP POLICY IF EXISTS "Alumni profiles viewable by same college only" ON public.alumni_profiles;
CREATE POLICY "Alumni profiles viewable by same college only" ON public.alumni_profiles
  FOR SELECT USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Faculty profiles: only see from same college
DROP POLICY IF EXISTS "Faculty profiles are viewable by everyone" ON public.faculty_profiles;
DROP POLICY IF EXISTS "Faculty profiles viewable by same college only" ON public.faculty_profiles;
CREATE POLICY "Faculty profiles viewable by same college only" ON public.faculty_profiles
  FOR SELECT USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Club profiles: only see from same college
DROP POLICY IF EXISTS "Club profiles are viewable by everyone" ON public.club_profiles;
DROP POLICY IF EXISTS "Club profiles viewable by same college only" ON public.club_profiles;
CREATE POLICY "Club profiles viewable by same college only" ON public.club_profiles
  FOR SELECT USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Organization profiles: only see from same college
DROP POLICY IF EXISTS "Organization profiles are viewable by everyone" ON public.organization_profiles;
DROP POLICY IF EXISTS "Organization profiles viewable by same college only" ON public.organization_profiles;
CREATE POLICY "Organization profiles viewable by same college only" ON public.organization_profiles
  FOR SELECT USING (
    college_domain = (
      SELECT college_domain FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 8: Create helper view for easy domain debugging
-- ============================================================================

CREATE OR REPLACE VIEW public.domain_statistics AS
SELECT 
  p.college_domain,
  COUNT(DISTINCT p.id) as total_users,
  COUNT(DISTINCT CASE WHEN p.role = 'Student' THEN p.id END) as students,
  COUNT(DISTINCT CASE WHEN p.role = 'Alumni' THEN p.id END) as alumni,
  COUNT(DISTINCT CASE WHEN p.role = 'Faculty' THEN p.id END) as faculty,
  COUNT(DISTINCT CASE WHEN p.role = 'Club' THEN p.id END) as clubs,
  COUNT(DISTINCT CASE WHEN p.role = 'Organization' THEN p.id END) as organizations,
  COUNT(DISTINCT po.id) as posts,
  COUNT(DISTINCT e.id) as events,
  COUNT(DISTINCT j.id) as jobs,
  COUNT(DISTINCT cp.id) as collab_projects,
  COUNT(DISTINCT m.id) as mentorship_offers
FROM public.profiles p
LEFT JOIN public.posts po ON po.college_domain = p.college_domain
LEFT JOIN public.events e ON e.college_domain = p.college_domain
LEFT JOIN public.jobs j ON j.college_domain = p.college_domain
LEFT JOIN public.collab_projects cp ON cp.college_domain = p.college_domain
LEFT JOIN public.mentorship_offers m ON m.college_domain = p.college_domain
WHERE p.college_domain IS NOT NULL
GROUP BY p.college_domain
ORDER BY total_users DESC;

COMMIT;
