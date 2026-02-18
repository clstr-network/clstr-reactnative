-- ============================================================================
-- 008_verification_admin.sql - Verification and Admin tables
-- U-Hub Platform Database Baseline
-- ============================================================================

BEGIN;

-- ============================================================================
-- VERIFICATION REQUESTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_role public.user_role NOT NULL,
  existing_role public.user_role NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
  reason text NOT NULL,
  supporting_documents text[] DEFAULT '{}',
  document_urls text[] DEFAULT '{}',
  institution_email text,
  employee_id text,
  organization_registration text,
  additional_info jsonb DEFAULT '{}'::jsonb,
  requested_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewer_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verification_requests_user_id_idx ON public.verification_requests(user_id);
CREATE INDEX IF NOT EXISTS verification_requests_status_idx ON public.verification_requests(status);
CREATE INDEX IF NOT EXISTS verification_requests_requested_role_idx ON public.verification_requests(requested_role);

-- ============================================================================
-- ROLE CHANGE HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.role_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_role public.user_role NOT NULL,
  new_role public.user_role NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  reason text,
  verification_request_id uuid REFERENCES public.verification_requests(id),
  changed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS role_change_history_user_id_idx ON public.role_change_history(user_id);

-- ============================================================================
-- ADMIN ROLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_level text DEFAULT 'moderator' CHECK (admin_level IN ('super_admin', 'admin', 'moderator', 'verifier')),
  can_verify_users boolean DEFAULT false,
  can_manage_posts boolean DEFAULT false,
  can_manage_events boolean DEFAULT false,
  can_manage_jobs boolean DEFAULT false,
  can_view_analytics boolean DEFAULT false,
  permissions jsonb DEFAULT '{}'::jsonb,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_roles_user_id_idx ON public.admin_roles(user_id);

-- ============================================================================
-- MODERATION REPORTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.moderation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_content_id uuid,
  content_type text NOT NULL,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  resolution text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_reports_status_idx ON public.moderation_reports(status);
CREATE INDEX IF NOT EXISTS moderation_reports_reporter_idx ON public.moderation_reports(reporter_id);

-- ============================================================================
-- MODERATION ACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  target_content_id uuid,
  action_type text NOT NULL,
  reason text NOT NULL,
  duration_hours integer,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  report_id uuid REFERENCES public.moderation_reports(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_actions_target_user_idx ON public.moderation_actions(target_user_id);
CREATE INDEX IF NOT EXISTS moderation_actions_is_active_idx ON public.moderation_actions(is_active);

COMMIT;
