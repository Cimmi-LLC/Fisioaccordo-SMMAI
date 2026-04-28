import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { publishToInstagram, publishStory } from "../_shared/instagramPublish.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 10;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Supabase config missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const nowIso = new Date().toISOString();

    const { data: posts, error: selErr } = await supabase
      .from("published_posts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_for", nowIso)
      .lt("attempts", MAX_ATTEMPTS)
      .order("scheduled_for", { ascending: true })
      .limit(BATCH_SIZE);

    if (selErr) {
      console.error("Select error:", selErr);
      return new Response(JSON.stringify({ error: selErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "Nessun post pronto" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];
    for (const post of posts) {
      const result = await processPost(supabase, post);
      results.push(result);
    }

    return new Response(JSON.stringify({ processed: posts.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-scheduled-posts error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processPost(
  supabase: ReturnType<typeof createClient>,
  post: any
): Promise<{ id: string; success: boolean; error?: string }> {
  const newAttempts = (post.attempts || 0) + 1;

  // Mark as in-flight to prevent double-processing if cron overlaps
  await supabase
    .from("published_posts")
    .update({ attempts: newAttempts, updated_at: new Date().toISOString() })
    .eq("id", post.id);

  try {
    if (!post.connection_id) throw new Error("connection_id mancante");
    if (!post.image_urls || post.image_urls.length === 0) throw new Error("image_urls mancante");

    const { data: conn, error: connErr } = await supabase
      .from("meta_connections")
      .select("page_access_token, instagram_business_id, token_expires_at, is_active")
      .eq("id", post.connection_id)
      .single();

    if (connErr || !conn) throw new Error("Connessione Meta non trovata");
    if (!conn.is_active) throw new Error("Connessione Meta disattivata");
    if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
      throw new Error("Token Meta scaduto");
    }
    if (!conn.instagram_business_id) throw new Error("Account Instagram non collegato");

    const fullCaption = post.hashtags
      ? `${post.content}\n\n${post.hashtags}`
      : post.content;

    const isStory = post.media_type === 'story';
    const result = isStory
      ? await publishStory(
          conn.instagram_business_id,
          conn.page_access_token,
          post.image_urls[0]
        )
      : await publishToInstagram(
          conn.instagram_business_id,
          conn.page_access_token,
          fullCaption,
          post.image_urls
        );

    if (!result.success) throw new Error(result.error || "Pubblicazione fallita");

    await supabase
      .from("published_posts")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        blotato_post_id: result.postId,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    return { id: post.id, success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Errore sconosciuto";
    const isFinalAttempt = newAttempts >= MAX_ATTEMPTS;

    await supabase
      .from("published_posts")
      .update({
        status: isFinalAttempt ? "failed" : "scheduled",
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    return { id: post.id, success: false, error: errorMessage };
  }
}
