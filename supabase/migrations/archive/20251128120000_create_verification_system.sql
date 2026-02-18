-- Create role verification system
BEGIN;

-- ============================================================================
-- VERIFICATION REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_role user_role NOT NULL,
  existing_role user_role NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
  reason text NOT NULL, -- Why they need this role
  supporting_documents text[] DEFAULT '{}', -- URLs to uploaded documents
  document_urls text[] DEFAULT '{}', -- Public URLs
  institution_email text, -- For faculty/organization verification
  employee_id text, -- For faculty
  organization_registration text, -- For organizations
  additional_info jsonb DEFAULT '{}'::jsonb,
  requested_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewer_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- ROLE CHANGE HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.role_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_role user_role NOT NULL,
  new_role user_role NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  reason text,
  verification_request_id uuid REFERENCES public.verification_requests(id),
  changed_at timestamptz DEFAULT now()
);

-- ============================================================================
-- ADMIN ROLES TABLE
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

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS verification_requests_user_id_idx ON public.verification_requests(user_id);
CREATE INDEX IF NOT EXISTS verification_requests_status_idx ON public.verification_requests(status);
CREATE INDEX IF NOT EXISTS verification_requests_requested_role_idx ON public.verification_requests(requested_role);
CREATE INDEX IF NOT EXISTS role_change_history_user_id_idx ON public.role_change_history(user_id);
CREATE INDEX IF NOT EXISTS admin_roles_user_id_idx ON public.admin_roles(user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE TRIGGER update_verification_requests_updated_at
  BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE PROCEDURE public.set_profiles_updated_at();

CREATE TRIGGER update_admin_roles_updated_at
  BEFORE UPDATE ON public.admin_roles
  FOR EACH ROW EXECUTE PROCEDURE public.set_profiles_updated_at();

-- ============================================================================
-- FUNCTION: Process verification approval
-- ============================================================================
CREATE OR REPLACE FUNCTION public.approve_verification_request(
  request_id uuid,
  reviewer_id uuid,
  notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_requested_role user_role;
  v_existing_role user_role;
  is_admin boolean;
BEGIN
  -- Check if reviewer is admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = reviewer_id AND can_verify_users = true
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'User does not have permission to verify requests';
  END IF;
  
  -- Get verification request details
  SELECT user_id, requested_role, existing_role
  INTO v_user_id, v_requested_role, v_existing_role
  FROM public.verification_requests
  WHERE id = request_id AND status = 'pending';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Verification request not found or already processed';
  END IF;
  
  -- Update verification request
  UPDATE public.verification_requests
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = reviewer_id,
      reviewer_notes = notes
  WHERE id = request_id;
  
  -- Update user profile role
  UPDATE public.profiles
  SET role = v_requested_role,
      is_verified = true,
      verified_at = now(),
      verified_by = reviewer_id
  WHERE id = v_user_id;
  
  -- Record role change history
  INSERT INTO public.role_change_history (
    user_id, old_role, new_role, changed_by, reason, verification_request_id
  ) VALUES (
    v_user_id, v_existing_role, v_requested_role, reviewer_id, 
    'Approved verification request', request_id
  );
  
  RETURN true;
END;
$$;

-- ============================================================================
-- FUNCTION: Reject verification request
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reject_verification_request(
  request_id uuid,
  reviewer_id uuid,
  notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if reviewer is admin
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = reviewer_id AND can_verify_users = true
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'User does not have permission to verify requests';
  END IF;
  
  -- Update verification request
  UPDATE public.verification_requests
  SET status = 'rejected',
      reviewed_at = now(),
      reviewed_by = reviewer_id,
      reviewer_notes = notes
  WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification request not found or already processed';
  END IF;
  
  RETURN true;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own verification requests
CREATE POLICY "Users can view their own verification requests" ON public.verification_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own verification requests
CREATE POLICY "Users can create verification requests" ON public.verification_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all verification requests
CREATE POLICY "Admins can view all verification requests" ON public.verification_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles 
      WHERE user_id = auth.uid() AND can_verify_users = true
    )
  );

-- Admins can update verification requests
CREATE POLICY "Admins can update verification requests" ON public.verification_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles 
      WHERE user_id = auth.uid() AND can_verify_users = true
    )
  );

-- Users can view their own role change history
CREATE POLICY "Users can view their own role history" ON public.role_change_history
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all role history
CREATE POLICY "Admins can view all role history" ON public.role_change_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Admin roles are viewable by admins only
CREATE POLICY "Admins can view admin roles" ON public.admin_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles 
      WHERE user_id = auth.uid()
    )
  );

COMMIT;
