
import { KnowledgeEntry } from '../types';

export const FRAMEWORKS_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'pas-framework',
    title: 'Framework PAS (Problem-Agitate-Solve)',
    content: 'Il framework PAS è la spina dorsale del copywriting persuasivo: 1) PROBLEM - Identifica il dolore specifico, 2) AGITATE - Amplifica le conseguenze negative, 3) SOLVE - Presenta la soluzione come salvezza. Funziona perché il cervello umano è programmato per evitare il dolore più che per cercare il piacere.',
    category: 'frameworks',
    tags: ['pas', 'framework', 'struttura', 'persuasione'],
    examples: [
      'PROBLEM: "Ti svegli ogni mattina con mal di schiena lancinante..."',
      'AGITATE: "...e ogni giorno che passa il dolore peggiora, limitando la tua vita..."',
      'SOLVE: "...finalmente esiste una soluzione scientifica che elimina il problema alla radice"'
    ],
    effectiveness_rating: 97
  },
  {
    id: 'before-after-bridge',
    title: 'Framework Before-After-Bridge',
    content: 'BAB è il framework preferito dai top copywriter: BEFORE (situazione attuale problematica), AFTER (visione del futuro desiderato), BRIDGE (il prodotto/servizio come ponte). Crea desiderio intenso mostrando il contrasto drammatico tra presente e futuro possibile.',
    category: 'frameworks',
    tags: ['bab', 'framework', 'desiderio', 'visione'],
    examples: [
      'BEFORE: "Lavori 12 ore al giorno per 2000€ al mese..."',
      'AFTER: "...immagina di guadagnare 10.000€ lavorando solo 4 ore al giorno..."',
      'BRIDGE: "...questo corso ti mostra esattamente come fare il salto"'
    ],
    effectiveness_rating: 95
  }
];
