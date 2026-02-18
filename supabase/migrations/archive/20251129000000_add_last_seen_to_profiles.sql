-- Add last_seen column to profiles table for presence/online status
BEGIN;

-- Add last_seen column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'last_seen'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_seen timestamptz DEFAULT now();
  END IF;
END $$;

-- Create index for efficient last_seen queries
CREATE INDEX IF NOT EXISTS profiles_last_seen_idx ON public.profiles(last_seen);

-- Update existing profiles to have current timestamp
UPDATE public.profiles SET last_seen = now() WHERE last_seen IS NULL;

COMMIT;
