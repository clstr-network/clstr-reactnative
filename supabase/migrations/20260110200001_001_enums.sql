-- ============================================================================
-- 001_enums.sql - Create all ENUM types
-- U-Hub Platform Database Baseline
-- ============================================================================

BEGIN;

-- User Role Enum
DO $$
BEGIN
  CREATE TYPE public.user_role AS ENUM ('Student', 'Alumni', 'Faculty', 'Club', 'Organization');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Skill Level Enum
DO $$
BEGIN
  CREATE TYPE public.skill_level AS ENUM ('Beginner', 'Intermediate', 'Expert', 'Professional');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Event Registration Status Enum
DO $$
BEGIN
  CREATE TYPE public.event_registration_status AS ENUM ('pending', 'confirmed', 'waitlisted', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Search Result Type Enum
DO $$
BEGIN
  CREATE TYPE public.search_result_type AS ENUM ('profile', 'post', 'club', 'event');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

COMMIT;
