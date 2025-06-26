
import { CopyTemplate } from './types';
import { ADVANCED_TEMPLATES } from './templates';
import { analyzeCopy } from './analyzer';

export const generateImprovedCopy = (originalText: string, selectedTemplates: string[]): string => {
  console.log('🔧 generateImprovedCopy called with:', { originalText: originalText.substring(0, 100), selectedTemplates });
  
  try {
    const analysis = analyzeCopy(originalText);
    console.log('📊 Analysis result:', analysis);
    
    // Se non ci sono template selezionati, usa quelli più efficaci automaticamente
    let templatesToUse = selectedTemplates;
    if (templatesToUse.length === 0) {
      console.log('🎯 No templates selected, using best viral templates');
      templatesToUse = ADVANCED_TEMPLATES
        .filter(t => t.effectiveness_score && t.effectiveness_score >= 95)
        .slice(0, 2)
        .map(t => t.id);
      console.log('🔥 Auto-selected templates:', templatesToUse);
    }
    
    // Trova il template più adatto
    let bestTemplate = ADVANCED_TEMPLATES.find(t => templatesToUse.includes(t.id));
    
    // Se ancora non troviamo un template, usa il template controverso come fallback
    if (!bestTemplate) {
      console.log('🚨 Using fallback template');
      bestTemplate = ADVANCED_TEMPLATES.find(t => t.id === 'controversy-viral' || t.category === 'viral') || ADVANCED_TEMPLATES[0];
    }
    
    console.log('✅ Selected template:', bestTemplate?.name);
    
    if (!bestTemplate) {
      console.error('❌ No template found');
      return originalText;
    }
    
    // Estrai variabili dal testo originale
    const extractedVars = extractVariables(originalText, bestTemplate.variables);
    console.log('🔍 Extracted variables:', extractedVars);
    
    // Applica il template
    let improvedCopy = bestTemplate.template;
    Object.entries(extractedVars).forEach(([key, value]) => {
      improvedCopy = improvedCopy.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });
    
    // Aggiungi elementi virali sempre
    improvedCopy = addViralElements(improvedCopy, originalText);
    
    console.log('🚀 Generated improved copy:', improvedCopy.substring(0, 200));
    
    return improvedCopy;
    
  } catch (error) {
    console.error('💥 Error in generateImprovedCopy:', error);
    return generateFallbackCopy(originalText);
  }
};

const generateFallbackCopy = (originalText: string): string => {
  console.log('🆘 Generating fallback copy');
  
  // Extract key topic from original text
  const topic = extractTopicFromText(originalText);
  
  return `🔥 ATTENZIONE: ${topic.toUpperCase()}

💡 Se questo è il tuo problema, questo post può cambiarti la vita!

❌ ERRORE COMUNE: La maggior parte delle persone fa questo sbaglio...

✅ ECCO LA SOLUZIONE che funziona davvero:

🎯 RISULTATI GARANTITI:
• Miglioramento visibile in 7 giorni
• Soluzione duratura e naturale  
• Metodo scientificamente provato

💥 VUOI RISULTATI CONCRETI?
📞 Prenota consulenza GRATUITA
💬 Scrivici in DM "AIUTO"

⚡ CONDIVIDI se ti è piaciuto!

#fisioterapia #salute #benessere`;
};

const extractTopicFromText = (text: string): string => {
  // Look for common health topics
  const healthTopics = [
    'mal di schiena', 'postura', 'dolori', 'riabilitazione', 
    'fisioterapia', 'movimento', 'esercizi', 'stretching'
  ];
  
  const textLower = text.toLowerCase();
  for (const topic of healthTopics) {
    if (textLower.includes(topic)) {
      return topic;
    }
  }
  
  return 'il tuo problema di salute';
};

const extractVariables = (text: string, variables: string[]): Record<string, string> => {
  const extracted: Record<string, string> = {};
  console.log('🔍 Extracting variables:', variables);
  
  variables.forEach(variable => {
    switch (variable) {
      case 'problema':
        const problemMatch = text.match(/(mal di \w+|stress|ansia|dolore|difficoltà|problema)/i);
        extracted[variable] = problemMatch ? problemMatch[0] : 'il tuo problema';
        break;
      case 'soluzione':
        extracted[variable] = 'la soluzione che stavi cercando';
        break;
      case 'tempo':
        const timeMatch = text.match(/(\d+\s*(giorni?|settimane?|mesi?))/i);
        extracted[variable] = timeMatch ? timeMatch[0] : '7 giorni';
        break;
      case 'opinione_controversa':
        extracted[variable] = 'quello che i dottori non ti dicono';
        break;
      case 'risultato_desiderato':
        extracted[variable] = 'eliminare completamente questo problema';
        break;
      case 'tempo_record':
        extracted[variable] = '48 ore';
        break;
      case 'evento_importante':
        extracted[variable] = 'ho scoperto questo metodo rivoluzionario';
        break;
      case 'situazione_drammatica_prima':
        extracted[variable] = 'dolore costante e limitazioni nel movimento';
        break;
      case 'risultato_incredibile_dopo':
        extracted[variable] = 'movimento libero e vita senza dolore';
        break;
      case 'settore':
        extracted[variable] = 'sanitario';
        break;
      case 'anni':
        extracted[variable] = '15';
        break;
      case 'industria':
        extracted[variable] = 'il sistema sanitario tradizionale';
        break;
      default:
        extracted[variable] = `[${variable}]`;
    }
  });
  
  console.log('✅ Variables extracted:', extracted);
  return extracted;
};

const addViralElements = (copy: string, originalText: string): string => {
  console.log('🔥 Adding viral elements');
  
  // Aggiungi elementi che aumentano la viralità
  const viralElements = [
    '\n\n🧵 THREAD completo nei commenti...',
    '\n\n💥 CONDIVIDI se ti ha colpito!',
    '\n\n⚡ SALVA questo post per dopo',
    '\n\n🔥 La tua esperienza nei commenti?',
    '\n\n💬 TAG un amico che deve vedere questo!'
  ];
  
  // Aggiungi un elemento virale casuale
  const randomElement = viralElements[Math.floor(Math.random() * viralElements.length)];
  return copy + randomElement;
};

// Nuova funzione per generare format virali specifici
export const generateViralFormat = (topic: string, formatType: string): string => {
  console.log('🎯 Generating viral format:', { topic, formatType });
  
  const viralFormats: Record<string, string> = {
    'controversy': `🔥 OPINIONE IMPOPOLARE su ${topic}:

Tutti dicono che devi fare X, ma dopo anni di esperienza posso dire che è completamente SBAGLIATO.

Ecco la verità che nessuno vi dice:

1. La maggior parte dei consigli sono obsoleti
2. I metodi tradizionali spesso peggiorano la situazione  
3. Esiste una via migliore che funziona davvero

💬 Ditemi nei commenti se sono pazzo o se ho ragione...`,
    
    'behind-scenes': `📹 DIETRO LE QUINTE di ${topic}:

Quello che vedete: risultati perfetti sui social
Quello che NON vedete: la realtà del percorso

La verità è molto diversa da quello che pensate.

Thread con tutti i dettagli che vi scioccheranno 👇`,
    
    'before-after': `😱 PRIMA vs DOPO con ${topic}:

PRIMA: Dolore costante, limitazioni, frustrazione
DOPO: Movimento libero, energia, fiducia

La trasformazione che ha scioccato tutti.

Ecco esattamente come ho fatto (passo dopo passo) 👇`,
    
    'expose': `💣 VERITÀ SCOMODA su ${topic}:

Dopo anni nel settore, è ora di dire la verità.

Quello che l'industria non vuole che sappiate:

• I trattamenti costosi spesso sono inutili
• Esistono soluzioni semplici ed efficaci
• La prevenzione è sempre meglio della cura

Thread con prove e documenti 🧵`,
    
    'challenge': `🎯 SFIDA ACCETTATA:

Mi hanno sfidato a risolvere ${topic} in 7 giorni.

Giorno 1: Iniziamo il protocollo rivoluzionario

Seguite il thread per gli aggiornamenti quotidiani!

#Challenge #${topic.replace(/\s+/g, '')}`
  };
  
  return viralFormats[formatType] || viralFormats['controversy'];
};
