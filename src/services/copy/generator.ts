
import { CopyTemplate } from './types';
import { analyzeCopy } from './analyzer';
import { analyzeTargetAudience, detectAwarenessLevel } from './audienceAnalysis';
import { selectOptimalTemplate } from './templateSelection';
import { extractVariablesAdvanced } from './variableExtraction';
import { buildProfessionalCopy, addProfessionalTouches } from './copyBuilder';
import { generateFallbackProfessionalCopy } from './fallbackGenerator';
import { IntelligentCopyService } from '../intelligentCopyService';

export const generateImprovedCopy = (originalText: string, selectedTemplates: string[]): string => {
  console.log('🎯 PROFESSIONAL COPY GENERATION STARTED');
  console.log('Original text length:', originalText.length);
  console.log('Selected templates:', selectedTemplates);
  
  try {
    // NUOVO: Usa il sistema intelligente se disponibile
    if (originalText.length > 10) {
      console.log('🚀 Using Intelligent Copy Service...');
      
      // Analisi semantica
      const analysis = IntelligentCopyService.analyzeTopicSemantics(originalText);
      console.log('📊 Semantic analysis:', analysis);
      
      // Se è un topic semplice, genera copy personalizzato
      if (analysis.type !== 'general') {
        const intelligentCopy = generateIntelligentCopy(originalText, analysis);
        if (intelligentCopy.length > originalText.length) {
          console.log('✅ Intelligent copy generated successfully');
          return intelligentCopy;
        }
      }
    }
    
    // FALLBACK: Sistema originale per compatibilità
    const analysis = analyzeCopy(originalText);
    const audienceProfile = analyzeTargetAudience(originalText);
    const awarenessLevel = detectAwarenessLevel(originalText);
    
    console.log('📊 Analysis completed:', { analysis: analysis.score, audience: audienceProfile.type, awareness: awarenessLevel });
    
    const optimalTemplate = selectOptimalTemplate(originalText, selectedTemplates, audienceProfile, awarenessLevel);
    console.log('🎯 Optimal template selected:', optimalTemplate?.name);
    
    if (!optimalTemplate) {
      return generateFallbackProfessionalCopy(originalText, audienceProfile);
    }
    
    const extractedVars = extractVariablesAdvanced(originalText, optimalTemplate.variables, audienceProfile);
    console.log('🔍 Variables extracted:', Object.keys(extractedVars));
    
    let professionalCopy = buildProfessionalCopy(optimalTemplate, extractedVars, audienceProfile, awarenessLevel);
    professionalCopy = addProfessionalTouches(professionalCopy, originalText, audienceProfile);
    
    console.log('🚀 Professional copy generated successfully');
    return professionalCopy;
    
  } catch (error) {
    console.error('💥 Error in professional copy generation:', error);
    return generateFallbackProfessionalCopy(originalText);
  }
};

const generateIntelligentCopy = (originalText: string, analysis: any): string => {
  let hook = '';
  
  // Hook intelligente basato sul tipo
  if (analysis.type === 'problem') {
    hook = `🚨 ATTENZIONE: Se anche tu hai problemi con ${originalText}`;
  } else if (analysis.type === 'solution') {
    hook = `💡 SCOPERTA: Ecco come ${originalText} può trasformare la tua vita`;
  } else {
    hook = `🔥 LA VERITÀ SU ${originalText.toUpperCase()}`;
  }
  
  return `${hook}

💥 IL PROBLEMA: Ogni giorno vedo persone che lottano con questo problema senza la soluzione giusta.

❌ ERRORE COMUNE: La maggior parte ignora i primi segnali e usa rimedi temporanei.

✅ LA SOLUZIONE PROFESSIONALE:
🎯 Valutazione completa personalizzata
🎯 Protocollo specifico per il tuo caso
🎯 Follow-up per risultati duraturi

🔥 RISULTATI COMPROVATI:
• Miglioramento in 7-14 giorni
• Soluzione duratura
• Approccio naturale e sicuro

💬 "Finalmente ho risolto quello che mi tormentava da mesi!" - Cliente soddisfatto

🚀 VUOI RISULTATI CONCRETI?
📞 Prenota consulenza GRATUITA
💬 Scrivici in DM "CONSULENZA"

⏰ Solo 5 posti disponibili questa settimana!`;
};
