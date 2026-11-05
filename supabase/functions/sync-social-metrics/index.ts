// ────────────────────────────────────────────────────────────────────
// sync-social-metrics — statistiche TikTok e YouTube → post_metrics
//
// Chi la chiama:
//   - pg_cron ogni giorno alle 05:00 UTC (header x-cron-secret): tutti
//   - un utente dall'app («Aggiorna ora»): solo i suoi account; un admin
//     tutti, o solo quelli di un brand se passa brand_id.
//
// Per ogni account collegato:
//   1. follower/iscritti → una riga «account» al giorno (new_followers =
//      differenza col giorno prima);
//   2. ultimi video (TikTok: solo i pubblici; YouTube: ultimi 50 caricati)
//      → totali in social_posts e l'aumento del giorno in post_metrics,
//      che la dashboard somma sul periodo (vedi planPostSnapshot).
// ────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { adminClient, requireAuth } from "../_shared/auth.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { type PostTotals, type SocialPlatform, planPostSnapshot } from "../_shared/social/socialCore.ts";
import {
  type LiveConnection,
  fetchProfile,
  loadConnection,
  tiktokRecentVideos,
  youtubeAnalyticsByVideo,
  youtubeRecentVideos,
} from "../_shared/socialApi.ts";

// deno-lint-ignore no-explicit-any
type Admin = SupabaseClient<any, any, any>;

interface PostIn {
  id: string;
  title: string | null;
  url: string | null;
  cover: string | null;
  publishedAt: string | null;
  totals: PostTotals;
  avgViewSec: number | null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function excerpt(s: string | null): string | null {
  return s ? s.replace(/\s+/g, " ").trim().slice(0, 240) : null;
}

async function isAdmin(admin: Admin, userId: string): Promise<boolean> {
  const { data } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  return !!data;
}

async function collectPosts(conn: LiveConnection): Promise<PostIn[]> {
  if (conn.platform === "tiktok") {
    const vids = await tiktokRecentVideos(conn.accessToken, 40);
    return vids.map((v) => ({
      id: v.id,
      title: v.title,
      url: v.share_url,
      cover: v.cover_image_url,
      publishedAt: v.create_time ? new Date(v.create_time * 1000).toISOString() : null,
      totals: { views: v.view_count, likes: v.like_count, comments: v.comment_count, shares: v.share_count },
      avgViewSec: null,
    }));
  }
  const uploads = conn.extra?.uploads_playlist;
  if (!uploads) return [];
  const vids = await youtubeRecentVideos(conn.accessToken, uploads, 50);
  const earliest = vids.map((v) => v.published_at?.slice(0, 10)).filter(Boolean).sort()[0] || todayIso();
  const analytics = await youtubeAnalyticsByVideo(conn.accessToken, vids.map((v) => v.id), earliest as string);
  return vids.map((v) => {
    const a = analytics.get(v.id);
    return {
      id: v.id,
      title: v.title,
      url: `https://www.youtube.com/watch?v=${v.id}`,
      cover: v.cover_url,
      publishedAt: v.published_at,
      totals: {
        views: v.views,
        likes: v.likes,
        comments: v.comments,
        shares: a ? a.shares : null,
        watch_minutes: a ? a.watch_minutes : null,
      },
      avgViewSec: a ? a.avg_view_sec : null,
    };
  });
}

async function syncConnection(admin: Admin, connectionId: string): Promise<{ posts: number }> {
  const conn = await loadConnection(admin, connectionId);
  const channel = conn.platform as SocialPlatform;
  const today = todayIso();

  // 1. account
  const profile = await fetchProfile(channel, conn.accessToken);
  const accountKey = `${channel === "tiktok" ? "tt" : "yt"}_account_${conn.external_account_id}`;
  const { data: prevAcc } = await admin.from("post_metrics")
    .select("followers_total").eq("external_post_id", accountKey).eq("channel", channel)
    .lt("snapshot_date", today).order("snapshot_date", { ascending: false }).limit(1).maybeSingle();
  const followers = profile.followers;
  const { error: accErr } = await admin.from("post_metrics").upsert({
    user_id: conn.user_id,
    brand_id: conn.brand_id,
    channel,
    external_post_id: accountKey,
    snapshot_date: today,
    followers_total: followers,
    new_followers: followers != null && prevAcc?.followers_total != null ? followers - prevAcc.followers_total : null,
    is_account_level: true,
    synced_at: new Date().toISOString(),
  }, { onConflict: "external_post_id,snapshot_date,channel" });
  if (accErr) throw new Error("Salvataggio follower: " + accErr.message);

  // nome, foto e playlist aggiornati (cambiano raramente)
  await admin.from("social_connections").update({
    username: profile.username,
    display_name: profile.displayName,
    avatar_url: profile.avatarUrl,
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq("id", connectionId);

  // 2. contenuti
  const posts = await collectPosts(conn);
  if (posts.length === 0) return { posts: 0 };
  const { data: storedRows } = await admin.from("social_posts")
    .select("external_post_id, published_post_id, views, likes, comments, shares, watch_minutes, base, totals_date")
    .eq("platform", channel).in("external_post_id", posts.map((p) => p.id));
  const stored = new Map((storedRows || []).map((r: any) => [r.external_post_id, r]));

  for (const p of posts) {
    const s: any = stored.get(p.id);
    const plan = planPostSnapshot(
      s ? { totals: { views: s.views, likes: s.likes, comments: s.comments, shares: s.shares, watch_minutes: s.watch_minutes }, base: s.base, totals_date: s.totals_date } : null,
      p.totals,
      p.publishedAt ? p.publishedAt.slice(0, 10) : null,
      today,
    );
    const inc = plan.increment;
    const engagement = [inc.likes, inc.comments, inc.shares].some((v) => v != null)
      ? (inc.likes || 0) + (inc.comments || 0) + (inc.shares || 0)
      : null;

    const { error: mErr } = await admin.from("post_metrics").upsert({
      user_id: conn.user_id,
      brand_id: conn.brand_id,
      channel,
      external_post_id: p.id,
      published_post_id: s?.published_post_id ?? null,
      caption_excerpt: excerpt(p.title),
      snapshot_date: plan.snapshotDate,
      video_views: inc.views,
      likes: inc.likes,
      comments: inc.comments,
      shares: inc.shares,
      engagement,
      watch_minutes: inc.watch_minutes,
      avg_view_sec: p.avgViewSec,
      is_account_level: false,
      synced_at: new Date().toISOString(),
    }, { onConflict: "external_post_id,snapshot_date,channel" });
    if (mErr) console.warn(`post_metrics ${p.id}:`, mErr.message);

    const { error: pErr } = await admin.from("social_posts").upsert({
      user_id: conn.user_id,
      brand_id: conn.brand_id,
      connection_id: connectionId,
      platform: channel,
      external_post_id: p.id,
      title: p.title,
      url: p.url,
      cover_url: p.cover,
      published_at: p.publishedAt,
      views: p.totals.views ?? null,
      likes: p.totals.likes ?? null,
      comments: p.totals.comments ?? null,
      shares: p.totals.shares ?? null,
      watch_minutes: p.totals.watch_minutes ?? null,
      avg_view_sec: p.avgViewSec,
      base: plan.base,
      totals_date: plan.totalsDate,
      synced_at: new Date().toISOString(),
    }, { onConflict: "platform,external_post_id" });
    if (pErr) console.warn(`social_posts ${p.id}:`, pErr.message);
  }
  return { posts: posts.length };
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const admin = adminClient();
    const body = await req.json().catch(() => ({}));

    let query = admin.from("social_connections").select("id, user_id, brand_id, platform").eq("is_active", true);
    const cron = req.headers.get("x-cron-secret");
    const expected = Deno.env.get("CRON_SECRET");
    if (!(cron && expected && expected.length >= 16 && cron === expected)) {
      const auth = await requireAuth(req);
      if (!auth.ok) return jsonResponse(req, { error: auth.error }, auth.status);
      if (!(await isAdmin(admin, auth.userId))) query = query.eq("user_id", auth.userId);
    }
    if (typeof body.brand_id === "string") query = query.eq("brand_id", body.brand_id);
    if (body.platform === "tiktok" || body.platform === "youtube") query = query.eq("platform", body.platform);

    const { data: conns, error } = await query;
    if (error) return jsonResponse(req, { error: "Errore lettura account" }, 500);

    const results: Array<{ id: string; platform: string; ok: boolean; posts?: number; error?: string }> = [];
    for (const c of conns || []) {
      try {
        const r = await syncConnection(admin, c.id);
        results.push({ id: c.id, platform: c.platform, ok: true, posts: r.posts });
      } catch (e) {
        const msg = (e as Error).message;
        console.error(`sync ${c.platform} ${c.id}:`, msg);
        await admin.from("social_connections").update({ last_error: msg.slice(0, 500) }).eq("id", c.id);
        results.push({ id: c.id, platform: c.platform, ok: false, error: msg });
      }
    }
    return jsonResponse(req, {
      processed: results.length,
      totalPostsSynced: results.reduce((a, r) => a + (r.posts || 0), 0),
      results,
    });
  } catch (e) {
    console.error("sync-social-metrics:", (e as Error).message);
    return jsonResponse(req, { error: "Errore interno" }, 500);
  }
});
