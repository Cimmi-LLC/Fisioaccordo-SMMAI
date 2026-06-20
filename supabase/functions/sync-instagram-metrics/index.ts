// ────────────────────────────────────────────────────────────────────
// sync-instagram-metrics — daily Meta Graph API → post_metrics
//
// Trigger: pg_cron (header `x-cron-secret`). Never call this anonymously.
//
// For every meta_connections row with is_active=true and a non-null
// instagram_business_id we:
//   1. resolve the decrypted token via get_meta_connection_token (RPC,
//      Vault-backed; never logged).
//   2. fetch account-level metrics (follower_count, reach, profile_views)
//      and upsert ONE 'account-level' row per (user, brand, day).
//   3. list the media of the last LOOKBACK_DAYS (caps Meta's pagination).
//   4. for each media fetch its insights (different metric set per
//      media_type: REELS/VIDEO use plays + total_interactions; IMAGE +
//      CAROUSEL_ALBUM use engagement + saved). Upsert one row per media
//      per day.
//
// Idempotent thanks to UNIQUE(external_post_id, snapshot_date, channel)
// on post_metrics. Re-running the cron is a no-op for existing rows
// except for refreshing engagement numbers (`upsert merge=true`).
// ────────────────────────────────────────────────────────────────────

import { adminClient } from "../_shared/auth.ts";
import { requireCronSecret } from "../_shared/auth.ts";
import { jsonResponse, handlePreflight } from "../_shared/cors.ts";

const META_API = "https://graph.instagram.com/v20.0";
const LOOKBACK_DAYS = 14;       // media published in the last N days
const ACCOUNT_PLACEHOLDER = "ig_account";

type BrandRow = { id: string; user_id: string; instagram_business_id?: string | null };

async function fetchJson(url: string, label: string): Promise<any> {
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const errCode = data?.error?.code ?? res.status;
    const errMsg = data?.error?.message ?? "request failed";
    throw new Error(`${label} [${errCode}]: ${errMsg}`);
  }
  return data;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function captionExcerpt(s: string | undefined | null): string | null {
  if (!s) return null;
  return s.replace(/\s+/g, " ").trim().slice(0, 240);
}

/** Get the latest brand for a given user (1 user → typically 1 brand). */
async function findBrandForUser(supabase: ReturnType<typeof adminClient>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("brands")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any)?.id ?? null;
}

interface SyncOutcome {
  connectionId: string;
  igId: string | null;
  ok: boolean;
  accountRowUpserted: boolean;
  mediaCount: number;
  error?: string;
}

async function syncOneConnection(
  supabase: ReturnType<typeof adminClient>,
  conn: { id: string; user_id: string; instagram_business_id: string | null; instagram_username: string | null },
): Promise<SyncOutcome> {
  const outcome: SyncOutcome = {
    connectionId: conn.id,
    igId: conn.instagram_business_id,
    ok: false,
    accountRowUpserted: false,
    mediaCount: 0,
  };

  try {
    if (!conn.instagram_business_id) throw new Error("instagram_business_id missing");

    // 1) Decrypted token via RPC (Vault-backed). Never logged.
    const { data: connRows, error: connErr } = await supabase.rpc("get_meta_connection_token", {
      p_connection_id: conn.id,
    });
    if (connErr) throw new Error(`token RPC: ${connErr.message}`);
    const decoded = Array.isArray(connRows) ? connRows[0] : null;
    if (!decoded?.page_access_token) throw new Error("no decoded token");
    if (decoded.token_expires_at && new Date(decoded.token_expires_at) < new Date()) {
      throw new Error("token expired");
    }
    const token = decoded.page_access_token as string;
    const igId = decoded.instagram_business_id as string;
    const brandId = await findBrandForUser(supabase, conn.user_id);
    const today = todayIso();

    // 2) Account-level snapshot (follower_count is point-in-time).
    //    Note: follower_count is the only metric we actually need today;
    //    reach/profile_views require period=day + 1d window and Meta
    //    intermittently returns empty. We tolerate either case.
    let followers = 0;
    try {
      const accUrl = `${META_API}/${igId}?fields=followers_count,media_count&access_token=${encodeURIComponent(token)}`;
      const acc = await fetchJson(accUrl, "ig account");
      followers = Number(acc.followers_count) || 0;
    } catch (e) {
      console.warn(`[${conn.id}] account fields failed:`, (e as Error).message);
    }

    // Previous day's followers_total → compute new_followers.
    const { data: yesterdayRows } = await supabase
      .from("post_metrics")
      .select("followers_total, snapshot_date")
      .eq("user_id", conn.user_id)
      .eq("channel", "instagram")
      .eq("is_account_level", true)
      .lt("snapshot_date", today)
      .order("snapshot_date", { ascending: false })
      .limit(1);
    const prevFollowers = ((yesterdayRows || [])[0] as any)?.followers_total ?? followers;
    const newFollowers = followers - prevFollowers;

    const { error: accUpsertErr } = await supabase
      .from("post_metrics")
      .upsert({
        user_id: conn.user_id,
        brand_id: brandId,
        channel: "instagram",
        external_post_id: `${ACCOUNT_PLACEHOLDER}_${igId}`,
        snapshot_date: today,
        followers_total: followers,
        new_followers: newFollowers,
        is_account_level: true,
        synced_at: new Date().toISOString(),
      }, { onConflict: "external_post_id,snapshot_date,channel" });
    if (accUpsertErr) throw new Error(`account upsert: ${accUpsertErr.message}`);
    outcome.accountRowUpserted = true;

    // 3) Recent media list (last LOOKBACK_DAYS by timestamp).
    const sinceUnix = Math.floor((Date.now() - LOOKBACK_DAYS * 86400_000) / 1000);
    const mediaListUrl = `${META_API}/${igId}/media?fields=id,caption,media_type,timestamp,permalink&limit=50&access_token=${encodeURIComponent(token)}`;
    const mediaList = await fetchJson(mediaListUrl, "media list");
    const recentMedia = ((mediaList.data || []) as any[])
      .filter((m) => m.timestamp && Date.parse(m.timestamp) / 1000 >= sinceUnix);

    // 4) For each media: pull insights, upsert one row for `today`.
    for (const m of recentMedia) {
      try {
        const isVideo = m.media_type === "VIDEO" || m.media_type === "REELS";
        const metricSet = isVideo
          ? "plays,reach,saved,total_interactions,comments,likes,shares"
          : "engagement,impressions,reach,saved";
        const insUrl = `${META_API}/${m.id}/insights?metric=${metricSet}&access_token=${encodeURIComponent(token)}`;
        const ins = await fetchJson(insUrl, `media ${m.id}`);
        const flat: Record<string, number> = {};
        for (const item of (ins.data || []) as any[]) {
          const val = item?.values?.[0]?.value ?? 0;
          flat[item.name] = Number(val) || 0;
        }
        const engagement = isVideo
          ? (flat.total_interactions ?? (flat.likes + flat.comments + flat.saved + flat.shares))
          : (flat.engagement ?? 0);
        await supabase
          .from("post_metrics")
          .upsert({
            user_id: conn.user_id,
            brand_id: brandId,
            channel: "instagram",
            external_post_id: m.id,
            snapshot_date: today,
            caption_excerpt: captionExcerpt(m.caption),
            reach: flat.reach ?? null,
            impressions: flat.impressions ?? null,
            engagement,
            likes: flat.likes ?? null,
            comments: flat.comments ?? null,
            saves: flat.saved ?? null,
            shares: flat.shares ?? null,
            video_views: isVideo ? (flat.plays ?? null) : null,
            followers_total: followers, // denormalized for fast LAST-in-period
            is_account_level: false,
            synced_at: new Date().toISOString(),
          }, { onConflict: "external_post_id,snapshot_date,channel" });
        outcome.mediaCount++;
      } catch (e) {
        console.warn(`[${conn.id}] media ${m.id} skipped:`, (e as Error).message);
      }
    }

    outcome.ok = true;
    return outcome;
  } catch (e) {
    outcome.error = (e as Error).message;
    return outcome;
  }
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const cron = requireCronSecret(req);
    if (!cron.ok) return jsonResponse(req, { error: cron.error }, cron.status);

    const supabase = adminClient();

    const { data: conns, error: connsErr } = await supabase
      .from("meta_connections")
      .select("id, user_id, instagram_business_id, instagram_username")
      .eq("is_active", true);
    if (connsErr) return jsonResponse(req, { error: connsErr.message }, 500);

    const results: SyncOutcome[] = [];
    for (const c of (conns || []) as any[]) {
      const r = await syncOneConnection(supabase, c);
      results.push(r);
    }

    return jsonResponse(req, {
      processed: results.length,
      ok: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      totalMediaSynced: results.reduce((a, r) => a + r.mediaCount, 0),
      results,
    });
  } catch (e) {
    console.error("sync-instagram-metrics error:", e);
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});
