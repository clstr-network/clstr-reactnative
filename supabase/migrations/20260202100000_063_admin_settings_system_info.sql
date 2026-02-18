-- ============================================================================
-- 063_admin_settings_system_info.sql - Add system_info and maintenance_mode settings
-- Ensures admin settings page has all required configuration keys
-- ============================================================================

BEGIN;

-- Add system_info setting for platform metadata
INSERT INTO public.admin_settings (setting_key, setting_value, description, updated_by)
VALUES 
  ('system_info', jsonb_build_object(
    'version', '1.0.0',
    'environment', 'production',
    'lastDeployment', now()::text,
    'supabaseProject', 'clstr-network',
    'region', 'ap-south-1'
  ), 'Platform system information and metadata', 'system'),
  ('maintenance_mode', jsonb_build_object(
    'enabled', false,
    'message', 'Platform is undergoing scheduled maintenance. Please check back soon.',
    'estimated_end', null,
    'enabled_at', null,
    'enabled_by', null
  ), 'Maintenance mode configuration', 'system'),
  ('api_keys', jsonb_build_object(
    'last_rotated', null,
    'rotation_count', 0,
    'rotated_by', null
  ), 'API key rotation tracking', 'system'),
  ('cache_settings', jsonb_build_object(
    'last_cleared', null,
    'clear_count', 0,
    'cleared_by', null
  ), 'Cache management tracking', 'system')
ON CONFLICT (setting_key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = now();

-- Enable realtime for admin_settings table if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'admin_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_settings;
  END IF;
END $$;

COMMIT;
