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

import { adminClient, requireAuth, requireCronSecret } from "../_shared/auth.ts";
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

/**
 * A "target" is anything that produces post_metrics rows. Two kinds:
 *  - brand: user_id required (post_metrics.user_id NOT NULL), brand_id set
 *  - tracked: standalone IG handle from `tracked_handles` (no brand,
 *             user_id = the admin who created it)
 */
interface SyncTarget {
  brandId: string | null;
  trackedHandleId: string | null;
  userId: string;
  username: string;
}

interface SyncOutcome {
  brandId: string | null;
  trackedHandleId: string | null;
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

async function syncOneTarget(
  supabase: ReturnType<typeof adminClient>,
  target: SyncTarget,
  apifyToken: string,
): Promise<SyncOutcome> {
  const out: SyncOutcome = {
    brandId: target.brandId,
    trackedHandleId: target.trackedHandleId,
    username: target.username,
    ok: false, posts: 0, followers: null,
  };

  try {
    const items = await apifyScrape(target.username, apifyToken);
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

    // Previous follower count for THIS specific target (by brand_id OR tracked_handle_id)
    const prevQuery = supabase
      .from("post_metrics")
      .select("followers_total")
      .eq("channel", "instagram")
      .eq("is_account_level", true)
      .lt("snapshot_date", today)
      .order("snapshot_date", { ascending: false })
      .limit(1);
    const { data: yesterdayRows } = target.brandId
      ? await prevQuery.eq("brand_id", target.brandId)
      : await prevQuery.eq("tracked_handle_id", target.trackedHandleId!);
    const prevFollowers = ((yesterdayRows || [])[0] as any)?.followers_total ?? followers;
    const newFollowers = followers - prevFollowers;

    const base = {
      user_id: target.userId,
      brand_id: target.brandId,
      tracked_handle_id: target.trackedHandleId,
      channel: "instagram",
    };

    // Account-level snapshot
    const { error: accErr } = await supabase
      .from("post_metrics")
      .upsert({
        ...base,
        external_post_id: `${ACCOUNT_PLACEHOLDER}_${target.username}`,
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
      const engagementProxy = likes + comments;

      const { error: postErr } = await supabase
        .from("post_metrics")
        .upsert({
          ...base,
          external_post_id: externalId,
          snapshot_date: today,
          caption_excerpt: captionExcerpt(p.caption),
          likes,
          comments,
          engagement: engagementProxy,
          video_views: isVideo && !isNaN(views) ? views : null,
          followers_total: followers,
          is_account_level: false,
          synced_at: new Date().toISOString(),
        }, { onConflict: "external_post_id,snapshot_date,channel" });
      if (postErr) {
        console.warn(`[${target.username}] post ${externalId}:`, postErr.message);
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
    // Accept either the cron secret (pg_cron) OR an admin JWT (UI "Sync now").
    let adminUserId: string | null = null;
    const cron = requireCronSecret(req);
    if (!cron.ok) {
      const auth = await requireAuth(req);
      if (!auth.ok) return jsonResponse(req, { error: "Unauthorized" }, 401);
      const sa = adminClient();
      const { data: roleRow } = await sa
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.userId)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleRow) return jsonResponse(req, { error: "Admin only" }, 403);
      adminUserId = auth.userId;
    }

    const APIFY_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    if (!APIFY_TOKEN) return jsonResponse(req, { error: "APIFY_API_TOKEN not configured" }, 500);

    const supabase = adminClient();

    // 1) brands with a manual IG handle
    const { data: brands, error: brandsErr } = await supabase
      .from("brands")
      .select("id, user_id, instagram_username")
      .not("instagram_username", "is", null);
    if (brandsErr) return jsonResponse(req, { error: brandsErr.message }, 500);

    // 2) skip brands whose user already has an active Meta OAuth connection
    const userIds = Array.from(new Set((brands || []).map((b: any) => b.user_id)));
    const { data: conns } = userIds.length > 0
      ? await supabase
          .from("meta_connections")
          .select("user_id")
          .in("user_id", userIds)
          .eq("is_active", true)
      : { data: [] as any[] };
    const skipUsers = new Set((conns || []).map((c: any) => c.user_id));

    // 3) tracked_handles (standalone, no brand)
    const { data: tracked, error: trackedErr } = await supabase
      .from("tracked_handles")
      .select("id, username, added_by")
      .eq("channel", "instagram");
    if (trackedErr) return jsonResponse(req, { error: trackedErr.message }, 500);

    // Resolve a "owner" user_id for tracked rows: prefer added_by, fall back
    // to the admin who triggered the manual sync, last resort = first admin
    // in user_roles (cron path with no admin trigger). post_metrics.user_id
    // is NOT NULL so we need *something*.
    let fallbackAdmin: string | null = adminUserId;
    if (!fallbackAdmin && (tracked || []).some((t: any) => !t.added_by)) {
      const { data: anyAdmin } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();
      fallbackAdmin = (anyAdmin as any)?.user_id ?? null;
    }

    const brandTargets: SyncTarget[] = (brands || [])
      .filter((b: any) => !skipUsers.has(b.user_id) && b.instagram_username)
      .map((b: any) => ({
        brandId: b.id, trackedHandleId: null, userId: b.user_id,
        username: cleanUsername(b.instagram_username),
      }))
      .filter((t) => !!t.username);

    const trackedTargets: SyncTarget[] = (tracked || [])
      .map((t: any) => ({
        brandId: null, trackedHandleId: t.id,
        userId: t.added_by || fallbackAdmin || "",
        username: cleanUsername(t.username),
      }))
      .filter((t) => !!t.username && !!t.userId);

    const targets = [...brandTargets, ...trackedTargets];

    const results: SyncOutcome[] = [];
    for (const t of targets) {
      const r = await syncOneTarget(supabase, t, APIFY_TOKEN);
      results.push(r);
    }

    return jsonResponse(req, {
      brands_with_handle: brands?.length ?? 0,
      tracked_handles: tracked?.length ?? 0,
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
