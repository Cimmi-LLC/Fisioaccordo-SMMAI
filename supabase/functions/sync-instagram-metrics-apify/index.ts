// ────────────────────────────────────────────────────────────────────
// sync-instagram-metrics-apify
//
// Weekly Apify scrape → post_metrics. Used for brands that DON'T have
// a Meta OAuth connection (no reach/saves/impressions, but follower
// count + likes/comments/video views are enough for the dashboard).
//
// Skipped automatically when meta_connections.is_active = true exists
// for the same user: the daily Meta sync is richer, no point in
// double-counting from Apify.
//
// Cost: 1 Apify run per brand per week, ~$0.01-0.03 per run.
// ────────────────────────────────────────────────────────────────────

import { adminClient, requireCronSecret } from "../_shared/auth.ts";
import { jsonResponse, handlePreflight } from "../_shared/cors.ts";

const APIFY_BASE = "https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items";
const ACCOUNT_PLACEHOLDER = "ig_account";
const POSTS_PER_BRAND = 12;

function cleanUsername(username: string): string {
  return username
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .replace(/\/$/, "")
    .trim();
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function captionExcerpt(s: unknown): string | null {
  if (!s || typeof s !== "string") return null;
  return s.replace(/\s+/g, " ").trim().slice(0, 240);
}

interface BrandTarget {
  id: string;
  user_id: string;
  username: string;
}

interface SyncOutcome {
  brandId: string;
  username: string;
  ok: boolean;
  posts: number;
  followers: number | null;
  error?: string;
}

async function apifyScrape(username: string, token: string): Promise<any[]> {
  const url = `${APIFY_BASE}?token=${encodeURIComponent(token)}&timeout=90`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      usernames: [username],
      resultsType: "posts",
      resultsLimit: POSTS_PER_BRAND,
      searchType: "user",
      // Including `addParentData` makes Apify enrich each post with
      // owner_followers_count / owner_full_name — saves a second call.
      addParentData: true,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Apify HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function syncOneBrand(
  supabase: ReturnType<typeof adminClient>,
  brand: BrandTarget,
  apifyToken: string,
): Promise<SyncOutcome> {
  const out: SyncOutcome = { brandId: brand.id, username: brand.username, ok: false, posts: 0, followers: null };

  try {
    const items = await apifyScrape(brand.username, apifyToken);
    if (items.length === 0) {
      out.error = "no items from Apify";
      return out;
    }

    const today = todayIso();
    const firstWithOwner = items.find((p) => p?.ownerFollowersCount != null || p?.followersCount != null);
    const followers = Number(
      firstWithOwner?.ownerFollowersCount ?? firstWithOwner?.followersCount ?? 0,
    ) || 0;
    out.followers = followers;

    // Previous follower count (for new_followers delta)
    const { data: yesterdayRows } = await supabase
      .from("post_metrics")
      .select("followers_total")
      .eq("user_id", brand.user_id)
      .eq("channel", "instagram")
      .eq("is_account_level", true)
      .lt("snapshot_date", today)
      .order("snapshot_date", { ascending: false })
      .limit(1);
    const prevFollowers = ((yesterdayRows || [])[0] as any)?.followers_total ?? followers;
    const newFollowers = followers - prevFollowers;

    // Account-level snapshot
    const { error: accErr } = await supabase
      .from("post_metrics")
      .upsert({
        user_id: brand.user_id,
        brand_id: brand.id,
        channel: "instagram",
        external_post_id: `${ACCOUNT_PLACEHOLDER}_${brand.username}`,
        snapshot_date: today,
        followers_total: followers,
        new_followers: newFollowers,
        is_account_level: true,
        synced_at: new Date().toISOString(),
      }, { onConflict: "external_post_id,snapshot_date,channel" });
    if (accErr) throw new Error(`account upsert: ${accErr.message}`);

    // Per-post rows
    for (const p of items) {
      if (!p || p.error) continue;
      const externalId = String(p.shortCode || p.id || p.url || "").trim();
      if (!externalId) continue;
      const likes = Number(p.likesCount) || 0;
      const comments = Number(p.commentsCount) || 0;
      const views = Number(p.videoViewCount ?? p.videoPlayCount ?? null);
      const isVideo = !!p.isVideo || !!p.videoUrl || p.type === "Video";
      const engagementProxy = likes + comments; // no saves/shares via scraping

      const { error: postErr } = await supabase
        .from("post_metrics")
        .upsert({
          user_id: brand.user_id,
          brand_id: brand.id,
          channel: "instagram",
          external_post_id: externalId,
          snapshot_date: today,
          caption_excerpt: captionExcerpt(p.caption),
          likes,
          comments,
          engagement: engagementProxy,
          video_views: isVideo && !isNaN(views) ? views : null,
          // reach, impressions, saves, shares: NOT AVAILABLE via scraping
          followers_total: followers, // denormalized
          is_account_level: false,
          synced_at: new Date().toISOString(),
        }, { onConflict: "external_post_id,snapshot_date,channel" });
      if (postErr) {
        console.warn(`[${brand.username}] post ${externalId}:`, postErr.message);
        continue;
      }
      out.posts++;
    }

    out.ok = true;
    return out;
  } catch (e) {
    out.error = (e as Error).message;
    return out;
  }
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const cron = requireCronSecret(req);
    if (!cron.ok) return jsonResponse(req, { error: cron.error }, cron.status);

    const APIFY_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    if (!APIFY_TOKEN) return jsonResponse(req, { error: "APIFY_API_TOKEN not configured" }, 500);

    const supabase = adminClient();

    // 1) all brands with a manual IG handle
    const { data: brands, error: brandsErr } = await supabase
      .from("brands")
      .select("id, user_id, instagram_username")
      .not("instagram_username", "is", null);
    if (brandsErr) return jsonResponse(req, { error: brandsErr.message }, 500);

    // 2) skip brands whose user already has an active Meta OAuth connection
    //    (the daily Meta sync covers them with richer metrics).
    const userIds = Array.from(new Set((brands || []).map((b: any) => b.user_id)));
    const { data: conns } = userIds.length > 0
      ? await supabase
          .from("meta_connections")
          .select("user_id")
          .in("user_id", userIds)
          .eq("is_active", true)
      : { data: [] as any[] };
    const skipUsers = new Set((conns || []).map((c: any) => c.user_id));

    const targets: BrandTarget[] = (brands || [])
      .filter((b: any) => !skipUsers.has(b.user_id) && b.instagram_username)
      .map((b: any) => ({
        id: b.id,
        user_id: b.user_id,
        username: cleanUsername(b.instagram_username),
      }))
      .filter((t) => !!t.username);

    const results: SyncOutcome[] = [];
    for (const t of targets) {
      const r = await syncOneBrand(supabase, t, APIFY_TOKEN);
      results.push(r);
    }

    return jsonResponse(req, {
      brands_with_handle: brands?.length ?? 0,
      skipped_oauth: skipUsers.size,
      processed: results.length,
      ok: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      totalPostsSynced: results.reduce((a, r) => a + r.posts, 0),
      results,
    });
  } catch (e) {
    console.error("sync-instagram-metrics-apify error:", e);
    return jsonResponse(req, { error: (e as Error).message }, 500);
  }
});
