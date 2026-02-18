-- ============================================================================
-- 074: Schedule Expired Verification Code Cleanup
-- Adds a pg_cron job to automatically purge expired email verification codes
-- every hour. Prevents accumulation of stale rows in the table.
-- ============================================================================

-- Enable pg_cron extension (Supabase projects have this available)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage to postgres (required for scheduling)
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule hourly cleanup of expired verification codes
-- Deletes codes older than 24 hours (already expired codes have 10-min TTL,
-- but we keep a 24h buffer for audit / debugging).
SELECT cron.schedule(
  'cleanup-expired-email-verification-codes',  -- job name
  '0 * * * *',                                  -- every hour at :00
  $$SELECT public.cleanup_expired_verification_codes()$$
);

-- Also schedule a weekly vacuum on the table to reclaim space
SELECT cron.schedule(
  'vacuum-email-verification-codes',
  '0 3 * * 0',  -- Sunday 3 AM UTC
  $$VACUUM ANALYZE public.email_verification_codes$$
);
