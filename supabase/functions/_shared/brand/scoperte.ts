// Scoperte scientifiche → carosello programmato (pilota automatico).
//
// Logica pura, senza import: questo file e la sua copia specchio in
// supabase/functions/_shared/brand/scoperte.ts devono restare byte-identici
// (guardia in __tests__/mirrorSync.test.ts).
//
// Passi del pilota automatico (funzione scoperte-automatiche):
//   1. Gemini traduce gli argomenti del brand in termini di ricerca inglesi
//   2. PubMed (gratis, senza chiave) dà gli studi clinici, le meta-analisi e
//      le linee guida dell'ultimo mese, con abstract
//   3. Gemini sceglie quelli utili ai pazienti e li riassume in italiano;
//      indirizzo, rivista e data vengono da PubMed, mai dal modello
//   4. per ogni scoperta Gemini scrive il carosello, poi una passata di
//      controllo dell'italiano
//   5. le slide escono col template approvato del brand e il post va in
//      programmazione all'orario scelto (ora italiana)

export type Scoperta = {
  titolo: string;
  sintesi: string[];
  fonte: string;
  url: string;
  data: string | null;
  tipo_fonte: string;
  /** Cosa crede la persona comune su questo tema (terreno comune). */
  credenza?: string;
  /** Cosa dice invece lo studio: la presa di posizione controcorrente. */
  verita?: string;
  /** Cosa può fare il paziente già oggi. */
  azione?: string;
  /** Abstract originale: serve a controllare che ogni numero del carosello venga dallo studio. */
  abstract?: string;
};

export type SlideRuolo = 'cover' | 'content' | 'cta';

export type CopyScoperta = {
  titolo_carosello: string;
  caption: string;
  hashtags: string;
  slides: Array<{ role: SlideRuolo; title: string; body: string }>;
};

export type BrandPerScoperte = {
  nome_business?: string | null;
  descrizione?: string | null;
  target_pazienti?: string | null;
  tono_voce?: string | null;
  persona_scrittura?: string | null;
  temi_chiave?: string[] | null;
  servizi?: string[] | null;
  cta_suggerite?: string[] | null;
  parole_da_evitare?: string[] | null;
  auto_temi?: string | null;
};

/** E-utilities di PubMed: gratis, senza chiave, massimo 3 richieste al secondo. */
export const PUBMED_EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

/** Solo studi clinici, meta-analisi, revisioni sistematiche e linee guida, con abstract, in inglese. */
const FILTRO_PUBMED =
  '(randomized controlled trial[pt] OR meta-analysis[pt] OR systematic review[pt] OR practice guideline[pt] OR guideline[pt])' +
  ' AND hasabstract AND english[la]';

/** Parole che non devono mai comparire nei contenuti, qualunque sia il brand. */
export const PAROLE_SEMPRE_VIETATE = ['sbloccare', 'sblocca', 'sblocchi', 'sblocco'];

export const MAX_ORARI = 3;

/** Orari "HH:MM" validi, senza doppioni, in ordine, al massimo 3. */
export function normalizzaOrari(orari: unknown): string[] {
  if (!Array.isArray(orari)) return ['09:00'];
  const validi = orari
    .map((o) => String(o).trim())
    .map((o) => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(o);
      if (!m) return null;
      const h = Number(m[1]);
      const min = Number(m[2]);
      if (h > 23 || min > 59) return null;
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    })
    .filter((o): o is string => o !== null);
  const unici = Array.from(new Set(validi)).sort();
  return unici.length > 0 ? unici.slice(0, MAX_ORARI) : ['09:00'];
}

/** Minuti da aggiungere all'UTC per avere l'ora italiana in quell'istante. */
export function scartoRomaMinuti(istante: Date): number {
  const parti = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(istante);
  const v = (t: string) => Number(parti.find((p) => p.type === t)?.value);
  const comeUtc = Date.UTC(v('year'), v('month') - 1, v('day'), v('hour') % 24, v('minute'));
  return Math.round((comeUtc - Math.floor(istante.getTime() / 60000) * 60000) / 60000);
}

/** Istante UTC che corrisponde a una data italiana (anno, mese 1-12, giorno, ora, minuti). */
export function daOraRoma(anno: number, mese: number, giorno: number, ora: number, minuti: number): Date {
  const ingenuo = Date.UTC(anno, mese - 1, giorno, ora, minuti);
  let istante = new Date(ingenuo - scartoRomaMinuti(new Date(ingenuo)) * 60000);
  // Seconda passata per i giorni del cambio d'ora.
  istante = new Date(ingenuo - scartoRomaMinuti(istante) * 60000);
  return istante;
}

/**
 * I prossimi orari di pubblicazione: uno per ogni orario scelto, il primo
 * possibile da adesso con almeno `anticipoMin` minuti di margine (oggi se
 * c'è tempo, altrimenti domani). In ordine di tempo.
 */
export function prossimiSlot(orari: string[], adesso: Date, anticipoMin = 30): Date[] {
  const limite = adesso.getTime() + anticipoMin * 60000;
  const romaOra = new Date(adesso.getTime() + scartoRomaMinuti(adesso) * 60000);
  const anno = romaOra.getUTCFullYear();
  const mese = romaOra.getUTCMonth() + 1;
  const giorno = romaOra.getUTCDate();
  return normalizzaOrari(orari)
    .map((o) => {
      const [h, m] = o.split(':').map(Number);
      const oggi = daOraRoma(anno, mese, giorno, h, m);
      if (oggi.getTime() >= limite) return oggi;
      const domaniRoma = new Date(Date.UTC(anno, mese - 1, giorno + 1));
      return daOraRoma(domaniRoma.getUTCFullYear(), domaniRoma.getUTCMonth() + 1, domaniRoma.getUTCDate(), h, m);
    })
    .sort((a, b) => a.getTime() - b.getTime());
}

/** Argomenti della ricerca: quelli scritti dal brand, altrimenti temi e servizi. */
export function temiRicerca(brand: BrandPerScoperte): string {
  const scritti = (brand.auto_temi || '').trim();
  if (scritti) return scritti;
  const temi = [...(brand.temi_chiave || []), ...(brand.servizi || [])]
    .map((t) => String(t).trim())
    .filter(Boolean);
  if (temi.length > 0) return Array.from(new Set(temi)).slice(0, 8).join(', ');
  return 'dolore muscoloscheletrico, mal di schiena, cervicale, riabilitazione, fisioterapia, osteopatia, postura';
}

export type StudioPubmed = {
  pmid: string;
  titolo: string;
  rivista: string;
  data: string | null;
  tipi: string[];
  abstract: string;
};

/** Indirizzo della scheda PubMed di uno studio. */
export function urlPubmed(pmid: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
}

/**
 * Prima chiamata: Gemini traduce gli argomenti (in italiano, scritti dal
 * brand) in termini di ricerca PubMed in inglese.
 */
export function richiestaTermini(temi: string): Record<string, unknown> {
  return {
    contents: [{
      role: 'user',
      parts: [{
        text:
          `Argomenti di uno studio sanitario: ${temi}.\n` +
          'Traducili in 3-5 termini di ricerca per PubMed, in inglese medico, brevi (2-4 parole), uno per argomento ' +
          'principale (es. "low back pain", "neck pain", "rotator cuff"). Niente operatori, niente virgolette.\n' +
          'Rispondi SOLO con JSON: {"termini":["..."]}',
      }],
    }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  };
}

/** Termini puliti (solo lettere, numeri e trattini), massimo 5. */
export function leggiTermini(risposta: unknown): string[] {
  const json = estraiJson(testoRisposta(risposta)) as { termini?: unknown[] } | null;
  const termini = (Array.isArray(json?.termini) ? json!.termini : [])
    .map((t) => String(t).replace(/[^A-Za-z0-9 '\-/]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60))
    .filter((t) => t.length >= 3);
  const unici = Array.from(new Set(termini.map((t) => t.toLowerCase()))).slice(0, 5);
  return unici.length > 0 ? unici : ['musculoskeletal pain'];
}

/** Ricerca PubMed: studi aggiunti negli ultimi `giorni`, i più pertinenti prima. */
export function urlCercaPubmed(termine: string, giorni: number, max = 8): string {
  const term = `(${termine}) AND ${FILTRO_PUBMED}`;
  return `${PUBMED_EUTILS}/esearch.fcgi?db=pubmed&retmode=json&sort=relevance&datetype=edat` +
    `&reldate=${giorni}&retmax=${max}&tool=fisioaccordo-smm&term=${encodeURIComponent(term)}`;
}

export function leggiIdPubmed(risposta: unknown): string[] {
  const ids = (risposta as { esearchresult?: { idlist?: unknown[] } } | null)?.esearchresult?.idlist || [];
  return ids.map((id) => String(id)).filter((id) => /^\d{1,10}$/.test(id));
}

/** Abstract completi degli studi, in XML. */
export function urlAbstractPubmed(ids: string[]): string {
  return `${PUBMED_EUTILS}/efetch.fcgi?db=pubmed&retmode=xml&tool=fisioaccordo-smm&id=${ids.join(',')}`;
}

function testoXml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

const MESI: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function dataXml(blocco: string | undefined): string | null {
  if (!blocco) return null;
  const anno = /<Year>(\d{4})<\/Year>/.exec(blocco)?.[1];
  if (!anno) return null;
  const meseGrezzo = (/<Month>([^<]+)<\/Month>/.exec(blocco)?.[1] || '').trim();
  const mese = /^\d{1,2}$/.test(meseGrezzo) ? meseGrezzo.padStart(2, '0') : MESI[meseGrezzo.slice(0, 3).toLowerCase()] || '01';
  const giorno = (/<Day>(\d{1,2})<\/Day>/.exec(blocco)?.[1] || '01').padStart(2, '0');
  return `${anno}-${mese}-${giorno}`;
}

/** Dall'XML di efetch: PMID, titolo, rivista, data, tipo di studio e abstract. */
export function leggiArticoliPubmed(xml: string): StudioPubmed[] {
  const articoli = xml.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || [];
  const studi: StudioPubmed[] = [];
  for (const a of articoli) {
    const pmid = /<PMID[^>]*>(\d+)<\/PMID>/.exec(a)?.[1];
    const titolo = testoXml(/<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/.exec(a)?.[1] || '');
    const abstract = Array.from(a.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g))
      .map((m) => {
        const etichetta = /Label="([^"]+)"/.exec(m[1])?.[1];
        const t = testoXml(m[2]);
        return etichetta ? `${etichetta}: ${t}` : t;
      })
      .filter(Boolean)
      .join(' ');
    if (!pmid || !titolo || !abstract) continue;
    // Nome della rivista senza sottotitolo ("The spine journal : official journal…" → "The spine journal").
    const rivista = testoXml(/<Journal>[\s\S]*?<Title>([\s\S]*?)<\/Title>/.exec(a)?.[1] || '').split(/ [:=] /)[0].trim() ||
      testoXml(/<ISOAbbreviation>([\s\S]*?)<\/ISOAbbreviation>/.exec(a)?.[1] || '');
    const data = dataXml(/<ArticleDate[^>]*>([\s\S]*?)<\/ArticleDate>/.exec(a)?.[1]) ||
      dataXml(/<PubDate>([\s\S]*?)<\/PubDate>/.exec(a)?.[1]);
    const tipi = Array.from(a.matchAll(/<PublicationType[^>]*>([^<]+)<\/PublicationType>/g)).map((m) => m[1].trim());
    studi.push({ pmid, titolo, rivista, data, tipi, abstract });
  }
  return studi;
}

function tipoFonte(tipi: string[]): string {
  if (tipi.some((t) => /meta-analysis|systematic review/i.test(t))) return 'meta-analysis';
  if (tipi.some((t) => /guideline/i.test(t))) return 'guideline';
  return 'study';
}

/**
 * Seconda chiamata (senza ricerca, risposta JSON): fra gli studi di PubMed
 * Gemini sceglie quelli utili ai pazienti e li riassume in italiano. Indica
 * solo il PMID: indirizzo, rivista e data li prendiamo da PubMed.
 */
export function richiestaScelta(
  temi: string,
  quante: number,
  studi: StudioPubmed[],
  titoliGiaUsati: string[],
): Record<string, unknown> {
  const esclusi = titoliGiaUsati.slice(0, 30);
  return {
    contents: [{
      role: 'user',
      parts: [{
        text:
          `Sei il divulgatore scientifico di uno studio sanitario che si occupa di: ${temi}.\n` +
          `Qui sotto ci sono studi recenti presi da PubMed. Scegline al massimo ${quante}, diversi fra loro, ` +
          'utili ai pazienti di questo studio. Tieni SOLO gli studi da cui esce una presa di posizione controcorrente ' +
          '(«la gente crede X, lo studio dice Y») che un paziente capisce in un minuto, meglio se smonta qualcosa che ' +
          'si paga o si fa per abitudine (macchinari, riposo, posture, integratori, miti). Scarta gli studi che dicono ' +
          'solo «è complicato», «servono altri studi», «è stato accettato bene», e quelli su farmaci, iniezioni, ' +
          'chirurgia, macchinari da ospedale, animali o con risultati poco chiari.\n' +
          (esclusi.length > 0 ? `Non ripetere argomenti già usati:\n${esclusi.map((t) => `- ${t}`).join('\n')}\n` : '') +
          'Preferisci gli studi con numeri che un paziente capisce (quante persone, quanti studi, percentuali, minuti, ' +
          'settimane).\n' +
          'Usa solo i dati dell\'abstract, con i numeri veri; non aggiungere nulla. Scrivi sempre quanti studi o quante ' +
          'persone ha esaminato, se l\'abstract lo dice. Le sigle statistiche (SMD, OR, RR, IC, p) non vanno scritte: ' +
          'di\' a parole se l\'effetto è piccolo, moderato o grande.\n\nSTUDI\n' +
          studi.map((s) =>
            `[PMID ${s.pmid}] ${s.rivista} · ${s.data || 'data n.d.'} · ${s.tipi.join(', ')}\n${s.titolo}\n${s.abstract.slice(0, 1400)}`,
          ).join('\n\n') +
          '\n\nRispondi SOLO con JSON: {"items":[{"pmid":"numero","title":"titolo breve in italiano, comprensibile a tutti",' +
          '"takeaways":["2-4 frasi brevi in italiano con i numeri veri, senza sigle statistiche"],' +
          '"credenza":"cosa crede la persona comune, in una frase","verita":"cosa dice invece lo studio, in una frase",' +
          '"azione":"una cosa concreta che il paziente può fare già oggi, coerente con lo studio"}]}',
      }],
    }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
  };
}

function estraiJson(testo: string): unknown {
  const pulito = testo.replace(/^```(?:json)?/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(pulito);
  } catch {
    const inizio = pulito.indexOf('{');
    const fine = pulito.lastIndexOf('}');
    if (inizio >= 0 && fine > inizio) {
      try { return JSON.parse(pulito.slice(inizio, fine + 1)); } catch { /* sotto */ }
    }
    return null;
  }
}

/** Normalizza un URL per confrontarlo con quelli già usati. */
export function chiaveUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    u.hash = '';
    for (const k of Array.from(u.searchParams.keys())) {
      if (/^utm_|^fbclid$|^gclid$/i.test(k)) u.searchParams.delete(k);
    }
    return (u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/+$/, '') + (u.search || '')).toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function testoRisposta(risposta: unknown): string {
  const r = risposta as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> } | null;
  return (r?.candidates?.[0]?.content?.parts || []).map((p) => p?.text || '').join('');
}

/**
 * Legge la scelta di Gemini. Si tengono solo PMID fra gli studi dati e non
 * già usati; indirizzo, rivista, data e tipo di studio vengono da PubMed.
 */
export function leggiScelta(
  risposta: unknown,
  studi: StudioPubmed[],
  urlGiaUsati: string[] = [],
): Scoperta[] {
  const json = estraiJson(testoRisposta(risposta)) as { items?: unknown[] } | null;
  const voci = Array.isArray(json?.items) ? json!.items : [];
  const perPmid = new Map(studi.map((s) => [s.pmid, s]));
  const usati = new Set(urlGiaUsati.map(chiaveUrl));
  const visti = new Set<string>();

  const scoperte: Scoperta[] = [];
  for (const v of voci) {
    const o = v as Record<string, unknown>;
    const studio = perPmid.get(String(o.pmid ?? '').replace(/\D/g, ''));
    if (!studio) continue;
    const url = urlPubmed(studio.pmid);
    const k = chiaveUrl(url);
    if (usati.has(k) || visti.has(k)) continue;
    const titolo = String(o.title || '').trim();
    const sintesi = (Array.isArray(o.takeaways) ? o.takeaways : [])
      .map((t) => String(t).trim())
      .filter(Boolean)
      .slice(0, 4);
    if (!titolo || sintesi.length === 0) continue;
    const frase = (x: unknown) => String(x ?? '').trim().slice(0, 300) || undefined;
    visti.add(k);
    scoperte.push({
      titolo: titolo.slice(0, 200),
      sintesi,
      fonte: (studio.rivista || 'PubMed').slice(0, 120),
      url,
      data: studio.data,
      tipo_fonte: tipoFonte(studio.tipi),
      credenza: frase(o.credenza),
      verita: frase(o.verita),
      azione: frase(o.azione),
      abstract: studio.abstract.slice(0, 3000),
    });
  }
  return scoperte;
}

type SlotLogo = { x: number; y: number; w: number; h?: number };

/**
 * Slot del logo dell'archetipo (definito sul canvas 1080) portato
 * all'altezza del formato: stessa regola di slotsForRole nell'app.
 */
export function slotLogoScalato(slot: SlotLogo, altezzaCanvas: number): SlotLogo {
  const k = altezzaCanvas / 1080;
  return {
    ...slot,
    y: Math.round(slot.y * k),
    ...(slot.h !== undefined ? { h: Math.round(slot.h * k) } : {}),
  };
}

/**
 * Posizioni del logo scelte per un singolo brand (genome.logo_slots, sul
 * canvas 1080), quando quella dell'archetipo cade su un elemento del suo
 * template. Il pilota mette il logo nella più libera della slide; l'app
 * usa la prima. Vuoto = si usa lo slot dell'archetipo.
 */
export function slotLogoDelBrand(genome: unknown): SlotLogo[] {
  const lista = (genome as { logo_slots?: unknown } | null)?.logo_slots;
  if (!Array.isArray(lista)) return [];
  const validi: SlotLogo[] = [];
  for (const s of lista.slice(0, 6)) {
    const { x, y, w, h } = (s || {}) as { x?: unknown; y?: unknown; w?: unknown; h?: unknown };
    if (![x, y, w].every((v) => typeof v === 'number' && Number.isFinite(v))) continue;
    if (h !== undefined && !(typeof h === 'number' && Number.isFinite(h))) continue;
    const [nx, ny, nw] = [x, y, w] as number[];
    const nh = h as number | undefined;
    if (nw < 40 || nw > 600 || nx < 0 || ny < 0 || nx + nw > 1080) continue;
    if (nh !== undefined && (nh < 20 || nh > 600)) continue;
    if (ny + (nh ?? nw) > 1080) continue;
    validi.push(nh !== undefined ? { x: nx, y: ny, w: nw, h: nh } : { x: nx, y: ny, w: nw });
  }
  return validi;
}

/** Indice della posizione più libera (a parità vince la prima). */
export function slotPiuLibero(occupazione: number[]): number {
  let migliore = 0;
  for (let i = 1; i < occupazione.length; i++) {
    if (occupazione[i] < occupazione[migliore]) migliore = i;
  }
  return migliore;
}

/**
 * Dove e quanto grande va il logo: contain-fit centrato nello slot, come
 * compositeLogo dell'app (senza altezza dello slot vale la sua larghezza).
 */
export function posizioneLogo(slot: SlotLogo, logoW: number, logoH: number): { x: number; y: number; w: number; h: number } {
  const maxW = slot.w;
  const maxH = slot.h ?? slot.w;
  const scala = Math.min(maxW / logoW, maxH / logoH);
  const w = Math.max(1, Math.round(logoW * scala));
  const h = Math.max(1, Math.round(logoH * scala));
  return { x: Math.round(slot.x + (maxW - w) / 2), y: Math.round(slot.y + (maxH - h) / 2), w, h };
}

function vietate(brand: BrandPerScoperte): string[] {
  return Array.from(new Set([...(brand.parole_da_evitare || []), ...PAROLE_SEMPRE_VIETATE]
    .map((p) => String(p).trim())
    .filter(Boolean)));
}

/** Prompt per Gemini: dal risultato della ricerca al carosello in italiano. */
export function promptCarosello(brand: BrandPerScoperte, s: Scoperta, numSlide = 6): string {
  const n = Math.min(Math.max(numSlide, 5), 7);
  // Niente "nel nostro studio": non tutti i brand sono uno studio (Terapista
  // Stellato è una piattaforma). Chi siete lo dice la descrizione.
  const persona = brand.persona_scrittura === 'io' ? "prima persona singolare (io)" : "prima persona plurale (noi)";
  const chi = (brand.descrizione || '').trim();
  const cta = (brand.cta_suggerite || []).filter(Boolean);
  const anno = s.data ? s.data.slice(0, 4) : '';
  return `Sei il copywriter di "${brand.nome_business || 'lo studio'}", che pubblica su Instagram contenuti di divulgazione scientifica sulla salute.
Scrivi UN carosello Instagram in ITALIANO CORRETTO partendo da questa scoperta reale.
${chi ? `\nCHI SIETE\n${chi}\n` : ''}
SCOPERTA
Titolo: ${s.titolo}
Fonte: ${s.fonte}${anno ? ` (${anno})` : ''}
URL: ${s.url}
Cosa dice:
${s.sintesi.map((t) => `- ${t}`).join('\n')}

A CHI PARLI
${brand.target_pazienti || 'persone comuni con dolori o fastidi, non professionisti'}. Dai del tu alla persona che ha il problema, mai al collega.
Tono: ${brand.tono_voce || 'autorevole ma caldo'}. Voce: ${persona}.

STRUTTURA (${n} slide)
1. cover: hook giornalistico che ferma lo scroll e rompe una credenza comune. Puoi aprire con "Ultima scoperta:" o con il dato più sorprendente. Il lettore deve capire subito che parla di lui.
2-${n - 1}. content, nell'ordine: la situazione di tutti i giorni in cui il lettore si riconosce; cosa ha trovato lo studio, con almeno un numero vero della scoperta (quante persone o quanti studi, oppure il risultato); perché succede, spiegato da terza media; cosa può fare già oggi (consiglio pratico e sicuro).
${n}. cta: chiusura con UNA sola azione morbida${cta.length > 0 ? ` scelta fra: ${cta.join(' · ')}` : ' (salva il post, oppure mandalo a chi ne ha bisogno, oppure segui la pagina)'}. Titolo di massimo 3 parole, testo di UNA frase di massimo 8 parole.

REGOLE
- Titolo di ogni slide: massimo 6 parole. Testo: massimo 2 frasi brevi.
- Usa SOLO i dati della scoperta qui sopra. Non inventare numeri, percentuali, università o studi.
- Niente sigle statistiche (SMD, OR, RR, IC, p): l'effetto si dice a parole, i numeri sono persone, studi, percentuali, tempi.
- Non scrivere "nel nostro studio", "i nostri pazienti" o "veniamo a trovarci" se in CHI SIETE non c'è scritto che siete uno studio.
- Niente diagnosi né promesse di guarigione; niente vendita diretta.
- Frasi corte, parole semplici, italiano naturale come lo scriverebbe un terapista italiano. Niente traduzioni letterali dall'inglese.
- Parole vietate (mai usarle, nemmeno coniugate): ${vietate(brand).join(', ')}.
- caption: 5-10 righe che riprendono il carosello, con lo stesso numero dello studio; la prima riga è l'hook, non chi siete. Poi una riga "Fonte: ${s.fonte}${anno ? `, ${anno}` : ''}" (senza link).
- hashtags: 5-8 hashtag italiani pertinenti, separati da spazio.

Rispondi SOLO con questo JSON:
{"titolo_carosello":"","caption":"","hashtags":"","slides":[{"role":"cover","title":"","body":""},{"role":"content","title":"","body":""},{"role":"cta","title":"","body":""}]}`;
}

/** Prompt della seconda passata: corregge l'italiano senza cambiare i contenuti. */
export function promptControlloItaliano(copy: CopyScoperta, brand: BrandPerScoperte): string {
  return `Sei un correttore di bozze italiano madrelingua. Rileggi questo carosello Instagram e correggi:
grammatica, accordi, punteggiatura, parole inglesi o calchi dall'inglese, frasi innaturali, maiuscole sbagliate.
Non cambiare i fatti, i numeri, la struttura, i ruoli delle slide o il numero di slide.
Titoli di massimo 6 parole, testi di massimo 2 frasi; l'ultima slide (cta) ha titolo di massimo 3 parole e una frase sola.
Se ci sono sigle statistiche (SMD, OR, RR, IC, p), riscrivi l'effetto a parole tenendo gli altri numeri.
Togli queste parole se compaiono: ${vietate(brand).join(', ')}.
Rispondi SOLO con lo stesso JSON corretto.

${JSON.stringify(copy)}`;
}

function contaParole(t: string): number {
  return t.trim().split(/\s+/).filter(Boolean).length;
}

/** Valida e ripulisce il JSON del carosello. Torna null se non è utilizzabile. */
export function leggiCopy(testo: string, brand: BrandPerScoperte = {}): CopyScoperta | null {
  const j = estraiJson(testo) as Record<string, unknown> | null;
  if (!j || !Array.isArray(j.slides)) return null;
  const slides = (j.slides as Array<Record<string, unknown>>)
    .map((s) => ({
      role: (['cover', 'content', 'cta'].includes(String(s.role)) ? String(s.role) : 'content') as SlideRuolo,
      title: String(s.title || '').trim(),
      body: String(s.body || '').trim(),
    }))
    .filter((s) => s.title.length > 0);
  if (slides.length < 3) return null;
  slides[0].role = 'cover';
  slides[slides.length - 1].role = 'cta';
  for (let i = 1; i < slides.length - 1; i++) slides[i].role = 'content';
  for (const s of slides) {
    if (contaParole(s.title) > 8) s.title = s.title.split(/\s+/).slice(0, 8).join(' ');
  }
  // Nella chiusura del template c'è posto per una riga sotto il titolo: un
  // testo lungo finisce sopra al titolo. Si tiene solo la prima frase.
  const chiusura = slides[slides.length - 1];
  chiusura.body = (chiusura.body.match(/^[^.!?]*[.!?]?/)?.[0] || chiusura.body).trim();
  const copy: CopyScoperta = {
    titolo_carosello: String(j.titolo_carosello || slides[0].title).trim(),
    caption: String(j.caption || '').trim(),
    hashtags: String(j.hashtags || '').trim(),
    slides: slides.slice(0, 8),
  };
  if (!copy.caption) return null;
  return copy;
}

/** Parole vietate rimaste nel testo (per scartare il carosello). */
export function paroleVietateTrovate(copy: CopyScoperta, brand: BrandPerScoperte): string[] {
  return vietateNelTesto([copy.titolo_carosello, copy.caption, ...copy.slides.flatMap((s) => [s.title, s.body])].join(' '), brand);
}

function vietateNelTesto(testo: string, brand: BrandPerScoperte): string[] {
  const t = testo.toLowerCase();
  return vietate(brand).filter((p) => new RegExp(`\\b${p.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*`).test(t));
}

/** Sigle statistiche che il paziente non capisce: se restano, il carosello non esce. */
const SIGLE_STATISTICHE = /\b(SMD|OR|RR|HR|IC|CI|MD|p\s*[<=>])\s*[:=]?\s*[\d(]/;

/**
 * Problemi di contenuto che bloccano il carosello prima di fare le immagini:
 * sigle statistiche, oppure nessun numero nelle slide quando la scoperta ne ha.
 */
export function problemiDelTesto(copy: CopyScoperta, s: Scoperta): string[] {
  const slide = copy.slides.map((x) => `${x.title} ${x.body}`).join(' ');
  const problemi: string[] = [];
  if (SIGLE_STATISTICHE.test(`${slide} ${copy.caption}`)) problemi.push('sigle statistiche nel testo');
  const numeri = (t: string) => (t.replace(/\b(19|20)\d{2}\b/g, '').match(/\d/g) || []).length;
  if (numeri(s.sintesi.join(' ')) > 0 && numeri(slide) === 0) problemi.push('nessun numero dello studio nelle slide');
  return problemi;
}

/**
 * Etichetta sopra il titolo delle slide di contenuto, fissa e nell'ordine
 * della struttura del carosello: il modello delle immagini, lasciato libero,
 * inventa parole come "Contraddittorio".
 */
export const ETICHETTE_CONTENUTO = ['LA SITUAZIONE', 'LO STUDIO', 'PERCHÉ SUCCEDE', 'COSA PUOI FARE'];

export function etichettaContenuto(posizione: number): string {
  return ETICHETTE_CONTENUTO[posizione] ?? 'IN PRATICA';
}

// ── Carosello «editoriale» (Terapista Stellato, 01/11/2026) ─────────────
// Le slide le disegna il server (testo esatto, niente refusi). Struttura del
// metodo Kallaway approvata da Attilio sul carosello del laser: copertina
// controcorrente, «ti riconosci?» (terreno comune), lo studio, il risultato,
// cosa vuol dire, cosa fare stasera coi passi, cosa chiedere al terapista,
// chiusura che chiede di mandarlo a qualcuno.
// Nei testi: [[parola]] = fascia gialla (titoli), **parola** = giallo.

export type SlideEditoriale =
  | { tipo: 'copertina'; sopra: string; titolo: string }
  | { tipo: 'riconosci'; titolo: string; righe: string[]; chiusa: string }
  | {
    tipo: 'confronto'; titolo: string; testo: string;
    a: { numero: string; etichetta: string }; b: { numero: string; etichetta: string }; nota: string;
  }
  | { tipo: 'numero'; titolo: string; numero: string; unita: string; scala: number | null; testo: string }
  | { tipo: 'punto'; titolo: string; testo: string; citazione: string }
  | { tipo: 'passi'; titolo: string; sottotitolo: string; passi: string[] }
  | { tipo: 'domanda'; titolo: string; domanda: string; nota: string }
  | { tipo: 'cta'; titolo: string; testo: string };

export type CopyEditoriale = {
  titolo_carosello: string;
  caption: string;
  hashtags: string;
  /** Descrizione in inglese della foto di copertina (senza testo). */
  foto_copertina: string;
  /** Descrizione in inglese della foto della slide coi passi. */
  foto_passi: string;
  slides: SlideEditoriale[];
};

/** Tipi ammessi per ognuna delle 8 posizioni. */
export const STRUTTURA_EDITORIALE: SlideEditoriale['tipo'][][] = [
  ['copertina'], ['riconosci'], ['confronto', 'punto'], ['numero', 'punto'],
  ['punto'], ['passi'], ['domanda'], ['cta'],
];

const ETICHETTE_EDITORIALI = [
  'NUOVO STUDIO', 'TI SUCCEDE?', 'LO STUDIO', 'IL RISULTATO', 'COSA VUOL DIRE', 'COSA PUOI FARE', 'AL TUO TERAPISTA',
];

/** Etichetta in alto a sinistra della slide (l'ultima porta il nome del brand). */
export function etichettaEditoriale(indice: number, nomeBrand: string): string {
  return ETICHETTE_EDITORIALI[indice] ?? nomeBrand.toUpperCase();
}

export type Segmento = {
  testo: string;
  stile: 'normale' | 'fascia' | 'accento';
  /** Va attaccato al pezzo prima, senza spazio (punteggiatura dopo una parola colorata). */
  attacca?: boolean;
};

/**
 * Divide un testo in pezzi con il loro stile ([[fascia]], **accento**). La
 * fascia resta un pezzo solo (una banda continua); il resto va parola per
 * parola, e la punteggiatura subito dopo un pezzo colorato gli resta attaccata.
 */
export function segmenti(testo: string): Segmento[] {
  const out: Segmento[] = [];
  // Il pezzo prima finiva senza spazio? Allora il primo pezzo di questo gli resta attaccato.
  let prima = false;
  for (const pezzo of testo.split(/(\[\[[^\]]+\]\]|\*\*[^*]+\*\*)/)) {
    if (!pezzo) continue;
    if (/^\[\[.*\]\]$/.test(pezzo)) {
      const t = pezzo.slice(2, -2).trim();
      if (t) out.push(prima && out.length > 0 ? { testo: t, stile: 'fascia', attacca: true } : { testo: t, stile: 'fascia' });
      prima = true;
      continue;
    }
    let stile: Segmento['stile'] = 'normale';
    let t = pezzo;
    if (/^\*\*.*\*\*$/.test(pezzo)) { stile = 'accento'; t = pezzo.slice(2, -2); }
    t = t.replace(/\[\[|\]\]|\*\*/g, '');
    const attaccato = prima && out.length > 0 && /^\S/.test(t);
    t.split(/\s+/).forEach((parola, i) => {
      if (parola) out.push(i === 0 && attaccato ? { testo: parola, stile, attacca: true } : { testo: parola, stile });
    });
    prima = /\S$/.test(t);
  }
  return out;
}

/** Testo senza i segni di stile. */
export function testoPiano(testo: string): string {
  return testo.replace(/\[\[|\]\]|\*\*/g, '');
}

/** Tutto il testo che il lettore vede nelle slide (per i controlli). */
export function testoSlide(s: SlideEditoriale): string {
  switch (s.tipo) {
    case 'copertina': return `${s.sopra} ${s.titolo}`;
    case 'riconosci': return [s.titolo, ...s.righe, s.chiusa].join(' ');
    case 'confronto': return [s.titolo, s.testo, s.a.numero, s.a.etichetta, s.b.numero, s.b.etichetta, s.nota].join(' ');
    case 'numero': return [s.titolo, s.numero, s.unita, s.testo].join(' ');
    case 'punto': return [s.titolo, s.testo, s.citazione].join(' ');
    case 'passi': return [s.titolo, s.sottotitolo, ...s.passi].join(' ');
    case 'domanda': return [s.titolo, s.domanda, s.nota].join(' ');
    case 'cta': return `${s.titolo} ${s.testo}`;
  }
}

/** Prompt per Gemini: dalla scoperta al carosello editoriale in 8 slide. */
export function promptCaroselloEditoriale(brand: BrandPerScoperte, s: Scoperta): string {
  const persona = brand.persona_scrittura === 'io' ? 'prima persona singolare (io)' : 'prima persona plurale (noi)';
  const chi = (brand.descrizione || '').trim();
  const anno = s.data ? s.data.slice(0, 4) : '';
  return `Sei il copywriter di "${brand.nome_business || 'lo studio'}" su Instagram. Scrivi UN carosello di 8 slide in ITALIANO CORRETTO col metodo dei contenuti brevi di Kallaway, partendo da questo studio vero.
${chi ? `\nCHI SIETE\n${chi}\n` : ''}
A CHI PARLI
${brand.target_pazienti || 'persone comuni con dolori o fastidi, non professionisti'}. Dai del tu a chi ha il problema. Tono: ${brand.tono_voce || 'diretto'}. Voce: ${persona}.

LO STUDIO
Titolo: ${s.titolo}
Fonte: ${s.fonte}${anno ? ` (${anno})` : ''}
Cosa dice: ${s.sintesi.join(' ')}
Cosa crede la gente: ${s.credenza || '(da capire dallo studio)'}
Cosa dice invece lo studio: ${s.verita || '(da capire dallo studio)'}
Cosa può fare il paziente: ${s.azione || '(da proporre, coerente con lo studio)'}
Abstract (inglese, è la fonte dei fatti e dei numeri):
${(s.abstract || '').slice(0, 2500)}

LE REGOLE DEL METODO
- Un'idea sola: la presa di posizione controcorrente («la gente crede X, lo studio dice Y»). Alza i toni come un giornale: frasi nette, emozione forte (sorpresa, paura di sprecare tempo e soldi). Il "nemico" è la pratica o la credenza, MAI una categoria di persone (terapisti, medici): voi siete la parte neutrale che porta i fatti.
- Il lettore deve RICONOSCERSI: scene concrete che ha vissuto (dove si trova, cosa fa, cosa sente), parole di tutti i giorni, livello prima media.
- Valore pratico: almeno una cosa da fare subito, con i passi, le quantità e quando fermarsi.
- Numeri: SOLO quelli dell'abstract o di "Cosa dice" (fa eccezione la slide 6 coi passi). Niente sigle statistiche (SMD, OR, IC, p): l'effetto si dice a parole o con il numero su una scala che tutti capiscono.
- Mai inventare fatti; niente diagnosi né promesse di guarigione; niente "nel nostro studio"; non contare le sedute; non nominare marchi di macchinari.
- Parole vietate (mai, nemmeno coniugate): ${vietate(brand).join(', ')}.
- Nei titoli metti tra [[doppie quadre]] UNA parola chiave da evidenziare in giallo; nei testi puoi mettere tra **doppi asterischi** al massimo 2 pezzi da colorare.

LE 8 SLIDE (in quest'ordine)
1. "copertina": "titolo" = la presa di posizione in massimo 7 parole, già in tema nelle prime parole, col contrasto; "sopra" = riga breve coi dati: tema · quante persone · per quanto tempo (es. "Mal di schiena · 148 persone · 12 mesi").
2. "riconosci": "titolo" = "Ti [[riconosci?]]" o simile; "righe" = 3 frasi brevi (max 9 parole) con la scena che il lettore ha vissuto; "chiusa" = una frase tipo "Se ti è successo, questo studio ti riguarda."
3. Lo studio, com'è fatto: "confronto" se ci sono due gruppi ("a" e "b" con numero di persone ed etichetta breve, il gruppo che conta in "a"; "testo" = chi erano e cosa hanno fatto; "nota" = un dettaglio che dà fiducia, es. chi non sapeva cosa) oppure "punto".
4. Il risultato: "numero" col dato chiave grande ("numero" max 6 caratteri, "unita" breve, "scala" = il massimo della scala se il numero sta su una scala, altrimenti null; "testo" = cosa vuol dire, max 2 frasi) oppure "punto".
5. "punto": cosa vuol dire per il lettore ("titolo" netto, "testo" max 2 frasi, "citazione" = la conclusione dell'abstract tradotta fedelmente in max 20 parole, oppure "").
6. "passi": la cosa da fare stasera. "titolo" tipo "Provalo stasera: …"; "sottotitolo" = come si collega allo studio, senza inventare; "passi" = 3 passi brevi (max 14 parole) con quantità (secondi, volte, minuti) e l'ultimo con quando fermarsi.
7. "domanda": "titolo" tipo "Se ti propongono …, chiedi:"; "domanda" = la frase da dire al terapista, tra «»; "nota" = una frase con un dato dello studio.
8. "cta": "titolo" = UNA sola azione, meglio mandarlo a qualcuno (es. "[[Mandalo]] a chi sta pagando il laser"), max 6 parole; "testo" = una frase.

ALTRO
- "caption": la prima riga è la copertina detta a parole; poi 5-8 righe brevi che ripercorrono il carosello, la cosa da fare, la stessa azione dell'ultima slide, e alla fine "Fonte: ${s.fonte}${anno ? `, ${anno}` : ''}" con tipo di studio e numero di persone. Niente link.
- "hashtags": 5 hashtag italiani pertinenti.
- "foto_copertina": in INGLESE, una foto realistica del tema della copertina (la pratica o il gesto di cui si parla, sulla parte del corpo giusta), studio buio quasi nero, luce laterale giallo oro, nessun testo, nessun volto, metà alta dell'immagine scura e vuota.
- "foto_passi": in INGLESE, una foto realistica di una persona che fa la cosa della slide 6, stessa luce, nessun testo.

Rispondi SOLO con questo JSON:
{"titolo_carosello":"","caption":"","hashtags":"","foto_copertina":"","foto_passi":"","slides":[
{"tipo":"copertina","sopra":"","titolo":""},
{"tipo":"riconosci","titolo":"","righe":["","",""],"chiusa":""},
{"tipo":"confronto","titolo":"","testo":"","a":{"numero":"","etichetta":""},"b":{"numero":"","etichetta":""},"nota":""},
{"tipo":"numero","titolo":"","numero":"","unita":"","scala":10,"testo":""},
{"tipo":"punto","titolo":"","testo":"","citazione":""},
{"tipo":"passi","titolo":"","sottotitolo":"","passi":["","",""]},
{"tipo":"domanda","titolo":"","domanda":"","nota":""},
{"tipo":"cta","titolo":"","testo":""}]}`;
}

const corto = (x: unknown, max: number) => String(x ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const elenco = (x: unknown, max: number, n: number) =>
  (Array.isArray(x) ? x : []).map((v) => corto(v, max)).filter(Boolean).slice(0, n);

function leggiSlideEditoriale(o: Record<string, unknown>): SlideEditoriale | null {
  const titolo = corto(o.titolo, 70);
  if (!titolo) return null;
  switch (o.tipo) {
    case 'copertina': return { tipo: 'copertina', titolo, sopra: corto(o.sopra, 60) };
    case 'riconosci': {
      const righe = elenco(o.righe, 80, 4);
      return righe.length >= 2 ? { tipo: 'riconosci', titolo, righe, chiusa: corto(o.chiusa, 80) } : null;
    }
    case 'confronto': {
      const a = (o.a || {}) as Record<string, unknown>;
      const b = (o.b || {}) as Record<string, unknown>;
      const lato = (x: Record<string, unknown>) => ({ numero: corto(x.numero, 6), etichetta: corto(x.etichetta, 32) });
      const la = lato(a), lb = lato(b);
      if (!la.numero || !lb.numero || !la.etichetta || !lb.etichetta) return null;
      return { tipo: 'confronto', titolo, testo: corto(o.testo, 200), a: la, b: lb, nota: corto(o.nota, 90) };
    }
    case 'numero': {
      const numero = corto(o.numero, 6);
      if (!numero) return null;
      const sc = Number(o.scala);
      const scala = Number.isFinite(sc) && sc >= 2 && sc <= 100 ? sc : null;
      return { tipo: 'numero', titolo, numero, unita: corto(o.unita, 16), scala, testo: corto(o.testo, 180) };
    }
    case 'punto': return { tipo: 'punto', titolo, testo: corto(o.testo, 200), citazione: corto(o.citazione, 160) };
    case 'passi': {
      const passi = elenco(o.passi, 110, 4);
      return passi.length >= 2 ? { tipo: 'passi', titolo, sottotitolo: corto(o.sottotitolo, 90), passi } : null;
    }
    case 'domanda': {
      const domanda = corto(o.domanda, 90);
      return domanda ? { tipo: 'domanda', titolo, domanda, nota: corto(o.nota, 160) } : null;
    }
    case 'cta': return { tipo: 'cta', titolo, testo: corto(o.testo, 120) };
    default: return null;
  }
}

/** Valida il JSON del carosello editoriale: 8 slide, ogni tipo al suo posto. */
export function leggiCopyEditoriale(testo: string): CopyEditoriale | null {
  const j = estraiJson(testo) as Record<string, unknown> | null;
  if (!j || !Array.isArray(j.slides) || j.slides.length !== STRUTTURA_EDITORIALE.length) return null;
  const slides: SlideEditoriale[] = [];
  for (let i = 0; i < STRUTTURA_EDITORIALE.length; i++) {
    const sl = leggiSlideEditoriale((j.slides[i] || {}) as Record<string, unknown>);
    if (!sl || !STRUTTURA_EDITORIALE[i].includes(sl.tipo)) return null;
    slides.push(sl);
  }
  const caption = String(j.caption || '').trim();
  if (!caption) return null;
  return {
    titolo_carosello: corto(j.titolo_carosello, 120) || testoPiano(slides[0].titolo),
    caption,
    hashtags: corto(j.hashtags, 200),
    foto_copertina: corto(j.foto_copertina, 700),
    foto_passi: corto(j.foto_passi, 700),
    slides,
  };
}

function numeriIn(testo: string): string[] {
  return (testo.match(/\d+(?:[.,]\d+)*/g) || []).map((n) => {
    // 1.480 / 1,480 come migliaia → 1480; 0,4 → 0.4
    if (/^\d{1,3}([.,]\d{3})+$/.test(n)) return n.replace(/[.,]/g, '');
    return n.replace(',', '.').replace(/\.0+$/, '');
  });
}

/**
 * Numeri del carosello che non stanno nello studio (abstract o sintesi).
 * Fanno eccezione la slide coi passi (secondi, volte) e gli anni.
 */
export function numeriFuoriFonte(copy: CopyEditoriale, s: Scoperta): string[] {
  const fonte = new Set(numeriIn(`${s.abstract || ''} ${s.sintesi.join(' ')}`));
  const passi = copy.slides.filter((x) => x.tipo === 'passi').map(testoSlide).join(' ');
  const daPassi = new Set(numeriIn(passi));
  const testo = [...copy.slides.filter((x) => x.tipo !== 'passi').map(testoSlide), copy.caption].join(' ');
  const fuori = numeriIn(testo).filter((n) =>
    !fonte.has(n) && !daPassi.has(n) && !/^(19|20)\d{2}$/.test(n) && !['1', '2'].includes(n));
  return Array.from(new Set(fuori));
}

/** Problemi che bloccano il carosello editoriale prima di fare le immagini. */
export function problemiEditoriale(copy: CopyEditoriale, s: Scoperta, brand: BrandPerScoperte): string[] {
  const tutto = [copy.caption, ...copy.slides.map(testoSlide)].join(' ');
  const problemi: string[] = [];
  const v = vietateNelTesto(testoPiano(tutto), brand);
  if (v.length > 0) problemi.push(`parole vietate: ${v.join(', ')}`);
  if (SIGLE_STATISTICHE.test(tutto)) problemi.push('sigle statistiche nel testo');
  const fuori = numeriFuoriFonte(copy, s);
  if (fuori.length > 0) problemi.push(`numeri che non sono nello studio: ${fuori.join(', ')}`);
  if (/nel nostro studio|i nostri pazienti/i.test(tutto) && !/studio/i.test(brand.descrizione || '')) {
    problemi.push('"nel nostro studio" ma il brand non è uno studio');
  }
  return problemi;
}

/** Seconda chiamata: un editor severo giudica il carosello col metodo. */
export function promptGiudice(copy: CopyEditoriale, s: Scoperta): string {
  return `Sei un editor severo di contenuti Instagram per pazienti, col metodo di Kallaway. Giudica questo carosello (8 slide) scritto a partire dallo studio qui sotto.

STUDIO: ${s.titolo} (${s.fonte}). ${s.sintesi.join(' ')}
ABSTRACT: ${(s.abstract || '').slice(0, 2000)}

CAROSELLO:
${JSON.stringify({ slides: copy.slides, caption: copy.caption })}

Dai un voto da 1 a 5 a:
- "aggancio": la copertina parla del problema del lettore nelle prime parole e lo sorprende con un contrasto netto?
- "riconoscibile": nella slide 2 il lettore si rivede in una scena concreta che ha vissuto?
- "pratico": la slide 6 dà una cosa da fare subito, chiara, con passi e quantità, sicura?
- "non_ovvio": il lettore impara qualcosa che non aveva già sentito?
- "fedele": ogni fatto e numero (esclusi i passi della slide 6) viene dallo studio, senza esagerare quello che lo studio dimostra?
- "italiano": italiano naturale, corretto, frasi brevi?
Scrivi in "problemi" cosa correggere, in modo concreto (slide e frase).
Rispondi SOLO con JSON: {"voti":{"aggancio":0,"riconoscibile":0,"pratico":0,"non_ovvio":0,"fedele":0,"italiano":0},"problemi":[""]}`;
}

export const VOTO_MINIMO = 4;

/** Legge il giudizio: passa solo se ogni voto è almeno VOTO_MINIMO. */
export function leggiGiudizio(testo: string): { ok: boolean; voti: Record<string, number>; problemi: string[] } {
  const j = estraiJson(testo) as { voti?: Record<string, unknown>; problemi?: unknown[] } | null;
  const chiavi = ['aggancio', 'riconoscibile', 'pratico', 'non_ovvio', 'fedele', 'italiano'];
  const voti: Record<string, number> = {};
  for (const k of chiavi) voti[k] = Number(j?.voti?.[k]) || 0;
  const problemi = elenco(j?.problemi, 300, 8);
  return { ok: chiavi.every((k) => voti[k] >= VOTO_MINIMO), voti, problemi };
}
