
import { KnowledgeEntry } from '../types';
import { FUNDAMENTALS_KNOWLEDGE } from './fundamentals';
import { FRAMEWORKS_KNOWLEDGE } from './frameworks';
import { VIRAL_KNOWLEDGE } from './viral';
import { NEUROMARKETING_KNOWLEDGE } from './neuromarketing';
import { STORYTELLING_KNOWLEDGE } from './storytelling';
import { SALES_KNOWLEDGE } from './sales';
import { HORMOZI_HOOKS_KNOWLEDGE } from './hormozi_hooks';
import { HORMOZI_PROOF_KNOWLEDGE } from './hormozi_proof';
import { HORMOZI_BRANDING_KNOWLEDGE } from './hormozi_branding';
import { HORMOZI_LTV_KNOWLEDGE } from './hormozi_ltv';
import { SOCIAL_SECRETS_KNOWLEDGE } from './social_secrets';

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  ...FUNDAMENTALS_KNOWLEDGE,
  ...FRAMEWORKS_KNOWLEDGE,
  ...VIRAL_KNOWLEDGE,
  ...NEUROMARKETING_KNOWLEDGE,
  ...STORYTELLING_KNOWLEDGE,
  ...SALES_KNOWLEDGE,
  ...HORMOZI_HOOKS_KNOWLEDGE,
  ...HORMOZI_PROOF_KNOWLEDGE,
  ...HORMOZI_BRANDING_KNOWLEDGE,
  ...HORMOZI_LTV_KNOWLEDGE,
  ...SOCIAL_SECRETS_KNOWLEDGE
];

export const getKnowledgeByCategory = (category?: string): KnowledgeEntry[] => {
  if (!category) return KNOWLEDGE_BASE;
  return KNOWLEDGE_BASE.filter(k => k.category === category);
};
