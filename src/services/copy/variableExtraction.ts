
import { AudienceProfile } from './types';

export const extractVariablesAdvanced = (
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
        const problems = audience.pain_points.length > 0 ? audience.pain_points[0] : 
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

export const detectMainProblem = (text: string): string => {
  const healthProblems = ['mal di schiena', 'dolore cronico', 'stress', 'tensione muscolare'];
  const businessProblems = ['mancanza di clienti', 'basso fatturato', 'concorrenza', 'marketing inefficace'];
  
  const textLower = text.toLowerCase();
  for (const problem of [...healthProblems, ...businessProblems]) {
    if (textLower.includes(problem)) return problem;
  }
  
  return 'la situazione che stai vivendo';
};

export const generateShockingStatement = (text: string, audience: AudienceProfile): string => {
  const shockingStatements = {
    health: 'Il 73% delle persone con problemi di salute peggiora ogni anno invece di migliorare',
    business: 'L\'87% delle aziende fallisce nei primi 5 anni per errori evitabili',
    personal: 'Il 91% delle persone muore con i propri sogni ancora nel cassetto'
  };
  
  return shockingStatements[audience.type as keyof typeof shockingStatements] || shockingStatements.personal;
};

export const generateSpecificResult = (audience: AudienceProfile): string => {
  const results = {
    health: 'eliminato il dolore cronico e recuperato piena mobilità',
    business: 'triplicato il fatturato in 12 mesi',
    personal: 'trasformato completamente la mia vita in 6 mesi'
  };
  
  return results[audience.type as keyof typeof results] || results.personal;
};

export const getContextualVariable = (variable: string, text: string, audience: AudienceProfile): string => {
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
