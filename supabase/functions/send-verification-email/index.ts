/// <reference path="../deno.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("VERIFICATION_FROM_EMAIL") || "verify@support.clstr.in";
const FROM_NAME = Deno.env.get("VERIFICATION_FROM_NAME") || "clstr.network";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendVerificationRequest {
  to: string;
  code?: string; // DEPRECATED: ignored if present. Code is now generated server-side.
  type?: "verification" | "resend";
  appUrl?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization (only callable from authenticated clients)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      console.error("[send-verification-email] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract user ID from JWT to pass to service_role RPC
    const supabaseUserClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the user's JWT and get their ID
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: authError } = await supabaseUserClient.auth.getUser(token);
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: SendVerificationRequest = await req.json();
    const { to, type = "verification", appUrl } = body;

    if (!to) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing 'to' email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY FIX (CB-1): Generate the code SERVER-SIDE via service_role RPC.
    // The client never sees the plaintext OTP.
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: codeResult, error: codeError } = await serviceClient.rpc(
      "generate_and_send_verification_code",
      { p_user_id: callerUser.id, p_email: to.toLowerCase().trim() }
    );

    if (codeError) {
      console.error("[send-verification-email] Code generation RPC error:", codeError.message);
      return new Response(
        JSON.stringify({ success: false, error: codeError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!codeResult?.success) {
      // Forward cooldown/rate-limit errors to client
      return new Response(
        JSON.stringify({
          success: false,
          error: codeResult?.error || "Code generation failed",
          cooldown_remaining: codeResult?.cooldown_remaining,
          retry_after_hours: codeResult?.retry_after_hours,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const code = codeResult.code as string;

    // Build magic link URL for one-click verification
    // FIX F13: Use fragment hash (#code=) instead of query param (?code=)
    // Fragments are NOT sent to servers or logged in access/referrer headers.
    const baseUrl = appUrl || "https://clstr.network";
    const magicLink = `${baseUrl}/verify-personal-email#code=${encodeURIComponent(code)}`;

    // SECURITY: Never log the code
    console.log(`[send-verification-email] Sending ${type} email to ${to.replace(/(.{2}).*@/, "$1***@")}`);

    const subject = type === "resend"
      ? "Your new clstr.network verification code"
      : "Verify your personal email — clstr.network";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#0a0a0a;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:480px;background-color:#111;border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
          <tr>
            <td style="padding:32px 28px 24px;">
              <!-- Logo / Brand -->
              <p style="margin:0 0 24px;font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.02em;">
                clstr.network
              </p>
              
              <!-- Title -->
              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#fff;">
                Verify your personal email
              </p>
              
              <!-- Description -->
              <p style="margin:0 0 24px;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.5;">
                Enter this code to verify your personal email on clstr.network. This code expires in <strong style="color:rgba(255,255,255,0.7);">10 minutes</strong>.
              </p>
              
              <!-- Magic Link Button -->
              <div style="text-align:center;margin:0 0 20px;">
                <a href="${magicLink}" target="_blank" style="display:inline-block;background-color:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:14px 32px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.01em;">
                  ✓ &nbsp;Verify my email
                </a>
              </div>
              
              <p style="margin:0 0 16px;font-size:12px;color:rgba(255,255,255,0.35);text-align:center;">
                Or enter this code manually:
              </p>
              
              <!-- Code Box -->
              <div style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
                <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:0.3em;color:#fff;font-family:'Courier New',monospace;">
                  ${code}
                </p>
              </div>
              
              <!-- Security Note -->
              <p style="margin:0 0 4px;font-size:12px;color:rgba(255,255,255,0.35);line-height:1.5;">
                If you didn't request this code, you can safely ignore this email.
              </p>
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.35);line-height:1.5;">
                Never share this code with anyone. clstr.network will never ask for it.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <p style="margin:24px 0 0;font-size:11px;color:rgba(255,255,255,0.2);">
          &copy; ${new Date().getFullYear()} clstr.network · Secure verification
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const textContent = `Verify your personal email on clstr.network\n\nClick this link to verify instantly:\n${magicLink}\n\nOr enter this code manually: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, ignore this email.\nNever share this code with anyone.`;

    // Send via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html: htmlContent,
        text: textContent,
        tags: [{ name: "type", value: "verification" }],
      }),
    });

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.text();
      console.error(`[send-verification-email] Resend API error: ${resendResponse.status} ${errorBody}`);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to send email. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendData = await resendResponse.json();
    console.log(`[send-verification-email] Email sent successfully. ID: ${resendData.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message_id: resendData.id,
        email_sent: true,
        expires_in_seconds: codeResult.expires_in_seconds || 600,
        cooldown_seconds: codeResult.cooldown_seconds || 60,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[send-verification-email] Unexpected error:", message);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
