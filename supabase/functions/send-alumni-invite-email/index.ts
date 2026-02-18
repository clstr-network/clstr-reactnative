/// <reference path="../deno.d.ts" />

/**
 * Edge Function: send-alumni-invite-email
 *
 * Sends an alumni invite email to a personal email address.
 * The email contains a link to claim the invite on clstr.network.
 */

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("VERIFICATION_FROM_EMAIL") || "invite@support.clstr.in";
const FROM_NAME = Deno.env.get("VERIFICATION_FROM_NAME") || "clstr.network";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendInviteRequest {
  to: string;
  token: string;
  full_name?: string;
  college_name?: string;
  appUrl?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      console.error("[send-alumni-invite-email] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: SendInviteRequest = await req.json();
    const { to, token, full_name, college_name, appUrl } = body;

    if (!to || !token) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing 'to' or 'token'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = appUrl || "https://clstr.network";
    const inviteLink = `${baseUrl}/alumni-invite?token=${encodeURIComponent(token)}`;

    console.log(`[send-alumni-invite-email] Sending invite to ${to.replace(/(.{2}).*@/, "$1***@")}`);

    const greeting = full_name ? `Hi ${full_name},` : "Hi there,";
    const collegeRef = college_name ? ` from ${college_name}` : "";

    const subject = "You're invited to join your alumni network — clstr.network";

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
              <!-- Logo -->
              <p style="margin:0 0 24px;font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.02em;">
                clstr.network
              </p>
              
              <!-- Greeting -->
              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#fff;">
                ${greeting}
              </p>
              
              <!-- Body -->
              <p style="margin:0 0 20px;font-size:13px;color:rgba(255,255,255,0.6);line-height:1.6;">
                You've been invited to join your alumni network${collegeRef} on <strong style="color:rgba(255,255,255,0.8);">clstr.network</strong>. Reconnect with classmates, find mentorship opportunities, and stay connected to your college community.
              </p>
              
              <!-- CTA Button -->
              <div style="text-align:center;margin:0 0 24px;">
                <a href="${inviteLink}" target="_blank" style="display:inline-block;background-color:#fff;border-radius:8px;padding:14px 32px;color:#000;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.01em;">
                  Accept Invite &rarr;
                </a>
              </div>
              
              <!-- Link fallback -->
              <p style="margin:0 0 20px;font-size:11px;color:rgba(255,255,255,0.3);line-height:1.5;word-break:break-all;">
                Or copy this link: ${inviteLink}
              </p>
              
              <!-- Info -->
              <div style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;margin:0 0 24px;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:rgba(255,255,255,0.5);">What happens next?</p>
                <ul style="margin:0;padding:0 0 0 16px;font-size:12px;color:rgba(255,255,255,0.4);line-height:1.8;">
                  <li>Verify your identity with the link above</li>
                  <li>Create your account using this email</li>
                  <li>Complete your alumni profile</li>
                  <li>Connect with your college network</li>
                </ul>
              </div>
              
              <!-- Expiry -->
              <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.25);line-height:1.5;">
                This invite expires in 7 days. If it expires, contact your college admin for a new one.
              </p>
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);line-height:1.5;">
                If this invite wasn't meant for you, you can safely ignore this email or report it using the link.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <p style="margin:24px 0 0;font-size:11px;color:rgba(255,255,255,0.15);">
          &copy; ${new Date().getFullYear()} clstr.network &middot; Alumni Network
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const textContent = `${greeting}\n\nYou've been invited to join your alumni network${collegeRef} on clstr.network.\n\nAccept your invite: ${inviteLink}\n\nWhat happens next:\n1. Verify your identity with the link above\n2. Create your account using this email\n3. Complete your alumni profile\n4. Connect with your college network\n\nThis invite expires in 7 days.\n\nIf this invite wasn't meant for you, you can safely ignore this email.\n\n© ${new Date().getFullYear()} clstr.network`;

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
        tags: [{ name: "type", value: "alumni-invite" }],
      }),
    });

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.text();
      console.error(`[send-alumni-invite-email] Resend API error: ${resendResponse.status} ${errorBody}`);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to send email" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendData = await resendResponse.json();
    console.log(`[send-alumni-invite-email] Email sent. ID: ${resendData.id}`);

    return new Response(
      JSON.stringify({ success: true, message_id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[send-alumni-invite-email] Error:", message);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
