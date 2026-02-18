/// <reference path="../deno.d.ts" />
/// <reference path="./deno-shim.d.ts" />

/**
 * Edge Function: send-magic-link
 *
 * Generates a Supabase magic link via the Admin API and sends it
 * through Resend — bypassing Supabase's rate-limited built-in
 * email system. Handles both new signups and existing users.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("VERIFICATION_FROM_EMAIL") || "auth@support.clstr.in";
const FROM_NAME = Deno.env.get("VERIFICATION_FROM_NAME") || "clstr.network";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Public-domain blocklist (matches is_public_email_domain in DB) ──────────
const PUBLIC_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "protonmail.com",
  "proton.me",
  "aol.com",
  "zoho.com",
  "yandex.com",
  "mail.com",
  "gmx.com",
  "tutanota.com",
  "fastmail.com",
  "hey.com",
  "pm.me",
  "ymail.com",
  "rocketmail.com",
  "googlemail.com",
  "msn.com",
  "me.com",
  "mac.com",
]);

function isPublicEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !domain || PUBLIC_DOMAINS.has(domain);
}

/** Mask email for logs: ab***@domain.com */
function maskEmail(email: string): string {
  return email.replace(/(.{2}).*@/, "$1***@");
}

interface SendMagicLinkRequest {
  email: string;
  redirectTo?: string;
}

// ── Email HTML builder ──────────────────────────────────────────────────────
function buildMagicLinkEmail(actionLink: string): { html: string; text: string } {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to clstr</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#0a0a0a;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:480px;background-color:#111;border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
          <tr>
            <td style="padding:32px 28px 24px;">
              <!-- Logo / Brand -->
              <p style="margin:0 0 28px;font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.02em;">
                clstr.network
              </p>

              <!-- Title -->
              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#fff;">
                Your magic link to sign in
              </p>

              <!-- Description -->
              <p style="margin:0 0 28px;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.5;">
                Click the button below to sign in to your <strong style="color:rgba(255,255,255,0.7);">clstr</strong> account instantly. This link expires in <strong style="color:rgba(255,255,255,0.7);">1 hour</strong> and can only be used once.
              </p>

              <!-- CTA Button -->
              <div style="text-align:center;margin:0 0 28px;">
                <a href="${actionLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#8B5CF6 0%,#EC4899 100%);border-radius:8px;padding:14px 40px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.01em;box-shadow:0 4px 12px rgba(139,92,246,0.3);">
                  Sign in to clstr
                </a>
              </div>

              <p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,0.35);text-align:center;">
                Or copy and paste this URL into your browser:
              </p>

              <!-- URL Fallback -->
              <div style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px;margin:0 0 28px;word-break:break-all;">
                <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.5);font-family:'Courier New',monospace;line-height:1.5;">
                  ${actionLink}
                </p>
              </div>

              <!-- Security Note -->
              <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
                <p style="margin:0 0 4px;font-size:12px;color:rgba(255,255,255,0.35);line-height:1.5;">
                  ⚠️ This link can only be used <strong style="color:rgba(255,255,255,0.5);">once</strong> and will keep you signed in on that device.
                </p>
                <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.35);line-height:1.5;">
                  If you didn't request this link, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <p style="margin:24px 0 0;font-size:11px;color:rgba(255,255,255,0.2);">
          &copy; ${new Date().getFullYear()} clstr.network &middot; Campus connections
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Sign in to clstr.network\n\nClick this link to sign in instantly:\n${actionLink}\n\nThis link expires in 1 hour and can only be used once.\n\nIf you didn't request this, ignore this email.`;

  return { html, text };
}

// ── Main handler ────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Pre-flight checks ──────────────────────────────────────────────────
    if (!RESEND_API_KEY) {
      console.error("[send-magic-link] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as SendMagicLinkRequest;
    const email = body.email?.trim().toLowerCase();
    const redirectTo = body.redirectTo || "https://clstr.network/auth/callback";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "A valid email address is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Block public domains — only academic emails are allowed to sign up
    if (isPublicEmail(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Please use your college or university email to sign up.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-magic-link] Generating link for ${maskEmail(email)}`);

    // ── Generate magic link via Admin API ───────────────────────────────────
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });

    if (linkError) {
      console.error("[send-magic-link] generateLink error:", linkError.message);

      // If user doesn't exist yet, create them first then generate the link
      if (
        linkError.message.toLowerCase().includes("user not found") ||
        linkError.message.toLowerCase().includes("unable to find")
      ) {
        console.log(`[send-magic-link] User not found — creating user for ${maskEmail(email)}`);

        const { data: signupLink, error: signupError } =
          await supabaseAdmin.auth.admin.generateLink({
            type: "signup",
            email,
            options: { redirectTo },
          });

        if (signupError) {
          console.error("[send-magic-link] signup generateLink error:", signupError.message);
          return new Response(
            JSON.stringify({ success: false, error: "Unable to create sign-in link. Please try again." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const actionLink = signupLink.properties?.action_link;
        if (!actionLink) {
          console.error("[send-magic-link] No action_link in signup response");
          return new Response(
            JSON.stringify({ success: false, error: "Failed to generate sign-in link." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return await sendEmail(email, actionLink, "signup");
      }

      return new Response(
        JSON.stringify({ success: false, error: "Unable to generate sign-in link. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const actionLink = linkData.properties?.action_link;
    if (!actionLink) {
      console.error("[send-magic-link] No action_link in response");
      return new Response(
        JSON.stringify({ success: false, error: "Failed to generate sign-in link." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return await sendEmail(email, actionLink, "magiclink");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[send-magic-link] Unexpected error:", message);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Send the actual email via Resend ────────────────────────────────────────
async function sendEmail(
  to: string,
  actionLink: string,
  type: "magiclink" | "signup"
): Promise<Response> {
  const { html, text } = buildMagicLinkEmail(actionLink);

  const subject =
    type === "signup"
      ? "Welcome to clstr — confirm your account"
      : "Your magic link to sign in — clstr.network";

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
      text,
      tags: [{ name: "type", value: type }],
    }),
  });

  if (!resendResponse.ok) {
    const errorBody = await resendResponse.text();
    console.error(
      `[send-magic-link] Resend API error: ${resendResponse.status} ${errorBody}`
    );
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to send email. Please try again in a moment.",
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const resendData = (await resendResponse.json()) as { id: string };
  console.log(
    `[send-magic-link] Email sent (${type}) to ${maskEmail(to)}. ID: ${resendData.id}`
  );

  return new Response(
    JSON.stringify({ success: true, message_id: resendData.id }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
