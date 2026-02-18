-- Migration: Add Principal and Dean roles to user_role enum
-- Description: Extends the user_role enum to support Principal and Dean roles for staff authentication

-- Step 1: Add new values to the user_role enum
-- PostgreSQL allows adding values to enums using ALTER TYPE ... ADD VALUE

-- Add 'Principal' role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Principal';

-- Add 'Dean' role  
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Dean';

-- Note: The IF NOT EXISTS clause prevents errors if the values already exist
-- These new roles will be used in the /club-auth flow for staff registration
