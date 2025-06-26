
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
  }
];

export const getKnowledgeByCategory = (category?: string): KnowledgeEntry[] => {
  if (!category) return KNOWLEDGE_BASE;
  return KNOWLEDGE_BASE.filter(k => k.category === category);
};
