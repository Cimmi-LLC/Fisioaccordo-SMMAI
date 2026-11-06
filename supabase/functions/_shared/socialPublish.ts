// Pubblicazione di un contenuto su TikTok o YouTube: la usano social-publish
// («Pubblica ora») e process-scheduled-posts (programmati).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { TikTokOptions, YouTubeOptions } from "./social/socialCore.ts";
import {
  downloadVideo,
  loadConnection,
  publishTikTokPhotos,
  publishTikTokVideo,
  publishYouTubeVideo,
  tiktokPublishStatus,
} from "./socialApi.ts";

// Client service_role senza tipi generati del database.
// deno-lint-ignore no-explicit-any
type Admin = SupabaseClient<any, any, any>;

export const PHOTO_BUCKET = "social-pubblici";
export const VIDEO_BUCKET = "social-video";

export interface SocialJob {
  connectionId: string;
  userId: string;
  kind: "video" | "photos";
  videoPath?: string | null;
  photoPaths?: string[] | null;
  /** Testo del post (didascalia TikTok, descrizione YouTube). */
  caption: string;
  tiktok?: TikTokOptions | null;
  youtube?: YouTubeOptions | null;
}

export interface SocialResult {
  /** 'processing': TikTok ha ricevuto il contenuto e lo sta pubblicando */
  status: "published" | "processing";
  externalPostId: string | null;
  publishId: string | null;
  url: string | null;
}

export interface SocialConnRef {
  id: string;
  user_id: string;
  brand_id: string | null;
  platform: string;
}

export function assertOwnedPaths(userId: string, paths: string[]): void {
  for (const p of paths) {
    if (typeof p !== "string" || !p.startsWith(userId + "/") || p.includes("..")) {
      throw new Error("Percorso del file non autorizzato");
    }
  }
}

function publicPhotoUrl(path: string): string {
  const base = Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${PHOTO_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Chiede a TikTok a che punto è; aspetta al massimo `maxWaitMs`. */
async function settleTikTok(token: string, publishId: string, maxWaitMs: number): Promise<SocialResult> {
  const until = Date.now() + maxWaitMs;
  while (true) {
    const s = await tiktokPublishStatus(token, publishId);
    if (s.status === "FAILED") throw new Error(`TikTok ha rifiutato il contenuto: ${s.failReason || "motivo non indicato"}`);
    if (s.status === "PUBLISH_COMPLETE") {
      return { status: "published", externalPostId: s.postId, publishId, url: null };
    }
    if (Date.now() + 4000 > until) return { status: "processing", externalPostId: null, publishId, url: null };
    await wait(4000);
  }
}

export async function runSocialJob(
  admin: Admin,
  job: SocialJob,
  maxWaitMs = 20000,
): Promise<SocialResult & { connection: SocialConnRef }> {
  const conn = await loadConnection(admin, job.connectionId);
  if (conn.user_id !== job.userId) throw new Error("Connessione non autorizzata");
  const connection = { id: conn.id, user_id: conn.user_id, brand_id: conn.brand_id, platform: conn.platform };
  return { ...(await publishWith(admin, conn, job, maxWaitMs)), connection };
}

async function publishWith(
  admin: Admin,
  conn: Awaited<ReturnType<typeof loadConnection>>,
  job: SocialJob,
  maxWaitMs: number,
): Promise<SocialResult> {
  if (conn.platform === "youtube") {
    if (job.kind !== "video" || !job.videoPath) throw new Error("Su YouTube si pubblicano solo video");
    if (!job.youtube) throw new Error("Mancano titolo e visibilità per YouTube");
    assertOwnedPaths(job.userId, [job.videoPath]);
    const { bytes, contentType } = await downloadVideo(admin, VIDEO_BUCKET, job.videoPath);
    const { videoId } = await publishYouTubeVideo(conn.accessToken, bytes, contentType, job.youtube, job.caption);
    return { status: "published", externalPostId: videoId, publishId: null, url: `https://www.youtube.com/shorts/${videoId}` };
  }

  if (!job.tiktok) throw new Error("Mancano le scelte di pubblicazione per TikTok");
  if (job.kind === "video") {
    if (!job.videoPath) throw new Error("Video mancante");
    assertOwnedPaths(job.userId, [job.videoPath]);
    const { bytes, contentType } = await downloadVideo(admin, VIDEO_BUCKET, job.videoPath);
    const { publishId } = await publishTikTokVideo(conn.accessToken, bytes, contentType, job.tiktok, job.caption);
    return await settleTikTok(conn.accessToken, publishId, maxWaitMs);
  }

  const photos = job.photoPaths || [];
  if (photos.length === 0) throw new Error("Nessuna foto da pubblicare");
  assertOwnedPaths(job.userId, photos);
  const firstLine = (job.caption.split("\n").find((l) => l.trim()) || "").trim();
  const { publishId } = await publishTikTokPhotos(
    conn.accessToken,
    photos.map(publicPhotoUrl),
    job.tiktok,
    firstLine,
    job.caption,
  );
  return await settleTikTok(conn.accessToken, publishId, maxWaitMs);
}

/** Dopo la pubblicazione: il contenuto entra tra quelli di cui leggere i numeri. */
export async function recordSocialPost(
  admin: Admin,
  conn: SocialConnRef,
  result: SocialResult,
  publishedPostId: string | null,
  title: string,
): Promise<void> {
  if (!result.externalPostId) return;
  const { error } = await admin.from("social_posts").upsert({
    user_id: conn.user_id,
    brand_id: conn.brand_id,
    connection_id: conn.id,
    platform: conn.platform,
    external_post_id: result.externalPostId,
    published_post_id: publishedPostId,
    title: title.slice(0, 240) || null,
    url: result.url,
    published_at: new Date().toISOString(),
  }, { onConflict: "platform,external_post_id" });
  if (error) console.warn("social_posts non aggiornato:", error.message);
}
