
import { CopyTemplate } from './types';

export const ADVANCED_TEMPLATES: CopyTemplate[] = [
  {
    id: 'truth-reveal',
    name: 'Rivelazione della Verità',
    category: 'hook',
    template: '🚨 VERITÀ SCIOCCANTE: La maggior parte delle persone con {problema} non sa che {verità_nascosta}. Ecco cosa {autorità} non ti dice mai...',
    variables: ['problema', 'verità_nascosta', 'autorità'],
    description: 'Hook potentissimo che crea curiosità e autorità',
    effectiveness_score: 95,
    use_cases: ['salute', 'business', 'relazioni', 'finanza']
  },
  {
    id: 'mistake-pattern',
    name: 'Pattern degli Errori',
    category: 'hook',
    template: '❌ ERRORE FATALE: Se hai {problema}, probabilmente stai commettendo questi 3 errori che peggiorano tutto. Errore #1: {errore_comune}...',
    variables: ['problema', 'errore_comune'],
    description: 'Pattern che identifica errori comuni e crea urgenza',
    effectiveness_score: 92,
    use_cases: ['educativo', 'problem-solving', 'guide']
  },
  {
    id: 'transformation-story',
    name: 'Storia di Trasformazione',
    category: 'storytelling',
    template: 'Da {situazione_prima} a {risultato_dopo} in soli {tempo}. Ecco esattamente cosa ho fatto (e cosa NON devi mai fare)...',
    variables: ['situazione_prima', 'risultato_dopo', 'tempo'],
    description: 'Storytelling potente con trasformazione credibile',
    effectiveness_score: 88,
    use_cases: ['testimonial', 'case-study', 'motivazionale']
  },
  {
    id: 'urgency-scarcity',
    name: 'Urgenza + Scarsità',
    category: 'cta',
    template: '⏰ ULTIMO GIORNO: Solo {numero} posti rimasti per {offerta}. Dopo mezzanotte il prezzo raddoppia. Non dire che non ti avevo avvisato...',
    variables: ['numero', 'offerta'],
    description: 'CTA con urgenza e scarsità psicologica',
    effectiveness_score: 85,
    use_cases: ['vendita', 'promozioni', 'eventi']
  },
  {
    id: 'social-proof-authority',
    name: 'Prova Sociale + Autorità',
    category: 'social-proof',
    template: '{numero_clienti}+ persone hanno già risolto {problema} con questo metodo. Anche {autorità_famosa} lo raccomanda. Vuoi essere il prossimo?',
    variables: ['numero_clienti', 'problema', 'autorità_famosa'],
    description: 'Combina numeri impressionanti con autorità riconosciuta',
    effectiveness_score: 90,
    use_cases: ['vendita', 'credibilità', 'conversione']
  }
];

export const getTemplatesByCategory = (category?: string): CopyTemplate[] => {
  if (!category) return ADVANCED_TEMPLATES;
  return ADVANCED_TEMPLATES.filter(t => t.category === category);
};
