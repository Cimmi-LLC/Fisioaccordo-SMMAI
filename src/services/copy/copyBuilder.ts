
import { CopyTemplate, AudienceProfile } from './types';

export const buildProfessionalCopy = (
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

export const addProfessionalTouches = (
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

export const addPersuasionElements = (copy: string, awarenessLevel: number, audience: AudienceProfile): string => {
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

export const generateEmotionalHook = (audience: AudienceProfile): string => {
  const hooks = {
    health: '💭 Immagina di svegliarti domani mattina senza dolore, pieno di energia...',
    business: '💭 Immagina di aprire il tuo conto in banca e vedere numeri che non avresti mai sognato...',
    personal: '💭 Immagina di guardarti allo specchio e essere finalmente orgoglioso di chi sei diventato...'
  };
  
  return hooks[audience.type as keyof typeof hooks] || hooks.personal;
};

export const generateContextualSocialProof = (audience: AudienceProfile): string => {
  const proofs = {
    health: '👥 Più di 15.000 persone hanno già risolto il loro problema con questo approccio',
    business: '👥 Oltre 8.500 imprenditori hanno trasformato la loro attività con questo sistema',
    personal: '👥 Più di 25.000 persone hanno già iniziato la loro trasformazione'
  };
  
  return proofs[audience.type as keyof typeof proofs] || proofs.personal;
};

export const generatePsychologicalCTA = (audience: AudienceProfile): string => {
  const ctas = {
    health: '🔥 AGISCI ORA: Il tuo corpo non può aspettare ancora. Ogni giorno di ritardo è salute persa per sempre.',
    business: '🔥 AGISCI ORA: I tuoi concorrenti stanno già usando queste strategie. Non rimanere indietro.',
    personal: '🔥 AGISCI ORA: Hai già aspettato troppo. Il momento perfetto non arriverà mai.'
  };
  
  return ctas[audience.type as keyof typeof ctas] || ctas.personal;
};

export const generateViralElements = (audience: AudienceProfile): string => {
  const viral = [
    '💥 CONDIVIDI se ti ha colpito!',
    '🔄 REPOST per aiutare altri',
    '💬 COMMENTA la tua esperienza',
    '🔥 SALVA questo post per dopo',
    '👥 TAG un amico che ha bisogno di vedere questo'
  ];
  
  return viral[Math.floor(Math.random() * viral.length)];
};
