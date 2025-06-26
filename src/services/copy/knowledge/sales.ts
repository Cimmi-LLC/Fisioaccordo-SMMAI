
import { KnowledgeEntry } from '../types';

export const SALES_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'objection-handling',
    title: 'Gestione Obiezioni Preventiva',
    content: 'Le obiezioni vanno neutralizzate PRIMA che nascano nella mente del prospect. Tecnica ACDC: 1) ACKNOWLEDGE (riconosci l\'obiezione), 2) CLARIFY (chiarisci il malinteso), 3) DEMONSTRATE (dimostra il contrario), 4) CONFIRM (chiedi conferma). Le 5 obiezioni universali: tempo, soldi, funziona?, per me?, momento giusto?',
    category: 'objection-handling',
    tags: ['obiezioni', 'vendita', 'resistenze', 'persuasione'],
    examples: [
      '"So cosa stai pensando: "Un altro corso che promette miracoli." Hai ragione a essere scettico..."',
      '"Non hai tempo? Ti capisco. Anch\'io lavoravo 80 ore a settimana. Per questo il sistema richiede solo 20 minuti al giorno..."',
      '"Troppo costoso? Considera che il tuo problema ti sta già costando 10x di più ogni mese..."'
    ],
    effectiveness_rating: 89
  }
];
