// Professioni sanitarie supportate dal generatore.
//
// Un brand puo dichiarare la propria professione (brands.professione) oppure
// lasciarla rilevare dal codice: dai campi del brand kit (nome, descrizione,
// categorie, servizi, target, temi) e, in mancanza, dal topic del post.
// Ogni professione porta con se il vocabolario per i prompt di copy, la
// scena per le immagini AI, i filtri per lo stock Pixabay e il copy
// segnaposto del Template Genesis.
//
// File specchiato in supabase/functions/_shared/brand/profession.ts: il test
// mirrorSync pretende che le due copie siano byte-identiche. Nessun import,
// cosi gira identico in Vite e in Deno.

export type ProfessionId =
  | 'fisioterapista'
  | 'osteopata'
  | 'poliambulatorio'
  | 'nutrizionista'
  | 'personal_trainer'
  | 'psicologo'
  | 'dentista'
  | 'chiropratico'
  | 'logopedista'
  | 'podologo'
  | 'ostetrica'
  | 'medico_estetico'
  | 'medico'
  | 'altro';

/** Copy segnaposto per il Template Genesis (reso dentro l'immagine). */
export type ProfessionPlaceholderCopy = {
  cover: { kicker: string; title: string };
  content: { number: string; label: string; title: string; body: string };
  cta: { title: string; body: string };
};

export type ProfessionProfile = {
  id: ProfessionId;
  /** Etichetta singolare mostrata nell'interfaccia: "Nutrizionista". */
  label: string;
  /** Plurale per i prompt: "nutrizionisti". */
  labelPlural: string;
  /** Il settore, come lo si nominerebbe in una frase: "nutrizione e alimentazione". */
  settore: string;
  /** Kicker di copertina del template (maiuscolo, breve). */
  kicker: string;
  /** Dove lavora: "studio", "centro", "palestra". */
  luogo: string;
  /** Come chiama la persona che segue: "paziente", "cliente". */
  cliente: string;
  clientePlurale: string;
  /** Radici di parola (regex, case-insensitive) che fanno riconoscere la professione. */
  keywords: Array<{ re: string; peso: number }>;
  /** Categorie proposte nel brand kit. */
  categorie: string[];
  /** Idee rapide mostrate nel generatore. */
  temiEsempio: string[];
  /** Istruzioni di settore per il copywriter AI (vocabolario, temi, limiti deontologici). */
  promptContext: string;
  /** Scena per la fotografia AI delle slide. */
  imageScene: string;
  /** Cosa deve mostrare la scena quando il tema e dato ("il trattamento o la parte del corpo"). */
  imageSubject: string;
  /** Come sono vestite le persone nella scena. */
  imageOutfit: string;
  /** Tag Pixabay che rendono un'immagine pertinente per questa professione. */
  imageWhitelist: string[];
  /** Voci della blacklist stock da riammettere per questa professione. */
  imageUnblacklist: string[];
  /** Ultima query di ripiego per lo stock. */
  stockFallbackQuery: string;
  /** Esempi di keywords_stock per il prompt di copy (gia in forma "slide -> keywords"). */
  keywordExamples: string[];
  placeholder: ProfessionPlaceholderCopy;
};

export const DEFAULT_PROFESSION_ID: ProfessionId = 'fisioterapista';

const CATEGORIE_COMUNI = ['Salute e Benessere', 'Studio Professionale'];

export const PROFESSIONS: ProfessionProfile[] = [
  {
    id: 'fisioterapista',
    label: 'Fisioterapista',
    labelPlural: 'fisioterapisti',
    settore: 'fisioterapia e riabilitazione',
    kicker: 'FISIOTERAPIA',
    luogo: 'studio',
    cliente: 'paziente',
    clientePlurale: 'pazienti',
    keywords: [
      { re: '\\bfisioterap', peso: 3 },
      { re: '\\bfisio\\b', peso: 2 },
      { re: '\\briabilitaz', peso: 2 },
      { re: '\\btecar', peso: 2 },
      { re: '\\bonde d.urto', peso: 2 },
      { re: '\\bposturolog', peso: 1 },
      { re: '\\brieducazione', peso: 1 },
      { re: '\\bterapia manuale', peso: 1 },
      { re: '\\bmal di schiena', peso: 1 },
      { re: '\\bcervical', peso: 1 },
      { re: '\\bphysio', peso: 2 },
    ],
    categorie: ['Fisioterapia', 'Riabilitazione', 'Medicina dello Sport', 'Fisioterapia Pediatrica', 'Fisioterapia in Gravidanza', 'Posturologia'],
    temiEsempio: [
      'Esercizi per il mal di schiena da scrivania',
      'Prevenzione infortuni sportivi',
      'Riabilitazione post-operatoria',
      'Routine di stretching mattutino',
      'Fisioterapia per anziani',
      'Recupero da distorsione alla caviglia',
      'Postura corretta al computer',
      'Benefici della terapia manuale',
    ],
    promptContext:
      'Parla di dolore, movimento, postura, recupero dopo infortuni e interventi, esercizi terapeutici, trattamenti manuali e strumentali. Lessico: valutazione, trattamento, seduta, esercizio, recupero funzionale. Mai promettere guarigioni certe o tempi garantiti.',
    imageScene:
      'centro di fisioterapia e riabilitazione in Italia: lettino, attrezzi riabilitativi, palestra terapeutica, trattamento manuale',
    imageSubject: 'il trattamento o la parte del corpo',
    imageOutfit: 'abbigliamento sportivo neutro o divisa sanitaria semplice',
    imageWhitelist: [],
    imageUnblacklist: [],
    stockFallbackQuery: 'physiotherapy clinic patient',
    keywordExamples: [
      'Slide "prevenzione dolore" -> ["physiotherapy prevention", "spine checkup clinic", "back care specialist"]',
      'Slide "mal di schiena cronico" -> ["chronic back pain office", "lower back pain treatment", "physiotherapist spine therapy"]',
      'Slide "postura corretta" -> ["posture correction therapy", "spine alignment physiotherapy", "posture assessment clinic"]',
      'Slide "esercizi riabilitativi" -> ["rehabilitation exercise clinic", "therapeutic exercise physiotherapy", "guided recovery exercise"]',
      'Slide "ginocchio dello sportivo" -> ["sport knee injury clinic", "knee rehabilitation specialist", "athlete knee therapy"]',
    ],
    placeholder: {
      cover: { kicker: 'FISIOTERAPIA', title: 'PERCHÉ LA SPALLA FA MALE ANCHE DA FERMA' },
      content: {
        number: '02',
        label: 'IL METODO',
        title: 'LA POSTURA NON È LA CAUSA',
        body: 'Il dolore persistente dipende da più fattori che agiscono insieme. Ridurlo a un solo elemento porta a scelte poco efficaci.',
      },
      cta: { title: 'PRENOTA UNA VALUTAZIONE', body: 'Scrivici in direct per parlarne.' },
    },
  },
  {
    id: 'osteopata',
    label: 'Osteopata',
    labelPlural: 'osteopati',
    settore: 'osteopatia',
    kicker: 'OSTEOPATIA',
    luogo: 'studio',
    cliente: 'paziente',
    clientePlurale: 'pazienti',
    keywords: [
      { re: '\\bosteopat', peso: 3 },
      { re: '\\btrattamento osteopatico', peso: 3 },
      { re: '\\bcraniosacral', peso: 2 },
      { re: '\\bviscerale', peso: 1 },
    ],
    categorie: ['Osteopatia', 'Posturologia', 'Osteopatia Pediatrica', 'Osteopatia in Gravidanza'],
    temiEsempio: [
      'Quando andare dall\'osteopata',
      'Mal di testa e tensioni cervicali',
      'Osteopatia per neonati e bambini',
      'Osteopatia in gravidanza',
      'Il corpo come sistema unico',
      'Dolore lombare e stile di vita',
      'Reflusso e tensioni del diaframma',
      'Differenza tra osteopata e fisioterapista',
    ],
    promptContext:
      'Parla di equilibrio globale del corpo, tensioni, mobilità, trattamento manuale dolce, prevenzione. Lessico: trattamento, seduta, valutazione, globalità. Mai presentare l\'osteopatia come cura di malattie né promettere risultati certi.',
    imageScene:
      'studio di osteopatia luminoso e accogliente in Italia: lettino da trattamento, trattamento manuale delicato, ambiente ordinato',
    imageSubject: 'il trattamento manuale o la parte del corpo',
    imageOutfit: 'abbigliamento comodo neutro o polo da professionista',
    imageWhitelist: [],
    imageUnblacklist: [],
    stockFallbackQuery: 'osteopathy manual therapy treatment',
    keywordExamples: [
      'Slide "trattamento osteopatico" -> ["osteopathy manual therapy", "osteopath treatment session", "spine manual treatment"]',
      'Slide "cervicale e mal di testa" -> ["neck manual therapy", "osteopath neck treatment", "tension headache treatment"]',
      'Slide "neonati" -> ["pediatric osteopathy", "baby gentle treatment", "infant osteopath session"]',
    ],
    placeholder: {
      cover: { kicker: 'OSTEOPATIA', title: 'PERCHÉ IL MAL DI TESTA PARTE DAL COLLO' },
      content: {
        number: '02',
        label: 'IL METODO',
        title: 'IL CORPO LAVORA COME UN SISTEMA',
        body: 'Una tensione in un punto cambia il modo in cui si muove tutto il resto. Per questo guardiamo l\'insieme, non il sintomo.',
      },
      cta: { title: 'PRENOTA UN TRATTAMENTO', body: 'Scrivici in direct per parlarne.' },
    },
  },
  {
    id: 'poliambulatorio',
    label: 'Poliambulatorio / centro medico',
    labelPlural: 'poliambulatori e centri medici',
    settore: 'servizi sanitari di un centro medico polispecialistico',
    kicker: 'CENTRO MEDICO',
    luogo: 'centro',
    cliente: 'paziente',
    clientePlurale: 'pazienti',
    keywords: [
      { re: '\\bpoliambulator', peso: 3 },
      { re: '\\bcentro medic', peso: 3 },
      { re: '\\bpolispecialist', peso: 3 },
      { re: '\\bmultispecialist', peso: 3 },
      { re: '\\bpoliclinic', peso: 2 },
      { re: '\\bambulator', peso: 1 },
      { re: '\\bspecialist', peso: 1 },
    ],
    categorie: ['Poliambulatorio', 'Medicina Specialistica', 'Diagnostica', 'Riabilitazione', 'Medicina dello Sport'],
    temiEsempio: [
      'Tutte le specialità in un unico centro',
      'Come prenotare una visita specialistica',
      'Check-up di prevenzione annuale',
      'Il percorso del paziente dal primo contatto',
      'Quando serve una seconda opinione',
      'Il team del centro si presenta',
      'Esami e visite senza liste d\'attesa',
      'Prevenzione per tutta la famiglia',
    ],
    promptContext:
      'Parla come un centro con più specialisti: continuità di cura, team, prenotazione semplice, prevenzione, percorsi integrati. Lessico: visita, specialista, equipe, percorso, prenotazione. Usa la prima persona plurale. Niente promesse di guarigione.',
    imageScene:
      'poliambulatorio moderno in Italia: reception accogliente, sala visite, equipe di specialisti, corridoio luminoso',
    imageSubject: 'la visita, il servizio o il reparto',
    imageOutfit: 'camice o divisa sanitaria semplice, abiti ordinati alla reception',
    imageWhitelist: ['reception', 'medical center', 'examination', 'consultation room', 'specialist'],
    imageUnblacklist: [],
    stockFallbackQuery: 'medical center doctor patient consultation',
    keywordExamples: [
      'Slide "prenota la visita" -> ["medical center reception", "clinic appointment desk", "doctor consultation room"]',
      'Slide "il nostro team" -> ["medical team clinic", "doctors staff hospital corridor", "healthcare team meeting"]',
      'Slide "check-up" -> ["health checkup doctor", "blood pressure measurement clinic", "preventive medical exam"]',
    ],
    placeholder: {
      cover: { kicker: 'CENTRO MEDICO', title: 'PERCHÉ RIMANDI LA VISITA DA MESI' },
      content: {
        number: '02',
        label: 'IL PERCORSO',
        title: 'UN SOLO POSTO, TUTTI GLI SPECIALISTI',
        body: 'Visite, esami e controlli nello stesso centro, con un team che si parla. Meno attese, meno giri a vuoto.',
      },
      cta: { title: 'PRENOTA LA TUA VISITA', body: 'Scrivici in direct per parlarne.' },
    },
  },
  {
    id: 'nutrizionista',
    label: 'Nutrizionista / dietista',
    labelPlural: 'nutrizionisti e dietisti',
    settore: 'nutrizione e alimentazione',
    kicker: 'NUTRIZIONE',
    luogo: 'studio',
    cliente: 'paziente',
    clientePlurale: 'pazienti',
    keywords: [
      { re: '\\bnutrizion', peso: 3 },
      { re: '\\bdietist', peso: 3 },
      { re: '\\bdietolog', peso: 3 },
      { re: '\\balimentaz', peso: 2 },
      { re: '\\bdieta\\b', peso: 2 },
      { re: '\\bdiete\\b', peso: 2 },
      { re: '\\bpiano alimentare', peso: 3 },
      { re: '\\bpiani alimentari', peso: 3 },
      { re: '\\bdimagr', peso: 1 },
      { re: '\\bbioimpedenz', peso: 2 },
      { re: '\\bcomposizione corporea', peso: 2 },
      { re: '\\bnutrition', peso: 2 },
      { re: '\\bricett', peso: 1 },
      { re: '\\bmetabolism', peso: 1 },
    ],
    categorie: ['Nutrizione', 'Nutrizione Sportiva', 'Nutrizione Clinica', 'Educazione Alimentare', 'Composizione Corporea'],
    temiEsempio: [
      'Colazione: gli errori più comuni',
      'Perché le diete fai da te non durano',
      'Spuntini intelligenti in ufficio',
      'Leggere le etichette al supermercato',
      'Alimentazione e sonno',
      'Idratazione: quanto bere davvero',
      'Mangiare bene con poco tempo',
      'Peso che non scende: le cause nascoste',
    ],
    promptContext:
      'Parla di abitudini alimentari, piani personalizzati, composizione corporea, educazione alimentare, rapporto con il cibo, energia e benessere quotidiano. Lessico: piano alimentare, consulenza, abitudini, porzioni, equilibrio. Vietato: diete miracolose, chili persi in X giorni, demonizzare alimenti, consigli medici su patologie, diagnosi.',
    imageScene:
      'studio di nutrizione o cucina luminosa in Italia: alimenti freschi, verdura e frutta, piatti bilanciati, bilancia e strumenti per la composizione corporea, consulenza al tavolo',
    imageSubject: 'l\'alimento, il pasto o l\'abitudine alimentare',
    imageOutfit: 'abiti quotidiani curati o camice bianco leggero',
    imageWhitelist: [
      'food', 'healthy food', 'vegetables', 'vegetable', 'fruit', 'fruits', 'salad', 'meal', 'breakfast', 'lunch', 'dinner',
      'nutrition', 'nutritionist', 'diet', 'dietitian', 'kitchen', 'cooking', 'eating', 'eat', 'plate', 'bowl',
      'scale', 'weight', 'water', 'hydration', 'smoothie', 'grocery', 'supermarket', 'label',
      'cibo', 'verdura', 'verdure', 'frutta', 'insalata', 'colazione', 'pranzo', 'cena', 'nutrizione', 'dieta', 'cucina', 'bilancia',
    ],
    imageUnblacklist: ['food', 'cooking', 'recipe'],
    stockFallbackQuery: 'nutritionist healthy food consultation',
    keywordExamples: [
      'Slide "colazione sbagliata" -> ["healthy breakfast table", "oatmeal fruit bowl", "nutritionist breakfast plan"]',
      'Slide "leggere le etichette" -> ["reading food label supermarket", "grocery shopping nutrition", "woman checking food package"]',
      'Slide "piano alimentare" -> ["nutritionist consultation office", "dietitian meal plan desk", "healthy meal prep containers"]',
      'Slide "idratazione" -> ["glass of water kitchen", "woman drinking water morning", "water bottle healthy habit"]',
    ],
    placeholder: {
      cover: { kicker: 'NUTRIZIONE', title: 'PERCHÉ LA DIETA NON BASTA DA SOLA' },
      content: {
        number: '02',
        label: 'IL METODO',
        title: 'NON È FORZA DI VOLONTÀ',
        body: 'Quando il piano non regge, quasi sempre il problema sono le abitudini intorno al pasto, non la persona. Si lavora su quelle.',
      },
      cta: { title: 'PRENOTA UNA CONSULENZA', body: 'Scrivici in direct per parlarne.' },
    },
  },
  {
    id: 'personal_trainer',
    label: 'Personal trainer',
    labelPlural: 'personal trainer e preparatori atletici',
    settore: 'allenamento e preparazione fisica',
    kicker: 'ALLENAMENTO',
    luogo: 'palestra',
    cliente: 'cliente',
    clientePlurale: 'clienti',
    keywords: [
      { re: '\\bpersonal train', peso: 3 },
      { re: '\\bpersonal-train', peso: 3 },
      { re: '\\bpreparat(ore|ori|rice) atletic', peso: 3 },
      { re: '\\bpreparazione atletica', peso: 3 },
      { re: '\\bchinesiolog', peso: 2 },
      { re: '\\ballenament', peso: 2 },
      { re: '\\ballenator', peso: 2 },
      { re: '\\bpalestr', peso: 2 },
      { re: '\\bfitness', peso: 2 },
      { re: '\\bworkout', peso: 2 },
      { re: '\\bcoach\\b', peso: 1 },
      { re: '\\bforza\\b', peso: 1 },
      { re: '\\bipertrof', peso: 2 },
      { re: '\\bscheda\\b', peso: 1 },
      { re: '\\bfunctional', peso: 1 },
      { re: '\\bcrossfit', peso: 2 },
    ],
    categorie: ['Personal Training', 'Preparazione Atletica', 'Allenamento Funzionale', 'Fitness', 'Ginnastica Posturale'],
    temiEsempio: [
      'Perché non vedi risultati in palestra',
      'Allenarsi 3 volte a settimana basta?',
      'Riscaldamento: quello che tutti saltano',
      'Forza dopo i 40 anni',
      'Dimagrire con i pesi, non solo cardio',
      'Il recupero conta quanto l\'allenamento',
      'Esercizi da fare a casa in 15 minuti',
      'Come scegliere la scheda giusta',
    ],
    promptContext:
      'Parla di allenamento personalizzato, forza, mobilità, progressione, costanza, recupero, abitudini quotidiane, motivazione concreta. Lessico: scheda, seduta, serie, progressione, recupero, obiettivo. Da\' del tu con energia ma senza gergo da influencer. Vietato: promettere trasformazioni in tempi fissi, consigli medici o su patologie, estremismi alimentari.',
    imageScene:
      'palestra moderna o spazio per allenamento funzionale in Italia: manubri, kettlebell, bilanciere, tappetini, trainer che segue il cliente durante l\'esercizio',
    imageSubject: 'l\'esercizio, l\'attrezzo o il gesto atletico',
    imageOutfit: 'abbigliamento sportivo tecnico, trainer con maglietta semplice',
    imageWhitelist: [
      'gym', 'fitness', 'workout', 'training', 'trainer', 'personal trainer', 'exercise', 'exercising', 'dumbbell', 'dumbbells',
      'kettlebell', 'barbell', 'weights', 'weight training', 'strength', 'squat', 'push up', 'plank', 'running', 'treadmill',
      'stretching', 'yoga mat', 'athlete', 'sport', 'sports', 'cardio', 'crossfit', 'functional training',
      'palestra', 'allenamento', 'esercizio', 'manubri', 'pesi', 'atleta', 'sport',
    ],
    imageUnblacklist: ['muscular', 'fitness model', 'gym selfie', 'crossfit'],
    stockFallbackQuery: 'personal trainer gym training session',
    keywordExamples: [
      'Slide "non vedi risultati" -> ["personal trainer coaching client gym", "woman lifting dumbbells trainer", "strength training session"]',
      'Slide "riscaldamento" -> ["dynamic warm up gym", "stretching before workout", "mobility exercise mat"]',
      'Slide "forza dopo i 40" -> ["mature man weight training", "middle aged woman dumbbells", "strength training older adult"]',
      'Slide "allenamento a casa" -> ["home workout living room", "bodyweight exercise mat", "woman exercising at home"]',
    ],
    placeholder: {
      cover: { kicker: 'ALLENAMENTO', title: 'PERCHÉ NON VEDI RISULTATI IN PALESTRA' },
      content: {
        number: '02',
        label: 'IL METODO',
        title: 'NON È IL PESO. È LA PROGRESSIONE',
        body: 'Fare sempre la stessa seduta non cambia il corpo. Si cambia un parametro alla volta, con un piano che si adatta a te.',
      },
      cta: { title: 'PRENOTA UNA PROVA', body: 'Scrivici in direct per parlarne.' },
    },
  },
  {
    id: 'psicologo',
    label: 'Psicologo / psicoterapeuta',
    labelPlural: 'psicologi e psicoterapeuti',
    settore: 'psicologia e benessere mentale',
    kicker: 'PSICOLOGIA',
    luogo: 'studio',
    cliente: 'paziente',
    clientePlurale: 'pazienti',
    keywords: [
      { re: '\\bpsicolog', peso: 3 },
      { re: '\\bpsicoterap', peso: 3 },
      { re: '\\bpsicoterapeut', peso: 3 },
      { re: '\\bansia\\b', peso: 1 },
      { re: '\\bbenessere mentale', peso: 2 },
      { re: '\\bsalute mentale', peso: 2 },
      { re: '\\bmindfulness', peso: 1 },
    ],
    categorie: ['Psicologia', 'Psicoterapia', 'Psicologia dell\'Età Evolutiva', 'Terapia di Coppia', 'Benessere Mentale'],
    temiEsempio: [
      'Ansia: quando chiedere aiuto',
      'Stress da lavoro e segnali da non ignorare',
      'Cosa succede nel primo colloquio',
      'Dormire male: il ruolo dei pensieri',
      'Come parlare di emozioni ai figli',
      'Miti sulla psicoterapia',
      'Pause mentali durante la giornata',
      'Relazioni che stancano: perché',
    ],
    promptContext:
      'Parla di emozioni, pensieri, relazioni, stress, abitudini mentali, percorso di consapevolezza, con tono accogliente e mai giudicante. Lessico: colloquio, percorso, consapevolezza, strumenti, spazio. Vietato: diagnosi, etichette cliniche sulle persone, promesse di risoluzione, toni allarmistici, consigli su farmaci.',
    imageScene:
      'studio di psicologia tranquillo in Italia: poltrone, luce calda, piante, ambiente raccolto, colloquio sereno',
    imageSubject: 'il momento di vita, l\'emozione o il contesto quotidiano',
    imageOutfit: 'abiti quotidiani curati, nessuna divisa',
    imageWhitelist: [
      'psychology', 'psychologist', 'therapy session', 'counseling', 'mental health', 'mindfulness', 'calm', 'meditation',
      'conversation', 'talking', 'listening', 'thinking', 'anxiety', 'stress', 'relax', 'couch', 'armchair', 'journal', 'writing',
      'psicologia', 'colloquio', 'ascolto', 'calma', 'ansia', 'stress',
    ],
    imageUnblacklist: [],
    stockFallbackQuery: 'psychologist therapy session calm conversation',
    keywordExamples: [
      'Slide "ansia" -> ["woman thinking by window", "calm breathing exercise", "quiet moment morning coffee"]',
      'Slide "primo colloquio" -> ["therapy session armchairs", "psychologist listening client", "counseling office plants"]',
      'Slide "stress da lavoro" -> ["tired man office desk", "work stress laptop evening", "pause coffee break office"]',
    ],
    placeholder: {
      cover: { kicker: 'PSICOLOGIA', title: 'PERCHÉ LA MENTE NON SI SPEGNE LA SERA' },
      content: {
        number: '02',
        label: 'IL PERCORSO',
        title: 'NON DEVI ARRIVARE AL LIMITE',
        body: 'Chiedere uno spazio per sé prima che tutto pesi troppo non è debolezza. È il modo più semplice per non arrivarci.',
      },
      cta: { title: 'PRENOTA UN PRIMO COLLOQUIO', body: 'Scrivici in direct per parlarne.' },
    },
  },
  {
    id: 'dentista',
    label: 'Dentista / studio odontoiatrico',
    labelPlural: 'dentisti e studi odontoiatrici',
    settore: 'odontoiatria e salute orale',
    kicker: 'SORRISO',
    luogo: 'studio',
    cliente: 'paziente',
    clientePlurale: 'pazienti',
    keywords: [
      { re: '\\bdentist', peso: 3 },
      { re: '\\bodontoiatr', peso: 3 },
      { re: '\\bortodon', peso: 3 },
      { re: '\\bimplantolog', peso: 3 },
      { re: '\\bigiene orale', peso: 3 },
      { re: '\\bigiene dentale', peso: 3 },
      { re: '\\bsbiancament', peso: 2 },
      { re: '\\bdenti\\b', peso: 2 },
      { re: '\\bcarie', peso: 2 },
      { re: '\\bdental', peso: 2 },
    ],
    categorie: ['Odontoiatria', 'Igiene Orale', 'Ortodonzia', 'Implantologia', 'Odontoiatria Pediatrica', 'Estetica Dentale'],
    temiEsempio: [
      'Quante volte lavare i denti davvero',
      'Paura del dentista: come la gestiamo',
      'Gengive che sanguinano: cosa significa',
      'Apparecchio da adulti, si può',
      'Sbiancamento: miti e realtà',
      'La prima visita dei bambini',
      'Alito cattivo: le cause vere',
      'Igiene professionale ogni quanto',
    ],
    promptContext:
      'Parla di prevenzione, igiene orale, controlli periodici, estetica del sorriso, cura dei bambini, gestione dell\'ansia da dentista. Lessico: visita, igiene, trattamento, controllo, sorriso. Vietato: promozioni aggressive, sconti nel copy, promesse di risultati estetici garantiti, sminuire altri professionisti.',
    imageScene:
      'studio dentistico moderno e luminoso in Italia: poltrona odontoiatrica, strumenti ordinati, sorriso sereno del paziente',
    imageSubject: 'il sorriso, i denti o la cura orale',
    imageOutfit: 'camice o divisa da studio dentistico',
    imageWhitelist: [
      'dentist', 'dental', 'teeth', 'tooth', 'smile', 'smiling', 'toothbrush', 'brushing', 'oral', 'orthodontic', 'braces',
      'dentista', 'denti', 'dente', 'sorriso', 'spazzolino',
    ],
    imageUnblacklist: [],
    stockFallbackQuery: 'dentist dental clinic patient smile',
    keywordExamples: [
      'Slide "lavare i denti" -> ["woman brushing teeth bathroom", "toothbrush toothpaste closeup", "child brushing teeth"]',
      'Slide "paura del dentista" -> ["calm patient dental chair", "dentist reassuring patient", "modern dental office"]',
      'Slide "sorriso" -> ["healthy smile closeup", "woman smiling teeth", "dental checkup mirror"]',
    ],
    placeholder: {
      cover: { kicker: 'SORRISO', title: 'PERCHÉ LE GENGIVE SANGUINANO AL MATTINO' },
      content: {
        number: '02',
        label: 'LA PREVENZIONE',
        title: 'NON È COLPA DELLO SPAZZOLINO',
        body: 'Il sangue sulle gengive è un segnale di infiammazione, non un effetto della pulizia. Si risolve con l\'igiene giusta, non evitandola.',
      },
      cta: { title: 'PRENOTA UN CONTROLLO', body: 'Scrivici in direct per parlarne.' },
    },
  },
  {
    id: 'chiropratico',
    label: 'Chiropratico',
    labelPlural: 'chiropratici',
    settore: 'chiropratica',
    kicker: 'CHIROPRATICA',
    luogo: 'studio',
    cliente: 'paziente',
    clientePlurale: 'pazienti',
    keywords: [
      { re: '\\bchiropra', peso: 3 },
      { re: '\\bchiropract', peso: 3 },
      { re: '\\baggiustament', peso: 2 },
    ],
    categorie: ['Chiropratica', 'Posturologia', 'Salute della Colonna'],
    temiEsempio: [
      'Cosa fa davvero un chiropratico',
      'Colonna vertebrale e qualità del sonno',
      'Lavoro da scrivania e schiena rigida',
      'Mal di testa che parte dal collo',
      'Chiropratica per sportivi',
      'Il primo appuntamento spiegato',
      'Postura e respirazione',
      'Quando la schiena si blocca',
    ],
    promptContext:
      'Parla di colonna vertebrale, postura, mobilità, aggiustamenti, funzione del sistema nervoso, prevenzione. Lessico: aggiustamento, valutazione, seduta, colonna. Mai presentare la chiropratica come cura di malattie né promettere risultati certi.',
    imageScene:
      'studio chiropratico moderno in Italia: lettino da trattamento, valutazione posturale, trattamento della colonna',
    imageSubject: 'il trattamento o la parte del corpo',
    imageOutfit: 'polo o divisa semplice da professionista',
    imageWhitelist: ['chiropractor', 'chiropractic', 'spine adjustment', 'chiropratica', 'chiropratico'],
    imageUnblacklist: [],
    stockFallbackQuery: 'chiropractor spine treatment session',
    keywordExamples: [
      'Slide "schiena bloccata" -> ["chiropractor spine adjustment", "lower back treatment table", "spine alignment session"]',
      'Slide "scrivania" -> ["office worker back pain desk", "posture at computer", "ergonomic sitting posture"]',
    ],
    placeholder: {
      cover: { kicker: 'CHIROPRATICA', title: 'PERCHÉ LA SCHIENA SI BLOCCA SENZA MOTIVO' },
      content: {
        number: '02',
        label: 'IL METODO',
        title: 'IL BLOCCO È L\'ULTIMO SEGNALE',
        body: 'Prima del blocco ci sono settimane di rigidità e piccoli compensi. Lavorare su quelli evita di arrivare al dolore acuto.',
      },
      cta: { title: 'PRENOTA UNA VALUTAZIONE', body: 'Scrivici in direct per parlarne.' },
    },
  },
  {
    id: 'logopedista',
    label: 'Logopedista',
    labelPlural: 'logopedisti',
    settore: 'logopedia',
    kicker: 'LOGOPEDIA',
    luogo: 'studio',
    cliente: 'paziente',
    clientePlurale: 'pazienti',
    keywords: [
      { re: '\\blogoped', peso: 3 },
      { re: '\\bdeglutiz', peso: 2 },
      { re: '\\bbalbuz', peso: 2 },
      { re: '\\bdisturbi del linguaggio', peso: 3 },
      { re: '\\bvoce\\b', peso: 1 },
    ],
    categorie: ['Logopedia', 'Logopedia Pediatrica', 'Disturbi della Voce', 'Deglutizione', 'Apprendimento'],
    temiEsempio: [
      'Quando portare un bambino dal logopedista',
      'Ritardo del linguaggio: i segnali',
      'Voce stanca a fine giornata',
      'Deglutizione e postura della lingua',
      'Balbuzie: cosa fare e cosa evitare',
      'Giochi che aiutano il linguaggio',
      'Logopedia per adulti: quando serve',
      'Lettura e scrittura: i campanelli d\'allarme',
    ],
    promptContext:
      'Parla di linguaggio, comunicazione, voce, deglutizione, apprendimento, con esempi concreti per genitori e adulti. Lessico: valutazione, percorso, esercizi, seduta. Vietato: diagnosi via social, allarmismi sui bambini, promesse di tempi.',
    imageScene:
      'studio di logopedia accogliente in Italia: tavolo con giochi e schede, bambino e logopedista, specchio, ambiente luminoso',
    imageSubject: 'il momento di comunicazione, gioco o esercizio',
    imageOutfit: 'abiti quotidiani curati o camice leggero',
    imageWhitelist: ['speech therapy', 'speech therapist', 'child talking', 'reading child', 'language', 'voice', 'logopedia', 'bambino', 'lettura'],
    imageUnblacklist: [],
    stockFallbackQuery: 'speech therapist child session',
    keywordExamples: [
      'Slide "ritardo del linguaggio" -> ["child speech therapy session", "toddler talking mother", "speech therapist child mirror"]',
      'Slide "voce stanca" -> ["woman speaking microphone", "teacher classroom talking", "voice exercise session"]',
    ],
    placeholder: {
      cover: { kicker: 'LOGOPEDIA', title: 'PERCHÉ A 3 ANNI PARLA ANCORA POCO' },
      content: {
        number: '02',
        label: 'I SEGNALI',
        title: 'ASPETTARE NON È SEMPRE LA SCELTA GIUSTA',
        body: 'Ogni bambino ha i suoi tempi, ma alcuni segnali meritano uno sguardo in più. Una valutazione toglie dubbi ai genitori.',
      },
      cta: { title: 'PRENOTA UNA VALUTAZIONE', body: 'Scrivici in direct per parlarne.' },
    },
  },
  {
    id: 'podologo',
    label: 'Podologo',
    labelPlural: 'podologi',
    settore: 'podologia',
    kicker: 'PODOLOGIA',
    luogo: 'studio',
    cliente: 'paziente',
    clientePlurale: 'pazienti',
    keywords: [
      { re: '\\bpodolog', peso: 3 },
      { re: '\\bplantar', peso: 2 },
      { re: '\\bunghia incarnit', peso: 3 },
      { re: '\\bpiede diabetic', peso: 3 },
      { re: '\\bpiedi\\b', peso: 1 },
    ],
    categorie: ['Podologia', 'Plantari su Misura', 'Piede Diabetico', 'Podologia Sportiva'],
    temiEsempio: [
      'Unghia incarnita: cosa non fare',
      'Plantari su misura: a chi servono',
      'Piede diabetico: la prevenzione',
      'Scarpe sbagliate e dolore al tallone',
      'Calli e duroni: perché tornano',
      'Piedi dei runner: i controlli',
      'Fascite plantare spiegata semplice',
      'Cura dei piedi d\'estate',
    ],
    promptContext:
      'Parla di salute del piede, unghie, pelle, appoggio, calzature, plantari, prevenzione nelle persone con diabete e negli sportivi. Lessico: trattamento, controllo, plantare, appoggio. Niente promesse di guarigione né consigli medici su patologie sistemiche.',
    imageScene:
      'studio podologico moderno in Italia: poltrona podologica, strumenti sterili, valutazione dell\'appoggio, plantari',
    imageSubject: 'il piede, la calzatura o il trattamento',
    imageOutfit: 'camice o divisa sanitaria semplice',
    imageWhitelist: ['foot', 'feet', 'podiatry', 'podiatrist', 'insole', 'shoes', 'heel', 'toes', 'piede', 'piedi', 'plantare', 'scarpe'],
    imageUnblacklist: [],
    stockFallbackQuery: 'podiatrist foot care treatment',
    keywordExamples: [
      'Slide "tallone" -> ["heel pain closeup", "foot massage treatment", "podiatrist examining foot"]',
      'Slide "plantari" -> ["custom insoles shoes", "foot pressure analysis", "orthotic insole fitting"]',
    ],
    placeholder: {
      cover: { kicker: 'PODOLOGIA', title: 'PERCHÉ IL TALLONE FA MALE AL MATTINO' },
      content: {
        number: '02',
        label: 'IL METODO',
        title: 'NON È LA SCARPA SBAGLIATA',
        body: 'Il dolore al primo passo dipende da come il piede appoggia e si carica. Si valuta l\'appoggio, poi si sceglie cosa fare.',
      },
      cta: { title: 'PRENOTA UN CONTROLLO', body: 'Scrivici in direct per parlarne.' },
    },
  },
  {
    id: 'ostetrica',
    label: 'Ostetrica',
    labelPlural: 'ostetriche',
    settore: 'ostetricia, gravidanza e salute della donna',
    kicker: 'MATERNITÀ',
    luogo: 'studio',
    cliente: 'donna',
    clientePlurale: 'donne',
    keywords: [
      { re: '\\bostetric', peso: 3 },
      { re: '\\bgravidanz', peso: 2 },
      { re: '\\bpavimento pelvico', peso: 3 },
      { re: '\\ballattament', peso: 3 },
      { re: '\\bpost.?parto', peso: 3 },
      { re: '\\bpreparto', peso: 3 },
      { re: '\\bpuerperio', peso: 3 },
      { re: '\\bneomamm', peso: 2 },
      { re: '\\bmidwife', peso: 3 },
    ],
    categorie: ['Ostetricia', 'Gravidanza', 'Post Parto', 'Pavimento Pelvico', 'Allattamento'],
    temiEsempio: [
      'Primo trimestre: cosa aspettarsi',
      'Pavimento pelvico: perché allenarlo',
      'Allattamento: i dubbi più comuni',
      'Corso preparto: quando iniziare',
      'Post parto: il corpo che cambia',
      'Movimento in gravidanza',
      'Il ruolo dell\'ostetrica a casa',
      'Ciclo e salute della donna',
    ],
    promptContext:
      'Parla alle donne di gravidanza, parto, post parto, allattamento, pavimento pelvico, salute femminile, con tono caldo e rassicurante. Lessico: accompagnamento, incontro, percorso, ascolto. Vietato: consigli medici su complicanze, allarmismi, giudizi sulle scelte delle mamme.',
    imageScene:
      'studio di ostetricia caldo e luminoso in Italia: donna in gravidanza, neomamma con neonato, tappetino e cuscini, colloquio sereno',
    imageSubject: 'la donna, il neonato o il momento della maternità',
    imageOutfit: 'abiti comodi, ostetrica con divisa leggera o abiti quotidiani',
    imageWhitelist: ['pregnancy', 'pregnant', 'maternity', 'newborn', 'baby', 'mother', 'breastfeeding', 'midwife', 'gravidanza', 'incinta', 'neonato', 'mamma', 'allattamento'],
    imageUnblacklist: [],
    stockFallbackQuery: 'midwife pregnant woman consultation',
    keywordExamples: [
      'Slide "pavimento pelvico" -> ["pregnant woman exercise mat", "pelvic floor exercise class", "postpartum woman stretching"]',
      'Slide "allattamento" -> ["mother breastfeeding newborn", "midwife helping mother baby", "newborn baby mother calm"]',
    ],
    placeholder: {
      cover: { kicker: 'MATERNITÀ', title: 'PERCHÉ IL POST PARTO NESSUNO TE LO RACCONTA' },
      content: {
        number: '02',
        label: 'IL PERCORSO',
        title: 'IL CORPO HA BISOGNO DI TEMPO',
        body: 'Dopo il parto si riparte per gradi: pavimento pelvico, respiro, riposo. Un accompagnamento evita di fare tutto da sole.',
      },
      cta: { title: 'PRENOTA UN INCONTRO', body: 'Scrivici in direct per parlarne.' },
    },
  },
  {
    id: 'medico_estetico',
    label: 'Medicina estetica',
    labelPlural: 'medici estetici',
    settore: 'medicina estetica',
    kicker: 'MEDICINA ESTETICA',
    luogo: 'studio',
    cliente: 'paziente',
    clientePlurale: 'pazienti',
    keywords: [
      { re: '\\bmedicina estetic', peso: 3 },
      { re: '\\bmedico estetic', peso: 3 },
      { re: '\\bfiller', peso: 3 },
      { re: '\\bbotulin', peso: 3 },
      { re: '\\bbiorivitalizz', peso: 3 },
      { re: '\\bpeeling', peso: 2 },
      { re: '\\bringiovaniment', peso: 2 },
      { re: '\\bdermatolog', peso: 2 },
      { re: '\\bantiage', peso: 2 },
      { re: '\\banti-age', peso: 2 },
      { re: '\\bestetic', peso: 1 },
    ],
    categorie: ['Medicina Estetica', 'Dermatologia', 'Trattamenti Viso', 'Trattamenti Corpo', 'Anti-Age'],
    temiEsempio: [
      'Prevenzione delle rughe dopo i 30',
      'Filler: cosa chiedere alla prima visita',
      'Pelle e sole: proteggersi davvero',
      'Risultati naturali, non trasformazioni',
      'Macchie della pelle: le cause',
      'Routine serale che funziona',
      'Trattamenti prima di un evento',
      'Quanto durano i trattamenti',
    ],
    promptContext:
      'Parla di pelle, prevenzione, trattamenti con risultati naturali, consulenza personalizzata, benessere e sicurezza. Lessico: visita, trattamento, protocollo, naturalezza. Vietato: prezzi e promozioni nel copy, foto prima/dopo esagerate, promesse di risultati garantiti, toni che inducono insicurezza.',
    imageScene:
      'studio di medicina estetica elegante e luminoso in Italia: lettino, luce morbida, pelle curata, consulenza allo specchio',
    imageSubject: 'la pelle, il viso o il momento di cura',
    imageOutfit: 'camice bianco elegante, paziente con abiti sobri',
    imageWhitelist: ['skin', 'skincare', 'face', 'facial', 'beauty', 'cosmetic', 'dermatology', 'dermatologist', 'serum', 'cream', 'pelle', 'viso', 'bellezza', 'cosmetic treatment'],
    imageUnblacklist: [],
    stockFallbackQuery: 'aesthetic medicine skin consultation',
    keywordExamples: [
      'Slide "pelle e sole" -> ["woman applying sunscreen face", "skin protection summer", "dermatologist skin check"]',
      'Slide "routine serale" -> ["skincare routine bathroom mirror", "woman applying face cream", "serum bottle closeup"]',
    ],
    placeholder: {
      cover: { kicker: 'MEDICINA ESTETICA', title: 'PERCHÉ LA PELLE INVECCHIA PRIMA SUL COLLO' },
      content: {
        number: '02',
        label: 'IL METODO',
        title: 'NATURALE NON VUOL DIRE INVISIBILE',
        body: 'Un buon trattamento si vede nel modo in cui la pelle appare riposata, non nei tratti che cambiano. Si parte sempre da una visita.',
      },
      cta: { title: 'PRENOTA UNA VISITA', body: 'Scrivici in direct per parlarne.' },
    },
  },
  {
    id: 'medico',
    label: 'Medico specialista',
    labelPlural: 'medici specialisti',
    settore: 'medicina specialistica',
    kicker: 'SALUTE',
    luogo: 'studio',
    cliente: 'paziente',
    clientePlurale: 'pazienti',
    keywords: [
      { re: '\\bmedico\\b', peso: 1 },
      { re: '\\bdott\\.', peso: 1 },
      { re: '\\bcardiolog', peso: 3 },
      { re: '\\bortopedic', peso: 3 },
      { re: '\\bginecolog', peso: 3 },
      { re: '\\bendocrinolog', peso: 3 },
      { re: '\\bgastroenterolog', peso: 3 },
      { re: '\\bneurolog', peso: 3 },
      { re: '\\bpediatr', peso: 3 },
      { re: '\\burolog', peso: 3 },
      { re: '\\botorino', peso: 3 },
      { re: '\\boculist', peso: 3 },
      { re: '\\ballergolog', peso: 3 },
      { re: '\\bpneumolog', peso: 3 },
      { re: '\\bambulatorio medico', peso: 2 },
    ],
    categorie: ['Medicina Specialistica', 'Prevenzione', 'Diagnostica', 'Visite Specialistiche'],
    temiEsempio: [
      'Quando fare un controllo anche se stai bene',
      'I sintomi che non vanno ignorati',
      'Come prepararsi alla visita',
      'Esami di routine spiegati semplici',
      'Prevenzione per fasce d\'età',
      'Il referto: come leggerlo',
      'Domande da fare al medico',
      'Stile di vita e prevenzione',
    ],
    promptContext:
      'Parla di prevenzione, quando rivolgersi allo specialista, cosa aspettarsi dalla visita, educazione sanitaria chiara e senza allarmismi. Lessico: visita, controllo, esame, prevenzione. Vietato: diagnosi via social, consigli su farmaci, promesse di guarigione.',
    imageScene:
      'studio medico moderno in Italia: scrivania, stetoscopio, visita serena, ambiente ordinato e luminoso',
    imageSubject: 'la visita, l\'esame o il tema di salute',
    imageOutfit: 'camice bianco, paziente in abiti quotidiani',
    imageWhitelist: ['stethoscope', 'examination', 'checkup', 'consultation', 'prescription', 'visita', 'stetoscopio'],
    imageUnblacklist: [],
    stockFallbackQuery: 'doctor consultation patient office',
    keywordExamples: [
      'Slide "controllo" -> ["doctor consultation office", "stethoscope examination patient", "medical checkup desk"]',
      'Slide "prevenzione" -> ["blood pressure check clinic", "doctor explaining results", "health screening appointment"]',
    ],
    placeholder: {
      cover: { kicker: 'SALUTE', title: 'PERCHÉ IL CONTROLLO VA FATTO QUANDO STAI BENE' },
      content: {
        number: '02',
        label: 'LA PREVENZIONE',
        title: 'I SINTOMI ARRIVANO TARDI',
        body: 'Molte condizioni si vedono negli esami prima che nel corpo. Un controllo periodico anticipa, invece di rincorrere.',
      },
      cta: { title: 'PRENOTA UNA VISITA', body: 'Scrivici in direct per parlarne.' },
    },
  },
  {
    id: 'altro',
    label: 'Altra figura sanitaria',
    labelPlural: 'professionisti della salute',
    settore: 'salute e benessere',
    kicker: 'SALUTE',
    luogo: 'studio',
    cliente: 'paziente',
    clientePlurale: 'pazienti',
    keywords: [],
    categorie: ['Salute e Benessere', 'Prevenzione'],
    temiEsempio: [
      'Prevenzione: i controlli da non saltare',
      'Il primo appuntamento spiegato',
      'Miti da sfatare sul mio lavoro',
      'Abitudini quotidiane che fanno la differenza',
      'Quando chiedere aiuto a un professionista',
      'Cosa succede durante una seduta',
      'Domande frequenti dei pazienti',
      'Dietro le quinte dello studio',
    ],
    promptContext:
      'Parla con il lessico proprio di questa professione, dei suoi servizi e dei problemi reali delle persone che segue. Niente promesse di guarigione, niente diagnosi via social.',
    imageScene:
      'studio professionale sanitario moderno e luminoso in Italia, ambiente ordinato e accogliente',
    imageSubject: 'il servizio, il momento di cura o il tema trattato',
    imageOutfit: 'abiti quotidiani curati o divisa sanitaria semplice',
    imageWhitelist: ['wellness', 'care', 'consultation', 'professional', 'benessere', 'cura'],
    imageUnblacklist: [],
    stockFallbackQuery: 'healthcare professional consultation patient',
    keywordExamples: [
      'Slide "prevenzione" -> ["healthcare consultation office", "professional explaining patient", "health checkup appointment"]',
    ],
    placeholder: {
      cover: { kicker: 'SALUTE', title: 'PERCHÉ RIMANDI SEMPRE QUEL CONTROLLO' },
      content: {
        number: '02',
        label: 'IL METODO',
        title: 'PICCOLI SEGNALI, GRANDI DIFFERENZE',
        body: 'I problemi che si trascinano nascono quasi sempre da segnali ignorati per mesi. Guardarli per tempo cambia tutto.',
      },
      cta: { title: 'PRENOTA UN APPUNTAMENTO', body: 'Scrivici in direct per parlarne.' },
    },
  },
];

const BY_ID: Record<string, ProfessionProfile> = {};
for (const p of PROFESSIONS) BY_ID[p.id] = p;

export const PROFESSION_IDS: ProfessionId[] = PROFESSIONS.map((p) => p.id);

/** True se la stringa e uno slug di professione noto. */
export function isProfessionId(value: unknown): value is ProfessionId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(BY_ID, value);
}

export function getProfession(id: ProfessionId): ProfessionProfile {
  return BY_ID[id] || BY_ID[DEFAULT_PROFESSION_ID];
}

/** Tutte le categorie, senza doppioni, per il prompt di analisi del sito. */
export function allProfessionCategories(): string[] {
  const out: string[] = [];
  for (const p of PROFESSIONS) {
    for (const c of p.categorie) if (out.indexOf(c) === -1) out.push(c);
  }
  for (const c of CATEGORIE_COMUNI) if (out.indexOf(c) === -1) out.push(c);
  return out;
}

/** Categorie proposte nel brand kit: quelle della professione piu quelle comuni e quelle gia scelte. */
export function categorieOptionsFor(id: ProfessionId | null | undefined, selected: string[] = []): string[] {
  const base = getProfession(id || DEFAULT_PROFESSION_ID).categorie.slice();
  for (const c of CATEGORIE_COMUNI) if (base.indexOf(c) === -1) base.push(c);
  for (const c of selected) if (c && base.indexOf(c) === -1) base.push(c);
  return base;
}

/** Campi del brand (o del topic) su cui riconoscere la professione. Ogni campo ha un peso. */
export type ProfessionSignals = {
  nome_business?: string | null;
  descrizione?: string | null;
  categorie?: string[] | null;
  servizi?: string[] | null;
  target_pazienti?: string | null;
  temi_chiave?: string[] | null;
  mission?: string | null;
  identita_core?: string | null;
  website_url?: string | null;
  topic?: string | null;
};

export type ProfessionDetection = {
  id: ProfessionId;
  score: number;
  /** Punteggio del secondo classificato: serve a capire quanto e netta la scelta. */
  runnerUp: number;
  confidence: 'alta' | 'media' | 'bassa';
};

const FIELD_WEIGHTS: Array<{ key: keyof ProfessionSignals; peso: number }> = [
  { key: 'nome_business', peso: 3 },
  { key: 'categorie', peso: 3 },
  { key: 'website_url', peso: 2 },
  { key: 'servizi', peso: 2 },
  { key: 'descrizione', peso: 1.5 },
  { key: 'identita_core', peso: 1 },
  { key: 'mission', peso: 1 },
  { key: 'target_pazienti', peso: 1 },
  { key: 'temi_chiave', peso: 1 },
  { key: 'topic', peso: 1 },
];

function signalText(value: unknown): string {
  if (!value) return '';
  if (Array.isArray(value)) return value.filter(Boolean).join(' ');
  return String(value);
}

function countMatches(re: RegExp, text: string): number {
  let n = 0;
  let m: RegExpExecArray | null;
  const r = new RegExp(re.source, re.flags.indexOf('g') === -1 ? re.flags + 'g' : re.flags);
  while ((m = r.exec(text)) !== null) {
    n++;
    if (n >= 3) break; // tre occorrenze bastano: oltre non aggiungono informazione
    if (m.index === r.lastIndex) r.lastIndex++;
  }
  return n;
}

/**
 * Riconosce la professione dai segnali del brand e/o dal topic.
 * Restituisce null quando non c'e nessun indizio o quando due professioni
 * sono troppo vicine per decidere. `minScore` alza l'asticella quando il
 * segnale e debole per natura (es. il solo topic di un post).
 */
export function detectProfession(
  signals: ProfessionSignals | string,
  minScore = 2,
): ProfessionDetection | null {
  const s: ProfessionSignals = typeof signals === 'string' ? { topic: signals } : signals || {};
  const scores: Record<string, number> = {};

  for (const field of FIELD_WEIGHTS) {
    const text = signalText(s[field.key]).toLowerCase();
    if (!text) continue;
    for (const p of PROFESSIONS) {
      if (p.id === 'altro') continue;
      for (const k of p.keywords) {
        const hits = countMatches(new RegExp(k.re, 'i'), text);
        if (hits > 0) scores[p.id] = (scores[p.id] || 0) + k.peso * field.peso * Math.min(hits, 3);
      }
    }
  }

  const ranked = Object.keys(scores)
    .map((id) => ({ id: id as ProfessionId, score: scores[id] }))
    .sort((a, b) => b.score - a.score);
  if (ranked.length === 0) return null;

  const best = ranked[0];
  const runnerUp = ranked[1]?.score || 0;
  if (best.score < minScore) return null;
  // Due professioni quasi alla pari: non si decide (es. "fisioterapia e osteopatia").
  if (runnerUp > 0 && best.score - runnerUp < 1.5) return null;

  const confidence: ProfessionDetection['confidence'] =
    best.score >= 9 && best.score >= runnerUp * 2 ? 'alta' : best.score >= 4 ? 'media' : 'bassa';
  return { id: best.id, score: best.score, runnerUp, confidence };
}

/** Riga del brand per come arriva da Supabase (solo i campi che servono qui). */
export type ProfessionBrandLike = ProfessionSignals & {
  professione?: string | null;
  professione_custom?: string | null;
  raw_analysis?: { professione?: unknown; professione_label?: unknown } | null;
};

export type ResolvedProfession = {
  id: ProfessionId;
  profile: ProfessionProfile;
  /** Etichetta da mostrare e usare nei prompt: per "altro" e quella scritta dall'utente. */
  label: string;
  /** Kicker di copertina, gia in maiuscolo. */
  kicker: string;
  /** Come e stata decisa: scelta dall'utente, rilevata dal codice, o predefinita. */
  source: 'scelta' | 'rilevata' | 'default';
  /** Da cosa e stata rilevata: dai campi del brand (affidabile) o dal solo topic (debole). */
  detectedFrom: 'brand' | 'topic' | null;
  detection: ProfessionDetection | null;
};

function cleanCustomLabel(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

function kickerFromLabel(label: string, fallback: string): string {
  const k = label.toUpperCase().replace(/[^A-ZÀ-ÿ0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!k) return fallback;
  return k.length > 22 ? k.split(' ')[0].slice(0, 22) : k;
}

/**
 * Decide la professione di un brand: la scelta esplicita vince; altrimenti si
 * rileva dai campi del brand e dal topic; in mancanza di indizi resta il
 * default storico (fisioterapista), cosi i brand esistenti non cambiano.
 */
export function resolveProfession(
  brand: ProfessionBrandLike | null | undefined,
  topic?: string | null,
): ResolvedProfession {
  const b = brand || {};
  const chosen = typeof b.professione === 'string' ? b.professione.trim() : '';

  if (isProfessionId(chosen)) {
    const profile = getProfession(chosen);
    if (chosen === 'altro') {
      const custom = cleanCustomLabel(b.professione_custom);
      const label = custom || profile.label;
      return {
        id: 'altro', profile, label,
        kicker: custom ? kickerFromLabel(custom, profile.kicker) : profile.kicker,
        source: 'scelta', detectedFrom: null, detection: null,
      };
    }
    return { id: chosen, profile, label: profile.label, kicker: profile.kicker, source: 'scelta', detectedFrom: null, detection: null };
  }

  // L'analisi del sito puo aver gia riconosciuto la professione.
  const fromAnalysis = b.raw_analysis && isProfessionId(b.raw_analysis.professione) ? b.raw_analysis.professione : null;
  if (fromAnalysis && fromAnalysis !== 'altro') {
    const profile = getProfession(fromAnalysis);
    return {
      id: fromAnalysis, profile, label: profile.label, kicker: profile.kicker, source: 'rilevata', detectedFrom: 'brand',
      detection: { id: fromAnalysis, score: 0, runnerUp: 0, confidence: 'media' },
    };
  }

  // Prima i campi del brand (chi pubblica), senza il topic: il topic di un
  // singolo post non deve cambiare mestiere a un brand gia riconoscibile.
  const fromBrand = detectProfession({ ...b, topic: null });
  if (fromBrand) {
    const profile = getProfession(fromBrand.id);
    return { id: fromBrand.id, profile, label: profile.label, kicker: profile.kicker, source: 'rilevata', detectedFrom: 'brand', detection: fromBrand };
  }

  // Poi il solo topic, con asticella piu alta: e un indizio debole.
  const topicText = topic || b.topic || null;
  const fromTopic = topicText ? detectProfession({ topic: topicText }, 4) : null;
  if (fromTopic) {
    const profile = getProfession(fromTopic.id);
    return { id: fromTopic.id, profile, label: profile.label, kicker: profile.kicker, source: 'rilevata', detectedFrom: 'topic', detection: fromTopic };
  }

  const profile = getProfession(DEFAULT_PROFESSION_ID);
  return { id: DEFAULT_PROFESSION_ID, profile, label: profile.label, kicker: profile.kicker, source: 'default', detectedFrom: null, detection: null };
}

/** "dello studio", "del centro", "della palestra". */
export function delLuogo(p: ProfessionProfile): string {
  if (p.luogo === 'palestra') return 'della palestra';
  if (p.luogo === 'centro') return 'del centro';
  return 'dello ' + p.luogo;
}

/** "nello studio", "nel centro", "nella palestra". */
export function nelLuogo(p: ProfessionProfile): string {
  if (p.luogo === 'palestra') return 'nella palestra';
  if (p.luogo === 'centro') return 'nel centro';
  return 'nello ' + p.luogo;
}

/** "nel mio studio" / "nel nostro centro" / "nella mia palestra". */
export function nelMioLuogo(p: ProfessionProfile, plurale = false): string {
  if (p.luogo === 'palestra') return plurale ? 'nella nostra palestra' : 'nella mia palestra';
  return (plurale ? 'nel nostro ' : 'nel mio ') + p.luogo;
}

/** "il paziente" / "la donna" / "il cliente" e la forma con "al"/"alla". */
export function ilCliente(p: ProfessionProfile): string {
  return (p.cliente === 'donna' ? 'la ' : 'il ') + p.cliente;
}
export function alCliente(p: ProfessionProfile): string {
  return (p.cliente === 'donna' ? 'alla ' : 'al ') + p.cliente;
}

/** Elenco "slug: etichetta" per i prompt che devono scegliere una professione. */
export function professionListForPrompt(): string {
  return PROFESSIONS.map((p) => p.id + ' (' + p.label + ')').join(', ');
}

/**
 * Blocco di istruzioni per i prompt di copy: chi pubblica, come chiama le
 * persone che segue, di cosa parla e cosa non deve fare.
 */
export function professionPromptBlock(resolved: ResolvedProfession): string {
  const p = resolved.profile;
  const label = resolved.label;
  const lines = [
    '=== CHI PUBBLICA: ' + label.toUpperCase() + ' ===',
    'Il contenuto e firmato da un professionista del settore "' + (resolved.id === 'altro' ? label : p.settore) + '". Scrivi con il lessico di QUESTO settore, non di un altro: ' + p.promptContext,
    'Chiama la persona che segue "' + p.cliente + '" (plurale "' + p.clientePlurale + '") e il luogo di lavoro "' + p.luogo + '".',
  ];
  // Il divieto esplicito solo quando il mestiere e certo (scelto o letto dal
  // brand): se e stato intuito dal solo topic non si chiude nessuna porta.
  const certo = resolved.source === 'scelta' || resolved.detectedFrom === 'brand';
  if (certo && resolved.id !== 'fisioterapista' && resolved.id !== 'osteopata' && resolved.id !== 'poliambulatorio') {
    lines.push('Non parlare di fisioterapia, riabilitazione o trattamenti manuali a meno che il topic lo richieda esplicitamente: non e il mestiere di chi pubblica.');
  }
  return lines.join('\n');
}

/** Esempi di keywords_stock coerenti con la professione, per il prompt del carosello. */
export function professionKeywordExamples(resolved: ResolvedProfession): string {
  return resolved.profile.keywordExamples.map((e) => '- ' + e).join('\n');
}

/** Copy segnaposto del Template Genesis per la professione (kicker personalizzato per "altro"). */
export function placeholderCopyFor(resolved: ResolvedProfession): ProfessionPlaceholderCopy {
  const base = resolved.profile.placeholder;
  if (resolved.kicker === base.cover.kicker) return base;
  return { ...base, cover: { ...base.cover, kicker: resolved.kicker } };
}
