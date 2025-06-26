
import { AudienceProfile } from './types';

export const analyzeTargetAudience = (text: string): AudienceProfile => {
  const textLower = text.toLowerCase();
  
  // Analizza settore
  const healthKeywords = ['salute', 'dolore', 'mal di', 'benessere', 'fisioterapia', 'riabilitazione'];
  const businessKeywords = ['business', 'vendita', 'marketing', 'impresa', 'fatturato', 'clienti'];
  const personalKeywords = ['vita', 'crescita', 'motivazione', 'successo', 'obiettivi'];
  
  let sector: 'health' | 'business' | 'personal' | 'general' = 'general';
  if (healthKeywords.some(keyword => textLower.includes(keyword))) sector = 'health';
  else if (businessKeywords.some(keyword => textLower.includes(keyword))) sector = 'business';
  else if (personalKeywords.some(keyword => textLower.includes(keyword))) sector = 'personal';
  
  // Analizza livello di sofisticazione
  const sophisticationMarkers = ['strategia', 'sistema', 'metodo', 'tecnica', 'framework'];
  const sophisticationLevel = sophisticationMarkers.filter(marker => textLower.includes(marker)).length;
  
  return {
    type: sector,
    sophistication: sophisticationLevel > 2 ? 'high' : sophisticationLevel > 0 ? 'medium' : 'low',
    awareness_level: detectAwarenessLevel(text),
    pain_points: extractPainPoints(text),
    desires: extractDesires(text)
  };
};

export const detectAwarenessLevel = (text: string): number => {
  const textLower = text.toLowerCase();
  
  // Level 1: Unaware (inconsapevole del problema)
  const unawareMarkers = ['non sai', 'non ti rendi conto', 'nascosto', 'segreto'];
  
  // Level 2: Problem aware (consapevole del problema)  
  const problemMarkers = ['problema', 'difficoltà', 'sfida', 'ostacolo'];
  
  // Level 3: Solution aware (consapevole della soluzione)
  const solutionMarkers = ['soluzione', 'metodo', 'sistema', 'tecnica'];
  
  // Level 4: Product aware (consapevole del prodotto)
  const productMarkers = ['corso', 'programma', 'servizio', 'consulenza'];
  
  // Level 5: Most aware (pronto all'acquisto)
  const readyMarkers = ['prezzo', 'sconto', 'offerta', 'acquista'];
  
  if (readyMarkers.some(marker => textLower.includes(marker))) return 5;
  if (productMarkers.some(marker => textLower.includes(marker))) return 4;
  if (solutionMarkers.some(marker => textLower.includes(marker))) return 3;
  if (problemMarkers.some(marker => textLower.includes(marker))) return 2;
  return 1;
};

const extractPainPoints = (text: string): string[] => {
  const painKeywords = ['problema', 'difficoltà', 'dolore', 'stress', 'ansia', 'fatica'];
  const pains: string[] = [];
  
  painKeywords.forEach(keyword => {
    if (text.toLowerCase().includes(keyword)) {
      pains.push(keyword);
    }
  });
  
  return pains.length > 0 ? pains : ['situazione attuale insoddisfacente'];
};

const extractDesires = (text: string): string[] => {
  const desireKeywords = ['successo', 'libertà', 'salute', 'benessere', 'crescita', 'miglioramento'];
  const desires: string[] = [];
  
  desireKeywords.forEach(keyword => {
    if (text.toLowerCase().includes(keyword)) {
      desires.push(keyword);
    }
  });
  
  return desires.length > 0 ? desires : ['trasformazione positiva'];
};
