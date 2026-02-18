-- ============================================================================
-- 010_rls_policies.sql - Row Level Security Policies
-- U-Hub Platform Database Baseline
-- ============================================================================

BEGIN;

-- ============================================================================
-- PROFILES RLS
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- ============================================================================
-- ROLE-SPECIFIC PROFILES RLS
-- ============================================================================
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_profiles ENABLE ROW LEVEL SECURITY;

-- Student Profiles
DROP POLICY IF EXISTS "Student profiles viewable by all" ON public.student_profiles;
CREATE POLICY "Student profiles viewable by all" ON public.student_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own student profile" ON public.student_profiles;
CREATE POLICY "Users manage own student profile" ON public.student_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Alumni Profiles
DROP POLICY IF EXISTS "Alumni profiles viewable by all" ON public.alumni_profiles;
CREATE POLICY "Alumni profiles viewable by all" ON public.alumni_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own alumni profile" ON public.alumni_profiles;
CREATE POLICY "Users manage own alumni profile" ON public.alumni_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Faculty Profiles
DROP POLICY IF EXISTS "Faculty profiles viewable by all" ON public.faculty_profiles;
CREATE POLICY "Faculty profiles viewable by all" ON public.faculty_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own faculty profile" ON public.faculty_profiles;
CREATE POLICY "Users manage own faculty profile" ON public.faculty_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Club Profiles
DROP POLICY IF EXISTS "Club profiles viewable by all" ON public.club_profiles;
CREATE POLICY "Club profiles viewable by all" ON public.club_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own club profile" ON public.club_profiles;
CREATE POLICY "Users manage own club profile" ON public.club_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Organization Profiles
DROP POLICY IF EXISTS "Organization profiles viewable by all" ON public.organization_profiles;
CREATE POLICY "Organization profiles viewable by all" ON public.organization_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own organization profile" ON public.organization_profiles;
CREATE POLICY "Users manage own organization profile" ON public.organization_profiles
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- PROFILE DETAILS RLS
-- ============================================================================
ALTER TABLE public.profile_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_achievements ENABLE ROW LEVEL SECURITY;

-- Experience
DROP POLICY IF EXISTS "Experience is viewable by everyone" ON public.profile_experience;
CREATE POLICY "Experience is viewable by everyone" ON public.profile_experience
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own experience" ON public.profile_experience;
CREATE POLICY "Users can manage their own experience" ON public.profile_experience
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND id = auth.uid())
  );

-- Education
DROP POLICY IF EXISTS "Education is viewable by everyone" ON public.profile_education;
CREATE POLICY "Education is viewable by everyone" ON public.profile_education
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own education" ON public.profile_education;
CREATE POLICY "Users can manage their own education" ON public.profile_education
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND id = auth.uid())
  );

-- Skills
DROP POLICY IF EXISTS "Skills are viewable by everyone" ON public.profile_skills;
CREATE POLICY "Skills are viewable by everyone" ON public.profile_skills
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own skills" ON public.profile_skills;
CREATE POLICY "Users can manage their own skills" ON public.profile_skills
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND id = auth.uid())
  );

-- Profile Views
DROP POLICY IF EXISTS "Profile views viewable by profile owner" ON public.profile_views;
CREATE POLICY "Profile views viewable by profile owner" ON public.profile_views
  FOR SELECT USING (profile_id = auth.uid() OR viewer_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can record profile views" ON public.profile_views;
CREATE POLICY "Anyone can record profile views" ON public.profile_views
  FOR INSERT WITH CHECK (true);

-- Certifications
DROP POLICY IF EXISTS "Certifications viewable by all" ON public.profile_certifications;
CREATE POLICY "Certifications viewable by all" ON public.profile_certifications
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own certifications" ON public.profile_certifications;
CREATE POLICY "Users manage own certifications" ON public.profile_certifications
  FOR ALL USING (profile_id = auth.uid());

-- Projects
DROP POLICY IF EXISTS "Profile projects viewable by all" ON public.profile_projects;
CREATE POLICY "Profile projects viewable by all" ON public.profile_projects
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own profile projects" ON public.profile_projects;
CREATE POLICY "Users manage own profile projects" ON public.profile_projects
  FOR ALL USING (profile_id = auth.uid());

-- Achievements
DROP POLICY IF EXISTS "Achievements viewable by all" ON public.profile_achievements;
CREATE POLICY "Achievements viewable by all" ON public.profile_achievements
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own achievements" ON public.profile_achievements;
CREATE POLICY "Users manage own achievements" ON public.profile_achievements
  FOR ALL USING (profile_id = auth.uid());

-- ============================================================================
-- USER SETTINGS RLS
-- ============================================================================
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
CREATE POLICY "Users can manage own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- POSTS RLS
-- NOTE: Posts use USING (true) for SELECT intentionally.
-- Clstr.network is a cross-campus networking platform — students from
-- different colleges can see each other's posts. This is by design
-- to encourage inter-college collaboration and networking. If college-
-- scoped isolation is ever needed, replace USING (true) with a
-- domain-based filter: USING (public.get_user_college_domain() = college_domain).
-- Same applies to post_likes, post_comments, post_shares, post_bookmarks.
-- ============================================================================
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by everyone" ON public.posts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
CREATE POLICY "Users can create their own posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts" ON public.posts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "Users can delete their own posts" ON public.posts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- POST LIKES RLS
-- ============================================================================
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Post likes are viewable by everyone" ON public.post_likes;
CREATE POLICY "Post likes are viewable by everyone" ON public.post_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
CREATE POLICY "Users can like posts" ON public.post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike posts" ON public.post_likes;
CREATE POLICY "Users can unlike posts" ON public.post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS RLS
-- ============================================================================
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone" ON public.comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
CREATE POLICY "Users can create comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
CREATE POLICY "Users can update their own comments" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
CREATE POLICY "Users can delete their own comments" ON public.comments
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENT LIKES RLS
-- ============================================================================
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comment likes are viewable by everyone" ON public.comment_likes;
CREATE POLICY "Comment likes are viewable by everyone" ON public.comment_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like comments" ON public.comment_likes;
CREATE POLICY "Users can like comments" ON public.comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike comments" ON public.comment_likes;
CREATE POLICY "Users can unlike comments" ON public.comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- POST REPORTS RLS
-- ============================================================================
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can report posts" ON public.post_reports;
CREATE POLICY "Users can report posts" ON public.post_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- ============================================================================
-- HIDDEN POSTS RLS
-- ============================================================================
ALTER TABLE public.hidden_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their hidden posts" ON public.hidden_posts;
CREATE POLICY "Users can view their hidden posts" ON public.hidden_posts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can hide posts" ON public.hidden_posts;
CREATE POLICY "Users can hide posts" ON public.hidden_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unhide posts" ON public.hidden_posts;
CREATE POLICY "Users can unhide posts" ON public.hidden_posts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- CONNECTIONS RLS
-- ============================================================================
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Connections are viewable by involved users" ON public.connections;
CREATE POLICY "Connections are viewable by involved users" ON public.connections
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send connection requests" ON public.connections;
CREATE POLICY "Users can send connection requests" ON public.connections
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can update their connections" ON public.connections;
CREATE POLICY "Users can update their connections" ON public.connections
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can delete their connections" ON public.connections;
CREATE POLICY "Users can delete their connections" ON public.connections
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- ============================================================================
-- MESSAGES RLS
-- ============================================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
CREATE POLICY "Users can view their messages" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update their messages" ON public.messages;
CREATE POLICY "Users can update their messages" ON public.messages
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- ============================================================================
-- NOTIFICATIONS RLS
-- ============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
CREATE POLICY "Users can update their notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their notifications" ON public.notifications;
CREATE POLICY "Users can delete their notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- SAVED ITEMS RLS
-- ============================================================================
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their saved items" ON public.saved_items;
CREATE POLICY "Users can view their saved items" ON public.saved_items
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can save items" ON public.saved_items;
CREATE POLICY "Users can save items" ON public.saved_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unsave items" ON public.saved_items;
CREATE POLICY "Users can unsave items" ON public.saved_items
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- EVENTS RLS
-- ============================================================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
CREATE POLICY "Events are viewable by everyone" ON public.events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create events" ON public.events;
CREATE POLICY "Users can create events" ON public.events
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update their events" ON public.events;
CREATE POLICY "Creators can update their events" ON public.events
  FOR UPDATE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete their events" ON public.events;
CREATE POLICY "Creators can delete their events" ON public.events
  FOR DELETE USING (auth.uid() = creator_id);

-- ============================================================================
-- EVENT REGISTRATIONS RLS
-- ============================================================================
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Event registrations viewable by event creator or registrant" ON public.event_registrations;
CREATE POLICY "Event registrations viewable by event creator or registrant" ON public.event_registrations
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND creator_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can register for events" ON public.event_registrations;
CREATE POLICY "Users can register for events" ON public.event_registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can cancel their registration" ON public.event_registrations;
CREATE POLICY "Users can cancel their registration" ON public.event_registrations
  FOR DELETE USING (auth.uid() = user_id);

COMMIT;
