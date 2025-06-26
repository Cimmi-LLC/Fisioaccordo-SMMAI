
import { KnowledgeEntry } from './types';

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: 'hook-psychology',
    title: 'Psicologia degli Hook Vincenti',
    content: 'Un hook efficace deve attivare almeno 3 trigger psicologici: curiosità, urgenza e rilevanza personale. La formula segreta è: PROBLEMA + PROMESSA + PROVA in 10 parole o meno.',
    category: 'hook-strategies',
    tags: ['psicologia', 'hook', 'attenzione', 'curiosità'],
    examples: [
      '🚨 ATTENZIONE: Se soffri di mal di schiena, questo post può cambiarti la vita!',
      '❌ ERRORE: Il 90% delle diete fallisce per questo motivo nascosto...',
      '💡 SCOPERTA: Il segreto che i nutrizionisti non vogliono che tu sappia'
    ],
    effectiveness_rating: 95
  },
  {
    id: 'storytelling-framework',
    title: 'Framework di Storytelling Virale',
    content: 'Usa la struttura: AGGANCIO → CONFLITTO → LOTTA → RISOLUZIONE → LEZIONE. Ogni storia deve avere un momento di "tutto sembrava perduto" seguito da una svolta drammatica.',
    category: 'storytelling',
    tags: ['storytelling', 'engagement', 'emozioni', 'struttura'],
    examples: [
      'Tre anni fa ero sul punto di chiudere la mia azienda...',
      'Il dottore mi disse che non c\'era più niente da fare...',
      'Quella notte ho preso la decisione che ha cambiato tutto...'
    ],
    effectiveness_rating: 92
  },
  {
    id: 'cta-conversion',
    title: 'CTA ad Alta Conversione',
    content: 'Le CTA migliori combinano: urgenza temporale + beneficio specifico + barriera bassa. Mai usare "clicca qui" - sempre usare verbi d\'azione con beneficio.',
    category: 'conversion',
    tags: ['cta', 'conversione', 'azione', 'urgenza'],
    examples: [
      'Prenota la tua consulenza GRATUITA (ultimi 3 posti)',
      'Scarica la guida PRIMA che sparisca',
      'Inizia la trasformazione OGGI (5 minuti)'
    ],
    effectiveness_rating: 88
  },
  // NUOVE CONOSCENZE VIRALI
  {
    id: 'viral-psychology',
    title: 'Psicologia dei Contenuti Virali',
    content: 'I contenuti virali attivano 6 emozioni primarie: rabbia, disgusto, paura, gioia, tristezza, sorpresa. La combinazione vincente è: SORPRESA + UTILITÀ + URGENZA. Il 80% dei contenuti virali usa la "controversia costruttiva".',
    category: 'viral-psychology',
    tags: ['viralità', 'emozioni', 'psicologia', 'engagement'],
    examples: [
      '🔥 OPINIONE IMPOPOLARE: I personal trainer vi mentono su questo...',
      '😱 SCIOCCANTE: Ho provato la dieta di tutti i CEO per 30 giorni...',
      '💣 NESSUNO NE PARLA: La verità sui corsi online da 2000€...'
    ],
    effectiveness_rating: 98
  },
  {
    id: 'viral-timing',
    title: 'Timing Perfetto per la Viralità',
    content: 'I contenuti virali seguono il "ciclo delle 72 ore": Prime 2 ore = engagement iniziale, Prime 24 ore = algoritmo decide, Prime 72 ore = picco virale. Pubblica quando il tuo pubblico è più attivo emotivamente.',
    category: 'viral-timing',
    tags: ['timing', 'algoritmo', 'viralità', 'engagement'],
    examples: [
      'Lunedì mattina: contenuti motivazionali',
      'Mercoledì sera: controversie e dibattiti',
      'Venerdì pomeriggio: contenuti leggeri e divertenti'
    ],
    effectiveness_rating: 85
  },
  {
    id: 'viral-formats',
    title: 'Format Virali che Funzionano Sempre',
    content: 'I 5 format più virali: 1) Lista numerata con twist, 2) Prima/Dopo drammatico, 3) Dietro le quinte shocking, 4) Predizione realizzata, 5) Errore costoso condiviso. Ogni format deve avere un "momento WOW".',
    category: 'viral-formats',
    tags: ['format', 'struttura', 'viralità', 'pattern'],
    examples: [
      '7 cose che ho imparato perdendo 100k€ in 6 mesi',
      'Da 0 a 1M followers: la strategia che nessuno usa',
      'Ho lavorato gratis per 50 influencer. Ecco cosa ho scoperto'
    ],
    effectiveness_rating: 94
  },
  {
    id: 'controversy-strategy',
    title: 'Strategia della Controversia Costruttiva',
    content: 'La controversia costruttiva genera 300% più engagement. Formula: OPINIONE FORTE + DATI A SUPPORTO + BENEFICIO PER CHI LEGGE. Mai attaccare persone, sempre criticare idee o sistemi.',
    category: 'controversy',
    tags: ['controversia', 'engagement', 'dibattito', 'opinioni'],
    examples: [
      'I corsi online sono una truffa (ecco perché e come evitarla)',
      'Il fitness tradizionale è morto (e questa è la nuova via)',
      'LinkedIn è diventato Facebook (e non è una buona cosa)'
    ],
    effectiveness_rating: 96
  },
  {
    id: 'engagement-hacks',
    title: 'Hack per Engagement Esplosivo',
    content: 'I contenuti più coinvolgenti usano il "cliffhanger threading": ogni paragrafo finisce con una promessa per il prossimo. Usa "thread" e "continua sotto" per creare dipendenza da lettura.',
    category: 'engagement',
    tags: ['engagement', 'threading', 'curiosità', 'retention'],
    examples: [
      'Ma il vero shock arriva nel punto 3...',
      'Quello che è successo dopo mi ha cambiato la vita (thread)',
      'La parte peggiore deve ancora arrivare...'
    ],
    effectiveness_rating: 91
  }
];

export const getKnowledgeByCategory = (category?: string): KnowledgeEntry[] => {
  if (!category) return KNOWLEDGE_BASE;
  return KNOWLEDGE_BASE.filter(k => k.category === category);
};
