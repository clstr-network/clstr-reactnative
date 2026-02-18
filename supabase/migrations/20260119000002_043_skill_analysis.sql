-- ============================================================================
-- 043_skill_analysis.sql - Skill Analysis Feature
-- Provides skill gap analysis against job market and peer comparison
-- ============================================================================

BEGIN;

-- ============================================================================
-- SKILL ANALYSIS TABLE
-- Stores computed skill analysis results for users
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.skill_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  college_domain text,
  
  -- User's current skills snapshot
  current_skills jsonb NOT NULL DEFAULT '[]',
  skill_count integer DEFAULT 0,
  
  -- Market analysis
  trending_skills text[] DEFAULT '{}',           -- Skills that are trending in job market
  recommended_skills text[] DEFAULT '{}',        -- Skills recommended to learn
  skill_gaps text[] DEFAULT '{}',               -- Skills user lacks for desired jobs
  
  -- Scores (0-100)
  market_alignment_score integer DEFAULT 0,     -- How well skills align with market demand
  completeness_score integer DEFAULT 0,         -- Profile skill completeness
  diversity_score integer DEFAULT 0,            -- Variety of skill categories
  
  -- Skill categories breakdown
  technical_skills text[] DEFAULT '{}',
  soft_skills text[] DEFAULT '{}',
  domain_skills text[] DEFAULT '{}',
  
  -- Job market insights
  matching_job_count integer DEFAULT 0,         -- Jobs that match user's skills
  avg_job_match_score integer DEFAULT 0,        -- Average match score across jobs
  top_job_categories text[] DEFAULT '{}',       -- Job categories user is suited for
  
  -- Peer comparison (within same college domain)
  peer_percentile integer DEFAULT 50,           -- Percentile rank among peers
  common_peer_skills text[] DEFAULT '{}',       -- Skills commonly held by peers
  differentiating_skills text[] DEFAULT '{}',   -- Skills that make user stand out
  
  -- Analysis metadata
  analysis_version integer DEFAULT 1,
  computed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One analysis record per user
  CONSTRAINT skill_analysis_user_unique UNIQUE(user_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS skill_analysis_user_id_idx ON public.skill_analysis(user_id);
CREATE INDEX IF NOT EXISTS skill_analysis_college_domain_idx ON public.skill_analysis(college_domain);
CREATE INDEX IF NOT EXISTS skill_analysis_market_score_idx ON public.skill_analysis(market_alignment_score DESC);
CREATE INDEX IF NOT EXISTS skill_analysis_computed_at_idx ON public.skill_analysis(computed_at);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
ALTER TABLE public.skill_analysis ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Users can view their own analysis
DROP POLICY IF EXISTS "skill_analysis_select_own" ON public.skill_analysis;
CREATE POLICY "skill_analysis_select_own"
  ON public.skill_analysis
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own analysis (first time)
DROP POLICY IF EXISTS "skill_analysis_insert_own" ON public.skill_analysis;
CREATE POLICY "skill_analysis_insert_own"
  ON public.skill_analysis
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own analysis
DROP POLICY IF EXISTS "skill_analysis_update_own" ON public.skill_analysis;
CREATE POLICY "skill_analysis_update_own"
  ON public.skill_analysis
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own analysis
DROP POLICY IF EXISTS "skill_analysis_delete_own" ON public.skill_analysis;
CREATE POLICY "skill_analysis_delete_own"
  ON public.skill_analysis
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- FUNCTION: Compute skill analysis for a user
-- ============================================================================
CREATE OR REPLACE FUNCTION public.compute_skill_analysis(p_user_id uuid)
RETURNS public.skill_analysis
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_skills RECORD;
  v_result public.skill_analysis;
  v_current_skills jsonb := '[]';
  v_skill_names text[] := '{}';
  v_skill_count integer := 0;
  v_trending text[] := '{}';
  v_recommended text[] := '{}';
  v_skill_gaps text[] := '{}';
  v_technical text[] := '{}';
  v_soft text[] := '{}';
  v_domain text[] := '{}';
  v_market_score integer := 0;
  v_completeness integer := 0;
  v_diversity integer := 0;
  v_matching_jobs integer := 0;
  v_avg_match integer := 0;
  v_peer_percentile integer := 50;
  v_peer_skills text[] := '{}';
  v_diff_skills text[] := '{}';
  v_job_categories text[] := '{}';
  v_common_peer text[] := '{}';
  v_all_market_skills text[];
  v_skill text;
BEGIN
  -- Get user profile
  SELECT id, college_domain, interests, role
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Get user's skills from profile_skills table
  SELECT 
    jsonb_agg(jsonb_build_object('name', name, 'level', level)),
    array_agg(lower(name)),
    count(*)::integer
  INTO v_current_skills, v_skill_names, v_skill_count
  FROM public.profile_skills
  WHERE profile_id = p_user_id;
  
  -- Handle null arrays
  v_current_skills := COALESCE(v_current_skills, '[]'::jsonb);
  v_skill_names := COALESCE(v_skill_names, '{}'::text[]);
  v_skill_count := COALESCE(v_skill_count, 0);
  
  -- Also include interests as skills
  IF v_profile.interests IS NOT NULL AND array_length(v_profile.interests, 1) > 0 THEN
    v_skill_names := v_skill_names || ARRAY(SELECT lower(unnest(v_profile.interests)));
    v_skill_names := ARRAY(SELECT DISTINCT unnest(v_skill_names));
  END IF;
  
  -- =========================================
  -- TRENDING SKILLS (from active jobs)
  -- =========================================
  SELECT array_agg(DISTINCT skill)
  INTO v_all_market_skills
  FROM (
    SELECT unnest(skills_required) AS skill
    FROM public.jobs
    WHERE is_active = true
      AND (college_domain IS NULL OR college_domain = v_profile.college_domain)
  ) market_skills;
  
  v_all_market_skills := COALESCE(v_all_market_skills, '{}'::text[]);
  
  -- Top 10 most demanded skills
  SELECT array_agg(skill ORDER BY cnt DESC)
  INTO v_trending
  FROM (
    SELECT lower(skill) AS skill, count(*) AS cnt
    FROM (
      SELECT unnest(skills_required) AS skill
      FROM public.jobs
      WHERE is_active = true
    ) s
    GROUP BY lower(skill)
    ORDER BY cnt DESC
    LIMIT 10
  ) top_skills;
  
  v_trending := COALESCE(v_trending, '{}'::text[]);
  
  -- =========================================
  -- RECOMMENDED SKILLS (trending but user doesn't have)
  -- =========================================
  v_recommended := ARRAY(
    SELECT t FROM unnest(v_trending) AS t
    WHERE t NOT IN (SELECT unnest(v_skill_names))
    LIMIT 5
  );
  
  -- =========================================
  -- SKILL GAPS (from jobs user applied to or matches)
  -- =========================================
  SELECT array_agg(DISTINCT ms)
  INTO v_skill_gaps
  FROM (
    SELECT unnest(missing_skills) AS ms
    FROM public.job_match_scores
    WHERE user_id = p_user_id
      AND array_length(missing_skills, 1) > 0
    LIMIT 100
  ) gaps
  WHERE ms IS NOT NULL;
  
  v_skill_gaps := COALESCE(v_skill_gaps, v_recommended);
  
  -- =========================================
  -- CATEGORIZE SKILLS
  -- =========================================
  -- Technical skills (programming, frameworks, tools)
  v_technical := ARRAY(
    SELECT s FROM unnest(v_skill_names) AS s
    WHERE s ~* '(javascript|python|java|react|node|sql|aws|docker|kubernetes|git|typescript|html|css|angular|vue|ruby|go|rust|c\+\+|php|swift|kotlin|flutter|tensorflow|pytorch|machine learning|data science|devops|cloud|api|database|linux|agile|scrum)'
  );
  
  -- Soft skills
  v_soft := ARRAY(
    SELECT s FROM unnest(v_skill_names) AS s
    WHERE s ~* '(communication|leadership|teamwork|problem solving|critical thinking|creativity|adaptability|time management|collaboration|presentation|negotiation|mentoring|coaching)'
  );
  
  -- Domain skills (everything else)
  v_domain := ARRAY(
    SELECT s FROM unnest(v_skill_names) AS s
    WHERE s NOT IN (SELECT unnest(v_technical))
      AND s NOT IN (SELECT unnest(v_soft))
  );
  
  -- =========================================
  -- MARKET ALIGNMENT SCORE
  -- =========================================
  IF array_length(v_all_market_skills, 1) > 0 AND array_length(v_skill_names, 1) > 0 THEN
    SELECT count(*)::integer INTO v_market_score
    FROM unnest(v_skill_names) AS us
    WHERE EXISTS (
      SELECT 1 FROM unnest(v_all_market_skills) AS ms
      WHERE lower(ms) = us OR lower(ms) ILIKE '%' || us || '%'
    );
    
    v_market_score := LEAST(100, ROUND(
      (v_market_score::numeric / GREATEST(array_length(v_skill_names, 1), 1)) * 100
    )::integer);
  ELSE
    v_market_score := 0;
  END IF;
  
  -- =========================================
  -- COMPLETENESS SCORE
  -- =========================================
  -- Based on number of skills (target: 10+ skills = 100%)
  v_completeness := LEAST(100, v_skill_count * 10);
  
  -- =========================================
  -- DIVERSITY SCORE
  -- =========================================
  -- Based on having skills in multiple categories
  v_diversity := 0;
  IF array_length(v_technical, 1) > 0 THEN v_diversity := v_diversity + 33; END IF;
  IF array_length(v_soft, 1) > 0 THEN v_diversity := v_diversity + 33; END IF;
  IF array_length(v_domain, 1) > 0 THEN v_diversity := v_diversity + 34; END IF;
  
  -- =========================================
  -- JOB MATCHING STATS
  -- =========================================
  SELECT count(*)::integer, COALESCE(avg(total_score), 0)::integer
  INTO v_matching_jobs, v_avg_match
  FROM public.job_match_scores
  WHERE user_id = p_user_id AND total_score >= 50;
  
  -- Top job categories
  SELECT array_agg(DISTINCT j.job_type)
  INTO v_job_categories
  FROM public.job_match_scores jms
  JOIN public.jobs j ON j.id = jms.job_id
  WHERE jms.user_id = p_user_id
    AND jms.total_score >= 60
  LIMIT 5;
  
  v_job_categories := COALESCE(v_job_categories, '{}'::text[]);
  
  -- =========================================
  -- PEER COMPARISON (within same college domain)
  -- =========================================
  IF v_profile.college_domain IS NOT NULL THEN
    -- Count peers with more skills
    SELECT 
      100 - LEAST(100, (
        (SELECT count(*) FROM public.profiles p2
         JOIN public.profile_skills ps2 ON ps2.profile_id = p2.id
         WHERE p2.college_domain = v_profile.college_domain
           AND p2.id <> p_user_id
         GROUP BY p2.id
         HAVING count(*) > v_skill_count
        )::numeric / NULLIF(
          (SELECT count(DISTINCT id) FROM public.profiles 
           WHERE college_domain = v_profile.college_domain AND id <> p_user_id), 0
        ) * 100
      ))::integer
    INTO v_peer_percentile;
    
    v_peer_percentile := COALESCE(v_peer_percentile, 50);
    
    -- Common skills among peers
    SELECT array_agg(skill ORDER BY cnt DESC)
    INTO v_common_peer
    FROM (
      SELECT lower(ps.name) AS skill, count(*) AS cnt
      FROM public.profile_skills ps
      JOIN public.profiles p ON p.id = ps.profile_id
      WHERE p.college_domain = v_profile.college_domain
        AND p.id <> p_user_id
      GROUP BY lower(ps.name)
      ORDER BY cnt DESC
      LIMIT 10
    ) common;
    
    v_common_peer := COALESCE(v_common_peer, '{}'::text[]);
    
    -- Differentiating skills (user has, peers don't commonly have)
    v_diff_skills := ARRAY(
      SELECT s FROM unnest(v_skill_names) AS s
      WHERE s NOT IN (SELECT unnest(v_common_peer))
      LIMIT 5
    );
  END IF;
  
  -- =========================================
  -- UPSERT ANALYSIS RESULT
  -- =========================================
  INSERT INTO public.skill_analysis (
    user_id,
    college_domain,
    current_skills,
    skill_count,
    trending_skills,
    recommended_skills,
    skill_gaps,
    market_alignment_score,
    completeness_score,
    diversity_score,
    technical_skills,
    soft_skills,
    domain_skills,
    matching_job_count,
    avg_job_match_score,
    top_job_categories,
    peer_percentile,
    common_peer_skills,
    differentiating_skills,
    computed_at,
    updated_at
  )
  VALUES (
    p_user_id,
    v_profile.college_domain,
    v_current_skills,
    v_skill_count,
    v_trending,
    v_recommended,
    v_skill_gaps,
    v_market_score,
    v_completeness,
    v_diversity,
    v_technical,
    v_soft,
    v_domain,
    v_matching_jobs,
    v_avg_match,
    v_job_categories,
    v_peer_percentile,
    v_common_peer,
    v_diff_skills,
    now(),
    now()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    college_domain = EXCLUDED.college_domain,
    current_skills = EXCLUDED.current_skills,
    skill_count = EXCLUDED.skill_count,
    trending_skills = EXCLUDED.trending_skills,
    recommended_skills = EXCLUDED.recommended_skills,
    skill_gaps = EXCLUDED.skill_gaps,
    market_alignment_score = EXCLUDED.market_alignment_score,
    completeness_score = EXCLUDED.completeness_score,
    diversity_score = EXCLUDED.diversity_score,
    technical_skills = EXCLUDED.technical_skills,
    soft_skills = EXCLUDED.soft_skills,
    domain_skills = EXCLUDED.domain_skills,
    matching_job_count = EXCLUDED.matching_job_count,
    avg_job_match_score = EXCLUDED.avg_job_match_score,
    top_job_categories = EXCLUDED.top_job_categories,
    peer_percentile = EXCLUDED.peer_percentile,
    common_peer_skills = EXCLUDED.common_peer_skills,
    differentiating_skills = EXCLUDED.differentiating_skills,
    computed_at = now(),
    updated_at = now()
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.compute_skill_analysis(uuid) TO authenticated;

-- ============================================================================
-- FUNCTION: Get skill analysis (fetches existing or returns null)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_skill_analysis(p_user_id uuid)
RETURNS public.skill_analysis
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.skill_analysis;
BEGIN
  -- User can only get their own analysis
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Can only access your own skill analysis';
  END IF;
  
  SELECT * INTO v_result
  FROM public.skill_analysis
  WHERE user_id = p_user_id;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_skill_analysis(uuid) TO authenticated;

-- ============================================================================
-- Enable realtime for skill_analysis
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'skill_analysis'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.skill_analysis;
  END IF;
END;
$$;

COMMIT;
