
import { KnowledgeEntry } from '../types';

export const HORMOZI_HOOKS_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'hormozi-hook-types',
    title: 'I 7 Tipi di Hook di Alex Hormozi ($100M Hooks)',
    content: `Alex Hormozi ha identificato 7 categorie di hook che funzionano SEMPRE:
1) LABELS - Chiami direttamente il tuo avatar ("Fisioterapisti, ho un regalo per voi")
2) DOMANDE SÌ - Domande dove la risposta è sempre sì ("Vorresti eliminare il mal di schiena in 3 sedute?")
3) DOMANDE APERTE - Creano curiosità ("Quale preferiresti essere?")
4) CONDIZIONALI - Se X allora Y ("Se lavori tutto il giorno e il tuo studio non cresce, stai lavorando sulle cose sbagliate")
5) COMANDI - Ordini diretti ("Leggi questo se sei stanco di pazienti che non tornano")
6) AFFERMAZIONI - Statement audaci ("La cosa più intelligente che puoi fare oggi...")
7) STORIE - Aneddoti avvincenti ("Un giorno ero nel mio studio e arriva questo paziente furioso...")
L'hook determina l'80% del successo del contenuto. Spendi 8 ore su 10 sull'hook.`,
    category: 'hooks-advanced',
    tags: ['hormozi', 'hooks', 'attenzione', 'scroll-stopper'],
    examples: [
      'LABEL: "Titolari di studi medici, devo dirvi una cosa..."',
      'DOMANDA SÌ: "Pagheresti 100€ per avere lo studio dei tuoi sogni in 30 giorni?"',
      'CONDIZIONALE: "Se i tuoi pazienti non tornano dopo la prima seduta, stai facendo questo errore"',
      'COMANDO: "Smetti di fare questo errore con i tuoi pazienti"',
      'AFFERMAZIONE: "Ho aiutato 500 studi a triplicare i pazienti. Ecco come..."',
      'STORIA: "2 anni fa stavo per chiudere il mio studio. Poi ho scoperto questo..."',
      'LISTA: "In questo post ti mostro i 7 errori che ti fanno perdere pazienti ogni settimana"'
    ],
    effectiveness_rating: 99
  },
  {
    id: 'hormozi-70-20-10',
    title: 'Regola 70-20-10 per Hooks (Google Innovation Rule)',
    content: `La regola 70-20-10 di Hormozi per creare hook:
70% CORE - Riusa i tuoi hook migliori già provati. Copia te stesso. Stabilizza la performance.
20% EMERGING - Modella hook vincenti di altri nicchie. "Winner Adjacent". Prendi formule virali e adattale.
10% EXPERIMENTAL - Prova cose completamente nuove. Se vincono, vanno nel 70%. Se perdono, documenta.
Formula: "USE THIS [X] FORMULA TO [Y]" - Hook virale cross-nicchia.
Tieni uno spreadsheet con: Nome, Hook, Views, Link per ogni piattaforma.`,
    category: 'hook-strategy',
    tags: ['hormozi', 'strategia', 'testing', 'ottimizzazione'],
    examples: [
      '70%: Riusa "Il metodo che ha cambiato tutto per 500 studi" (già provato)',
      '20%: Adatta "You\'re Not X: My System for Y" → "Non sei in ritardo: il mio sistema per superare tutti"',
      '10%: Prova un hook completamente nuovo e traccia i risultati'
    ],
    effectiveness_rating: 95
  },
  {
    id: 'hormozi-best-hooks-ads',
    title: 'I Migliori Hook di Hormozi per Ads',
    content: `Top hook testati da Hormozi che hanno generato milioni in vendite:
- "Domanda veloce… Posso avere la tua attenzione per 30 secondi?"
- "Le voci sono vere…"
- "Ho una confessione…"
- "Questo è [oggetto banale]… e non ti farò pagare neanche questo per [risultato incredibile]"
- "Ti sei mai chiesto se stai lavorando sulle cose sbagliate?"
- "Leggi questo se vuoi vincere"
- "Come superare il 99% delle persone"
- "La cosa più intelligente che puoi fare oggi"
- "L'ho scritto per te"
- "Per le persone che vogliono smettere di lavorare un giorno"`,
    category: 'hooks-proven',
    tags: ['hormozi', 'ads', 'proven', 'high-converting'],
    examples: [
      '"Domanda veloce… Posso mostrarti come [risultato] in [tempo]?"',
      '"Le voci sono vere… [affermazione audace sul tuo settore]"',
      '"Ho una confessione… Sono stufo di vedere [problema del settore]"',
      '"Questo è un [oggetto da 1€]… e non ti farò pagare neanche questo per [trasformazione]"'
    ],
    effectiveness_rating: 98
  },
  {
    id: 'hormozi-best-hooks-content',
    title: 'Hook Virali di Hormozi per Content',
    content: `Hook che hanno generato milioni di views su YouTube e Instagram:
- "Volete sentire una cosa completamente assurda?"
- "Ahhhhh… Questo è il blueprint per diventare [risultato] e vi guiderò passo passo"
- "Ho [X] anni di esperienza. Ho venduto [X] aziende. Vi comprimo tutto in questo post"
- "In questo post vi parlo dei [numero] modi per restare [stato negativo]"
- "Una persona su [numero] riesce a [risultato]. Ecco come farne parte"
- "I miei primi [numero] tentativi non hanno portato a niente. [Numero]."
- "Se puoi essere di cattivo umore senza motivo, puoi anche essere di buon umore senza motivo"
- "Le persone povere restano povere perché hanno paura che altri poveri li giudichino per voler diventare ricchi"`,
    category: 'hooks-content',
    tags: ['hormozi', 'content', 'youtube', 'instagram', 'viral'],
    examples: [
      '"Volete sentire una cosa assurda sul vostro settore?"',
      '"Ho trattato 10.000 pazienti in 15 anni. Vi comprimo tutto in questo post"',
      '"I 7 modi per restare uno studio mediocre (e come evitarli)"',
      '"Il mio primo studio era un disastro. Il primo."'
    ],
    effectiveness_rating: 97
  },
  {
    id: 'hormozi-best-hooks-email',
    title: 'Hook Email Top-Performing di Hormozi',
    content: `Subject line che hanno generato i migliori tassi di apertura:
- "SHHHHH È una SORPRESA!!"
- "A proposito… (ho un favore da chiederti)"
- "Hop on" (ultra-breve)
- "Rivelato: Il mio metodo Whisper-Tease-Shout"
- "1 settimana (avviso dentro)"
- "Abbiamo fatto un errore"
- "Grazie (ecco un invito privato)"
- "Apri solo se hai [condizione] e vuoi [risultato]"
- "Il regalo dalla cassaforte di [brand]"
- "Perché tu [azione appena fatta]"
Formula: Subject corte (3-5 parole), curiosità + esclusività, parentetiche misteriose.`,
    category: 'hooks-email',
    tags: ['hormozi', 'email', 'subject-line', 'apertura'],
    examples: [
      '"A proposito… (devo dirti una cosa)"',
      '"Abbiamo fatto un errore (e ne benefici tu)"',
      '"Apri solo se vuoi più pazienti questo mese"',
      '"Il segreto dalla cassaforte di [nome studio]"'
    ],
    effectiveness_rating: 94
  },
  {
    id: 'hormozi-twitter-outliers',
    title: 'Hook Twitter/X Outlier di Hormozi',
    content: `I post più virali di Hormozi su Twitter/X - formule replicabili:
- "I vincenti si definiscono per quello che hanno fatto accadere. Le vittime per quello che è successo a loro. Scegli tu."
- "Tutti vogliono la vista dalla cima, ma nessuno vuole la scalata."
- "I perdenti diventano vincenti riprovando."
- "Devi solo essere disposto a sembrare un idiota mentre capisci come funziona."
- "O cresci nel tuo potenziale o continui a vivere gli stessi 6 mesi all'infinito."
- "Giovinezza, Tempo libero, Soldi. Scegline due."
- "Prima accetti che tutto è colpa tua, prima puoi farci qualcosa."
Formula: VERITÀ SCOMODA + CONTRASTO + SCELTA BINARIA`,
    category: 'hooks-twitter',
    tags: ['hormozi', 'twitter', 'viral', 'one-liner'],
    examples: [
      '"I professionisti mediocri si lamentano del mercato. I top player creano il loro mercato."',
      '"Tutti vogliono più pazienti. Nessuno vuole diventare bravo abbastanza da meritarseli."',
      '"Smetti di cercare il momento giusto. Il momento giusto era ieri. Il secondo momento migliore è adesso."'
    ],
    effectiveness_rating: 96
  }
];
