-- ============================================================================
-- 000_extensions.sql - Enable required PostgreSQL extensions
-- U-Hub Platform Database Baseline
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Note: pgcrypto is typically enabled by default in Supabase
