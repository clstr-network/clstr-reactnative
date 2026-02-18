-- Extends the public.profiles table to support the profile creation flow in the app
BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS university text,
  ADD COLUMN IF NOT EXISTS major text,
  ADD COLUMN IF NOT EXISTS graduation_year text,
  ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cover_photo_url text,
  ADD COLUMN IF NOT EXISTS profile_completion integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS domain text;

ALTER TABLE public.profiles
  ALTER COLUMN updated_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS profiles_domain_idx ON public.profiles (domain);

CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE public.set_profiles_updated_at();

COMMIT;
