import type { ApifyPost, ApifyProfile, ScrapedRaw } from "./types.ts";

// ─── Public output types ───
export interface TopHashtag {
  tag: string;
  uses: number;
  avg_engagement: number; // (likes + comments) media dei post che usano questo hashtag
}

export interface TopPost {
  url: string;
  type: "reel" | "carousel" | "image";
  likes: number;
  comments: number;
  views: number | null;
  caption_preview: string;
  timestamp: string;
  hashtags: string[];
  engagement: number;
}

export interface PostingSchedule {
  top_days: string[]; // es. ["mar", "gio", "sab"]
  top_hours: string[]; // es. ["18-20", "20-22"]
}

export interface FormatBreakdown {
  reel: number; // percentuale
  carousel: number;
  image: number;
}

export interface ScrapedMetrics {
  posts_analyzed: number;
  follower_count: number | null;
  avg_likes: number;
  avg_comments: number;
  avg_views: number | null;
  engagement_rate: number | null; // percentuale es. 3.2
  format_breakdown: FormatBreakdown;
  posting_frequency_per_week: number;
  posting_schedule: PostingSchedule;
  top_hashtags: TopHashtag[];
  caption_avg_length: number;
  top_3_posts: TopPost[];
  overall_score: number; // 0-100, calcolato deterministicamente
}

// ─── Pure helpers ───

const DAYS_IT = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];

function normalizeType(t: string): "reel" | "carousel" | "image" {
  const tt = (t || "").toLowerCase();
  if (tt.includes("video") || tt.includes("reel")) return "reel";
  if (tt.includes("sidecar") || tt.includes("carousel") || tt.includes("album")) return "carousel";
  return "image";
}

function postEngagement(p: ApifyPost): number {
  return (p.likes || 0) + (p.comments || 0);
}

function calcFormatBreakdown(posts: ApifyPost[]): FormatBreakdown {
  if (posts.length === 0) return { reel: 0, carousel: 0, image: 0 };
  const counts = { reel: 0, carousel: 0, image: 0 };
  for (const p of posts) counts[normalizeType(p.type)]++;
  const total = posts.length;
  return {
    reel: Math.round((counts.reel / total) * 100),
    carousel: Math.round((counts.carousel / total) * 100),
    image: Math.round((counts.image / total) * 100),
  };
}

function calcPostingFrequencyPerWeek(posts: ApifyPost[]): number {
  const valid = posts.map(p => p.timestamp).filter(Boolean).map(t => new Date(t).getTime()).filter(t => !isNaN(t));
  if (valid.length < 2) return 0;
  valid.sort((a, b) => a - b);
  const spanDays = (valid[valid.length - 1] - valid[0]) / (1000 * 60 * 60 * 24);
  if (spanDays < 1) return valid.length;
  return Math.round((valid.length / spanDays) * 7 * 10) / 10; // 1 decimale
}

function calcPostingSchedule(posts: ApifyPost[]): PostingSchedule {
  const dayCount: Record<string, number> = {};
  const hourBuckets: Record<string, number> = {};
  for (const p of posts) {
    if (!p.timestamp) continue;
    const d = new Date(p.timestamp);
    if (isNaN(d.getTime())) continue;
    const day = DAYS_IT[d.getDay()];
    dayCount[day] = (dayCount[day] || 0) + 1;
    const h = d.getHours();
    const bucket = `${String(Math.floor(h / 2) * 2).padStart(2, "0")}-${String(Math.floor(h / 2) * 2 + 2).padStart(2, "0")}`;
    hourBuckets[bucket] = (hourBuckets[bucket] || 0) + 1;
  }
  const top_days = Object.entries(dayCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
  const top_hours = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);
  return { top_days, top_hours };
}

function calcTopHashtags(posts: ApifyPost[]): TopHashtag[] {
  const map: Record<string, { uses: number; engagementSum: number }> = {};
  for (const p of posts) {
    const eng = postEngagement(p);
    for (const tagRaw of (p.hashtags || [])) {
      const tag = String(tagRaw).replace(/^#/, "").toLowerCase();
      if (!tag) continue;
      if (!map[tag]) map[tag] = { uses: 0, engagementSum: 0 };
      map[tag].uses++;
      map[tag].engagementSum += eng;
    }
  }
  return Object.entries(map)
    .map(([tag, v]) => ({ tag, uses: v.uses, avg_engagement: Math.round(v.engagementSum / v.uses) }))
    .sort((a, b) => b.uses - a.uses || b.avg_engagement - a.avg_engagement)
    .slice(0, 10);
}

function pickTop3(posts: ApifyPost[]): TopPost[] {
  return [...posts]
    .map(p => ({ p, eng: postEngagement(p) }))
    .sort((a, b) => b.eng - a.eng)
    .slice(0, 3)
    .map(({ p, eng }) => ({
      url: p.url,
      type: normalizeType(p.type),
      likes: p.likes,
      comments: p.comments,
      views: p.views,
      caption_preview: (p.caption || "").substring(0, 200),
      timestamp: p.timestamp,
      hashtags: p.hashtags || [],
      engagement: eng,
    }));
}

function calcCaptionAvgLength(posts: ApifyPost[]): number {
  if (posts.length === 0) return 0;
  return Math.round(posts.reduce((sum, p) => sum + (p.caption || "").length, 0) / posts.length);
}

function calcAvgViews(posts: ApifyPost[]): number | null {
  const reels = posts.filter(p => normalizeType(p.type) === "reel" && typeof p.views === "number");
  if (reels.length === 0) return null;
  return Math.round(reels.reduce((sum, p) => sum + (p.views || 0), 0) / reels.length);
}

function calcEngagementRate(scraped: ScrapedRaw, profile: ApifyProfile | null): number | null {
  if (!profile || !profile.followersCount || profile.followersCount === 0) return null;
  const avgEng = scraped.avgLikes + scraped.avgComments;
  return Math.round((avgEng / profile.followersCount) * 100 * 100) / 100; // 2 decimali, %
}

function calcOverallScore(metrics: Omit<ScrapedMetrics, "overall_score">): number {
  // Heuristic 0-100: weighted by engagement, posting frequency, format diversity
  let score = 0;
  // Engagement rate: 0-40 punti (3% = 40 pts)
  if (metrics.engagement_rate !== null) {
    score += Math.min(40, metrics.engagement_rate * 13);
  } else {
    // Fallback: avg engagement absoluto, 1000+ = 30
    score += Math.min(30, Math.round((metrics.avg_likes + metrics.avg_comments) / 50));
  }
  // Posting frequency: 0-25 punti (5+/settimana = 25)
  score += Math.min(25, metrics.posting_frequency_per_week * 5);
  // Format diversity: 0-20 punti (3 formati usati = 20)
  const fmts = [metrics.format_breakdown.reel, metrics.format_breakdown.carousel, metrics.format_breakdown.image].filter(v => v > 0).length;
  score += fmts * 7;
  // Caption quality: 0-15 punti (100-300 char ideali)
  const cl = metrics.caption_avg_length;
  if (cl >= 100 && cl <= 300) score += 15;
  else if (cl >= 50) score += 10;
  else if (cl >= 30) score += 5;
  return Math.min(100, Math.max(0, Math.round(score)));
}

// ─── Public API ───

export class InsufficientDataError extends Error {
  constructor(public postsFound: number) {
    super(`Profilo con dati insufficienti: ${postsFound} post estratti (minimo 5)`);
  }
}

/**
 * Compute all deterministic metrics from scraped posts and optional profile.
 * Throws InsufficientDataError if posts < 5.
 */
export function computeMetrics(scraped: ScrapedRaw, profile: ApifyProfile | null): ScrapedMetrics {
  if (scraped.posts.length < 5) {
    throw new InsufficientDataError(scraped.posts.length);
  }

  const partial: Omit<ScrapedMetrics, "overall_score"> = {
    posts_analyzed: scraped.postsCount,
    follower_count: profile?.followersCount ?? null,
    avg_likes: scraped.avgLikes,
    avg_comments: scraped.avgComments,
    avg_views: calcAvgViews(scraped.posts),
    engagement_rate: calcEngagementRate(scraped, profile),
    format_breakdown: calcFormatBreakdown(scraped.posts),
    posting_frequency_per_week: calcPostingFrequencyPerWeek(scraped.posts),
    posting_schedule: calcPostingSchedule(scraped.posts),
    top_hashtags: calcTopHashtags(scraped.posts),
    caption_avg_length: calcCaptionAvgLength(scraped.posts),
    top_3_posts: pickTop3(scraped.posts),
  };

  return {
    ...partial,
    overall_score: calcOverallScore(partial),
  };
}
