
import { AudienceProfile } from './types';

export const generateFallbackProfessionalCopy = (originalText: string, audience?: AudienceProfile): string => {
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

export const extractTopicFromText = (text: string): string => {
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
