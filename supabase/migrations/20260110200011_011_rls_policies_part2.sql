-- ============================================================================
-- 011_rls_policies_part2.sql - Row Level Security Policies (Part 2)
-- U-Hub Platform Database Baseline
-- ============================================================================

BEGIN;

-- ============================================================================
-- JOBS RLS
-- ============================================================================
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active jobs are viewable by everyone" ON public.jobs;
CREATE POLICY "Active jobs are viewable by everyone" ON public.jobs
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Job posters can view all their jobs" ON public.jobs;
CREATE POLICY "Job posters can view all their jobs" ON public.jobs
  FOR SELECT USING (auth.uid() = poster_id);

DROP POLICY IF EXISTS "Users can post jobs" ON public.jobs;
CREATE POLICY "Users can post jobs" ON public.jobs
  FOR INSERT WITH CHECK (auth.uid() = poster_id);

DROP POLICY IF EXISTS "Posters can update their jobs" ON public.jobs;
CREATE POLICY "Posters can update their jobs" ON public.jobs
  FOR UPDATE USING (auth.uid() = poster_id);

DROP POLICY IF EXISTS "Posters can delete their jobs" ON public.jobs;
CREATE POLICY "Posters can delete their jobs" ON public.jobs
  FOR DELETE USING (auth.uid() = poster_id);

-- ============================================================================
-- JOB APPLICATIONS RLS
-- ============================================================================
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Applicants can view their applications" ON public.job_applications;
CREATE POLICY "Applicants can view their applications" ON public.job_applications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Job posters can view applications" ON public.job_applications;
CREATE POLICY "Job posters can view applications" ON public.job_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND poster_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can apply to jobs" ON public.job_applications;
CREATE POLICY "Users can apply to jobs" ON public.job_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Job posters can update applications" ON public.job_applications;
CREATE POLICY "Job posters can update applications" ON public.job_applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND poster_id = auth.uid())
  );

-- ============================================================================
-- SAVED JOBS RLS
-- ============================================================================
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their saved jobs" ON public.saved_jobs;
CREATE POLICY "Users can view their saved jobs" ON public.saved_jobs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can save jobs" ON public.saved_jobs;
CREATE POLICY "Users can save jobs" ON public.saved_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unsave jobs" ON public.saved_jobs;
CREATE POLICY "Users can unsave jobs" ON public.saved_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- COLLAB PROJECTS RLS
-- ============================================================================
ALTER TABLE public.collab_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public projects are viewable by everyone" ON public.collab_projects;
CREATE POLICY "Public projects are viewable by everyone" ON public.collab_projects
  FOR SELECT USING (visibility = 'public' OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can create projects" ON public.collab_projects;
CREATE POLICY "Users can create projects" ON public.collab_projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update their projects" ON public.collab_projects;
CREATE POLICY "Owners can update their projects" ON public.collab_projects
  FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete their projects" ON public.collab_projects;
CREATE POLICY "Owners can delete their projects" ON public.collab_projects
  FOR DELETE USING (auth.uid() = owner_id);

-- ============================================================================
-- COLLAB PROJECT ROLES RLS
-- ============================================================================
ALTER TABLE public.collab_project_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project roles are viewable by everyone" ON public.collab_project_roles;
CREATE POLICY "Project roles are viewable by everyone" ON public.collab_project_roles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Project owners can manage roles" ON public.collab_project_roles;
CREATE POLICY "Project owners can manage roles" ON public.collab_project_roles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.collab_projects WHERE id = project_id AND owner_id = auth.uid())
  );

-- ============================================================================
-- COLLAB TEAM MEMBERS RLS
-- ============================================================================
ALTER TABLE public.collab_team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members viewable by project participants" ON public.collab_team_members;
CREATE POLICY "Team members viewable by project participants" ON public.collab_team_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Project owners can manage team" ON public.collab_team_members;
CREATE POLICY "Project owners can manage team" ON public.collab_team_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.collab_projects WHERE id = project_id AND owner_id = auth.uid())
  );

-- ============================================================================
-- COLLAB PROJECT APPLICATIONS RLS
-- ============================================================================
ALTER TABLE public.collab_project_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Applicants can view their applications" ON public.collab_project_applications;
CREATE POLICY "Applicants can view their applications" ON public.collab_project_applications
  FOR SELECT USING (auth.uid() = applicant_id);

DROP POLICY IF EXISTS "Project owners can view applications" ON public.collab_project_applications;
CREATE POLICY "Project owners can view applications" ON public.collab_project_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.collab_projects WHERE id = project_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can apply to projects" ON public.collab_project_applications;
CREATE POLICY "Users can apply to projects" ON public.collab_project_applications
  FOR INSERT WITH CHECK (auth.uid() = applicant_id);

DROP POLICY IF EXISTS "Project owners can update applications" ON public.collab_project_applications;
CREATE POLICY "Project owners can update applications" ON public.collab_project_applications
  FOR UPDATE USING (
    auth.uid() = applicant_id OR
    EXISTS (SELECT 1 FROM public.collab_projects WHERE id = project_id AND owner_id = auth.uid())
  );

-- ============================================================================
-- COLLAB PROJECT UPDATES RLS
-- ============================================================================
ALTER TABLE public.collab_project_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public updates viewable by everyone" ON public.collab_project_updates;
CREATE POLICY "Public updates viewable by everyone" ON public.collab_project_updates
  FOR SELECT USING (visibility = 'public');

DROP POLICY IF EXISTS "Team members can post updates" ON public.collab_project_updates;
CREATE POLICY "Team members can post updates" ON public.collab_project_updates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.collab_team_members WHERE project_id = collab_project_updates.project_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.collab_projects WHERE id = project_id AND owner_id = auth.uid())
  );

-- ============================================================================
-- CLUBS RLS
-- ============================================================================
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active clubs are viewable by everyone" ON public.clubs;
CREATE POLICY "Active clubs are viewable by everyone" ON public.clubs
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can create clubs" ON public.clubs;
CREATE POLICY "Users can create clubs" ON public.clubs
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creators can update their clubs" ON public.clubs;
CREATE POLICY "Creators can update their clubs" ON public.clubs
  FOR UPDATE USING (auth.uid() = created_by);

-- ============================================================================
-- CLUB MEMBERS RLS
-- ============================================================================
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Club members are viewable by everyone" ON public.club_members;
CREATE POLICY "Club members are viewable by everyone" ON public.club_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can join clubs" ON public.club_members;
CREATE POLICY "Users can join clubs" ON public.club_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can leave clubs" ON public.club_members;
CREATE POLICY "Users can leave clubs" ON public.club_members
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- MENTORSHIP OFFERS RLS
-- ============================================================================
ALTER TABLE public.mentorship_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active mentorship offers viewable by everyone" ON public.mentorship_offers;
CREATE POLICY "Active mentorship offers viewable by everyone" ON public.mentorship_offers
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Mentors can manage their offers" ON public.mentorship_offers;
CREATE POLICY "Mentors can manage their offers" ON public.mentorship_offers
  FOR ALL USING (auth.uid() = mentor_id);

-- ============================================================================
-- MENTORSHIP REQUESTS RLS
-- ============================================================================
ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mentees can view their requests" ON public.mentorship_requests;
CREATE POLICY "Mentees can view their requests" ON public.mentorship_requests
  FOR SELECT USING (auth.uid() = mentee_id);

DROP POLICY IF EXISTS "Mentors can view requests to them" ON public.mentorship_requests;
CREATE POLICY "Mentors can view requests to them" ON public.mentorship_requests
  FOR SELECT USING (auth.uid() = mentor_id);

DROP POLICY IF EXISTS "Mentees can create requests" ON public.mentorship_requests;
CREATE POLICY "Mentees can create requests" ON public.mentorship_requests
  FOR INSERT WITH CHECK (auth.uid() = mentee_id);

DROP POLICY IF EXISTS "Involved users can update requests" ON public.mentorship_requests;
CREATE POLICY "Involved users can update requests" ON public.mentorship_requests
  FOR UPDATE USING (auth.uid() = mentee_id OR auth.uid() = mentor_id);

-- ============================================================================
-- ECOCAMPUS RLS
-- ============================================================================
ALTER TABLE public.shared_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_requests ENABLE ROW LEVEL SECURITY;

-- Shared Items
DROP POLICY IF EXISTS "Available items viewable by everyone" ON public.shared_items;
CREATE POLICY "Available items viewable by everyone" ON public.shared_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can share items" ON public.shared_items;
CREATE POLICY "Users can share items" ON public.shared_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their shared items" ON public.shared_items;
CREATE POLICY "Users can manage their shared items" ON public.shared_items
  FOR ALL USING (auth.uid() = user_id);

-- Item Requests
DROP POLICY IF EXISTS "Item requests viewable by everyone" ON public.item_requests;
CREATE POLICY "Item requests viewable by everyone" ON public.item_requests
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create item requests" ON public.item_requests;
CREATE POLICY "Users can create item requests" ON public.item_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their item requests" ON public.item_requests;
CREATE POLICY "Users can manage their item requests" ON public.item_requests
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- NOTES RLS
-- ============================================================================
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their notes" ON public.notes;
CREATE POLICY "Users can view their notes" ON public.notes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their notes" ON public.notes;
CREATE POLICY "Users can manage their notes" ON public.notes
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- VERIFICATION & ADMIN RLS
-- ============================================================================
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

-- Verification Requests
DROP POLICY IF EXISTS "Users can view their verification requests" ON public.verification_requests;
CREATE POLICY "Users can view their verification requests" ON public.verification_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can submit verification requests" ON public.verification_requests;
CREATE POLICY "Users can submit verification requests" ON public.verification_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Role Change History (read-only for users)
DROP POLICY IF EXISTS "Users can view their role history" ON public.role_change_history;
CREATE POLICY "Users can view their role history" ON public.role_change_history
  FOR SELECT USING (auth.uid() = user_id);

-- Admin Roles (restricted)
DROP POLICY IF EXISTS "Admins can view admin roles" ON public.admin_roles;
CREATE POLICY "Admins can view admin roles" ON public.admin_roles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_roles ar WHERE ar.user_id = auth.uid())
  );

-- Moderation Reports
DROP POLICY IF EXISTS "Users can submit reports" ON public.moderation_reports;
CREATE POLICY "Users can submit reports" ON public.moderation_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can view their reports" ON public.moderation_reports;
CREATE POLICY "Users can view their reports" ON public.moderation_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Moderation Actions (admin only)
DROP POLICY IF EXISTS "Moderators can view actions" ON public.moderation_actions;
CREATE POLICY "Moderators can view actions" ON public.moderation_actions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_roles ar WHERE ar.user_id = auth.uid() AND ar.can_manage_posts = true)
  );

-- Account Deletion Audit (insert only, no select for users)
ALTER TABLE public.account_deletion_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can insert audit records" ON public.account_deletion_audit;
CREATE POLICY "System can insert audit records" ON public.account_deletion_audit
  FOR INSERT WITH CHECK (true);

COMMIT;
