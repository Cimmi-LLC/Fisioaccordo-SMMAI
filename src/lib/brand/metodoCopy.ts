// Metodo per scrivere caroselli e post: le regole della Short Form Academy
// di Kallaway (corso letto riga per riga il 07/11/2026; manuale nel vault,
// wiki/concepts/metodo-contenuti-organici-kallaway.md) più le regole di
// Attilio. Prende il posto del vecchio prompt «$100M Playbook»: il copy
// usciva senza un'idea dietro, perché si scriveva l'hook prima di sapere
// che cosa dire.
//
// Ordine di lavoro del corso: format → idea (seed, convinzione comune,
// contrarian take, prove) → hook → corpo → CTA. Poi un giudice vota il
// testo e, sotto la soglia, lo si riscrive una volta.
//
// File PURO, specchiato in supabase/functions/_shared/brand/metodoCopy.ts.

export type Pubblico = 'B2C' | 'B2B';

export type BrandPerPubblico = {
  avatar_type?: string | null;
  target_pazienti?: string | null;
};

// Mestieri e strutture sanitarie: se il target è fatto solo di questi, i
// post parlano ai titolari, anche con avatar_type rimasto al default B2C.
const TARGET_PROFESSIONISTI = /\b(fisioterapist|osteopat|nutrizionist|dietist|chiropratic|logopedist|psicolog|podolog|massoterapist|chinesiolog|dentist|odontoiatr|medici|titolari|colleghi|personal trainer|professionisti (sanitari|della salute)|poliambulator|cliniche|studi (medici|sanitari|dentistici|di fisioterapia|di osteopatia)|centri (medici|sanitari|di fisioterapia|di riabilitazione))/i;
const TARGET_PERSONE = /\b(pazient|persone|chi (ha|soffre|vuole|cerca|fa)|donne|uomini|mamme|neomamme|anzian|over\s?\d|sportiv|runner|atlet|bambin|ragazz|famiglie|lavorator)/i;

/**
 * A chi parlano i post. B2B scelto nel kit vince; altrimenti decide il
 * target: GestioMed («Fisioterapisti, osteopati e poliambulatori») era
 * rimasto B2C di default e il copy parlava ai pazienti degli studi.
 */
export function pubblicoDelBrand(b: BrandPerPubblico | null | undefined, richiesto?: string): Pubblico {
  if (b?.avatar_type === 'B2B') return 'B2B';
  const target = String(b?.target_pazienti || '');
  if (TARGET_PROFESSIONISTI.test(target) && !TARGET_PERSONE.test(target)) return 'B2B';
  if (b?.avatar_type === 'B2C') return 'B2C';
  return richiesto === 'B2B' ? 'B2B' : 'B2C';
}

export type Formato = {
  id: string;
  nome: string;
  /** Il «punto di partenza» che fa riconoscere il format. */
  partenza: string;
  /** Le parti in ordine, dalla seconda slide alla penultima. */
  parti: string[];
  /** Il secret sauce: cosa lo fa funzionare. */
  segreto: string;
  /** Schemi di copertina presi dagli hook vincenti del corso. */
  copertine: string[];
  cta: string;
};

// Solo format educativi: per un servizio sanitario o un gestionale si
// compra per fiducia, e la fiducia la costruiscono questi (corso, 6.2).
// Case study e storie personali restano fuori finché il brand non dà casi
// veri: il corso vieta le prove inventate.
export const FORMATI: Formato[] = [
  {
    id: 'errore',
    nome: 'Errore comune',
    partenza: 'un errore che il lettore fa senza saperlo',
    parti: ["l'errore, detto in concreto come lo fa lui", 'perché è un errore (il meccanismo, con il suo nome)', "l'alternativa, con un primo passo da fare oggi"],
    segreto: "abbastanza specifico da importare, abbastanza nuovo da non essere già sentito; dire sempre PERCHÉ è un errore",
    copertine: ['La cosa peggiore che puoi fare per [X] è [abitudine comune]', 'Stai facendo [X] nel modo sbagliato', 'Smetti di [abitudine comune] se [situazione]'],
    cta: 'salva oppure commenta una parola per ricevere la guida',
  },
  {
    id: 'problema',
    nome: 'Problema e soluzione',
    partenza: 'un problema che il lettore sente ogni giorno',
    parti: ['il problema, fatto sentire con una scena precisa della sua giornata', 'perché le soluzioni solite non bastano', 'la soluzione, con il motivo per cui funziona', 'cosa cambia quando lo risolve'],
    segreto: 'far sentire il dolore, un lettore molto preciso, una soluzione diversa da quelle già sentite',
    copertine: ['Se [problema preciso], fai solo questo', 'Il motivo per cui [sintomo] è [causa con un nome]', 'Il modo più veloce per [risultato]'],
    cta: 'commenta una parola per avere informazioni o la guida',
  },
  {
    id: 'spiegazione',
    nome: 'Spiegazione',
    partenza: 'un fatto o un meccanismo che il lettore non conosce',
    parti: ['il fatto più interessante, subito', 'il meccanismo in parole semplici, con una metafora', 'cosa significa per lui', 'cosa farne'],
    segreto: "o sei il primo o sei unico: un'idea mai sentita o una presa di posizione contro il pensiero comune",
    copertine: ['[Fatto sorprendente]. Ecco cosa significa per te', '[Sintomo] non viene da dove pensi', 'Non è [causa ovvia]. È [causa vera]'],
    cta: 'commenta una parola per ricevere la spiegazione completa, oppure segui',
  },
  {
    id: 'tutorial',
    nome: 'Tutorial',
    partenza: 'un risultato da ottenere passo per passo',
    parti: ['il risultato e quanto ci vuole', 'passo 1', 'passo 2', 'passo 3', "l'errore che rovina tutto"],
    segreto: 'un tutorial breve serve a farsi salvare: passaggi densi, numerati, eseguibili',
    copertine: ['Come [risultato] in [tempo breve]', '[Risultato] in [numero] passaggi'],
    cta: 'salva il carosello oppure commenta una parola per la guida scritta',
  },
  {
    id: 'lista',
    nome: 'Lista',
    partenza: 'una lista di opzioni per un problema',
    parti: ['la voce più forte e meno ovvia', 'la seconda voce', 'la terza voce'],
    segreto: "ogni voce deve contare; la prima è la più sorprendente, perché se è ovvia il resto non lo legge nessuno; niente voci messe lì per fare numero",
    copertine: ['[Numero] [cose] per [risultato] che nessuno ti dice', 'Lascia perdere [soluzione solita]: ecco [numero] alternative'],
    cta: 'salva oppure commenta una parola',
  },
  {
    id: 'confronto',
    nome: 'A contro B',
    partenza: 'due modi di fare la stessa cosa: uno ovvio che non funziona, uno non ovvio che funziona',
    parti: ['cosa sono A e B, il prima possibile', 'la differenza non ovvia', 'cosa succede con A, cosa succede con B', 'come passare a B'],
    segreto: "il confronto è il motivo per cui si legge: mostrare in fretta la differenza non ovvia, così il lettore capisce che fa A e vorrebbe B",
    copertine: ['[A] contro [B]', 'Non fare [X] è male. Farlo così è peggio. Farlo così è giusto'],
    cta: 'commenta una parola per capire se fai A o B',
  },
  {
    id: 'domanda',
    nome: 'Domanda e risposta',
    partenza: 'una domanda che il lettore si fa già',
    parti: ['la domanda, esplicita', "l'inizio della risposta, non ovvio", 'il perché', 'cosa fare'],
    segreto: 'una domanda giusta per il lettore e una risposta che non inizia come se l\'aspetta',
    copertine: ['È normale che [situazione]?', 'Quanto [dubbio concreto]?', 'Perché [cosa che non torna]?'],
    cta: 'commenta una parola per la risposta sul tuo caso',
  },
  {
    id: 'livelli',
    nome: 'Tre livelli',
    partenza: 'tre modi di fare la stessa cosa, dal peggiore al migliore',
    parti: ['livello 1: quello che fa quasi tutti (ci si riconosce)', 'livello 2', 'livello 3: quello che fa chi ottiene il risultato', 'come salire di livello'],
    segreto: 'il livello 1 è quello che il lettore considera normale; in ogni livello qualcosa a cui non avrebbe pensato, con il tuo parere',
    copertine: ['Tre livelli di [X]', 'Da principiante a esperto: [X]'],
    cta: 'commenta il tuo livello con una parola e ti dico il passo dopo',
  },
  {
    id: 'scenario',
    nome: 'Scenario',
    partenza: "un'ipotesi: «se arrivasse da noi qualcuno con [situazione], faremmo questo»",
    parti: ['lo scenario, preciso e riconoscibile', 'cosa faremmo e perché, in un modo che non si aspetta', 'il primo passo che può fare anche lui', 'quando serve il professionista'],
    segreto: 'mostra la competenza senza un caso vero: situazione estrema, soluzione semplice e non ovvia',
    copertine: ['Se avessi [situazione], farei solo questo', 'Cosa farei io con [situazione] in [tempo]'],
    cta: 'commenta una parola per parlarne',
  },
];

export function formatoPerId(id: unknown): Formato | null {
  const k = String(id || '').trim().toLowerCase();
  return FORMATI.find((f) => f.id === k) ?? null;
}

/** Come si distribuiscono le parti del format su N slide (copertina e CTA comprese). */
export function pianoSlide(f: Formato, n: number): string[] {
  const tot = Math.max(2, Math.min(10, Math.round(n) || 5));
  const interne = tot - 2;
  const piano = ['copertina: l\'hook'];
  for (let i = 0; i < interne; i++) {
    if (i < f.parti.length) piano.push(f.parti[i]);
    else piano.push(i === interne - 1 ? 'il payoff: «Quindi: non X, fai Y»' : 'una prova o un esempio in più sul punto prima');
  }
  // Con poche slide le parti in eccesso si fondono nell'ultima interna.
  if (interne > 0 && f.parti.length > interne) {
    piano[piano.length - 1] = f.parti.slice(interne - 1).join(' + ');
  }
  piano.push('CTA');
  return piano;
}

export type ContestoMetodo = {
  pubblico: Pubblico;
  /** «i pazienti», «i clienti», «gli studi»: come si chiama chi legge. */
  lettori: string;
  sanitario: boolean;
};

/** Regole del corso + regole di Attilio, per il prompt di sistema. */
export function regoleMetodo(c: ContestoMetodo): string {
  const aChi = c.pubblico === 'B2B'
    ? `Parli al titolare o al professionista (${c.lettori}): i suoi problemi sono tempo, soldi, agenda, collaboratori, pazienti persi. Mai consigli di salute ai pazienti.`
    : `Parli alla persona che ha il problema (${c.lettori}), con il tu: sintomi, giornata, cosa non riesce più a fare. Mai al professionista, mai parole come marketing, fatturato, posizionamento.`;
  const terapista = c.sanitario && c.pubblico === 'B2C'
    ? `\n- Il post non deve MAI dire o far capire che si può fare a meno del professionista o dello studio (esercizi, app o video «al posto» della terapia). Criticare una pratica va bene; il professionista resta la persona giusta a cui chiedere.\n- Linguaggio da benessere e vita quotidiana, non da cartella clinica.`
    : '';
  return `=== METODO (Short Form Academy di Kallaway): ORDINE DI LAVORO ===
1. FORMAT per primo: il modo in cui l'informazione è organizzata (errore, lista, confronto…). Si riconosce in 3 secondi.
2. IDEA prima di scrivere: un seed di una riga, la CONVINZIONE COMUNE del lettore (A) e la tua CONTRARIAN TAKE (B), 2-3 fatti veri che la provano, un esempio con una persona normale.
3. HOOK (copertina) solo quando l'idea c'è.
4. CORPO: le prove, nell'ordine del format.
5. CTA: una sola.

=== A CHI PARLI ===
${aChi}
Nella prima frase della copertina il lettore deve capire che parla di lui: il target o la sua situazione detti subito.

=== CONTRARIAN TAKE (il cuore del post) ===
- Una cosa che credi vera e che il lettore non sa, dimostrabile in meno di un minuto di lettura.
- Contrasto massimo fra quello che crede (A) e quello che sai tu (B): «tutti fanno A, ma è B».
- Test: se chiunque nella nicchia potrebbe scriverla, scartala e cercane un'altra. Ovvietà come «muoviti di più», «ascolta il tuo corpo», «affidati a professionisti», «la prevenzione è importante», «organizzati meglio» sono vietate come idea centrale.

=== HOOK = COPERTINA (on target curiosity loop) ===
- Contesto rapido + contrasto, dichiarato («Smetti di X, fai Y») o implicito.
- Apri dal risultato che vuole o dal dolore che ha, mai dal termine tecnico.
- Il tu, non l'io. Parole da terza media, il minimo di parole, una sola lettura possibile (test dell'ambiguità).
- Deve aprire UNA domanda precisa nella testa del lettore, e il carosello deve chiuderla.
- Il titolo di copertina è un «title text»: dice il beneficio, il soggetto in 2-3 parole, la lezione, la domanda centrale o le etichette A/B.
- Allineamento massimo: copertina, foto e prima riga della caption dicono la stessa cosa.
- Vietati: «non ci crederai», «storia pazzesca», «secondo me», «sapevi che», «il tuo corpo ti sta parlando», «X cose che non sai», «non sottovalutare», «la verità su», «attenzione!», domande generiche tipo «ti è mai capitato?».

=== CORPO ===
- Speed to value: la slide 2 dà già una verità non ovvia. Niente riscaldamento, niente «in questo carosello vedremo».
- L'avvocato: la copertina è la tesi, ogni slide porta una prova (fatto, esempio, meccanismo). 2-3 blocchi di prova bastano.
- Distanza minima: ogni frase dice la cosa più vicina a quella prima. Niente salti.
- Lean in / snap back: descrivi in concreto cosa fa di solito il lettore, poi «Ma è proprio questo che…», poi «Invece…».
- Dai un nome al meccanismo («Si chiama…») e di' perché funziona in una frase a sé.
- Repeater: il punto chiave si dice due volte, con il termine e con una metafora semplice.
- Re-hook a metà con «ma in realtà», «il punto è che».
- Payoff prima della CTA: «Quindi: non X. Fai Y.»
- Walkaway value: almeno una cosa concreta, piccola, da fare o da capire subito.

=== STILE ===
- Frasi di circa 8 parole, voce attiva, niente subordinate lunghe, niente parentesi.
- Ritmo frastagliato: alterna frasi brevi e medie. Ogni frase va a capo (\\n) dentro il testo della slide.
- Mai la stessa parola in due frasi di fila.
- Scrivi a una persona sola, come a un amico che ha lo stesso problema. Prima il terreno comune, poi la novità.
- Ogni frase deve valere 100 euro: se la togli e non cambia niente, toglila.
- Italiano corretto e naturale. Niente lineette lunghe, niente emoji nelle slide, niente parole inglesi se c'è quella italiana.

=== PROVE E NUMERI ===
- Numeri, percentuali, casi, studi, prezzi, durate: SOLO se sono nel brand kit o nel topic. Mai inventarli, nemmeno «tondi».
- Le prove si buttano lì di lato («quando lo facciamo in studio…»), non si sbandierano.
- Le opinioni si dichiarano come opinioni.
- Mai promettere guarigioni o risultati garantiti.

=== CTA ===
- UNA sola, nativa: un'estensione del valore appena dato, mai incollata.
- Ordine di preferenza: commenta una parola per ricevere qualcosa legato al post (solo se il brand lo può davvero mandare: una risposta, una spiegazione sul suo caso, la guida dei passaggi appena visti) > commenta una parola per informazioni > salva (tutorial e liste) > segui (solo se non c'è di meglio).
- Vietati «tagga un amico» e «commenta la tua opinione».
- Vendita diretta (prenota, chiama) solo se il post annuncia una novità del brand, o se il brand ha solo CTA dirette approvate.

=== CAPTION ===
- La prima riga è l'hook e funziona da sola, senza la foto; nomina il tema e il lettore.
- Poi 2-3 paragrafi brevi che aggiungono (non ripetono) il perché e il passo pratico, poi la CTA.

=== REGOLE DI ATTILIO ===
- Le parole dei clienti battono quelle del sito: usa le frasi vere quando ci sono.
- Mai «sbloccare» (né i pazienti, né le articolazioni, né i risultati): si aiuta, si risolve in meno tempo, si ottengono più risultati.${terapista}`;
}

export type Brief = {
  formato: string;
  seed: string;
  convinzione_comune: string;
  contrarian_take: string;
  fatti: string[];
  esempio: string;
  emozione: string;
  domanda_hook: string;
  copertine_alternative: string[];
};

/** Il brief da compilare prima delle slide, nello stesso JSON. */
export const SCHEMA_BRIEF = `"brief": {
    "formato": "id del format scelto",
    "seed": "l'idea in una riga",
    "convinzione_comune": "cosa crede o fa di solito il lettore (A), in concreto",
    "contrarian_take": "cosa sai tu che lui non sa (B), in una frase",
    "fatti": ["2-3 fatti veri che provano B, presi dal tuo mestiere o dal brand kit"],
    "esempio": "una persona normale del target in una situazione precisa",
    "emozione": "l'emozione che deve provare leggendo",
    "domanda_hook": "la domanda che la copertina apre nella sua testa",
    "copertine_alternative": ["altre 3 copertine possibili, ognuna di un tipo diverso"]
  }`;

export function elencoFormati(): string {
  return FORMATI.map((f) => `- ${f.id} («${f.nome}»): parte da ${f.partenza}. Parti in ordine: ${f.parti.join(' → ')}. Funziona se: ${f.segreto}. Copertine: ${f.copertine.map((c) => `«${c}»`).join(', ')}.`).join('\n');
}

export function bloccoFormato(f: Formato, n: number): string {
  const piano = pianoSlide(f, n);
  return `=== FORMAT: ${f.nome.toUpperCase()} (${f.id}) ===
Punto di partenza: ${f.partenza}.
Cosa lo fa funzionare: ${f.segreto}.
Schemi di copertina (adattali, non copiarli parola per parola): ${f.copertine.map((c) => `«${c}»`).join(', ')}.
Piano delle ${piano.length} slide:
${piano.map((p, i) => `${i + 1}. ${p}`).join('\n')}
CTA adatta: ${f.cta}.`;
}

// ── Controlli meccanici sul testo uscito ──

const FRASI_VIETATE: [RegExp, string][] = [
  [/sblocc/i, '«sbloccare» è vietato'],
  [/non ci crederai|storia pazzesca/i, 'hook da clickbait vuoto'],
  [/sapevi che/i, '«Sapevi che…» è vietato'],
  [/il tuo corpo ti (sta )?parl/i, '«il tuo corpo ti parla» è vietato'],
  [/non sottovalutare/i, '«non sottovalutare» è vietato'],
  [/tagga (un|una|i|le)\b/i, 'CTA «tagga» vietata'],
  [/commenta (la tua|cosa ne pensi)/i, 'CTA «commenta la tua opinione» vietata'],
  [/milioni di persone|in un mondo in cui|la salute è importante|prendersi cura di sé/i, 'frase generica vietata'],
  [/[—–]/, 'lineetta lunga'],
];

// Numeri che fanno da prova: percentuali, soldi, quanti pazienti o studi.
const NUMERO_PROVA = /\d+(?:[.,]\d+)?\s?(?:%|€|euro\b|pazienti\b|clienti\b|studi\b|centri\b|persone\b|casi\b)/gi;

export type TestoCarosello = {
  slides?: Array<Record<string, unknown>>;
  caption_instagram?: string;
};

function testiDi(c: TestoCarosello): string[] {
  const out: string[] = [];
  for (const s of c.slides || []) {
    for (const k of ['hook', 'sottotitolo', 'titolo', 'testo', 'testo_cta', 'bottone_cta']) {
      if (typeof s[k] === 'string') out.push(s[k] as string);
    }
  }
  if (typeof c.caption_instagram === 'string') out.push(c.caption_instagram);
  return out;
}

/**
 * Problemi trovabili senza AI: frasi vietate e numeri-prova che non stanno
 * né nel brand kit né nel topic (cioè inventati).
 */
export function controlliMeccanici(c: TestoCarosello, fonti: string, vietateDelBrand: string[] = []): string[] {
  const problemi: string[] = [];
  const tutto = testiDi(c).join('\n');
  for (const [re, msg] of FRASI_VIETATE) if (re.test(tutto)) problemi.push(msg);
  for (const p of vietateDelBrand) {
    const w = String(p || '').trim();
    if (w.length > 2 && tutto.toLocaleLowerCase('it').includes(w.toLocaleLowerCase('it'))) problemi.push(`parola bandita dal brand: «${w}»`);
  }
  const fontiNorm = fonti.replace(/\s+/g, '').toLowerCase();
  for (const m of tutto.matchAll(NUMERO_PROVA)) {
    const num = m[0].match(/\d+(?:[.,]\d+)?/)![0];
    if (!fontiNorm.includes(num)) problemi.push(`numero non presente nei dati del brand: «${m[0].trim()}»`);
  }
  return [...new Set(problemi)];
}

// ── Il giudice ──

export const CRITERI_GIUDICE: [string, string][] = [
  ['bersaglio', 'dalla copertina il lettore giusto capisce subito che parla di lui e del suo problema'],
  ['non_ovvio', 'la contrarian take e il primo punto sono non ovvi: non li scriverebbe chiunque nella nicchia'],
  ['contrasto', 'c\'è un contrasto chiaro fra cosa crede il lettore e cosa gli dici, sostenuto da prove vere'],
  ['valore', 'chi legge si porta via una cosa concreta da fare o da capire subito'],
  ['filo', 'ogni slide segue la precedente, nell\'ordine del format, senza riempitivo né ripetizioni'],
  ['stile', 'frasi corte, voce attiva, parole semplici, italiano naturale e corretto, niente frasi da sito vetrina'],
  ['fedele', 'niente numeri, casi, servizi o promesse inventati; CTA una sola e mantenibile'],
];

export function promptGiudice(copy: unknown, c: ContestoMetodo, topic: string): string {
  return `Sei un editor severo che applica il metodo Short Form Academy di Kallaway. Valuta questo carosello Instagram.
Pubblico: ${c.pubblico === 'B2B' ? `titolari e professionisti (${c.lettori})` : `le persone con il problema (${c.lettori})`}.
Topic: «${topic}».

Dai un voto da 1 a 5 a ogni criterio (5 = da pubblicare così, 3 = mediocre, 1 = da buttare):
${CRITERI_GIUDICE.map(([k, d]) => `- ${k}: ${d}`).join('\n')}
${c.sanitario && c.pubblico === 'B2C' ? '- Se il testo fa capire che si può fare a meno del professionista o dello studio, «fedele» vale 1.\n' : ''}
Per ogni voto sotto 4 scrivi in «problemi» cosa cambiare, in concreto (quale slide, quale frase, come).

CAROSELLO
${JSON.stringify(copy)}

Rispondi solo con JSON: {"voti":{${CRITERI_GIUDICE.map(([k]) => `"${k}":0`).join(',')}},"problemi":["…"]}`;
}

export type Giudizio = { voti: Record<string, number>; problemi: string[]; promosso: boolean; minimo: number };

/** Giudizio valido o null. Promosso se ogni voto è almeno 4. */
export function leggiGiudizio(raw: string): Giudizio | null {
  try {
    const o = JSON.parse(String(raw || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    const voti: Record<string, number> = {};
    for (const [k] of CRITERI_GIUDICE) {
      const v = Number(o?.voti?.[k]);
      if (!Number.isFinite(v) || v < 1 || v > 5) return null;
      voti[k] = v;
    }
    const problemi = (Array.isArray(o?.problemi) ? o.problemi : [])
      .map((p: unknown) => String(p ?? '').trim())
      .filter(Boolean)
      .slice(0, 10);
    const minimo = Math.min(...Object.values(voti));
    return { voti, problemi, promosso: minimo >= 4, minimo };
  } catch {
    return null;
  }
}
