
import { CopyTemplate } from './types';
import { analyzeCopy } from './analyzer';
import { supabase } from "@/integrations/supabase/client";

export const generateImprovedCopy = async (originalText: string, selectedTemplates: string[]): Promise<string> => {
  console.log('🎯 PROFESSIONAL COPY GENERATION STARTED');
  
  try {
    if (originalText.length > 10) {
      // Use edge function for AI-powered copy improvement
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          topic: `Migliora questo copy mantenendo il messaggio originale ma rendendolo più virale e coinvolgente: "${originalText}"`,
          audience: '',
          platform: 'instagram',
          tone: 'professionale',
          postType: 'post-singolo',
          numSlides: 1
        }
      });

      if (!error && data?.content) {
        console.log('✅ AI copy improvement generated');
        return data.content;
      }
    }
    
    // Fallback: return original text with basic analysis
    const analysis = analyzeCopy(originalText);
    console.log('📊 Analysis score:', analysis.score);
    return originalText;
    
  } catch (error) {
    console.error('💥 Error in copy generation:', error);
    return originalText;
  }
};
