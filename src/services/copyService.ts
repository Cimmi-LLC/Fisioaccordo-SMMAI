
// Main CopyService that aggregates all copy-related functionality
export { CopyTemplate, KnowledgeEntry, CopyAnalysis } from './copy/types';
export { ADVANCED_TEMPLATES, getTemplatesByCategory } from './copy/templates';
export { KNOWLEDGE_BASE, getKnowledgeByCategory } from './copy/knowledge';
export { analyzeCopy } from './copy/analyzer';
export { generateImprovedCopy } from './copy/generator';

export class CopyService {
  static getTemplatesByCategory = getTemplatesByCategory;
  static getKnowledgeByCategory = getKnowledgeByCategory;
  static analyzeCopy = analyzeCopy;
  static generateImprovedCopy = generateImprovedCopy;
}

// Re-export for backward compatibility
import { getTemplatesByCategory } from './copy/templates';
import { getKnowledgeByCategory } from './copy/knowledge';
import { analyzeCopy } from './copy/analyzer';
import { generateImprovedCopy } from './copy/generator';
