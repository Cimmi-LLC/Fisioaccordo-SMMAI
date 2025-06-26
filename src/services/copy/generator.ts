
import { CopyTemplate } from './types';
import { ADVANCED_TEMPLATES } from './templates';
import { analyzeCopy } from './analyzer';

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

// ANALISI TARGET AUDIENCE AVANZATA
const analyzeTargetAudience = (text: string): AudienceProfile => {
  const textLower = text.toLowerCase();
  
  // Analizza settore
  const healthKeywords = ['salute', 'dolore', 'mal di', 'benessere', 'fisioterapia', 'riabilitazione'];
  const businessKeywords = ['business', 'vendita', 'marketing', 'impresa', 'fatturato', 'clienti'];
  const personalKeywords = ['vita', 'crescita', 'motivazione', 'successo', 'obiettivi'];
  
  let sector = 'general';
  if (healthKeywords.some(keyword => textLower.includes(keyword))) sector = 'health';
  else if (businessKeywords.some(keyword => textLower.includes(keyword))) sector = 'business';
  else if (personalKeywords.some(keyword => textLower.includes(keyword))) sector = 'personal';
  
  // Analizza livello di sofisticazione
  const sophisticationMarkers = ['strategia', 'sistema', 'metodo', 'tecnica', 'framework'];
  const sophisticationLevel = sophisticationMarkers.filter(marker => textLower.includes(marker)).length;
  
  return {
    type: sector,
    sophistication: sophisticationLevel > 2 ? 'high' : sophisticationLevel > 0 ? 'medium' : 'low',
    painPoints: extractPainPoints(text),
    desires: extractDesires(text)
  };
};

// RILEVAMENTO LIVELLO DI CONSAPEVOLEZZA (SCHWARTZ)
const detectAwarenessLevel = (text: string): number => {
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

// SELEZIONE TEMPLATE OTTIMALE
const selectOptimalTemplate = (
  text: string, 
  selectedTemplates: string[], 
  audience: AudienceProfile, 
  awarenessLevel: number
): CopyTemplate | null => {
  
  // Se ci sono template selezionati, usa il più appropriato
  if (selectedTemplates.length > 0) {
    const available = ADVANCED_TEMPLATES.filter(t => selectedTemplates.includes(t.id));
    return available.find(t => isTemplateOptimal(t, audience, awarenessLevel)) || available[0];
  }
  
  // Selezione automatica intelligente
  const optimalTemplates = ADVANCED_TEMPLATES.filter(t => 
    isTemplateOptimal(t, audience, awarenessLevel)
  ).sort((a, b) => (b.effectiveness_score || 0) - (a.effectiveness_score || 0));
  
  return optimalTemplates[0] || ADVANCED_TEMPLATES.find(t => t.id === 'pas-professional');
};

const isTemplateOptimal = (template: CopyTemplate, audience: AudienceProfile, awarenessLevel: number): boolean => {
  // Template per livello di consapevolezza
  if (awarenessLevel <= 2 && template.category === 'hook') return true;
  if (awarenessLevel === 3 && template.category === 'storytelling') return true;
  if (awarenessLevel >= 4 && template.category === 'cta') return true;
  
  // Template per settore
  if (audience.type === 'health' && template.id.includes('health')) return true;
  if (audience.type === 'business' && template.id.includes('business')) return true;
  
  return template.effectiveness_score && template.effectiveness_score >= 90;
};

// ESTRAZIONE VARIABILI AVANZATA
const extractVariablesAdvanced = (
  text: string, 
  variables: string[], 
  audience: AudienceProfile
): Record<string, string> => {
  const extracted: Record<string, string> = {};
  const textLower = text.toLowerCase();
  
  variables.forEach(variable => {
    switch (variable) {
      case 'target_audience':
        extracted[variable] = audience.type === 'health' ? 'persone con problemi di salute' :
                             audience.type === 'business' ? 'imprenditori e professionisti' :
                             'persone ambiziose';
        break;
        
      case 'problema_specifico':
        const problems = audience.painPoints.length > 0 ? audience.painPoints[0] : 
                        detectMainProblem(text);
        extracted[variable] = problems;
        break;
        
      case 'desiderio_specifico':
        const desires = audience.desires.length > 0 ? audience.desires[0] :
                       'trasformare completamente la propria situazione';
        extracted[variable] = desires;
        break;
        
      case 'statistica_scioccante':
        extracted[variable] = audience.type === 'health' ? '73' :
                             audience.type === 'business' ? '87' : '91';
        break;
        
      case 'tempo_specifico':
        extracted[variable] = audience.sophistication === 'high' ? '30 giorni' :
                             audience.sophistication === 'medium' ? '14 giorni' : '7 giorni';
        break;
        
      case 'statement_shocking':
        extracted[variable] = generateShockingStatement(text, audience);
        break;
        
      case 'risultato_specifico':
        extracted[variable] = generateSpecificResult(audience);
        break;
        
      case 'numero_totale':
        extracted[variable] = Math.floor(Math.random() * 5 + 8).toString(); // 8-12
        break;
        
      default:
        extracted[variable] = getContextualVariable(variable, text, audience);
    }
  });
  
  return extracted;
};

// COSTRUZIONE COPY PROFESSIONALE
const buildProfessionalCopy = (
  template: CopyTemplate,
  variables: Record<string, string>,
  audience: AudienceProfile,
  awarenessLevel: number
): string => {
  let copy = template.template;
  
  // Sostituisci variabili
  Object.entries(variables).forEach(([key, value]) => {
    copy = copy.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  
  // Aggiungi elementi di persuasione basati su consapevolezza
  copy = addPersuasionElements(copy, awarenessLevel, audience);
  
  return copy;
};

// TOCCHI FINALI PROFESSIONALI
const addProfessionalTouches = (
  copy: string,
  originalText: string,
  audience: AudienceProfile
): string => {
  // Aggiungi emotional hooks
  copy += '\n\n' + generateEmotionalHook(audience);
  
  // Aggiungi social proof contextuale
  copy += '\n\n' + generateContextualSocialProof(audience);
  
  // Aggiungi CTA basata su urgenza psicologica
  copy += '\n\n' + generatePsychologicalCTA(audience);
  
  // Aggiungi elementi virali
  copy += '\n\n' + generateViralElements(audience);
  
  return copy;
};

// FUNZIONI DI SUPPORTO
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

const detectMainProblem = (text: string): string => {
  const healthProblems = ['mal di schiena', 'dolore cronico', 'stress', 'tensione muscolare'];
  const businessProblems = ['mancanza di clienti', 'basso fatturato', 'concorrenza', 'marketing inefficace'];
  
  const textLower = text.toLowerCase();
  for (const problem of [...healthProblems, ...businessProblems]) {
    if (textLower.includes(problem)) return problem;
  }
  
  return 'la situazione che stai vivendo';
};

const generateShockingStatement = (text: string, audience: AudienceProfile): string => {
  const shockingStatements = {
    health: 'Il 73% delle persone con problemi di salute peggiora ogni anno invece di migliorare',
    business: 'L\'87% delle aziende fallisce nei primi 5 anni per errori evitabili',
    personal: 'Il 91% delle persone muore con i propri sogni ancora nel cassetto'
  };
  
  return shockingStatements[audience.type as keyof typeof shockingStatements] || shockingStatements.personal;
};

const generateSpecificResult = (audience: AudienceProfile): string => {
  const results = {
    health: 'eliminato il dolore cronico e recuperato piena mobilità',
    business: 'triplicato il fatturato in 12 mesi',
    personal: 'trasformato completamente la mia vita in 6 mesi'
  };
  
  return results[audience.type as keyof typeof results] || results.personal;
};

const getContextualVariable = (variable: string, text: string, audience: AudienceProfile): string => {
  // Mappa di variabili contestuali basate su audience e contenuto
  const contextualMaps: Record<string, Record<string, string>> = {
    health: {
      'autorità_medica': 'Dr. Giovanni Rossi, fisioterapista',
      'approccio_naturale': 'metodo naturale senza farmaci',
      'meccanismo_funzionamento': 'riattiva la naturale capacità di guarigione del corpo'
    },
    business: {
      'autorità_settore': 'Forbes e Entrepreneur Magazine',
      'metodo_specifico': 'sistema di marketing scientifico',
      'metriche_specifiche': '+300% di ROI documentato'
    }
  };
  
  const typeMap = contextualMaps[audience.type];
  return typeMap?.[variable] || `[${variable.replace('_', ' ')}]`;
};

const addPersuasionElements = (copy: string, awarenessLevel: number, audience: AudienceProfile): string => {
  // Aggiungi elementi di persuasione basati sul livello di consapevolezza
  if (awarenessLevel <= 2) {
    copy += '\n\n🎯 ATTENZIONE: Se non agisci ora, il problema peggiorerà esponenzialmente.';
  } else if (awarenessLevel === 3) {
    copy += '\n\n✅ GARANZIA: Risultati visibili in 14 giorni o rimborso completo.';
  } else {
    copy += '\n\n⚡ URGENTE: Ultimi posti disponibili a questo prezzo.';
  }
  
  return copy;
};

const generateEmotionalHook = (audience: AudienceProfile): string => {
  const hooks = {
    health: '💭 Immagina di svegliarti domani mattina senza dolore, pieno di energia...',
    business: '💭 Immagina di aprire il tuo conto in banca e vedere numeri che non avresti mai sognato...',
    personal: '💭 Immagina di guardarti allo specchio e essere finalmente orgoglioso di chi sei diventato...'
  };
  
  return hooks[audience.type as keyof typeof hooks] || hooks.personal;
};

const generateContextualSocialProof = (audience: AudienceProfile): string => {
  const proofs = {
    health: '👥 Più di 15.000 persone hanno già risolto il loro problema con questo approccio',
    business: '👥 Oltre 8.500 imprenditori hanno trasformato la loro attività con questo sistema',
    personal: '👥 Più di 25.000 persone hanno già iniziato la loro trasformazione'
  };
  
  return proofs[audience.type as keyof typeof proofs] || proofs.personal;
};

const generatePsychologicalCTA = (audience: AudienceProfile): string => {
  const ctas = {
    health: '🔥 AGISCI ORA: Il tuo corpo non può aspettare ancora. Ogni giorno di ritardo è salute persa per sempre.',
    business: '🔥 AGISCI ORA: I tuoi concorrenti stanno già usando queste strategie. Non rimanere indietro.',
    personal: '🔥 AGISCI ORA: Hai già aspettato troppo. Il momento perfetto non arriverà mai.'
  };
  
  return ctas[audience.type as keyof typeof ctas] || ctas.personal;
};

const generateViralElements = (audience: AudienceProfile): string => {
  const viral = [
    '💥 CONDIVIDI se ti ha colpito!',
    '🔄 REPOST per aiutare altri',
    '💬 COMMENTA la tua esperienza',
    '🔥 SALVA questo post per dopo',
    '👥 TAG un amico che ha bisogno di vedere questo'
  ];
  
  return viral[Math.floor(Math.random() * viral.length)];
};

const generateFallbackProfessionalCopy = (originalText: string, audience?: AudienceProfile): string => {
  const topic = extractTopicFromText(originalText);
  const audienceType = audience?.type || 'general';
  
  return `🔥 ATTENZIONE ${audienceType.toUpperCase()}: La Verità Su ${topic.toUpperCase()}

💡 Se stai lottando con ${topic}, questo messaggio può cambiarti la vita.

❌ ERRORE MORTALE: Il 87% delle persone commette questo errore che peggiora tutto...

🎯 LA SOLUZIONE CHE FUNZIONA:
✅ Metodo scientificamente provato
✅ Risultati visibili in 14 giorni  
✅ Usato da oltre 10.000 persone

🔥 TESTIMONIANZA:
"Incredibile! In sole 2 settimane ho visto risultati che cercavo da anni."
- Marco T., Roma

💥 VUOI RISULTATI CONCRETI?
📞 Prenota consulenza GRATUITA
💬 Scrivimi "AIUTO" in DM

⚠️ ATTENZIONE: Solo 48 ore rimaste

#${topic.replace(/\s+/g, '')} #trasformazione #risultati`;
};

const extractTopicFromText = (text: string): string => {
  const topics = [
    'mal di schiena', 'postura', 'dolori', 'riabilitazione', 
    'fisioterapia', 'movimento', 'esercizi', 'stretching',
    'business', 'marketing', 'vendite', 'crescita personale'
  ];
  
  const textLower = text.toLowerCase();
  for (const topic of topics) {
    if (textLower.includes(topic)) return topic;
  }
  
  return 'il tuo obiettivo';
};

// TIPI DI SUPPORTO
interface AudienceProfile {
  type: string;
  sophistication: 'low' | 'medium' | 'high';
  painPoints: string[];
  desires: string[];
}
