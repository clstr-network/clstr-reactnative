-- ====================================================================
-- Add onboarding_complete column to profiles table
-- ====================================================================
-- This migration adds the onboarding_complete boolean column to track
-- whether users have completed the onboarding process

-- Add onboarding_complete column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'onboarding_complete'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN onboarding_complete BOOLEAN DEFAULT FALSE NOT NULL;
    
    -- Set existing profiles to TRUE (they're already created)
    UPDATE profiles SET onboarding_complete = TRUE WHERE id IS NOT NULL;
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_complete 
ON profiles(onboarding_complete);

-- Add helpful comment
COMMENT ON COLUMN profiles.onboarding_complete IS 
'Indicates whether the user has completed the onboarding process after email verification';
