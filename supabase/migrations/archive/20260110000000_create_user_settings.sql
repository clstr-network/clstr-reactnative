-- Create user_settings table for persisted app settings (notification + privacy)
-- Ensures Settings page is fully Supabase-persisted and RLS-protected.

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications boolean NOT NULL DEFAULT true,
  push_notifications boolean NOT NULL DEFAULT true,
  message_notifications boolean NOT NULL DEFAULT true,
  connection_notifications boolean NOT NULL DEFAULT true,
  profile_visibility text NOT NULL DEFAULT 'public',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_settings_profile_visibility_check CHECK (profile_visibility IN ('public', 'connections', 'private'))
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see and modify their own row
DROP POLICY IF EXISTS "Users can view own user settings" ON public.user_settings;
CREATE POLICY "Users can view own user settings"
  ON public.user_settings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own user settings" ON public.user_settings;
CREATE POLICY "Users can insert own user settings"
  ON public.user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own user settings" ON public.user_settings;
CREATE POLICY "Users can update own user settings"
  ON public.user_settings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- updated_at trigger
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Backfill: create default settings rows for existing profiles
INSERT INTO public.user_settings (user_id)
SELECT p.id
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_settings s WHERE s.user_id = p.id
);
