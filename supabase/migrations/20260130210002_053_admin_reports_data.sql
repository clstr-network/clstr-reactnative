-- ============================================================================
-- 053_admin_reports_data.sql - Store report payloads
-- ============================================================================

BEGIN;

ALTER TABLE public.admin_reports
  ADD COLUMN IF NOT EXISTS report_data jsonb;

COMMIT;
