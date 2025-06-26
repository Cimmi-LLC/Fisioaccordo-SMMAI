import { KnowledgeEntry } from './types';

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // PRINCIPI FONDAMENTALI DI COPYWRITING PROFESSIONALE
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
  },
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
  },
  // TECNICHE VIRALI AVANZATE
  {
    id: 'mrbeast-retention',
    title: 'Tecniche di Retention di Mr. Beast',
    content: 'Mr. Beast usa tecniche specifiche per mantenere l\'attenzione: 1) Hook ogni 15 secondi, 2) Teaser di quello che sta per succedere, 3) Payoff rapidi ma con promesse ancora più grandi, 4) Cliffhanger continui, 5) Variazioni di ritmo e intensità. Ogni frase deve portare alla successiva.',
    category: 'retention-techniques',
    tags: ['mrbeast', 'retention', 'engagement', 'attention'],
    examples: [
      '"Ma aspetta, quello che succede nel prossimo paragrafo ti scioccherà..."',
      '"E se pensavi che fosse tutto, ti sbagli di grosso..."',
      '"Fra 30 secondi scoprirai il segreto che ha cambiato tutto..."'
    ],
    effectiveness_rating: 99
  },
  {
    id: 'iman-gadzhi-authority',
    title: 'Costruzione di Autorità secondo Iman Gadzhi',
    content: 'Iman costruisce autorità attraverso: 1) Risultati specifici e verificabili, 2) Behind-the-scenes della vita reale, 3) Errori costosi condivisi apertamente, 4) Predictions realizzate, 5) Associazione con altre autorità. L\'autorità si costruisce con trasparenza + risultati + vulnerabilità strategica.',
    category: 'authority-building',
    tags: ['iman-gadzhi', 'autorità', 'credibilità', 'personal-brand'],
    examples: [
      '"A 19 anni ho fatto il mio primo milione. A 20 l\'ho perso tutto. Ecco cosa ho imparato..."',
      '"Ieri ho fatto colazione con il CEO di [azienda famosa]. Mi ha detto una cosa che vi cambierà la vita..."',
      '"2 anni fa ho predetto il crollo di questo mercato. Ecco la mia prossima previsione..."'
    ],
    effectiveness_rating: 96
  },
  {
    id: 'neuromarketing-triggers',
    title: 'Trigger di Neuromarketing Avanzati',
    content: 'Il cervello reagisce a specifici trigger neurali: 1) Numeri dispari (3, 7, 9 sono più credibili), 2) Urgenza temporale specifica, 3) Perdita vs Guadagno (fear of loss è 2x più potente), 4) Novità + Familiarità insieme, 5) Contrasto estremo. Usare max 2-3 trigger per messaggio per evitare sovraccarico.',
    category: 'neuromarketing',
    tags: ['neuroscienze', 'trigger', 'cervello', 'psicologia'],
    examples: [
      'NUMERI DISPARI: "7 segreti che i ricchi non condividono mai"',
      'LOSS AVERSION: "Quello che stai perdendo ogni giorno senza saperlo"',
      'CONTRASTO: "Da fallito totale a milionario in 18 mesi"'
    ],
    effectiveness_rating: 93
  },
  {
    id: 'storytelling-layers',
    title: 'Storytelling Professionale a Più Livelli',
    content: 'Le storie professionali hanno 3 livelli: 1) SURFACE STORY (quello che sembra accadere), 2) EMOTIONAL STORY (il conflitto emotivo), 3) ARCHETYPAL STORY (il viaggio dell\'eroe). Ogni storia deve avere: Setup, Inciting Incident, Rising Action, Climax, Resolution + Lesson. La trasformazione del protagonista = trasformazione del lettore.',
    category: 'storytelling-advanced',
    tags: ['storytelling', 'narrativa', 'emozioni', 'archetipi'],
    examples: [
      'SETUP: "Ero un dipendente qualunque con 30k di debiti..."',
      'CLIMAX: "Quella notte, seduto sul pavimento del bagno, ho preso LA decisione..."',
      'RESOLUTION: "Oggi aiuto 1000+ persone a replicare il mio sistema"'
    ],
    effectiveness_rating: 91
  },
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
