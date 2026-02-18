/**
 * Send Push Notification Edge Function
 * 
 * Sends Web Push notifications to users via the Web Push API.
 * Requires VAPID keys to be configured in Supabase secrets:
 * - VAPID_PUBLIC_KEY: Public key (also used in frontend)
 * - VAPID_PRIVATE_KEY: Private key (server-side only)
 * - VAPID_SUBJECT: Contact email (e.g., mailto:admin@example.com)
 * 
 * Generate keys with: npx web-push generate-vapid-keys
 */

import "./deno-shim.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  type?: string;
  url?: string;
  related_id?: string;
  icon?: string;
  badge?: string;
}

interface PushSubscription {
  id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

// Web Push signing utilities
async function generateVapidAuthHeader(
  endpoint: string,
  vapidSubject: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const audience = new URL(endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours
  
  const header = {
    typ: "JWT",
    alg: "ES256",
  };
  
  const payload = {
    aud: audience,
    exp: expiration,
    sub: vapidSubject,
  };
  
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  // Import the private key and sign
  const privateKeyData = base64UrlDecode(vapidPrivateKey);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    privateKeyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );
  
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  const jwt = `${unsignedToken}.${signatureB64}`;
  
  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    cryptoKey: vapidPublicKey,
  };
}

function base64UrlEncode(data: string | Uint8Array): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function sendPushToSubscription(
  subscription: PushSubscription,
  payload: object,
  vapidSubject: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; statusCode: number; subscriptionId: string }> {
  try {
    const payloadString = JSON.stringify(payload);
    const payloadBytes = new TextEncoder().encode(payloadString);
    
    // For simplicity, we'll send unencrypted payload
    // In production, you should use the Web Push encryption spec
    const { authorization } = await generateVapidAuthHeader(
      subscription.endpoint,
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );
    
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Authorization": authorization,
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400", // 24 hours
        "Urgency": "normal",
      },
      body: payloadBytes,
    });
    
    return {
      success: response.ok,
      statusCode: response.status,
      subscriptionId: subscription.id,
    };
  } catch (error) {
    console.error(`Failed to send push to ${subscription.id}:`, error);
    return {
      success: false,
      statusCode: 500,
      subscriptionId: subscription.id,
    };
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get VAPID keys from environment
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@alumniconnect.com";
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with service role for reading subscriptions
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the user making the request
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body: PushPayload = await req.json();
    
    if (!body.user_id || !body.title || !body.body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, title, body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // For security, users can only send test notifications to themselves
    // Server-side notifications (from triggers) should use service role directly
    if (body.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Can only send notifications to yourself" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user's active push subscriptions
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .rpc("get_user_push_subscriptions", { p_user_id: body.user_id });

    if (subError) {
      console.error("Failed to get subscriptions:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to get push subscriptions" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No active push subscriptions found",
          sent: 0,
          failed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build notification payload
    const notificationPayload = {
      title: body.title,
      body: body.body,
      icon: body.icon || "/logo.png",
      badge: body.badge || "/logo.png",
      type: body.type,
      url: body.url || "/",
      related_id: body.related_id,
      timestamp: new Date().toISOString(),
    };

    // Send to all subscriptions
    const results = await Promise.all(
      subscriptions.map((sub: PushSubscription) =>
        sendPushToSubscription(
          sub,
          notificationPayload,
          vapidSubject,
          vapidPublicKey,
          vapidPrivateKey
        )
      )
    );

    // Deactivate any subscriptions that returned 410 Gone
    const staleSubscriptions = results.filter((r) => r.statusCode === 410);
    for (const stale of staleSubscriptions) {
      const sub = subscriptions.find((s: PushSubscription) => s.id === stale.subscriptionId);
      if (sub) {
        await supabaseAdmin.rpc("deactivate_push_subscription", { p_endpoint: sub.endpoint });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        success: sent > 0,
        message: `Sent ${sent} notification(s), ${failed} failed`,
        sent,
        failed,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
