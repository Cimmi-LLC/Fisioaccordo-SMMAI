
export interface CopyTemplate {
  id: string;
  name: string;
  category: 'hook' | 'storytelling' | 'cta' | 'problem-solution' | 'social-proof' | 'viral';
  template: string;
  variables: string[];
  description: string;
  effectiveness_score?: number;
  use_cases: string[];
  viral_potential?: number;
  target_awareness_level?: number[];
  target_audience?: string[];
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  examples: string[];
  effectiveness_rating: number;
  psychological_triggers?: string[];
  frameworks_used?: string[];
}

export interface CopyAnalysis {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  hook_rating: number;
  emotion_rating: number;
  clarity_rating: number;
  cta_rating: number;
  viral_potential?: number;
  awareness_level?: number;
  target_audience?: string;
  persuasion_score?: number;
}

export interface ViralFormat {
  id: string;
  name: string;
  pattern: string;
  engagement_multiplier: number;
  platform_optimized: string[];
  psychological_triggers: string[];
}

export interface AudienceProfile {
  type: 'health' | 'business' | 'personal' | 'general';
  sophistication: 'low' | 'medium' | 'high';
  awareness_level: number;
  pain_points: string[];
  desires: string[];
  demographics?: {
    age_range?: string;
    income_level?: string;
    education?: string;
  };
}

export interface PersuasionAnalysis {
  cialdini_principles: string[];
  emotional_triggers: string[];
  logical_flow: number;
  objection_handling: number;
  urgency_level: number;
  social_proof_strength: number;
}
