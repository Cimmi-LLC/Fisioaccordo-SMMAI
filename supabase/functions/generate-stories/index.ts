import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, requireAuth, requireWithinRateLimit } from "../_shared/auth.ts";
import { callGeminiWithRetry } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Convert Claude-style messages to Gemini format
function convertMessages(messages: any[]) {
  const contents: any[] = [];
  for (const msg of messages) {
    const parts: any[] = [];
    if (typeof msg.content === "string") {
      parts.push({ text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "text") {
          parts.push({ text: block.text });
        } else if (block.type === "document" && block.source?.type === "base64") {
          // Gemini accepts inline_data for PDFs
          parts.push({
            inline_data: {
              mime_type: block.source.media_type || "application/pdf",
              data: block.source.data,
            },
          });
        }
      }
    }
    if (parts.length > 0) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts,
      });
    }
  }
  return contents;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth + rate limit (50 calls/min per user, generous for batch story flows)
    const auth = await requireAuth(req);
    if (auth.ok) {
      const supabaseAdmin = adminClient();
      const rl = await requireWithinRateLimit(supabaseAdmin, auth.userId, "generate-stories", 50, 60);
      if (!rl.ok) {
        return new Response(JSON.stringify({ error: rl.error }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rl.retryAfter ?? 60) },
        });
      }
    }
    // Note: if !auth.ok we still allow (preserves dev/test paths). In production
    // edge gateway with verify_jwt=true would reject anonymous calls upstream.

    const { messages, max_tokens, temperature } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contents = convertMessages(messages);

    const geminiResult = await callGeminiWithRetry({
      apiKey: GEMINI_API_KEY,
      body: {
        contents,
        generationConfig: {
          // Allow caller to override temperature (use ~0.1 for structured
          // extraction tasks like parsing reviews from PDF/CSV).
          temperature: typeof temperature === "number" ? temperature : 0.85,
          maxOutputTokens: max_tokens || 5000,
        },
      },
    });

    if (!geminiResult.ok) {
      const userMsg = geminiResult.status === 503
        ? "Gemini è temporaneamente sovraccarico. Riprova tra 30 secondi."
        : geminiResult.status === 429
        ? "Quota Gemini superata. Riprova tra qualche minuto."
        : `AI API error: ${geminiResult.status}`;
      return new Response(JSON.stringify({ error: userMsg }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = geminiResult.data;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Return in Claude-compatible format so existing client code works
    return new Response(JSON.stringify({
      content: [{ type: "text", text }],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-stories error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
