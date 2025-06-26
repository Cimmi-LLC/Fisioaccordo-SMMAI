
import { KnowledgeEntry } from '../types';

export const FUNDAMENTALS_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'cialdini-principles',
    title: 'I 6 Principi di Persuasione di Cialdini',
    content: 'Robert Cialdini ha identificato 6 leve psicologiche universali: Reciprocità (dare prima di ricevere), Impegno/Coerenza (le persone vogliono essere coerenti), Riprova Sociale (seguiamo gli altri), Simpatia (compriamo da chi ci piace), Autorità (seguiamo gli esperti), Scarsità (desideriamo ciò che è raro). Ogni copy vincente deve attivare almeno 3 di questi principi.',
    category: 'psychology-fundamentals',
    tags: ['cialdini', 'persuasione', 'psicologia', 'fondamenti'],
    examples: [
      'RECIPROCITÀ: "Ti regalo questa guida da 97€ completamente GRATIS"',
      'RIPROVA SOCIALE: "Oltre 50.000 imprenditori hanno già trasformato il loro business"',
      'SCARSITÀ: "Solo 48 ore rimaste - dopo sparisce per sempre"'
    ],
    effectiveness_rating: 98
  },
  {
    id: 'schwartz-levels-awareness',
    title: 'I 5 Livelli di Consapevolezza di Eugene Schwartz',
    content: 'Eugene Schwartz ha mappato 5 livelli di consapevolezza del cliente: 1) Inconsapevole del problema, 2) Consapevole del problema, 3) Consapevole della soluzione, 4) Consapevole del prodotto, 5) Pronto all\'acquisto. Ogni livello richiede un approccio copywriting completamente diverso.',
    category: 'customer-psychology',
    tags: ['schwartz', 'awareness', 'customer-journey', 'targeting'],
    examples: [
      'LIVELLO 1: "Perché ti svegli sempre stanco anche dopo 8 ore di sonno?"',
      'LIVELLO 3: "Hai provato di tutto per dormire meglio ma niente funziona?"',
      'LIVELLO 5: "Clicca qui per ordinare il Materasso Perfetto con 30% di sconto"'
    ],
    effectiveness_rating: 96
  },
  {
    id: 'ogilvy-headlines',
    title: 'Le Formula per Headline di David Ogilvy',
    content: 'David Ogilvy ha creato le formule più potenti per headline: "Come fare X senza Y", "Il segreto di X", "X modi per Y", "Finalmente! X che funziona davvero", "Attenzione: non fare X finché non leggi questo". Le headline determinano l\'80% del successo di un copy.',
    category: 'headline-mastery',
    tags: ['ogilvy', 'headline', 'hook', 'attention'],
    examples: [
      '"Come guadagnare 10.000€ al mese senza lavorare 80 ore a settimana"',
      '"Il segreto che i guru del marketing non vogliono che tu sappia"',
      '"Attenzione: non investire un euro finché non leggi questa pagina"'
    ],
    effectiveness_rating: 94
  }
];
