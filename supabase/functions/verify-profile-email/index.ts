// Supabase Edge Function: verify-profile-email
// This function can be triggered as a webhook when users sign up
// to perform enhanced email domain verification

// @ts-ignore - Deno imports
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore - Deno imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Deno type declarations for Edge Functions
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Educational domain patterns
const EDUCATIONAL_PATTERNS = [
  /\.edu$/,
  /\.ac\.[a-z]{2,3}$/,
  /\.edu\.[a-z]{2,3}$/,
  /\.university$/,
  /\.college$/,
  /\.school$/,
  /university\.[a-z]{2,3}$/,
  /college\.[a-z]{2,3}$/,
  /school\.[a-z]{2,3}$/,
];

// Educational keywords in domain
const EDUCATIONAL_KEYWORDS = [
  "college",
  "university",
  "edu",
  "academic",
  "school",
  "iit",
  "nit",
  "iiit",
  "iim",
  "bits",
  "vit",
  "srm",
];

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: string;
    email: string;
    email_confirmed_at: string | null;
    raw_user_meta_data: Record<string, unknown>;
  };
  old_record: Record<string, unknown> | null;
}

function isValidEducationalEmail(email: string): boolean {
  if (!email) return false;
  
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;

  // Check patterns
  const matchesPattern = EDUCATIONAL_PATTERNS.some((pattern) => pattern.test(domain));
  if (matchesPattern) return true;

  // Check keywords
  const hasKeyword = EDUCATIONAL_KEYWORDS.some((keyword) => domain.includes(keyword));
  if (hasKeyword) return true;

  return false;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const payload: WebhookPayload = await req.json();
    
    // Only process INSERT events on auth.users
    if (payload.type !== "INSERT" || payload.table !== "users") {
      return new Response(
        JSON.stringify({ message: "Skipping non-INSERT event" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const { record } = payload;
    const userEmail = record.email?.toLowerCase();
    
    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "No email in record" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Verify educational email
    const isEducational = isValidEducationalEmail(userEmail);
    const domain = userEmail.split("@")[1];

    console.log(`Verifying email: ${userEmail}, Educational: ${isEducational}, Domain: ${domain}`);

    // Log verification result (for analytics/auditing)
    const verificationLog = {
      user_id: record.id,
      email: userEmail,
      domain: domain,
      is_educational: isEducational,
      email_confirmed: !!record.email_confirmed_at,
      verified_at: new Date().toISOString(),
      verification_method: "webhook_auto",
      raw_metadata: record.raw_user_meta_data,
    };

    // If NOT educational, we could:
    // 1. Delete the auth user (strict)
    // 2. Flag for manual review (lenient)
    // 3. Just log it (observation only)
    
    // Current approach: Log and flag, don't delete
    // The frontend AuthCallback.tsx already handles rejection
    
    if (!isEducational) {
      console.warn(`Non-educational email attempted signup: ${userEmail}`);
      
      // Optional: Create an audit log entry
      // await supabase.from('verification_audit_log').insert(verificationLog);
      
      return new Response(
        JSON.stringify({
          success: false,
          message: "Non-educational email domain",
          email: userEmail,
          domain: domain,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Email is educational - return success
    return new Response(
      JSON.stringify({
        success: true,
        message: "Educational email verified",
        email: userEmail,
        domain: domain,
        is_educational: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
