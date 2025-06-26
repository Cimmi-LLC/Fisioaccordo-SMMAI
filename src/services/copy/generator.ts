
import { CopyTemplate } from './types';
import { ADVANCED_TEMPLATES } from './templates';
import { analyzeCopy } from './analyzer';

export const generateImprovedCopy = (originalText: string, selectedTemplates: string[]): string => {
  const analysis = analyzeCopy(originalText);
  
  // Trova il template più adatto
  const bestTemplate = ADVANCED_TEMPLATES.find(t => 
    selectedTemplates.includes(t.id) || 
    (analysis.hook_rating < 70 && t.category === 'hook')
  );
  
  if (!bestTemplate) return originalText;
  
  // Estrai variabili dal testo originale
  const extractedVars = extractVariables(originalText, bestTemplate.variables);
  
  // Applica il template
  let improvedCopy = bestTemplate.template;
  Object.entries(extractedVars).forEach(([key, value]) => {
    improvedCopy = improvedCopy.replace(`{${key}}`, value);
  });
  
  return improvedCopy;
};

const extractVariables = (text: string, variables: string[]): Record<string, string> => {
  const extracted: Record<string, string> = {};
  
  // Logica semplificata per estrarre variabili dal testo
  // In un sistema reale, useresti NLP più avanzato
  variables.forEach(variable => {
    switch (variable) {
      case 'problema':
        const problemMatch = text.match(/(mal di \w+|stress|ansia|dolore|difficoltà)/i);
        extracted[variable] = problemMatch ? problemMatch[0] : 'il tuo problema';
        break;
      case 'soluzione':
        extracted[variable] = 'la soluzione che cerchi';
        break;
      case 'tempo':
        const timeMatch = text.match(/(\d+\s*(giorni?|settimane?|mesi?))/i);
        extracted[variable] = timeMatch ? timeMatch[0] : '30 giorni';
        break;
      default:
        extracted[variable] = `[${variable}]`;
    }
  });
  
  return extracted;
};
