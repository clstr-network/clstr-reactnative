/**
 * Send Push Notification Edge Function
 * 
 * Sends notifications via BOTH channels:
 * 1. Web Push (VAPID) — to push_subscriptions (desktop/mobile browsers)
 * 2. Expo Push — to device_tokens (iOS/Android native apps)
 * 
 * Requires VAPID keys for Web Push and reads Expo tokens from device_tokens.
 * VAPID keys in Supabase secrets:
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

interface DeviceToken {
  id: string;
  expo_push_token: string;
  device_type: string;
}

// ── Expo Push API ────────────────────────────────────────────────────────
const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
  priority?: "default" | "normal" | "high";
}

async function sendExpoPushNotifications(
  tokens: DeviceToken[],
  payload: { title: string; body: string; data: Record<string, unknown> },
): Promise<{ sent: number; failed: number; invalidTokenIds: string[] }> {
  if (tokens.length === 0) return { sent: 0, failed: 0, invalidTokenIds: [] };

  const messages: ExpoPushMessage[] = tokens.map((t) => ({
    to: t.expo_push_token,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sound: "default",
    channelId: "default",
    priority: "high",
  }));

  try {
    const response = await fetch(EXPO_PUSH_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error(`[expo-push] API error: ${response.status}`);
      return { sent: 0, failed: tokens.length, invalidTokenIds: [] };
    }

    const result = await response.json() as { data: Array<{ status: string; message?: string; details?: { error?: string } }> };
    let sent = 0;
    let failed = 0;
    const invalidTokenIds: string[] = [];

    for (let i = 0; i < result.data.length; i++) {
      const ticket = result.data[i];
      if (ticket.status === "ok") {
        sent++;
      } else {
        failed++;
        // Mark DeviceNotRegistered tokens for deactivation
        if (ticket.details?.error === "DeviceNotRegistered") {
          invalidTokenIds.push(tokens[i].id);
        }
      }
    }

    return { sent, failed, invalidTokenIds };
  } catch (error) {
    console.error("[expo-push] Send error:", error);
    return { sent: 0, failed: tokens.length, invalidTokenIds: [] };
  }
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

    // Get user's active push subscriptions (Web Push)
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .rpc("get_user_push_subscriptions", { p_user_id: body.user_id });

    if (subError) {
      console.error("Failed to get web push subscriptions:", subError);
    }

    // Get user's active device tokens (Expo Push)
    const { data: deviceTokens, error: dtError } = await supabaseAdmin
      .rpc("get_user_device_tokens", { p_user_id: body.user_id });

    if (dtError) {
      console.error("Failed to get device tokens:", dtError);
    }

    const hasWebSubs = subscriptions && subscriptions.length > 0;
    const hasDeviceTokens = deviceTokens && deviceTokens.length > 0;

    if (!hasWebSubs && !hasDeviceTokens) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No active push subscriptions or device tokens found",
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

    let totalSent = 0;
    let totalFailed = 0;

    // ── Web Push (VAPID) ──────────────────────────────────────────────────
    if (hasWebSubs && vapidPublicKey && vapidPrivateKey) {
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

      totalSent += results.filter((r) => r.success).length;
      totalFailed += results.filter((r) => !r.success).length;
    }

    // ── Expo Push (native mobile) ─────────────────────────────────────────
    if (hasDeviceTokens) {
      const expoResult = await sendExpoPushNotifications(
        deviceTokens as DeviceToken[],
        {
          title: body.title,
          body: body.body,
          data: {
            type: body.type,
            url: body.url || "/",
            related_id: body.related_id,
          },
        },
      );

      // Deactivate invalid tokens (DeviceNotRegistered)
      for (const tokenId of expoResult.invalidTokenIds) {
        const token = (deviceTokens as DeviceToken[]).find((t) => t.id === tokenId);
        if (token) {
          await supabaseAdmin
            .from("device_tokens")
            .update({ is_active: false })
            .eq("id", tokenId);
        }
      }

      totalSent += expoResult.sent;
      totalFailed += expoResult.failed;
    }

    return new Response(
      JSON.stringify({
        success: totalSent > 0,
        message: `Sent ${totalSent} notification(s), ${totalFailed} failed`,
        sent: totalSent,
        failed: totalFailed,
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
