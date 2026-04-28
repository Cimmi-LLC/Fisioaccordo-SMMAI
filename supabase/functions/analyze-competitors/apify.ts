import type { ScrapedRaw, ApifyPost, ApifyProfile } from "./types.ts";

const APIFY_BASE = "https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items";

function cleanUsername(username: string): string {
  return username
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .replace(/\/$/, "");
}

/**
 * Scrape Instagram posts (last 12) for a given username via Apify.
 * Returns null on any failure.
 */
export async function scrapeInstagramPosts(
  username: string,
  apifyToken: string
): Promise<ScrapedRaw | null> {
  try {
    const cu = cleanUsername(username);
    console.log("[apify] scraping posts for:", cu);

    const response = await fetch(
      `${APIFY_BASE}?token=${apifyToken}&timeout=60`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernames: [cu],
          resultsType: "posts",
          resultsLimit: 12,
          searchType: "user",
        }),
      }
    );

    if (!response.ok) {
      console.error("[apify] posts error status:", response.status);
      return null;
    }

    const items = await response.json();
    if (!items || items.length === 0) return null;

    const posts: ApifyPost[] = items
      .filter((p: any) => !p.error)
      .map((p: any) => ({
        caption: (p.caption || "").substring(0, 500),
        likes: p.likesCount || 0,
        comments: p.commentsCount || 0,
        views: p.videoViewCount || p.videoPlayCount || null,
        type: p.type || "unknown",
        timestamp: p.timestamp || "",
        hashtags: p.hashtags || [],
        url: p.url || "",
      }));

    if (posts.length === 0) return null;

    const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);
    const totalComments = posts.reduce((sum, p) => sum + p.comments, 0);

    return {
      username: cu,
      postsCount: posts.length,
      posts,
      totalLikes,
      totalComments,
      avgLikes: Math.round(totalLikes / posts.length),
      avgComments: Math.round(totalComments / posts.length),
    };
  } catch (err) {
    console.error("[apify] scrape posts exception:", err);
    return null;
  }
}

/**
 * Scrape Instagram profile details (followers, biography, ecc).
 * Used to calculate engagement_rate. Returns null on failure (graceful).
 */
export async function scrapeInstagramProfile(
  username: string,
  apifyToken: string
): Promise<ApifyProfile | null> {
  try {
    const cu = cleanUsername(username);
    console.log("[apify] scraping profile for:", cu);

    const response = await fetch(
      `${APIFY_BASE}?token=${apifyToken}&timeout=30`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernames: [cu],
          resultsType: "details",
          resultsLimit: 1,
          searchType: "user",
        }),
      }
    );

    if (!response.ok) {
      console.error("[apify] profile error status:", response.status);
      return null;
    }

    const items = await response.json();
    if (!items || items.length === 0) return null;

    const p = items[0];
    if (p.error) return null;

    return {
      username: cu,
      followersCount: typeof p.followersCount === "number" ? p.followersCount : null,
      followsCount: typeof p.followsCount === "number" ? p.followsCount : null,
      biography: p.biography || "",
      fullName: p.fullName || "",
      verified: !!p.verified,
    };
  } catch (err) {
    console.error("[apify] scrape profile exception:", err);
    return null;
  }
}
