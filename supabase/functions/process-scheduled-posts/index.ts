import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { publishToInstagram, publishStory } from "../_shared/instagramPublish.ts";
import { adminClient, requireCronSecret } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { giroReel, REEL_COLONNE, type RigaReelDb, type Client } from "../_shared/reelPublish.ts";
import { recordSocialPost, runSocialJob } from "../_shared/socialPublish.ts";
import { loadConnection, tiktokPublishStatus } from "../_shared/socialApi.ts";

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

    // TikTok pubblica in differita: i contenuti «in pubblicazione» si
    // ricontrollano a ogni giro finché diventano pubblicati o falliti.
    const settled = await settleProcessing(supabase);

    // Reel in elaborazione su Instagram: a ogni giro si controlla il container.
    const { data: reelInCorso, error: reelErr } = await supabase
      .from("published_posts")
      .select(REEL_COLONNE)
      .eq("status", "processing")
      .eq("media_type", "reel")
      .order("updated_at", { ascending: true })
      .limit(BATCH_SIZE);
    if (reelErr) console.error("Select reel error:", reelErr);

    const pronti = posts || [];
    const inCorso = (reelInCorso || []) as unknown as RigaReelDb[];
    if (pronti.length === 0 && inCorso.length === 0) {
      return jsonResponse(req, { processed: 0, settled, message: "Nessun post pronto" });
    }

    const results = [];
    for (const post of pronti) {
      results.push(post.media_type === "reel" ? await processReel(supabase, post) : await processPost(supabase, post));
    }
    for (const reel of inCorso) {
      results.push(await processReel(supabase, reel));
    }

    return jsonResponse(req, { processed: results.length, settled, results });
  } catch (e) {
    console.error("process-scheduled-posts error:", e);
    return jsonResponse(req, { error: "Errore interno" }, 500);
  }
});

async function processReel(
  supabase: Client,
  riga: RigaReelDb
): Promise<{ id: string; success: boolean; esito?: string; error?: string }> {
  try {
    const esito = await giroReel(supabase, riga);
    const errore = "errore" in esito ? esito.errore : undefined;
    return { id: riga.id, success: esito.esito !== "fallito", esito: esito.esito, error: errore };
  } catch (err) {
    // Errore imprevisto: la riga resta com'è e si riprova al giro dopo.
    console.error("processReel error:", riga.id, err);
    return { id: riga.id, success: false, error: err instanceof Error ? err.message : "Errore sconosciuto" };
  }
}

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

  // TikTok / YouTube
  if (post.social_connection_id) return await processSocialPost(supabase, post, newAttempts);

  try {
    if (!post.connection_id) throw new Error("connection_id mancante");

    // Prefer new {bucket, paths} shape. Mint signed URLs right now (TTL 10
    // minutes) so Meta Graph can download them during container creation.
    // Fall back to legacy image_urls if present.
    let mediaUrls: string[] = [];
    const hasPaths = Array.isArray(post.image_paths) && post.image_paths.length > 0;
    if (hasPaths) {
      const bucket = post.image_bucket || "carousel-images";
      // Ownership: the cron is service-role but each path must belong to the
      // post owner. We re-check here as defense in depth (DB rows should
      // already satisfy it because schedule-post enforced it on insert).
      const ownerPrefix = post.user_id + "/";
      for (const p of post.image_paths) {
        if (typeof p !== "string" || !p.startsWith(ownerPrefix)) {
          throw new Error("Path non appartiene al proprietario del post");
        }
      }
      const { data: signed, error: signErr } = await supabase.storage
        .from(bucket)
        .createSignedUrls(post.image_paths, 60 * 10);
      if (signErr || !signed) {
        throw new Error("Signed URL fallita: " + (signErr?.message || "unknown"));
      }
      mediaUrls = signed.map((s: any) => s.signedUrl);
    } else if (Array.isArray(post.image_urls) && post.image_urls.length > 0) {
      mediaUrls = post.image_urls;
    } else {
      throw new Error("image_paths/image_urls mancante");
    }

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
          mediaUrls[0]
        )
      : await publishToInstagram(
          conn.instagram_business_id,
          conn.page_access_token,
          fullCaption,
          mediaUrls
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

async function processSocialPost(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  post: any,
  attempts: number,
): Promise<{ id: string; success: boolean; error?: string }> {
  const opts = post.platform_options || {};
  try {
    const result = await runSocialJob(supabase, {
      connectionId: post.social_connection_id,
      userId: post.user_id,
      kind: post.media_type === "video" ? "video" : "photos",
      videoPath: post.video_path,
      photoPaths: post.image_paths,
      caption: post.hashtags ? `${post.content}\n\n${post.hashtags}` : post.content,
      tiktok: opts.tiktok ?? null,
      youtube: opts.youtube ?? null,
    }, 8000);
    await supabase.from("published_posts").update({
      status: result.status,
      published_at: new Date().toISOString(),
      external_post_id: result.externalPostId,
      platform_options: { ...opts, publish_id: result.publishId, url: result.url },
      error_message: null,
      updated_at: new Date().toISOString(),
    }).eq("id", post.id);
    await recordSocialPost(supabase, result.connection, result, post.id, opts.youtube?.title || String(post.content).split("\n")[0]);
    return { id: post.id, success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Errore sconosciuto";
    await supabase.from("published_posts").update({
      status: attempts >= MAX_ATTEMPTS ? "failed" : "scheduled",
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    }).eq("id", post.id);
    return { id: post.id, success: false, error: errorMessage };
  }
}

// deno-lint-ignore no-explicit-any
async function settleProcessing(supabase: any): Promise<number> {
  const { data: rows } = await supabase
    .from("published_posts")
    .select("id, user_id, social_connection_id, platform_options, content, published_at, updated_at")
    .eq("status", "processing")
    .not("social_connection_id", "is", null)
    .order("updated_at", { ascending: true })
    .limit(10);
  let done = 0;
  for (const p of rows || []) {
    const publishId = p.platform_options?.publish_id;
    if (!p.social_connection_id || !publishId) continue;
    if (p.published_at && Date.parse(p.published_at) < Date.now() - 24 * 3600 * 1000) {
      await supabase.from("published_posts").update({
        status: "failed", error_message: "TikTok non ha confermato la pubblicazione entro 24 ore", updated_at: new Date().toISOString(),
      }).eq("id", p.id);
      continue;
    }
    try {
      const conn = await loadConnection(supabase, p.social_connection_id);
      const s = await tiktokPublishStatus(conn.accessToken, publishId);
      if (s.status === "PUBLISH_COMPLETE") {
        await supabase.from("published_posts").update({
          status: "published", external_post_id: s.postId, error_message: null, updated_at: new Date().toISOString(),
        }).eq("id", p.id);
        if (s.postId) {
          await recordSocialPost(supabase, { id: conn.id, user_id: conn.user_id, brand_id: conn.brand_id, platform: conn.platform },
            { status: "published", externalPostId: s.postId, publishId, url: null }, p.id, String(p.content).split("\n")[0]);
        }
        done++;
      } else if (s.status === "FAILED") {
        await supabase.from("published_posts").update({
          status: "failed", error_message: `TikTok: ${s.failReason || "pubblicazione fallita"}`, updated_at: new Date().toISOString(),
        }).eq("id", p.id);
        done++;
      } else {
        // tocca updated_at così il prossimo giro guarda prima gli altri
        await supabase.from("published_posts").update({ updated_at: new Date().toISOString() }).eq("id", p.id);
      }
    } catch (e) {
      console.warn("stato TikTok non letto per", p.id, (e as Error).message);
    }
  }
  return done;
}
