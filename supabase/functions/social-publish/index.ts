// social-publish — pubblica (o programma) un video o un carosello di foto
// su un account TikTok/YouTube collegato.
//
// Azioni (POST, con il JWT dell'utente):
//   creator_info  { connection_id } → nome, visibilità ammesse e limiti del
//                 profilo TikTok (le linee guida TikTok chiedono di mostrarli)
//   publish       { connection_id, kind: 'video'|'photos', video_path?,
//                   photo_paths?, caption, tiktok?, youtube?, scheduled_for? }
//
// I file stanno nello Storage: video in social-video, foto (JPEG) in
// social-pubblici, sempre sotto la cartella dell'utente.

import { adminClient, requireAuth, requireWithinRateLimit } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { validateTikTokOptions } from "../_shared/social/socialCore.ts";
import { loadConnection, tiktokCreatorInfo } from "../_shared/socialApi.ts";
import {
  PHOTO_BUCKET,
  VIDEO_BUCKET,
  assertOwnedPaths,
  recordSocialPost,
  runSocialJob,
  type SocialJob,
} from "../_shared/socialPublish.ts";

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return jsonResponse(req, { success: false, error: auth.error }, auth.status);
    const userId = auth.userId;
    const admin = adminClient();
    const body = await req.json().catch(() => ({}));

    const connectionId = body.connection_id;
    if (typeof connectionId !== "string") return jsonResponse(req, { success: false, error: "connection_id mancante" }, 400);
    const { data: row } = await admin.from("social_connections")
      .select("id, user_id, brand_id, platform, is_active").eq("id", connectionId).maybeSingle();
    if (!row || row.user_id !== userId) return jsonResponse(req, { success: false, error: "Connessione non trovata" }, 404);
    if (!row.is_active) return jsonResponse(req, { success: false, error: "Account scollegato: ricollegalo" }, 400);

    if (body.action === "creator_info") {
      if (row.platform !== "tiktok") return jsonResponse(req, { success: true, info: null });
      const conn = await loadConnection(admin, connectionId);
      return jsonResponse(req, { success: true, info: await tiktokCreatorInfo(conn.accessToken) });
    }

    if (body.action !== "publish") return jsonResponse(req, { success: false, error: "Azione non valida" }, 400);

    const kind = body.kind === "photos" ? "photos" : "video";
    const caption = typeof body.caption === "string" ? body.caption.slice(0, 5000) : "";
    const job: SocialJob = {
      connectionId,
      userId,
      kind,
      videoPath: typeof body.video_path === "string" ? body.video_path : null,
      photoPaths: Array.isArray(body.photo_paths) ? body.photo_paths.filter((p: unknown) => typeof p === "string") : null,
      caption,
      tiktok: row.platform === "tiktok" ? body.tiktok ?? null : null,
      youtube: row.platform === "youtube" ? body.youtube ?? null : null,
    };

    if (kind === "video") {
      if (!job.videoPath) return jsonResponse(req, { success: false, error: "Video mancante" }, 400);
      assertOwnedPaths(userId, [job.videoPath]);
    } else {
      if (row.platform !== "tiktok") return jsonResponse(req, { success: false, error: "Le foto si pubblicano solo su TikTok" }, 400);
      if (!job.photoPaths?.length) return jsonResponse(req, { success: false, error: "Nessuna foto" }, 400);
      assertOwnedPaths(userId, job.photoPaths);
    }
    if (row.platform === "tiktok") {
      if (!job.tiktok) return jsonResponse(req, { success: false, error: "Mancano le scelte per TikTok" }, 400);
      const invalid = validateTikTokOptions(job.tiktok);
      if (invalid) return jsonResponse(req, { success: false, error: invalid }, 400);
    } else if (!job.youtube?.title || !["public", "unlisted", "private"].includes(job.youtube.privacy_status)) {
      return jsonResponse(req, { success: false, error: "Mancano titolo e visibilità per YouTube" }, 400);
    }

    const platformOptions = { tiktok: job.tiktok, youtube: job.youtube };
    const baseRow = {
      user_id: userId,
      content: caption || "(senza testo)",
      platforms: [row.platform],
      social_connection_id: connectionId,
      media_type: kind === "video" ? "video" : "post",
      video_path: kind === "video" ? job.videoPath : null,
      video_bucket: kind === "video" ? VIDEO_BUCKET : null,
      image_paths: kind === "photos" ? job.photoPaths : null,
      image_bucket: kind === "photos" ? PHOTO_BUCKET : null,
    };

    // ── Programmato: lo pubblica process-scheduled-posts all'ora scelta
    if (body.scheduled_for) {
      const when = new Date(body.scheduled_for);
      if (isNaN(when.getTime()) || when.getTime() < Date.now() + 30_000) {
        return jsonResponse(req, { success: false, error: "Scegli un orario nel futuro" }, 400);
      }
      const { data: ins, error } = await admin.from("published_posts").insert({
        ...baseRow,
        status: "scheduled",
        scheduled_for: when.toISOString(),
        published_at: null,
        platform_options: platformOptions,
      }).select("id").single();
      if (error) return jsonResponse(req, { success: false, error: "Errore programmazione: " + error.message }, 500);
      return jsonResponse(req, { success: true, scheduled: true, id: ins.id });
    }

    // ── Subito
    const rl = await requireWithinRateLimit(admin, userId, "social-publish", 10, 3600);
    if (!rl.ok) return jsonResponse(req, { success: false, error: rl.error }, rl.status);

    try {
      const result = await runSocialJob(admin, job);
      const { data: ins } = await admin.from("published_posts").insert({
        ...baseRow,
        status: result.status,
        published_at: new Date().toISOString(),
        external_post_id: result.externalPostId,
        platform_options: { ...platformOptions, publish_id: result.publishId, url: result.url },
      }).select("id").single();
      await recordSocialPost(admin, result.connection, result, ins?.id ?? null,
        job.youtube?.title || caption.split("\n")[0] || "");
      return jsonResponse(req, {
        success: true,
        status: result.status,
        external_post_id: result.externalPostId,
        url: result.url,
      });
    } catch (e) {
      const msg = (e as Error).message;
      await admin.from("published_posts").insert({
        ...baseRow,
        status: "failed",
        published_at: null,
        error_message: msg,
        platform_options: platformOptions,
      });
      return jsonResponse(req, { success: false, error: msg }, 502);
    }
  } catch (e) {
    console.error("social-publish:", (e as Error).message);
    return jsonResponse(req, { success: false, error: (e as Error).message || "Errore interno" }, 500);
  }
});
