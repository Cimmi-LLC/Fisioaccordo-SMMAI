
import { CopyTemplate } from './types';
import { analyzeCopy } from './analyzer';
import { analyzeTargetAudience, detectAwarenessLevel } from './audienceAnalysis';
import { selectOptimalTemplate } from './templateSelection';
import { extractVariablesAdvanced } from './variableExtraction';
import { buildProfessionalCopy, addProfessionalTouches } from './copyBuilder';
import { generateFallbackProfessionalCopy } from './fallbackGenerator';

export const generateImprovedCopy = (originalText: string, selectedTemplates: string[]): string => {
  console.log('🎯 PROFESSIONAL COPY GENERATION STARTED');
  console.log('Original text length:', originalText.length);
  console.log('Selected templates:', selectedTemplates);
  
  try {
    // FASE 1: Analisi Professionale del Contenuto
    const analysis = analyzeCopy(originalText);
    const audienceProfile = analyzeTargetAudience(originalText);
    const awarenessLevel = detectAwarenessLevel(originalText);
    
    console.log('📊 Analysis completed:', { analysis: analysis.score, audience: audienceProfile.type, awareness: awarenessLevel });
    
    // FASE 2: Selezione Template Intelligente
    const optimalTemplate = selectOptimalTemplate(originalText, selectedTemplates, audienceProfile, awarenessLevel);
    console.log('🎯 Optimal template selected:', optimalTemplate?.name);
    
    if (!optimalTemplate) {
      return generateFallbackProfessionalCopy(originalText, audienceProfile);
    }
    
    // FASE 3: Estrazione Variabili Intelligente
    const extractedVars = extractVariablesAdvanced(originalText, optimalTemplate.variables, audienceProfile);
    console.log('🔍 Variables extracted:', Object.keys(extractedVars));
    
    // FASE 4: Generazione Copy Professionale
    let professionalCopy = buildProfessionalCopy(optimalTemplate, extractedVars, audienceProfile, awarenessLevel);
    
    // FASE 5: Ottimizzazione Finale
    professionalCopy = addProfessionalTouches(professionalCopy, originalText, audienceProfile);
    
    console.log('🚀 Professional copy generated successfully');
    return professionalCopy;
    
  } catch (error) {
    console.error('💥 Error in professional copy generation:', error);
    return generateFallbackProfessionalCopy(originalText);
  }
};
