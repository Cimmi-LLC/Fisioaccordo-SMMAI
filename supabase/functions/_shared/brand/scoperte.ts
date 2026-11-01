// Scoperte scientifiche → carosello programmato (pilota automatico).
//
// Logica pura, senza import: questo file e la sua copia specchio in
// supabase/functions/_shared/brand/scoperte.ts devono restare byte-identici
// (guardia in __tests__/mirrorSync.test.ts).
//
// Passi del pilota automatico (funzione scoperte-automatiche):
//   1. ricerca con Gemini + Google Search (gratis entro i limiti giornalieri
//      dell'API) solo su fonti autorevoli, ultimo mese
//   2. per ogni scoperta nuova, Gemini scrive il carosello in italiano
//   3. seconda passata di controllo dell'italiano
//   4. le slide escono col template approvato del brand e il post va in
//      programmazione all'orario scelto (ora italiana)

export type Scoperta = {
  titolo: string;
  sintesi: string[];
  fonte: string;
  url: string;
  data: string | null;
  tipo_fonte: string;
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
  target_pazienti?: string | null;
  tono_voce?: string | null;
  persona_scrittura?: string | null;
  temi_chiave?: string[] | null;
  servizi?: string[] | null;
  cta_suggerite?: string[] | null;
  parole_da_evitare?: string[] | null;
  auto_temi?: string | null;
};

/** Siti da cui si accettano le scoperte: tutto il resto viene scartato. */
export const DOMINI_AUTOREVOLI = [
  'pubmed.ncbi.nlm.nih.gov',
  'pmc.ncbi.nlm.nih.gov',
  'nih.gov',
  'who.int',
  'cochranelibrary.com',
  'thelancet.com',
  'bmj.com',
  'jamanetwork.com',
  'nejm.org',
  'nature.com',
  'sciencedirect.com',
  'frontiersin.org',
  'jospt.org',
  'health.harvard.edu',
  'mayoclinic.org',
  'sciencedaily.com',
  'medicalxpress.com',
  'iss.it',
  'salute.gov.it',
  'epicentro.iss.it',
];

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

/** Il sito è fra quelli autorevoli (anche come sottodominio)? */
export function dominioAutorevole(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return DOMINI_AUTOREVOLI.some((d) => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}

/**
 * Prima chiamata (con la ricerca Google): Gemini cerca e scrive le scoperte
 * in testo libero. Gli indirizzi NON li chiediamo a lui: con la ricerca
 * attiva vede solo rimandi di Google e li inventerebbe. Le fonti si prendono
 * dai metadati delle pagine consultate.
 */
export function richiestaRicerca(temi: string, quante: number, titoliGiaUsati: string[], oggi: Date): Record<string, unknown> {
  const giorno = oggi.toISOString().slice(0, 10);
  const esclusi = titoliGiaUsati.slice(0, 30);
  return {
    contents: [{
      role: 'user',
      parts: [{
        text:
          `Oggi è il ${giorno}. Cerca con Google ${quante} scoperte scientifiche diverse e RECENTI (ultimi 30 giorni se possibile, ` +
          `altrimenti le più recenti) utili alle persone comuni su: ${temi}.\n` +
          `Cerca su questi siti: ${DOMINI_AUTOREVOLI.join(', ')}.\n` +
          'Preferisci studi peer-review, meta-analisi, linee guida ufficiali, comunicati di università.\n' +
          'Ogni scoperta deve smentire una credenza comune o dare qualcosa di pratico da fare.\n' +
          (esclusi.length > 0 ? `Non ripetere queste, già usate:\n${esclusi.map((t) => `- ${t}`).join('\n')}\n` : '') +
          'Per ogni scoperta scrivi un paragrafo con: titolo, cosa ha trovato (con i numeri veri), rivista o istituto, data. ' +
          'Non inventare nulla: scrivi solo quello che trovi nelle pagine.',
      }],
    }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.2 },
  };
}

/** Pagine consultate da Gemini, numerate da 1 (uri = rimando di Google da risolvere). */
export function fontiConsultate(risposta: unknown): Array<{ n: number; uri: string; title: string }> {
  const r = risposta as {
    candidates?: Array<{ groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> } }>;
  } | null;
  const chunks = r?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return chunks
    .map((c, i) => ({ n: i + 1, uri: String(c?.web?.uri || ''), title: String(c?.web?.title || '') }))
    .filter((c) => /^https?:\/\//i.test(c.uri));
}

/** Testo della risposta e, per ogni frase appoggiata a una pagina, i numeri delle fonti. */
export function testoConFonti(risposta: unknown): { testo: string; frasi: Array<{ frase: string; fonti: number[] }> } {
  const r = risposta as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      groundingMetadata?: { groundingSupports?: Array<{ segment?: { text?: string }; groundingChunkIndices?: number[] }> };
    }>;
  } | null;
  const c = r?.candidates?.[0];
  const testo = (c?.content?.parts || []).map((p) => p?.text || '').join('');
  const frasi = (c?.groundingMetadata?.groundingSupports || [])
    .map((s) => ({
      frase: String(s?.segment?.text || '').trim(),
      fonti: (s?.groundingChunkIndices || []).filter((i) => Number.isInteger(i)).map((i) => i + 1),
    }))
    .filter((f) => f.frase && f.fonti.length > 0);
  return { testo, frasi };
}

/**
 * Seconda chiamata (senza ricerca, risposta JSON): mette in ordine le
 * scoperte e per ognuna sceglie il numero della pagina che la sostiene.
 */
export function richiestaEstrazione(
  testo: string,
  frasi: Array<{ frase: string; fonti: number[] }>,
  fonti: Array<{ n: number; sito: string; url: string }>,
): Record<string, unknown> {
  return {
    contents: [{
      role: 'user',
      parts: [{
        text:
          'Qui sotto ci sono delle scoperte scientifiche trovate con Google, le frasi con il numero della pagina che le sostiene, ' +
          'e l\'elenco delle pagine.\n\nTESTO\n' + testo +
          '\n\nFRASI E FONTI\n' + frasi.map((f) => `[${f.fonti.join(',')}] ${f.frase}`).join('\n') +
          '\n\nPAGINE\n' + fonti.map((f) => `[${f.n}] ${f.sito} ${f.url}`).join('\n') +
          '\n\nPer ogni scoperta scegli UNA pagina fra quelle elencate che la sostiene davvero (preferisci lo studio o il sito ' +
          'scientifico alla notizia). Se nessuna pagina la sostiene, lasciala fuori. Usa solo i dati del testo, non aggiungere nulla.\n' +
          'Rispondi SOLO con JSON: {"items":[{"fonte":numero,"title":"titolo breve in italiano",' +
          '"takeaways":["2-4 frasi brevi in italiano con i numeri veri"],"source":"rivista o istituto","date":"AAAA-MM-GG o vuoto",' +
          '"source_type":"study|meta-analysis|guideline|news"}]}',
      }],
    }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
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

/**
 * Legge il JSON della seconda chiamata. L'indirizzo di ogni scoperta è quello
 * vero della pagina scelta (mai scritto dal modello); si tengono solo siti
 * autorevoli e pagine non già usate.
 */
export function leggiRicerca(
  risposta: unknown,
  fonti: Array<{ n: number; url: string }>,
  urlGiaUsati: string[] = [],
): { scoperte: Scoperta[]; scartate: string[] } {
  const r = risposta as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> } | null;
  const contenuto = (r?.candidates?.[0]?.content?.parts || []).map((p) => p?.text || '').join('');
  const json = estraiJson(contenuto) as { items?: unknown[] } | null;
  const voci = Array.isArray(json?.items) ? json!.items : [];
  const urlDi = new Map(fonti.map((f) => [f.n, f.url]));
  const usati = new Set(urlGiaUsati.map(chiaveUrl));
  const visti = new Set<string>();
  const scartate: string[] = [];

  const scoperte: Scoperta[] = [];
  for (const v of voci) {
    const o = v as Record<string, unknown>;
    const url = urlDi.get(Number(o.fonte)) || '';
    if (!/^https?:\/\//i.test(url)) continue;
    if (!dominioAutorevole(url)) {
      try { scartate.push(new URL(url).hostname.replace(/^www\./, '')); } catch { /* indirizzo non valido */ }
      continue;
    }
    const k = chiaveUrl(url);
    if (usati.has(k) || visti.has(k)) continue;
    const titolo = String(o.title || '').trim();
    const sintesi = (Array.isArray(o.takeaways) ? o.takeaways : [])
      .map((t) => String(t).trim())
      .filter(Boolean)
      .slice(0, 4);
    if (!titolo || sintesi.length === 0) continue;
    const dataGrezza = String(o.date || '').trim();
    visti.add(k);
    scoperte.push({
      titolo: titolo.slice(0, 200),
      sintesi,
      fonte: String(o.source || '').trim().slice(0, 120) || new URL(url).hostname.replace(/^www\./, ''),
      url,
      data: /^\d{4}-\d{2}-\d{2}/.test(dataGrezza) ? dataGrezza.slice(0, 10) : null,
      tipo_fonte: String(o.source_type || '').trim().slice(0, 40) || 'study',
    });
  }
  return { scoperte, scartate };
}

function vietate(brand: BrandPerScoperte): string[] {
  return Array.from(new Set([...(brand.parole_da_evitare || []), ...PAROLE_SEMPRE_VIETATE]
    .map((p) => String(p).trim())
    .filter(Boolean)));
}

/** Prompt per Gemini: dal risultato della ricerca al carosello in italiano. */
export function promptCarosello(brand: BrandPerScoperte, s: Scoperta, numSlide = 6): string {
  const n = Math.min(Math.max(numSlide, 5), 7);
  const persona = brand.persona_scrittura === 'io'
    ? "prima persona singolare (io, nel mio studio)"
    : "prima persona plurale (noi, nel nostro studio)";
  const cta = (brand.cta_suggerite || []).filter(Boolean);
  const anno = s.data ? s.data.slice(0, 4) : '';
  return `Sei il copywriter di "${brand.nome_business || 'lo studio'}", che pubblica su Instagram contenuti di divulgazione scientifica sulla salute.
Scrivi UN carosello Instagram in ITALIANO CORRETTO partendo da questa scoperta reale.

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
2-${n - 1}. content, nell'ordine: la situazione di tutti i giorni in cui il lettore si riconosce; cosa ha trovato lo studio (con il numero vero, se c'è); perché succede, spiegato da terza media; cosa può fare già oggi (consiglio pratico e sicuro).
${n}. cta: chiusura con una CTA morbida${cta.length > 0 ? ` scelta fra: ${cta.join(' · ')}` : ' (salva il post, mandalo a chi ne ha bisogno, segui la pagina)'}.

REGOLE
- Titolo di ogni slide: massimo 6 parole. Testo: massimo 2 frasi brevi.
- Usa SOLO i dati della scoperta qui sopra. Non inventare numeri, percentuali, università o studi.
- Niente diagnosi né promesse di guarigione; niente vendita diretta.
- Frasi corte, parole semplici, italiano naturale come lo scriverebbe un terapista italiano. Niente traduzioni letterali dall'inglese.
- Parole vietate (mai usarle, nemmeno coniugate): ${vietate(brand).join(', ')}.
- caption: 5-10 righe che riprendono il carosello, poi una riga "Fonte: ${s.fonte}${anno ? `, ${anno}` : ''}" (senza link).
- hashtags: 5-8 hashtag italiani pertinenti, separati da spazio.

Rispondi SOLO con questo JSON:
{"titolo_carosello":"","caption":"","hashtags":"","slides":[{"role":"cover","title":"","body":""},{"role":"content","title":"","body":""},{"role":"cta","title":"","body":""}]}`;
}

/** Prompt della seconda passata: corregge l'italiano senza cambiare i contenuti. */
export function promptControlloItaliano(copy: CopyScoperta, brand: BrandPerScoperte): string {
  return `Sei un correttore di bozze italiano madrelingua. Rileggi questo carosello Instagram e correggi:
grammatica, accordi, punteggiatura, parole inglesi o calchi dall'inglese, frasi innaturali, maiuscole sbagliate.
Non cambiare i fatti, i numeri, la struttura, i ruoli delle slide o il numero di slide.
Titoli di massimo 6 parole, testi di massimo 2 frasi.
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
  const testo = [copy.titolo_carosello, copy.caption, ...copy.slides.flatMap((s) => [s.title, s.body])]
    .join(' ')
    .toLowerCase();
  return vietate(brand).filter((p) => new RegExp(`\\b${p.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*`).test(testo));
}
