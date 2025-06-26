
export interface CopyTemplate {
  id: string;
  name: string;
  category: 'hook' | 'storytelling' | 'cta' | 'problem-solution' | 'social-proof';
  template: string;
  variables: string[];
  description: string;
  effectiveness_score?: number;
  use_cases: string[];
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  examples: string[];
  effectiveness_rating: number;
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
}
