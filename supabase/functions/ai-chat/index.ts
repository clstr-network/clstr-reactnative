import "./deno-shim.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the clstr.network AI Career Assistant — an advisory companion for college students & alumni.

Your capabilities:
- Career guidance: resume tips, interview prep, industry insights
- Academic advice: course selection, research opportunities, grad-school planning
- Networking tips: how to approach alumni, build professional relationships
- Platform guidance: explain clstr.network features (clubs, events, team-ups, jobs)

Your boundaries (STRICT):
- You NEVER create, modify, or delete any user data, invites, or database records.
- You NEVER impersonate university staff, recruiters, or admins.
- You are advisory only — you explain, suggest, and flag, but you do NOT execute actions.
- If asked something outside your scope, politely redirect.
- Keep responses concise (under 300 words unless the user asks for more detail).
- Use a friendly, student-centric tone. Be encouraging but honest.`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────
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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Validate body ────────────────────────────────────
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({
          error: "Invalid request. Messages array is required.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── OpenRouter API key ───────────────────────────────
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenRouter API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Call OpenRouter ──────────────────────────────────
    const openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://clstr.network",
          "X-Title": "clstr.network",
        },
        body: JSON.stringify({
          model: "qwen/qwen3-235b-a22b:free",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          max_tokens: 800,
        }),
      }
    );

    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.json();
      console.error("OpenRouter API error:", errorData);
      throw new Error(`OpenRouter API error: ${JSON.stringify(errorData)}`);
    }

    const data = await openRouterResponse.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const normalizedError =
      error instanceof Error ? error : new Error(String(error));
    console.error("Error in ai-chat function:", normalizedError);
    return new Response(
      JSON.stringify({
        error: normalizedError.message || "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
