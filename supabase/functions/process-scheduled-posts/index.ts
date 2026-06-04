import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { publishToInstagram, publishStory } from "../_shared/instagramPublish.ts";
import { adminClient, requireCronSecret } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 10;

serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    // ── Cron secret check: this endpoint must NOT be callable anonymously.
    // The Supabase cron schedules it with header `x-cron-secret`.
    const cron = requireCronSecret(req);
    if (!cron.ok) return jsonResponse(req, { error: cron.error }, cron.status);

    const supabase = adminClient();
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
      return jsonResponse(req, { error: "Errore lettura posts" }, 500);
    }

    if (!posts || posts.length === 0) {
      return jsonResponse(req, { processed: 0, message: "Nessun post pronto" });
    }

    const results = [];
    for (const post of posts) {
      const result = await processPost(supabase, post);
      results.push(result);
    }

    return jsonResponse(req, { processed: posts.length, results });
  } catch (e) {
    console.error("process-scheduled-posts error:", e);
    return jsonResponse(req, { error: "Errore interno" }, 500);
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

    // Read token via security-definer RPC (decrypted from Vault-protected key)
    const { data: connRows, error: connErr } = await supabase
      .rpc("get_meta_connection_token", { p_connection_id: post.connection_id });

    const conn = Array.isArray(connRows) ? connRows[0] : null;
    if (connErr || !conn) throw new Error("Connessione Meta non trovata");
    if (!conn.is_active) throw new Error("Connessione Meta disattivata");
    if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
      throw new Error("Token Meta scaduto");
    }
    if (!conn.instagram_business_id) throw new Error("Account Instagram non collegato");
    if (!conn.page_access_token) throw new Error("Token non disponibile (Vault non configurato)");

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
