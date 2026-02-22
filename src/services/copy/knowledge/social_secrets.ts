import { KnowledgeEntry } from '../types';

export const SOCIAL_SECRETS_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'ss-titoli-estremi',
    title: 'Titoli Estremi e Polarizzanti',
    content: `Più è estrema la tua opinione/promessa nel titolo, più alto sarà il CTR. Non dire "un esercizio per il mal di schiena" ma "L'esercizio per il mal di schiena che ha salvato la vita a 1 milione di persone". Usa parole FORTI, sii polarizzante. Il titolo deve essere breve (sotto 50 caratteri), così interessante che le persone DEVONO cliccare. Esempio: non "ho curato migliaia di pazienti" ma "Come curo 4.276 pazienti al mese". I numeri specifici ispirano fiducia e sembrano più reali.`,
    category: 'viral',
    tags: ['titoli', 'CTR', 'polarizzazione', 'numeri specifici', 'hook'],
    examples: [
      '"L\'uomo che ha ROTTO la fisioterapia" — forte, inusuale, incuriosisce',
      '"Come perdere 2,73 chili al mese" invece di "Come perdere 3 chili al mese"',
      '"Il segreto delle persone che vivono 110 anni da fare da casa con 1 minuto al giorno"',
      '"L\'acqua panna è la peggiore che abbia mai bevuto nella mia vita" — opinione estrema'
    ],
    effectiveness_rating: 9.5,
    psychological_triggers: ['curiosità', 'specificità', 'polarizzazione', 'FOMO'],
    frameworks_used: ['MrBeast Formula', 'Trump Communication Style', 'Extreme Promise']
  },
  {
    id: 'ss-primi-5-secondi',
    title: 'I Primi 5 Secondi Valgono Come Copertina',
    content: `Con l'autoplay su tutte le piattaforme, i primi 5 secondi sono la vera copertina del video. Devi VISUALMENTE convincere a cliccare anche senza audio. Come esercizio: guarda il video senza audio e poi ascoltalo senza guardare — deve tenere l'attenzione in entrambi i casi. Nei primi secondi devi rispettare le aspettative create dal titolo e poi SUPERARLE. Non perdere tempo con introduzioni generiche. Vai dritto al punto con tensione e curiosità.`,
    category: 'viral',
    tags: ['intro', 'hook', 'primi secondi', 'autoplay', 'retention'],
    examples: [
      '"Ho legato un agente dell\'FBI, ho 100.000 dollari in questa borsa, questo è un coltello, buona fortuna" — MrBeast intro',
      'Mostra fisicamente il format nel primo frame degli shorts',
      'Non "grazie a tutti" ma "Boom! Un\'esplosione della madonna, erano le 5 del mattino..."'
    ],
    effectiveness_rating: 9.8,
    psychological_triggers: ['curiosità istantanea', 'shock', 'tensione', 'visual impact'],
    frameworks_used: ['Autoplay Optimization', 'MrBeast Hook Formula']
  },
  {
    id: 'ss-rispetta-aspettative',
    title: 'Rispetta e Supera le Aspettative',
    content: `Il titolo e la copertina settano le aspettative. Nei primi secondi DEVI assicurarti che vengano rispettate, altrimenti le persone escono. Se il titolo è "Luca è una truffa" e inizi parlando di altro, perdi tutti. Se inizi con "Luca è una truffa e ti spiego perché" rispetti le aspettative. Non bruciare la reputazione con clickbait non mantenuto. Più è estrema la promessa nel titolo, più estremo devi essere nel video. Una volta che rispetti le aspettative, devi SUPERARLE — far scoppiare la testa agli spettatori.`,
    category: 'storytelling',
    tags: ['aspettative', 'drop-off', 'retention', 'promessa', 'fiducia'],
    examples: [
      'Titolo "Luca è una truffa" → Inizio: inquadra un tizio legato con cassaforte vuota dietro',
      'Vuoi che pensino "oh aspetta, questo sembra interessante"',
      'Il 15% in più di persone trattenute all\'inizio può fare la differenza tra 2M e 10M views'
    ],
    effectiveness_rating: 9.0,
    psychological_triggers: ['fiducia', 'coerenza', 'sorpresa positiva'],
    frameworks_used: ['Promise-Delivery Framework', 'Retention Optimization']
  },
  {
    id: 'ss-qualita-vs-quantita',
    title: 'Qualità Batte Quantità — Sempre',
    content: `Meglio caricare la metà dei video ma farli così FOTTUTAMENTE BUONI che l'algoritmo deve promuoverli. L'algoritmo riflette quello che le persone vogliono. Ogni volta che usi la parola "algoritmo" sostituiscila con "pubblico". "Al pubblico non è piaciuto quel video" — semplicemente è questo. Essere nella media è la cosa peggiore. Fai 100 video, migliora una cosa ogni volta. I top creators spendono 50-60 ore per un video di 10-15 minuti.`,
    category: 'fundamentals',
    tags: ['qualità', 'algoritmo', 'miglioramento continuo', 'mentalità'],
    examples: [
      'Scrivi 12 intro diverse, registrale, studiale e scegli la migliore',
      'Crea e testa 100 copertine per vedere quale funziona di più',
      'Dedica 20 ore ai primi 15 secondi del video',
      'Fai vedere il video a 10 persone critiche e "rosolalo" — aggiustalo ogni volta'
    ],
    effectiveness_rating: 9.2,
    psychological_triggers: ['disciplina', 'eccellenza', 'effetto composto'],
    frameworks_used: ['Continuous Improvement', 'Pareto Principle']
  },
  {
    id: 'ss-una-sola-cta',
    title: 'Solo Una Call-To-Action Alla Volta',
    content: `"Una mente confusa non compra". Non chiedere di mettere like, commentare, condividere E prenotare. Invece: se vuoi che prenotino → chiedi solo di prenotare. Se vuoi che scrivano su WhatsApp → chiedi solo quello. Se vuoi che condividano → chiedi solo quello. Decidi tu così non devono farlo loro. Questo vale per ogni contenuto: una sola azione chiara.`,
    category: 'sales',
    tags: ['CTA', 'conversione', 'semplicità', 'decisione'],
    examples: [
      'Non: "Metti like, commenta, condividi e prenota" → Nessuno farà nulla',
      'Sì: "Scrivi CERVICALE nei commenti e ti mando la guida"',
      'Sì: "Prenota la tua prima visita dal link in bio"'
    ],
    effectiveness_rating: 9.0,
    psychological_triggers: ['semplicità', 'chiarezza', 'riduzione attrito'],
    frameworks_used: ['Single CTA Principle', 'Paradox of Choice']
  },
  {
    id: 'ss-nicchia-comunicazione-ampia',
    title: 'Contenuto di Nicchia con Comunicazione per Tutti',
    content: `Fai un video che può guardare tua madre, un bambino, un quindicenne, un fisioterapista con 50 anni di esperienza. Passa da "Come si fa" a "Come faccio io" — quando parli della TUA esperienza nessuno può metterti in discussione. Non "Questo è il miglior esercizio per la cervicale" ma "Questo è l'esercizio che faccio fare più spesso ai miei pazienti con cervicalgia". Domina il tuo micro-territorio prima: dalla pozzanghera (mal di schiena nella tua città) allo stagno, al lago, all'oceano.`,
    category: 'fundamentals',
    tags: ['nicchia', 'posizionamento', 'autorevolezza', 'esperienza personale'],
    examples: [
      '"Come ho portato un paziente con ernia lombare a tornare a correre"',
      '"Come organizzo la prima visita nel mio poliambulatorio"',
      '"Il mio modo preferito per valutare una spalla dolorosa"',
      'Diventa il punto di riferimento per il mal di schiena a [tua città]'
    ],
    effectiveness_rating: 9.3,
    psychological_triggers: ['autorevolezza', 'specificità', 'prova sociale indiretta'],
    frameworks_used: ['Puddle-Pond-Lake-Ocean', 'Experience vs Theory Framework']
  },
  {
    id: 'ss-storytelling-nolan',
    title: 'Storytelling Non Lineare alla Christopher Nolan',
    content: `Parti dal centro della storia, non dall'inizio cronologico. Intreccia linee temporali diverse per mantenere mistero e curiosità. Affianca momenti piatti con momenti alti di un'altra linea narrativa. Usa oggetti ricorrenti per creare risonanza emotiva (come la girandola di Inception). Apri loop narrativi che tengono le persone in suspense. Esempio per fisioterapia: monta la storia di un paziente intrecciando allenamento, momenti di dolore e guarigione senza seguire l'ordine cronologico.`,
    category: 'storytelling',
    tags: ['storytelling non lineare', 'Nolan', 'loop aperti', 'suspense', 'montaggio'],
    examples: [
      'Inizia dal momento più intenso, poi ricostruisci la storia',
      'Intreccia la storia del paziente con flashback del suo dolore iniziale',
      'Usa oggetti simbolo: il tutore, la stampella, le scarpe da corsa',
      '"Intrigali e confondili, tenendoli in suspense ed aprendo loop"'
    ],
    effectiveness_rating: 8.5,
    psychological_triggers: ['curiosità', 'suspense', 'pattern interrupt', 'mistero'],
    frameworks_used: ['Non-Linear Timeline', 'Nolan Interleaving', 'Open Loop']
  },
  {
    id: 'ss-brand-recognition',
    title: 'Riconoscimento Istantaneo del Brand',
    content: `Trova una grafica che funziona e poi cambia solo un elemento ogni volta (come le facce dei pazienti). Lo stile delle scritte e degli elementi deve essere coerente in modo che le persone ti riconoscano ISTANTANEAMENTE mentre scrollano. Usa parole FORTI nei titoli e nelle copertine. Non stare "al tuo posto" — scegli se essere la persona dietro la linea o quella sul piedistallo. Brandizza con oggetti ricorrenti: dal sigaro agli orologi, dalla scorza di limone al gioco della dama.`,
    category: 'fundamentals',
    tags: ['brand', 'riconoscibilità', 'grafica coerente', 'identità visiva'],
    examples: [
      'Stessa grafica, cambio solo la faccia del paziente e il testo',
      'Colori fissi del brand in ogni slide/copertina',
      'Usa un oggetto simbolo ricorrente nei tuoi contenuti'
    ],
    effectiveness_rating: 8.8,
    psychological_triggers: ['familiarità', 'fiducia', 'consistenza'],
    frameworks_used: ['Brand Recognition Framework', 'Visual Consistency']
  },
  {
    id: 'ss-contenuti-ripetizione',
    title: 'La Ripetizione Crea Autorevolezza',
    content: `Abbiamo bisogno di essere ricordati più di quanto abbiamo bisogno di essere istruiti. Se pubblichi ogni settimana contenuti sul mal di schiena, una persona su cinque non sa nemmeno che ti occupi principalmente di quello. Continua a ripetere i concetti chiave. Ti annoierai dei tuoi contenuti molto prima che il tuo pubblico li abbia davvero assorbiti. Ripetizione = autorevolezza. Il 78% dei clienti consuma almeno 2 contenuti long-form prima di prenotare.`,
    category: 'fundamentals',
    tags: ['ripetizione', 'autorevolezza', 'contenuto gratuito', 'fiducia'],
    examples: [
      'Ripeti: "La risonanza non sempre spiega il dolore"',
      'Ripeti: "Il dolore non è uguale al danno"',
      'Salva i tuoi "greatest hits" e rimettili all\'infinito',
      'Il contenuto gratuito migliora i risultati di TUTTI i tuoi metodi pubblicitari'
    ],
    effectiveness_rating: 8.7,
    psychological_triggers: ['familiarità', 'mere exposure effect', 'fiducia progressiva'],
    frameworks_used: ['Repetition Authority', 'Content Flywheel']
  },
  {
    id: 'ss-shorts-algorithm',
    title: 'Algoritmo Shorts e Contenuti Brevi',
    content: `Quando lanci uno short, l'algoritmo lo mostra a ~100 persone. Se viene condiviso abbastanza, lo mostra a 1000, poi 10k, poi 50k e così via. Il primo frame è la copertina! Pensa agli shorts come intro con un finale. Inizia gli shorts con "Tu" o "Questo ragazzo" — es: "questo ragazzo crea vestiti che crescono con te...". Font consigliati: FUTURA (classico, usato da Supreme/Nike), FOREVER FREEDOM (alto e grasso per verticale).`,
    category: 'viral',
    tags: ['shorts', 'reels', 'algoritmo', 'formato verticale', 'font'],
    examples: [
      '"Questo ragazzo crea vestiti che crescono con te..."',
      'Il primo frame deve convincere a rimanere',
      'Usa le intro dei video lunghi come shorts separati'
    ],
    effectiveness_rating: 8.9,
    psychological_triggers: ['curiosità immediata', 'pattern sociale', 'FOMO'],
    frameworks_used: ['Shorts Algorithm Cascade', 'First Frame Hook']
  },
  {
    id: 'ss-idee-virali',
    title: 'Come Trovare Idee Virali Infinite',
    content: `Trova i tuoi 5-6 video con risultati "anomali" e fanne una serie. Cerca tra i competitor i video più virali e adattali. Trova idee "oceano blu" — originali e diverse. Guarda video virali in nicchie diverse dalla tua e combina quelle idee con la tua nicchia. Non copiare mai: vedi cosa funziona, studia perché funziona, prendi spunto e fai 100 volte meglio. Fai una lista con punteggio delle idee: "Questo video può fare 1 milione di views?" Se non può, perché registrarlo?`,
    category: 'viral',
    tags: ['idee', 'viralità', 'oceano blu', 'competitor analysis', 'originalità'],
    examples: [
      'Usa ChatGPT: "Dammi 30 credenze comuni sbagliate sul mal di schiena"',
      'Combina nicchie diverse: ingegneria + fisioterapia = contenuto unico',
      'Cavalca i trend del momento creando contenuti il giorno stesso',
      'Scrivi 100 idee e scegli la MIGLIORE, non la più facile'
    ],
    effectiveness_rating: 9.0,
    psychological_triggers: ['novità', 'sorpresa', 'curiosità cross-nicchia'],
    frameworks_used: ['Blue Ocean Ideas', 'Cross-Niche Hybrid', 'Trend Riding']
  }
];
