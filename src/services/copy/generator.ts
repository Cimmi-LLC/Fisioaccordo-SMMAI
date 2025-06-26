
import { CopyTemplate } from './types';
import { ADVANCED_TEMPLATES } from './templates';
import { analyzeCopy } from './analyzer';

export const generateImprovedCopy = (originalText: string, selectedTemplates: string[]): string => {
  const analysis = analyzeCopy(originalText);
  
  // Prioritizza i template virali se disponibili
  const viralTemplates = ADVANCED_TEMPLATES.filter(t => 
    t.effectiveness_score && t.effectiveness_score >= 90
  );
  
  // Trova il template più adatto
  const bestTemplate = ADVANCED_TEMPLATES.find(t => 
    selectedTemplates.includes(t.id) || 
    (analysis.hook_rating < 70 && t.category === 'hook') ||
    (viralTemplates.includes(t) && analysis.score < 80)
  );
  
  if (!bestTemplate) return originalText;
  
  // Estrai variabili dal testo originale
  const extractedVars = extractVariables(originalText, bestTemplate.variables);
  
  // Applica il template
  let improvedCopy = bestTemplate.template;
  Object.entries(extractedVars).forEach(([key, value]) => {
    improvedCopy = improvedCopy.replace(`{${key}}`, value);
  });
  
  // Aggiungi elementi virali se il template lo supporta
  if (bestTemplate.effectiveness_score && bestTemplate.effectiveness_score >= 93) {
    improvedCopy = addViralElements(improvedCopy, originalText);
  }
  
  return improvedCopy;
};

const extractVariables = (text: string, variables: string[]): Record<string, string> => {
  const extracted: Record<string, string> = {};
  
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
      case 'opinione_controversa':
        extracted[variable] = 'la maggior parte dei consigli che ricevete sono sbagliati';
        break;
      case 'risultato_desiderato':
        extracted[variable] = 'risolvere completamente questo problema';
        break;
      case 'tempo_record':
        extracted[variable] = '72 ore';
        break;
      case 'evento_importante':
        extracted[variable] = 'ho iniziato il mio percorso professionale';
        break;
      case 'situazione_drammatica_prima':
        extracted[variable] = 'dolore costante e impossibilità di movimento';
        break;
      case 'risultato_incredibile_dopo':
        extracted[variable] = 'movimento libero e vita normale';
        break;
      case 'settore':
        extracted[variable] = 'sanitario';
        break;
      case 'anni':
        extracted[variable] = '10';
        break;
      case 'industria':
        extracted[variable] = 'il sistema sanitario';
        break;
      default:
        extracted[variable] = `[${variable}]`;
    }
  });
  
  return extracted;
};

const addViralElements = (copy: string, originalText: string): string => {
  // Aggiungi elementi che aumentano la viralità
  const viralElements = [
    '\n\n🧵 THREAD completo nei commenti...',
    '\n\n💥 CONDIVIDI se ti è piaciuto!',
    '\n\n⚡ SALVA questo post per dopo',
    '\n\n🔥 La tua opinione nei commenti'
  ];
  
  // Aggiungi un elemento virale casuale
  const randomElement = viralElements[Math.floor(Math.random() * viralElements.length)];
  return copy + randomElement;
};

// Nuova funzione per generare format virali specifici
export const generateViralFormat = (topic: string, formatType: string): string => {
  const viralFormats: Record<string, string> = {
    'controversy': `🔥 OPINIONE IMPOPOLARE su ${topic}:\n\nTutti dicono che [...], ma dopo anni di esperienza posso dire che è completamente SBAGLIATO.\n\nEcco la verità che nessuno vi dice:\n\n1. [...]\n2. [...]\n3. [...]\n\n💬 Ditemi nei commenti se sono pazzo o se ho ragione...`,
    
    'behind-scenes': `📹 DIETRO LE QUINTE di ${topic}:\n\nQuello che vedete: [...]\nQuello che NON vedete: [...]\n\nLa realtà è molto diversa da quello che pensate.\n\nThread con tutti i dettagli che vi scioccheranno 👇`,
    
    'before-after': `😱 PRIMA vs DOPO con ${topic}:\n\nPRIMA: [...]\nDOPO: [...]\n\nLa trasformazione che ha scioccato tutti.\n\nEcco esattamente come ho fatto (passo dopo passo) 👇`,
    
    'expose': `💣 VERITÀ SCOMODA su ${topic}:\n\nDopo anni nel settore, è ora di dire la verità.\n\nQuello che l'industria non vuole che sappiate:\n\n• [...]\n• [...]\n• [...]\n\nThread con prove e documenti 🧵`,
    
    'challenge': `🎯 SFIDA ACCETTATA:\n\nMi hanno sfidato a [...] in [...] giorni.\n\nGiorno 1: [...]\n\nSeguite il thread per gli aggiornamenti quotidiani!\n\n#Challenge #${topic}`
  };
  
  return viralFormats[formatType] || viralFormats['controversy'];
};
