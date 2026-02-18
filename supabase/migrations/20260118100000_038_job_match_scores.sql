-- ============================================================================
-- 038_job_match_scores.sql - Persisted job match scoring system
-- Fixes the "AI Match Score" feature with real Supabase-persisted matching
-- ============================================================================

BEGIN;

-- ============================================================================
-- JOB MATCH SCORES TABLE
-- Stores computed match scores between users and jobs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_match_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  college_domain text,
  
  -- Score components (0-100 each)
  skill_score integer DEFAULT 0,           -- Skills overlap score
  experience_score integer DEFAULT 0,      -- Experience level match
  location_score integer DEFAULT 0,        -- Location/remote preference match
  education_score integer DEFAULT 0,       -- Education/branch relevance
  
  -- Final computed score (weighted average)
  total_score integer DEFAULT 0,
  
  -- Match metadata
  matched_skills text[] DEFAULT '{}',      -- Which skills matched
  missing_skills text[] DEFAULT '{}',      -- Required skills user lacks
  match_reasons text[] DEFAULT '{}',       -- Human-readable reasons
  
  -- Timestamps
  computed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT job_match_scores_user_job_unique UNIQUE(user_id, job_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS job_match_scores_user_id_idx ON public.job_match_scores(user_id);
CREATE INDEX IF NOT EXISTS job_match_scores_job_id_idx ON public.job_match_scores(job_id);
CREATE INDEX IF NOT EXISTS job_match_scores_total_score_idx ON public.job_match_scores(total_score DESC);
CREATE INDEX IF NOT EXISTS job_match_scores_college_domain_idx ON public.job_match_scores(college_domain);
CREATE INDEX IF NOT EXISTS job_match_scores_user_score_idx ON public.job_match_scores(user_id, total_score DESC);

-- ============================================================================
-- FUNCTION: Compute match score for a user-job pair
-- Uses weighted scoring based on multiple factors
-- ============================================================================
CREATE OR REPLACE FUNCTION public.compute_job_match_score(
  p_user_id uuid,
  p_job_id uuid
)
RETURNS TABLE (
  skill_score integer,
  experience_score integer,
  location_score integer,
  education_score integer,
  total_score integer,
  matched_skills text[],
  missing_skills text[],
  match_reasons text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_job RECORD;
  v_user_skills text[];
  v_job_skills text[];
  v_matched text[] := '{}';
  v_missing text[] := '{}';
  v_reasons text[] := '{}';
  v_skill_score integer := 0;
  v_exp_score integer := 0;
  v_loc_score integer := 0;
  v_edu_score integer := 0;
  v_total integer := 0;
  v_skill text;
BEGIN
  -- Get user profile
  SELECT 
    p.interests,
    p.branch,
    p.location AS user_location,
    p.role,
    p.year_of_completion,
    p.college_domain,
    p.profile_completion
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0, 0, 0, '{}'::text[], '{}'::text[], ARRAY['Profile not found'];
    RETURN;
  END IF;
  
  -- Get job details
  SELECT 
    j.skills_required,
    j.experience_level,
    j.location,
    j.is_remote,
    j.job_title,
    j.description
  INTO v_job
  FROM public.jobs j
  WHERE j.id = p_job_id AND j.is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0, 0, 0, '{}'::text[], '{}'::text[], ARRAY['Job not found or inactive'];
    RETURN;
  END IF;
  
  -- Normalize skills to lowercase
  v_user_skills := ARRAY(SELECT lower(unnest(COALESCE(v_profile.interests, '{}'::text[]))));
  v_job_skills := ARRAY(SELECT lower(unnest(COALESCE(v_job.skills_required, '{}'::text[]))));
  
  -- =========================================
  -- SKILL MATCHING (Weight: 40%)
  -- =========================================
  IF array_length(v_job_skills, 1) > 0 THEN
    -- Find matched skills (partial matching supported)
    FOREACH v_skill IN ARRAY v_job_skills LOOP
      IF EXISTS (
        SELECT 1 FROM unnest(v_user_skills) AS us 
        WHERE us ILIKE '%' || v_skill || '%' OR v_skill ILIKE '%' || us || '%'
      ) THEN
        v_matched := array_append(v_matched, v_skill);
      ELSE
        v_missing := array_append(v_missing, v_skill);
      END IF;
    END LOOP;
    
    -- Calculate skill score
    v_skill_score := LEAST(100, ROUND(
      (array_length(v_matched, 1)::numeric / NULLIF(array_length(v_job_skills, 1), 0)) * 100
    )::integer);
    
    IF array_length(v_matched, 1) > 0 THEN
      v_reasons := array_append(v_reasons, 
        format('Matches %s of %s required skills', array_length(v_matched, 1), array_length(v_job_skills, 1))
      );
    END IF;
  ELSE
    -- No skills required = default good match
    v_skill_score := 70;
    v_reasons := array_append(v_reasons, 'No specific skills required');
  END IF;
  
  -- =========================================
  -- EXPERIENCE LEVEL MATCHING (Weight: 25%)
  -- =========================================
  CASE v_job.experience_level
    WHEN 'entry', 'Entry Level', 'junior' THEN
      -- Entry level favors students/recent grads
      IF v_profile.role IN ('Student', 'Alumni') THEN
        v_exp_score := 90;
        v_reasons := array_append(v_reasons, 'Entry-level position suits your profile');
      ELSE
        v_exp_score := 60;
      END IF;
    WHEN 'mid', 'Mid Level', 'intermediate' THEN
      IF v_profile.role = 'Alumni' THEN
        v_exp_score := 85;
        v_reasons := array_append(v_reasons, 'Mid-level position matches alumni experience');
      ELSIF v_profile.role = 'Student' THEN
        v_exp_score := 50;
        v_reasons := array_append(v_reasons, 'May require more experience');
      ELSE
        v_exp_score := 70;
      END IF;
    WHEN 'senior', 'Senior Level', 'lead' THEN
      IF v_profile.role = 'Alumni' THEN
        v_exp_score := 70;
      ELSE
        v_exp_score := 30;
        v_reasons := array_append(v_reasons, 'Senior role may be challenging');
      END IF;
    ELSE
      v_exp_score := 60; -- Default for unspecified
  END CASE;
  
  -- =========================================
  -- LOCATION MATCHING (Weight: 20%)
  -- =========================================
  IF v_job.is_remote = true THEN
    v_loc_score := 95;
    v_reasons := array_append(v_reasons, 'Remote work available');
  ELSIF v_profile.user_location IS NOT NULL AND v_job.location IS NOT NULL THEN
    IF lower(v_profile.user_location) ILIKE '%' || lower(v_job.location) || '%' 
       OR lower(v_job.location) ILIKE '%' || lower(v_profile.user_location) || '%' THEN
      v_loc_score := 90;
      v_reasons := array_append(v_reasons, 'Location matches your profile');
    ELSE
      v_loc_score := 50;
    END IF;
  ELSE
    v_loc_score := 60; -- Default when location not specified
  END IF;
  
  -- =========================================
  -- EDUCATION/BRANCH MATCHING (Weight: 15%)
  -- =========================================
  IF v_profile.branch IS NOT NULL THEN
    -- Check if branch relates to job (basic keyword matching in title/description)
    IF lower(v_job.job_title) ILIKE '%' || lower(v_profile.branch) || '%'
       OR lower(COALESCE(v_job.description, '')) ILIKE '%' || lower(v_profile.branch) || '%' THEN
      v_edu_score := 90;
      v_reasons := array_append(v_reasons, 'Your field of study is relevant');
    ELSE
      v_edu_score := 50;
    END IF;
  ELSE
    v_edu_score := 50;
  END IF;
  
  -- =========================================
  -- COMPUTE WEIGHTED TOTAL (0-100)
  -- Weights: Skills 40%, Experience 25%, Location 20%, Education 15%
  -- =========================================
  v_total := ROUND(
    (v_skill_score * 0.40) +
    (v_exp_score * 0.25) +
    (v_loc_score * 0.20) +
    (v_edu_score * 0.15)
  )::integer;
  
  -- Bonus for complete profile
  IF v_profile.profile_completion >= 80 THEN
    v_total := LEAST(100, v_total + 5);
    v_reasons := array_append(v_reasons, 'Profile completeness bonus');
  END IF;
  
  RETURN QUERY SELECT 
    v_skill_score,
    v_exp_score,
    v_loc_score,
    v_edu_score,
    v_total,
    v_matched,
    v_missing,
    v_reasons;
END;
$$;

-- ============================================================================
-- FUNCTION: Get recommended jobs for a user with computed scores
-- Returns jobs sorted by match score, persisting scores for future queries
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_recommended_jobs_with_scores(
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_min_score integer DEFAULT 0
)
RETURNS TABLE (
  job_id uuid,
  job_title text,
  company_name text,
  description text,
  location text,
  job_type text,
  experience_level text,
  salary_min numeric,
  salary_max numeric,
  skills_required text[],
  is_remote boolean,
  is_active boolean,
  application_deadline date,
  application_url text,
  application_email text,
  poster_id uuid,
  college_domain text,
  created_at timestamptz,
  total_score integer,
  skill_score integer,
  experience_score integer,
  location_score integer,
  matched_skills text[],
  missing_skills text[],
  match_reasons text[],
  is_saved boolean,
  has_applied boolean
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_domain text;
  v_job RECORD;
  v_score RECORD;
BEGIN
  -- Get user's college domain
  SELECT p.college_domain INTO v_user_domain
  FROM public.profiles p
  WHERE p.id = p_user_id;
  
  IF v_user_domain IS NULL THEN
    RAISE EXCEPTION 'User profile not found or missing college domain';
  END IF;
  
  -- Process each eligible job and compute/update scores
  FOR v_job IN 
    SELECT j.id
    FROM public.jobs j
    WHERE j.is_active = true
      AND (j.college_domain = v_user_domain OR j.college_domain IS NULL)
    ORDER BY j.created_at DESC
    LIMIT 50  -- Process top 50 recent jobs for scoring
  LOOP
    -- Compute score for this job
    SELECT * INTO v_score 
    FROM public.compute_job_match_score(p_user_id, v_job.id);
    
    -- Upsert the score
    INSERT INTO public.job_match_scores (
      user_id, job_id, college_domain,
      skill_score, experience_score, location_score, education_score,
      total_score, matched_skills, missing_skills, match_reasons,
      computed_at, updated_at
    )
    VALUES (
      p_user_id, v_job.id, v_user_domain,
      v_score.skill_score, v_score.experience_score, v_score.location_score, v_score.education_score,
      v_score.total_score, v_score.matched_skills, v_score.missing_skills, v_score.match_reasons,
      now(), now()
    )
    ON CONFLICT (user_id, job_id) DO UPDATE SET
      skill_score = EXCLUDED.skill_score,
      experience_score = EXCLUDED.experience_score,
      location_score = EXCLUDED.location_score,
      education_score = EXCLUDED.education_score,
      total_score = EXCLUDED.total_score,
      matched_skills = EXCLUDED.matched_skills,
      missing_skills = EXCLUDED.missing_skills,
      match_reasons = EXCLUDED.match_reasons,
      computed_at = now(),
      updated_at = now();
  END LOOP;
  
  -- Return jobs with scores
  RETURN QUERY
  SELECT
    j.id AS job_id,
    j.job_title,
    j.company_name,
    j.description,
    j.location,
    j.job_type,
    j.experience_level,
    j.salary_min,
    j.salary_max,
    j.skills_required,
    j.is_remote,
    j.is_active,
    j.application_deadline,
    j.application_url,
    j.application_email,
    j.poster_id,
    j.college_domain,
    j.created_at,
    COALESCE(jms.total_score, 0) AS total_score,
    COALESCE(jms.skill_score, 0) AS skill_score,
    COALESCE(jms.experience_score, 0) AS experience_score,
    COALESCE(jms.location_score, 0) AS location_score,
    COALESCE(jms.matched_skills, '{}') AS matched_skills,
    COALESCE(jms.missing_skills, '{}') AS missing_skills,
    COALESCE(jms.match_reasons, '{}') AS match_reasons,
    EXISTS (
      SELECT 1 FROM public.saved_items si
      WHERE si.user_id = p_user_id AND si.item_id = j.id AND si.type = 'job'
    ) AS is_saved,
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      WHERE ja.user_id = p_user_id AND ja.job_id = j.id
    ) AS has_applied
  FROM public.jobs j
  LEFT JOIN public.job_match_scores jms ON jms.job_id = j.id AND jms.user_id = p_user_id
  WHERE j.is_active = true
    AND (j.college_domain = v_user_domain OR j.college_domain IS NULL)
    AND COALESCE(jms.total_score, 0) >= p_min_score
  ORDER BY COALESCE(jms.total_score, 0) DESC, j.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- FUNCTION: Refresh match scores for a user (e.g., after profile update)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.refresh_user_job_matches(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  -- Delete existing scores for this user (will be recomputed on next query)
  DELETE FROM public.job_match_scores WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$;

-- ============================================================================
-- TRIGGER: Invalidate match scores when profile changes
-- ============================================================================
CREATE OR REPLACE FUNCTION public.on_profile_update_invalidate_matches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only invalidate if relevant fields changed
  IF (OLD.interests IS DISTINCT FROM NEW.interests) OR
     (OLD.branch IS DISTINCT FROM NEW.branch) OR
     (OLD.location IS DISTINCT FROM NEW.location) OR
     (OLD.role IS DISTINCT FROM NEW.role) THEN
    -- Mark scores as stale by deleting them (will recompute on next query)
    DELETE FROM public.job_match_scores WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_profile_update_invalidate_matches ON public.profiles;
CREATE TRIGGER tr_profile_update_invalidate_matches
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.on_profile_update_invalidate_matches();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE public.job_match_scores ENABLE ROW LEVEL SECURITY;

-- Users can only see their own match scores
CREATE POLICY "job_match_scores_select_own"
  ON public.job_match_scores
  FOR SELECT
  USING (user_id = auth.uid());

-- System can insert/update scores (via SECURITY DEFINER functions)
CREATE POLICY "job_match_scores_service_write"
  ON public.job_match_scores
  FOR ALL
  USING (auth.role() = 'service_role');

-- Users can insert their own scores (edge case)
CREATE POLICY "job_match_scores_insert_own"
  ON public.job_match_scores
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own scores  
CREATE POLICY "job_match_scores_delete_own"
  ON public.job_match_scores
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- REALTIME: Enable realtime for job_match_scores
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_match_scores;

COMMIT;
