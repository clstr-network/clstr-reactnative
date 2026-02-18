-- Create tables for profile experience, education, and skills
BEGIN;

-- Profile Experience Table
CREATE TABLE IF NOT EXISTS public.profile_experience (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  company text NOT NULL,
  location text,
  start_date text NOT NULL,
  end_date text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Profile Education Table
CREATE TABLE IF NOT EXISTS public.profile_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  degree text NOT NULL,
  school text NOT NULL,
  location text,
  start_date text NOT NULL,
  end_date text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Profile Skills Table with enum level
DO $$
BEGIN
  CREATE TYPE public.skill_level AS ENUM ('Beginner', 'Intermediate', 'Expert', 'Professional');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.profile_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  level public.skill_level NOT NULL DEFAULT 'Intermediate',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, name)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS profile_experience_profile_id_idx ON public.profile_experience(profile_id);
CREATE INDEX IF NOT EXISTS profile_education_profile_id_idx ON public.profile_education(profile_id);
CREATE INDEX IF NOT EXISTS profile_skills_profile_id_idx ON public.profile_skills(profile_id);

-- Enable Row Level Security
ALTER TABLE public.profile_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_skills ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profile_experience
DROP POLICY IF EXISTS "Experience is viewable by everyone" ON public.profile_experience;
CREATE POLICY "Experience is viewable by everyone" ON public.profile_experience
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own experience" ON public.profile_experience;
CREATE POLICY "Users can insert their own experience" ON public.profile_experience
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own experience" ON public.profile_experience;
CREATE POLICY "Users can update their own experience" ON public.profile_experience
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their own experience" ON public.profile_experience;
CREATE POLICY "Users can delete their own experience" ON public.profile_experience
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND id = auth.uid())
  );

-- RLS Policies for profile_education
DROP POLICY IF EXISTS "Education is viewable by everyone" ON public.profile_education;
CREATE POLICY "Education is viewable by everyone" ON public.profile_education
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own education" ON public.profile_education;
CREATE POLICY "Users can insert their own education" ON public.profile_education
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own education" ON public.profile_education;
CREATE POLICY "Users can update their own education" ON public.profile_education
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their own education" ON public.profile_education;
CREATE POLICY "Users can delete their own education" ON public.profile_education
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND id = auth.uid())
  );

-- RLS Policies for profile_skills
DROP POLICY IF EXISTS "Skills are viewable by everyone" ON public.profile_skills;
CREATE POLICY "Skills are viewable by everyone" ON public.profile_skills
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own skills" ON public.profile_skills;
CREATE POLICY "Users can insert their own skills" ON public.profile_skills
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own skills" ON public.profile_skills;
CREATE POLICY "Users can update their own skills" ON public.profile_skills
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their own skills" ON public.profile_skills;
CREATE POLICY "Users can delete their own skills" ON public.profile_skills
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND id = auth.uid())
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_profile_details_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

DROP TRIGGER IF EXISTS update_profile_experience_updated_at ON public.profile_experience;
CREATE TRIGGER update_profile_experience_updated_at
BEFORE UPDATE ON public.profile_experience
FOR EACH ROW
EXECUTE PROCEDURE public.update_profile_details_updated_at();

DROP TRIGGER IF EXISTS update_profile_education_updated_at ON public.profile_education;
CREATE TRIGGER update_profile_education_updated_at
BEFORE UPDATE ON public.profile_education
FOR EACH ROW
EXECUTE PROCEDURE public.update_profile_details_updated_at();

DROP TRIGGER IF EXISTS update_profile_skills_updated_at ON public.profile_skills;
CREATE TRIGGER update_profile_skills_updated_at
BEFORE UPDATE ON public.profile_skills
FOR EACH ROW
EXECUTE PROCEDURE public.update_profile_details_updated_at();

COMMIT;
