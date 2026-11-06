// Chiamate di rete verso TikTok (Login Kit, Content Posting, Display API) e
// Google (OAuth, YouTube Data API v3, YouTube Analytics API). Le regole pure
// stanno in ./social/socialCore.ts, specchio di src/lib/social/socialCore.ts.
//
// Segreti (Supabase → Edge Functions → Secrets, li inserisce Attilio):
//   TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//   APP_ORIGIN (facoltativo, di serie https://fisioaccordo-smm-ai.vercel.app)

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type SocialPlatform,
  type TikTokOptions,
  type YouTubeOptions,
  PLATFORM_LABEL,
  needsRefresh,
  tiktokChunkPlan,
  tiktokPostInfo,
  youtubeDescription,
  youtubeTitle,
} from "./social/socialCore.ts";

// Client service_role senza tipi generati del database.
// deno-lint-ignore no-explicit-any
type Admin = SupabaseClient<any, any, any>;

const TIKTOK_API = "https://open.tiktokapis.com/v2";
const YT_API = "https://www.googleapis.com/youtube/v3";

export const DEFAULT_APP_ORIGIN = "https://fisioaccordo-smm-ai.vercel.app";

export function appOrigin(): string {
  return (Deno.env.get("APP_ORIGIN") || DEFAULT_APP_ORIGIN).replace(/\/$/, "");
}

export function platformCredentials(p: SocialPlatform): { clientId: string; clientSecret: string } | null {
  const clientId = Deno.env.get(p === "tiktok" ? "TIKTOK_CLIENT_KEY" : "GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get(p === "tiktok" ? "TIKTOK_CLIENT_SECRET" : "GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function requireCredentials(p: SocialPlatform) {
  const c = platformCredentials(p);
  if (!c) throw new Error(`${PLATFORM_LABEL[p]} non configurato sul server`);
  return c;
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
  refreshExpiresAt: string | null;
  scopes: string | null;
  /** TikTok: open_id arriva già con il token */
  openId?: string | null;
}

function inSeconds(sec: number | undefined, fallback: number): string {
  return new Date(Date.now() + (Number(sec) || fallback) * 1000).toISOString();
}

async function readJson(res: Response): Promise<any> {
  return await res.json().catch(() => ({}));
}

/** TikTok risponde 200 con error.code diverso da "ok" quando qualcosa va storto. */
function tiktokError(data: any, res: Response, label: string): Error | null {
  const code = data?.error?.code;
  if (res.ok && (!code || code === "ok")) return null;
  const msg = data?.error?.message || data?.error_description || data?.error || `HTTP ${res.status}`;
  return new Error(`${label}: ${code && code !== "ok" ? code + " – " : ""}${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
}

function googleError(data: any, res: Response, label: string): Error | null {
  if (res.ok) return null;
  const reason = data?.error?.errors?.[0]?.reason;
  const msg = data?.error?.message || data?.error_description || data?.error || `HTTP ${res.status}`;
  return new Error(`${label}: ${reason ? reason + " – " : ""}${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
}

// ── Token ───────────────────────────────────────────────────────────

export async function exchangeCode(p: SocialPlatform, code: string, redirectUri: string): Promise<TokenSet> {
  const { clientId, clientSecret } = requireCredentials(p);
  if (p === "tiktok") {
    const res = await fetch(`${TIKTOK_API}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    const d = await readJson(res);
    if (!d.access_token) throw tiktokError(d, res, "Scambio codice TikTok") ?? new Error("Scambio codice TikTok fallito");
    return {
      accessToken: d.access_token,
      refreshToken: d.refresh_token ?? null,
      expiresAt: inSeconds(d.expires_in, 86400),
      refreshExpiresAt: d.refresh_expires_in ? inSeconds(d.refresh_expires_in, 0) : null,
      scopes: d.scope ?? null,
      openId: d.open_id ?? null,
    };
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const d = await readJson(res);
  if (!d.access_token) throw googleError(d, res, "Scambio codice Google") ?? new Error("Scambio codice Google fallito");
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token ?? null,
    expiresAt: inSeconds(d.expires_in, 3600),
    refreshExpiresAt: null,
    scopes: d.scope ?? null,
  };
}

export async function refreshTokens(p: SocialPlatform, refreshToken: string): Promise<TokenSet> {
  const { clientId, clientSecret } = requireCredentials(p);
  if (p === "tiktok") {
    const res = await fetch(`${TIKTOK_API}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    const d = await readJson(res);
    if (!d.access_token) throw tiktokError(d, res, "Rinnovo token TikTok") ?? new Error("Rinnovo token TikTok fallito");
    return {
      accessToken: d.access_token,
      refreshToken: d.refresh_token ?? null,
      expiresAt: inSeconds(d.expires_in, 86400),
      refreshExpiresAt: d.refresh_expires_in ? inSeconds(d.refresh_expires_in, 0) : null,
      scopes: d.scope ?? null,
    };
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const d = await readJson(res);
  if (!d.access_token) throw googleError(d, res, "Rinnovo token Google") ?? new Error("Rinnovo token Google fallito");
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token ?? null,
    expiresAt: inSeconds(d.expires_in, 3600),
    refreshExpiresAt: null,
    scopes: d.scope ?? null,
  };
}

/** Toglie il permesso all'app sulla piattaforma (allo scollegamento). Mai bloccante. */
export async function revokeToken(p: SocialPlatform, token: string): Promise<void> {
  try {
    if (p === "tiktok") {
      const c = platformCredentials(p);
      if (!c) return;
      await fetch(`${TIKTOK_API}/oauth/revoke/`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_key: c.clientId, client_secret: c.clientSecret, token }),
      });
    } else {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST" });
    }
  } catch (e) {
    console.warn(`revoca ${p} non riuscita:`, (e as Error).message);
  }
}

// ── Profilo ─────────────────────────────────────────────────────────

export interface Profile {
  externalId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  followers: number | null;
  extra: Record<string, unknown>;
}

export async function fetchProfile(p: SocialPlatform, accessToken: string): Promise<Profile> {
  if (p === "tiktok") {
    const fields = "open_id,avatar_url,display_name,username,follower_count,likes_count,video_count";
    const res = await fetch(`${TIKTOK_API}/user/info/?fields=${fields}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const d = await readJson(res);
    const err = tiktokError(d, res, "Profilo TikTok");
    if (err) throw err;
    const u = d?.data?.user || {};
    return {
      externalId: String(u.open_id || ""),
      username: u.username || null,
      displayName: u.display_name || null,
      avatarUrl: u.avatar_url || null,
      followers: u.follower_count ?? null,
      extra: { likes_count: u.likes_count ?? null, video_count: u.video_count ?? null },
    };
  }
  const res = await fetch(`${YT_API}/channels?part=snippet,statistics,contentDetails&mine=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const d = await readJson(res);
  const err = googleError(d, res, "Canale YouTube");
  if (err) throw err;
  const ch = d?.items?.[0];
  if (!ch) throw new Error("Nessun canale YouTube su questo account Google");
  return {
    externalId: ch.id,
    username: ch.snippet?.customUrl || null,
    displayName: ch.snippet?.title || null,
    avatarUrl: ch.snippet?.thumbnails?.default?.url || null,
    followers: ch.statistics?.hiddenSubscriberCount ? null : Number(ch.statistics?.subscriberCount ?? 0),
    extra: {
      uploads_playlist: ch.contentDetails?.relatedPlaylists?.uploads || null,
      video_count: Number(ch.statistics?.videoCount ?? 0),
      view_count: Number(ch.statistics?.viewCount ?? 0),
    },
  };
}

// ── Connessione con token sempre valido ─────────────────────────────

export interface LiveConnection {
  id: string;
  platform: SocialPlatform;
  user_id: string;
  brand_id: string | null;
  external_account_id: string;
  username: string | null;
  extra: Record<string, any>;
  accessToken: string;
}

/** Legge la connessione, rinnova il token se sta per scadere e lo salva. */
export async function loadConnection(admin: Admin, connectionId: string): Promise<LiveConnection> {
  const { data, error } = await admin.rpc("get_social_connection_tokens", { p_connection_id: connectionId });
  // deno-lint-ignore no-explicit-any
  const c: any = Array.isArray(data) ? data[0] : null;
  if (error || !c) throw new Error("Connessione non trovata");
  const label = PLATFORM_LABEL[c.platform as SocialPlatform] || c.platform;
  if (!c.is_active) throw new Error(`${label} scollegato: ricollegalo dalle impostazioni`);
  if (!c.access_token) throw new Error("Token non disponibile (chiave del Vault mancante)");

  let accessToken: string = c.access_token;
  if (needsRefresh(c.token_expires_at, Date.now())) {
    if (!c.refresh_token) throw new Error(`Collegamento ${label} scaduto: ricollegalo dalle impostazioni`);
    try {
      const t = await refreshTokens(c.platform, c.refresh_token);
      const { error: upErr } = await admin.rpc("update_social_connection_tokens", {
        p_connection_id: connectionId,
        p_access_token: t.accessToken,
        p_refresh_token: t.refreshToken,
        p_token_expires_at: t.expiresAt,
        p_refresh_expires_at: t.refreshExpiresAt,
      });
      if (upErr) console.error("salvataggio token rinnovato:", upErr.message);
      accessToken = t.accessToken;
    } catch (e) {
      const msg = (e as Error).message;
      await admin.from("social_connections").update({ last_error: msg, updated_at: new Date().toISOString() }).eq("id", connectionId);
      throw new Error(`Collegamento ${label} scaduto: ricollegalo dalle impostazioni (${msg})`);
    }
  }
  return {
    id: connectionId,
    platform: c.platform,
    user_id: c.user_id,
    brand_id: c.brand_id,
    external_account_id: c.external_account_id,
    username: c.username,
    extra: c.extra || {},
    accessToken,
  };
}

// ── TikTok: pubblicazione ───────────────────────────────────────────

export interface CreatorInfo {
  creator_nickname: string | null;
  creator_username: string | null;
  creator_avatar_url: string | null;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number | null;
}

async function tiktokPost(path: string, token: string, body: unknown, label: string): Promise<any> {
  const res = await fetch(`${TIKTOK_API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body ?? {}),
  });
  const d = await readJson(res);
  const err = tiktokError(d, res, label);
  if (err) throw err;
  return d?.data ?? {};
}

export async function tiktokCreatorInfo(token: string): Promise<CreatorInfo> {
  const d = await tiktokPost("/post/publish/creator_info/query/", token, {}, "Profilo creator TikTok");
  return {
    creator_nickname: d.creator_nickname ?? null,
    creator_username: d.creator_username ?? null,
    creator_avatar_url: d.creator_avatar_url ?? null,
    privacy_level_options: d.privacy_level_options ?? [],
    comment_disabled: !!d.comment_disabled,
    duet_disabled: !!d.duet_disabled,
    stitch_disabled: !!d.stitch_disabled,
    max_video_post_duration_sec: d.max_video_post_duration_sec ?? null,
  };
}

/** Rispetta le scelte del creator: se ha spento commenti/duetti/stitch, restano spenti. */
function applyCreatorLimits(o: TikTokOptions, info: CreatorInfo): TikTokOptions {
  if (info.privacy_level_options.length && o.privacy_level && !info.privacy_level_options.includes(o.privacy_level)) {
    throw new Error("Visibilità non disponibile per questo profilo TikTok: scegline un'altra");
  }
  return {
    ...o,
    allow_comment: o.allow_comment && !info.comment_disabled,
    allow_duet: o.allow_duet && !info.duet_disabled,
    allow_stitch: o.allow_stitch && !info.stitch_disabled,
  };
}

export async function publishTikTokVideo(
  token: string,
  video: Uint8Array,
  contentType: string,
  options: TikTokOptions,
  caption: string,
): Promise<{ publishId: string }> {
  const info = await tiktokCreatorInfo(token);
  const opts = applyCreatorLimits(options, info);
  const plan = tiktokChunkPlan(video.byteLength);
  const init = await tiktokPost("/post/publish/video/init/", token, {
    post_info: tiktokPostInfo(opts, caption, false),
    source_info: {
      source: "FILE_UPLOAD",
      video_size: video.byteLength,
      chunk_size: plan.chunkSize,
      total_chunk_count: plan.totalChunks,
    },
  }, "Avvio pubblicazione TikTok");
  if (!init.publish_id || !init.upload_url) throw new Error("TikTok non ha restituito l'indirizzo di caricamento");

  for (const [start, end] of plan.ranges) {
    const res = await fetch(init.upload_url, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(end - start),
        "Content-Range": `bytes ${start}-${end - 1}/${video.byteLength}`,
      },
      body: video.subarray(start, end),
    });
    if (!res.ok && res.status !== 206) {
      const t = await res.text().catch(() => "");
      throw new Error(`Caricamento video su TikTok fallito (HTTP ${res.status}) ${t.slice(0, 200)}`);
    }
  }
  return { publishId: init.publish_id };
}

export async function publishTikTokPhotos(
  token: string,
  photoUrls: string[],
  options: TikTokOptions,
  title: string,
  description: string,
): Promise<{ publishId: string }> {
  if (photoUrls.length === 0) throw new Error("Nessuna foto da pubblicare");
  const info = await tiktokCreatorInfo(token);
  const opts = applyCreatorLimits(options, info);
  const init = await tiktokPost("/post/publish/content/init/", token, {
    post_info: { ...tiktokPostInfo(opts, title, true), description: description.slice(0, 4000) },
    source_info: { source: "PULL_FROM_URL", photo_cover_index: 0, photo_images: photoUrls.slice(0, 35) },
    post_mode: "DIRECT_POST",
    media_type: "PHOTO",
  }, "Pubblicazione foto TikTok");
  if (!init.publish_id) throw new Error("TikTok non ha restituito l'id di pubblicazione");
  return { publishId: init.publish_id };
}

export async function tiktokPublishStatus(
  token: string,
  publishId: string,
): Promise<{ status: string; postId: string | null; failReason: string | null }> {
  const d = await tiktokPost("/post/publish/status/fetch/", token, { publish_id: publishId }, "Stato pubblicazione TikTok");
  // il campo si chiama davvero «publicaly_available_post_id»
  const ids = d.publicaly_available_post_id || d.publicly_available_post_id || [];
  return {
    status: d.status || "UNKNOWN",
    postId: Array.isArray(ids) && ids.length ? String(ids[0]) : null,
    failReason: d.fail_reason || null,
  };
}

// ── TikTok: statistiche ─────────────────────────────────────────────

export interface TikTokVideo {
  id: string;
  title: string | null;
  share_url: string | null;
  cover_image_url: string | null;
  create_time: number | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  share_count: number | null;
}

export async function tiktokRecentVideos(token: string, max = 40): Promise<TikTokVideo[]> {
  const fields = "id,title,video_description,create_time,cover_image_url,share_url,view_count,like_count,comment_count,share_count";
  const out: TikTokVideo[] = [];
  let cursor: number | undefined;
  while (out.length < max) {
    const body: Record<string, unknown> = { max_count: 20 };
    if (cursor) body.cursor = cursor;
    const res = await fetch(`${TIKTOK_API}/video/list/?fields=${fields}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(body),
    });
    const d = await readJson(res);
    const err = tiktokError(d, res, "Elenco video TikTok");
    if (err) throw err;
    for (const v of d?.data?.videos || []) {
      out.push({
        id: String(v.id),
        title: v.title || v.video_description || null,
        share_url: v.share_url || null,
        cover_image_url: v.cover_image_url || null,
        create_time: v.create_time ?? null,
        view_count: v.view_count ?? null,
        like_count: v.like_count ?? null,
        comment_count: v.comment_count ?? null,
        share_count: v.share_count ?? null,
      });
    }
    if (!d?.data?.has_more || !d?.data?.cursor) break;
    cursor = d.data.cursor;
  }
  return out.slice(0, max);
}

// ── YouTube: pubblicazione ──────────────────────────────────────────

export async function publishYouTubeVideo(
  token: string,
  video: Uint8Array,
  contentType: string,
  options: YouTubeOptions,
  description: string,
): Promise<{ videoId: string }> {
  const meta = {
    snippet: {
      title: youtubeTitle(options.title),
      description: youtubeDescription(description),
      categoryId: "22",
      defaultLanguage: "it",
      defaultAudioLanguage: "it",
    },
    status: { privacyStatus: options.privacy_status, selfDeclaredMadeForKids: false },
  };
  const start = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(video.byteLength),
        "X-Upload-Content-Type": contentType,
      },
      body: JSON.stringify(meta),
    },
  );
  if (!start.ok) {
    throw googleError(await readJson(start), start, "Avvio caricamento YouTube") ?? new Error("Avvio caricamento YouTube fallito");
  }
  const location = start.headers.get("Location");
  if (!location) throw new Error("YouTube non ha restituito l'indirizzo di caricamento");
  const up = await fetch(location, {
    method: "PUT",
    headers: { "Content-Type": contentType, "Content-Length": String(video.byteLength) },
    body: video,
  });
  const d = await readJson(up);
  if (!up.ok || !d.id) throw googleError(d, up, "Caricamento video YouTube") ?? new Error("Caricamento video YouTube fallito");
  return { videoId: d.id };
}

// ── YouTube: statistiche ────────────────────────────────────────────

export interface YouTubeVideo {
  id: string;
  title: string | null;
  cover_url: string | null;
  published_at: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
}

async function ytGet(path: string, token: string, label: string): Promise<any> {
  const res = await fetch(`${YT_API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const d = await readJson(res);
  const err = googleError(d, res, label);
  if (err) throw err;
  return d;
}

export async function youtubeRecentVideos(token: string, uploadsPlaylist: string, max = 50): Promise<YouTubeVideo[]> {
  const pl = await ytGet(
    `/playlistItems?part=contentDetails&maxResults=${Math.min(50, max)}&playlistId=${encodeURIComponent(uploadsPlaylist)}`,
    token,
    "Video del canale",
  );
  const ids: string[] = (pl.items || []).map((i: any) => i.contentDetails?.videoId).filter(Boolean);
  if (ids.length === 0) return [];
  const v = await ytGet(`/videos?part=snippet,statistics&id=${ids.join(",")}`, token, "Statistiche video YouTube");
  return (v.items || []).map((it: any) => ({
    id: it.id,
    title: it.snippet?.title || null,
    cover_url: it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url || null,
    published_at: it.snippet?.publishedAt || null,
    views: it.statistics?.viewCount != null ? Number(it.statistics.viewCount) : null,
    likes: it.statistics?.likeCount != null ? Number(it.statistics.likeCount) : null,
    comments: it.statistics?.commentCount != null ? Number(it.statistics.commentCount) : null,
  }));
}

/**
 * Condivisioni, minuti visti e durata media per video, dall'Analytics API
 * (dati con 1-2 giorni di ritardo). Se il permesso manca, si va avanti senza.
 */
export async function youtubeAnalyticsByVideo(
  token: string,
  videoIds: string[],
  startDate: string,
): Promise<Map<string, { shares: number; watch_minutes: number; avg_view_sec: number }>> {
  const out = new Map<string, { shares: number; watch_minutes: number; avg_view_sec: number }>();
  if (videoIds.length === 0) return out;
  const q = new URLSearchParams({
    ids: "channel==MINE",
    startDate,
    endDate: new Date().toISOString().slice(0, 10),
    metrics: "shares,estimatedMinutesWatched,averageViewDuration",
    dimensions: "video",
    filters: `video==${videoIds.join(",")}`,
    maxResults: "200",
  });
  const res = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const d = await readJson(res);
  if (!res.ok) {
    console.warn("YouTube Analytics non disponibile:", d?.error?.message || res.status);
    return out;
  }
  const cols: string[] = (d.columnHeaders || []).map((c: any) => c.name);
  const iv = cols.indexOf("video");
  const is = cols.indexOf("shares");
  const iw = cols.indexOf("estimatedMinutesWatched");
  const ia = cols.indexOf("averageViewDuration");
  for (const row of d.rows || []) {
    out.set(String(row[iv]), {
      shares: Number(row[is]) || 0,
      watch_minutes: Number(row[iw]) || 0,
      avg_view_sec: Math.round(Number(row[ia]) || 0),
    });
  }
  return out;
}

/** Scarica dallo Storage il video da pubblicare. */
export async function downloadVideo(admin: Admin, bucket: string, path: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const { data, error } = await admin.storage.from(bucket).download(path);
  if (error || !data) throw new Error("Video non trovato nello Storage: " + (error?.message || path));
  const bytes = new Uint8Array(await data.arrayBuffer());
  const contentType = data.type || (path.endsWith(".mov") ? "video/quicktime" : "video/mp4");
  return { bytes, contentType };
}
