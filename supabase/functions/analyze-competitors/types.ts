// Shared types for analyze-competitors Edge Function

export interface ApifyPost {
  caption: string;
  likes: number;
  comments: number;
  views: number | null;
  type: string;
  timestamp: string;
  hashtags: string[];
  url: string;
}

export interface ApifyProfile {
  username: string;
  followersCount: number | null;
  followsCount: number | null;
  biography: string;
  fullName: string;
  verified: boolean;
}

export interface ScrapedRaw {
  username: string;
  postsCount: number;
  posts: ApifyPost[];
  totalLikes: number;
  totalComments: number;
  avgLikes: number;
  avgComments: number;
}

// v1 legacy output schema (Gemini direct fields)
export interface LegacyOutputV1 {
  competitor_name: string;
  overall_score: number;
  engagement_rate: string; // "alto/medio/basso"
  content_strategy: {
    main_topics: string[];
    posting_frequency: string;
    best_content_type: string;
    tone_of_voice: string;
  };
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  content_ideas: Array<{ idea: string; format: string; why: string }>;
  hashtag_analysis: { most_used: string[]; suggested: string[] };
  summary: string;
  scraped_metrics?: {
    posts_analyzed: number;
    avg_likes: number;
    avg_comments: number;
  };
}
