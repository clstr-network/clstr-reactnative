// ============================================================================
// auto-expire-mentorship — Supabase Edge Function
// Runs on a schedule (daily) to auto-cancel pending requests > 14 days.
// Calls the DB function public.auto_expire_stale_mentorship_requests()
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (_req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Call the DB function that handles auto-expiry
    const { data, error } = await supabase.rpc('auto_expire_stale_mentorship_requests');

    if (error) {
      console.error('Auto-expire mentorship requests failed:', error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const expiredCount = data ?? 0;
    console.log(`Auto-expired ${expiredCount} stale mentorship requests`);

    return new Response(
      JSON.stringify({ success: true, expired_count: expiredCount }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Unexpected error in auto-expire-mentorship:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
