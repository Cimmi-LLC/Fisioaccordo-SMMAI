
import { KnowledgeEntry } from '../types';
import { FUNDAMENTALS_KNOWLEDGE } from './fundamentals';
import { FRAMEWORKS_KNOWLEDGE } from './frameworks';
import { VIRAL_KNOWLEDGE } from './viral';
import { NEUROMARKETING_KNOWLEDGE } from './neuromarketing';
import { STORYTELLING_KNOWLEDGE } from './storytelling';
import { SALES_KNOWLEDGE } from './sales';

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  ...FUNDAMENTALS_KNOWLEDGE,
  ...FRAMEWORKS_KNOWLEDGE,
  ...VIRAL_KNOWLEDGE,
  ...NEUROMARKETING_KNOWLEDGE,
  ...STORYTELLING_KNOWLEDGE,
  ...SALES_KNOWLEDGE
];

export const getKnowledgeByCategory = (category?: string): KnowledgeEntry[] => {
  if (!category) return KNOWLEDGE_BASE;
  return KNOWLEDGE_BASE.filter(k => k.category === category);
};
