// Recensioni importate (Google Maps via Apify, MioDottore): nome dell'autore e
// testo puliti. Funzioni pure, specchiate in supabase/functions/_shared/brand
// (lo controlla mirrorSync.test.ts): le usa scrape-reviews e le usa il sito
// per le recensioni già salvate.
//
// Prova del reparto social del 18/11/2026: in molte card al posto del nome
// c'era «2 recensioni» (il contatore delle recensioni dell'autore, letto come
// se fosse il nome) e nel testo restavano i tag <br> grezzi.

const ENTITA: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  agrave: 'à', aacute: 'á', egrave: 'è', eacute: 'é', igrave: 'ì', iacute: 'í',
  ograve: 'ò', oacute: 'ó', ugrave: 'ù', uacute: 'ú',
  Agrave: 'À', Egrave: 'È', Eacute: 'É', Igrave: 'Ì', Ograve: 'Ò', Ugrave: 'Ù',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', laquo: '«', raquo: '»',
  hellip: '…', ndash: '–', mdash: '—', euro: '€', middot: '·', deg: '°',
};

/** Decodifica le entità HTML (&amp;, &egrave;, &#39;, &#x27;...) in un passaggio solo. */
export function decodificaEntita(s: string): string {
  return String(s ?? '').replace(/&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z]{2,8});/gi, (intera, nome: string) => {
    if (nome[0] === '#') {
      const codice = nome[1] === 'x' || nome[1] === 'X' ? parseInt(nome.slice(2), 16) : parseInt(nome.slice(1), 10);
      return Number.isFinite(codice) && codice > 0 && codice <= 0x10ffff ? String.fromCodePoint(codice) : intera;
    }
    return ENTITA[nome] ?? ENTITA[nome.toLowerCase()] ?? intera;
  });
}

/** Solo i veri tag (una lettera dopo «<»): «<3» o «a < b» restano. */
const TAG = /<\/?[a-z][a-z0-9]*(?:\s[^<>]*)?\/?>/gi;

/**
 * Testo della recensione pulito: <br> e fine paragrafo diventano a capo, gli
 * altri tag spariscono, le entità tornano lettere, niente spazi doppi né più
 * di una riga vuota di fila.
 */
export function testoRecensione(grezzo: unknown): string {
  let t = decodificaEntita(String(grezzo ?? ''));
  t = t
    .replace(/\r\n?/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(TAG, '');
  return t
    .split('\n')
    .map((r) => r.replace(/[ \t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Valori che non sono un nome: contatori e qualifiche di Google Maps. */
const NON_NOME = [
  /^\d[\d.,]*\s*(recension[ei]|review(s)?|valutazion[ei]|foto|photos?|ratings?)\b/i,
  /^(una|un'|one)\s+(recensione|review|foto|photo)\b/i,
  /\blocal\s*guide\b/i,
  /^guida\s+locale\b/i,
  /^\d[\d.,]*$/,
];

/**
 * Nome dell'autore, o null se manca o non è un nome («2 recensioni»,
 * «Local Guide · 45 recensioni», «12 foto»). Chi disegna mette «Paziente».
 */
export function nomeAutore(grezzo: unknown): string | null {
  if (typeof grezzo !== 'string') return null;
  const n = decodificaEntita(grezzo).replace(TAG, ' ').replace(/\s+/g, ' ').trim();
  if (!n || n.length > 80) return null;
  if (NON_NOME.some((re) => re.test(n))) return null;
  // «Mario Rossi · 3 recensioni»: si tiene la parte prima del punto.
  const primo = n.split(/\s+[·•|]\s+/)[0].trim();
  if (primo !== n) return nomeAutore(primo);
  return n;
}

/** Il primo nome valido fra i campi che gli scraper usano per l'autore. */
export function nomeDaCampi(r: Record<string, unknown> | null | undefined): string | null {
  if (!r) return null;
  for (const campo of ['name', 'reviewerName', 'authorName', 'author']) {
    const n = nomeAutore(r[campo]);
    if (n) return n;
  }
  return null;
}
