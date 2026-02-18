-- ============================================================================
-- 049_platform_admins.sql - Platform Admin Dashboard Tables
-- Founder/Company Admin Dashboard (Internal Use Only)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PLATFORM ADMINS TABLE
-- Stores authorized admin users for the company dashboard
-- Only visible to founders and company employees
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('founder', 'admin', 'moderator')),
  name text,
  added_by text NOT NULL,
  added_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  permissions jsonb DEFAULT '{}'::jsonb,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_admins_email_idx ON public.platform_admins(email);
CREATE INDEX IF NOT EXISTS platform_admins_role_idx ON public.platform_admins(role);
CREATE INDEX IF NOT EXISTS platform_admins_is_active_idx ON public.platform_admins(is_active);

-- Enable RLS
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ADMIN ACTIVITY LOGS TABLE
-- Audit trail for admin actions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email text NOT NULL,
  action_type text NOT NULL,
  target_type text,
  target_id text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_activity_logs_admin_email_idx ON public.admin_activity_logs(admin_email);
CREATE INDEX IF NOT EXISTS admin_activity_logs_action_type_idx ON public.admin_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS admin_activity_logs_created_at_idx ON public.admin_activity_logs(created_at DESC);

ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ADMIN SETTINGS TABLE
-- Platform-wide settings managed by admins
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_settings_key_idx ON public.admin_settings(setting_key);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SYSTEM ALERTS TABLE
-- Platform alerts for admin dashboard
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL CHECK (alert_type IN ('warning', 'info', 'error', 'success')),
  title text NOT NULL,
  message text NOT NULL,
  action_label text,
  action_route text,
  is_read boolean DEFAULT false,
  is_dismissed boolean DEFAULT false,
  auto_generated boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS system_alerts_type_idx ON public.system_alerts(alert_type);
CREATE INDEX IF NOT EXISTS system_alerts_is_read_idx ON public.system_alerts(is_read);
CREATE INDEX IF NOT EXISTS system_alerts_created_at_idx ON public.system_alerts(created_at DESC);

ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RECRUITER ACCOUNTS TABLE
-- Manages recruiter/company accounts for the platform
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recruiter_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_email text,
  contact_name text,
  contact_phone text,
  plan_type text NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'basic', 'pro', 'enterprise')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'suspended', 'pending', 'cancelled')),
  active_searches integer DEFAULT 0,
  messages_sent integer DEFAULT 0,
  conversion_rate numeric(5,2) DEFAULT 0,
  subscription_start_date timestamptz,
  subscription_end_date timestamptz,
  subscription_price numeric(10,2),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recruiter_accounts_company_name_idx ON public.recruiter_accounts(company_name);
CREATE INDEX IF NOT EXISTS recruiter_accounts_plan_type_idx ON public.recruiter_accounts(plan_type);
CREATE INDEX IF NOT EXISTS recruiter_accounts_status_idx ON public.recruiter_accounts(status);

ALTER TABLE public.recruiter_accounts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RECRUITER SEARCH HISTORY TABLE
-- Tracks recruiter search queries
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recruiter_search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES public.recruiter_accounts(id) ON DELETE CASCADE,
  query text NOT NULL,
  filters jsonb DEFAULT '{}'::jsonb,
  results_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recruiter_search_history_recruiter_id_idx ON public.recruiter_search_history(recruiter_id);
CREATE INDEX IF NOT EXISTS recruiter_search_history_created_at_idx ON public.recruiter_search_history(created_at DESC);

ALTER TABLE public.recruiter_search_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR PLATFORM ADMINS
-- Only platform admins can read/write admin tables
-- ============================================================================

-- Function to check if current user is a platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_email text;
  is_admin boolean;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  IF user_email IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins 
    WHERE lower(email) = lower(user_email) 
    AND is_active = true
  ) INTO is_admin;
  
  RETURN COALESCE(is_admin, false);
END;
$$;

-- Function to check if current user is the founder
CREATE OR REPLACE FUNCTION public.is_founder()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_email text;
  is_founder_user boolean;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  IF user_email IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins 
    WHERE lower(email) = lower(user_email) 
    AND role = 'founder'
    AND is_active = true
  ) INTO is_founder_user;
  
  RETURN COALESCE(is_founder_user, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_founder() TO authenticated;

-- Platform admins table policies
CREATE POLICY "Platform admins can view all admins"
  ON public.platform_admins FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "Only founder can insert admins"
  ON public.platform_admins FOR INSERT
  TO authenticated
  WITH CHECK (public.is_founder());

CREATE POLICY "Only founder can update admins"
  ON public.platform_admins FOR UPDATE
  TO authenticated
  USING (public.is_founder())
  WITH CHECK (public.is_founder());

CREATE POLICY "Only founder can delete admins"
  ON public.platform_admins FOR DELETE
  TO authenticated
  USING (public.is_founder() AND role != 'founder');

-- Admin activity logs policies
CREATE POLICY "Platform admins can view activity logs"
  ON public.admin_activity_logs FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins can insert activity logs"
  ON public.admin_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_admin());

-- Admin settings policies
CREATE POLICY "Platform admins can view settings"
  ON public.admin_settings FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "Only founder can modify settings"
  ON public.admin_settings FOR ALL
  TO authenticated
  USING (public.is_founder())
  WITH CHECK (public.is_founder());

-- System alerts policies
CREATE POLICY "Platform admins can view alerts"
  ON public.system_alerts FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins can manage alerts"
  ON public.system_alerts FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Recruiter accounts policies
CREATE POLICY "Platform admins can view recruiter accounts"
  ON public.recruiter_accounts FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins can manage recruiter accounts"
  ON public.recruiter_accounts FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Recruiter search history policies
CREATE POLICY "Platform admins can view search history"
  ON public.recruiter_search_history FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

-- ============================================================================
-- SEED FOUNDER DATA
-- Insert the founder email as the first admin
-- ============================================================================
INSERT INTO public.platform_admins (email, role, name, added_by, is_active)
VALUES ('2005ganesh16@gmail.com', 'founder', 'Ganesh (Founder & CEO)', 'system', true)
ON CONFLICT (email) DO UPDATE SET
  role = 'founder',
  name = EXCLUDED.name,
  is_active = true,
  updated_at = now();

-- ============================================================================
-- DEFAULT ADMIN SETTINGS
-- ============================================================================
INSERT INTO public.admin_settings (setting_key, setting_value, description, updated_by)
VALUES 
  ('notification_rules', '{"newDomainAlert": true, "activityThreshold": 100, "spamDetection": true}'::jsonb, 'Notification configuration', 'system'),
  ('data_anonymization', '{"minAggregationSize": 10, "excludeFields": ["email", "phone"]}'::jsonb, 'Data anonymization rules', 'system'),
  ('export_thresholds', '{"maxRecords": 10000, "requireApproval": true}'::jsonb, 'Export limitations', 'system')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- ENABLE REALTIME
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_admins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recruiter_accounts;

COMMIT;
