
import { CopyTemplate } from './copy/types';
import { getTemplatesByCategory as getTemplatesFromModule } from './copy/templates';
import { getKnowledgeByCategory } from './copy/knowledge';
import { generateImprovedCopy as generateFromModule } from './copy/generator';
import { analyzeCopy as analyzeFromModule } from './copy/analyzer';

export class CopyService {
  static getTemplatesByCategory(category?: string): CopyTemplate[] {
    try {
      return getTemplatesFromModule(category);
    } catch (error) {
      console.error('Error getting templates:', error);
      return [];
    }
  }

  static getKnowledgeByCategory(category?: string) {
    try {
      return getKnowledgeByCategory(category);
    } catch (error) {
      console.error('Error getting knowledge:', error);
      return [];
    }
  }

  static async generateImprovedCopy(originalText: string, selectedTemplates: string[] = []): Promise<string> {
    try {
      return await generateFromModule(originalText, selectedTemplates);
    } catch (error) {
      console.error('Error generating improved copy:', error);
      return originalText;
    }
  }

  static analyzeCopy(text: string) {
    try {
      return analyzeFromModule(text);
    } catch (error) {
      console.error('Error analyzing copy:', error);
      return {
        score: 0,
        suggestions: [],
        strengths: [],
        weaknesses: [],
        readabilityScore: 0,
        emotionalImpact: 0,
        persuasionScore: 0
      };
    }
  }
}
