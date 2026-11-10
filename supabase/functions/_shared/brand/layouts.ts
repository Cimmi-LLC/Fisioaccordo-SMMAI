// I 3 layout dei caroselli, disegnati dal codice (non dal modello di immagini).
//
// Nati il 06/11/2026 dopo il giudizio di Attilio sui template generati da NB2
// («nessuno può pubblicare o usare questi template»): il modello disegnava
// tutta la slide, testo e icone compresi, e usciva clipart. Qui il testo è
// impaginato in modo esatto (Satori + Resvg, come le slide editoriali del
// pilota) e le immagini sono foto vere o schermate, mai icone disegnate.
//
// A «Colore del brand»: fondo pieno sfumato nel colore del brand, parole
//   chiave nel colore di evidenza, foto o schermata in una card inclinata.
// B «Foto editoriale»: foto vera a tutta pagina in copertina, pagine interne
//   color carta con numeri grandi, chiusura con foto e pannello.
// C «Carta clinica»: carta, titoli con grazie, righe sottili, niente foto
//   obbligatorie.
//
// File PURO: zero import, zero API di piattaforma. Produce l'albero per
// Satori; il rendering vive in supabase/functions/_shared/layoutRender.ts.
// Specchiato byte-identico in supabase/functions/_shared/brand/layouts.ts
// (vedi test mirrorSync).

export type LayoutId = 'brand_pieno' | 'foto_editoriale' | 'carta_clinica';
export type LayoutRole = 'cover' | 'content' | 'cta';

export const LAYOUT_IDS: readonly LayoutId[] = ['brand_pieno', 'foto_editoriale', 'carta_clinica'];

export const LAYOUT_INFO: Readonly<Record<LayoutId, { lettera: string; nome: string; descrizione: string }>> = {
  brand_pieno: {
    lettera: 'A',
    nome: 'Colore del brand',
    descrizione: 'Fondo pieno nel colore del brand, parole chiave evidenziate, foto o schermate in una card.',
  },
  foto_editoriale: {
    lettera: 'B',
    nome: 'Foto editoriale',
    descrizione: 'Foto vera a tutta pagina in copertina, pagine interne chiare con numeri grandi.',
  },
  carta_clinica: {
    lettera: 'C',
    nome: 'Carta clinica',
    descrizione: 'Fondo color carta, titoli con grazie, righe sottili: sobrio e autorevole.',
  },
};

export function isLayoutId(x: unknown): x is LayoutId {
  return typeof x === 'string' && (LAYOUT_IDS as readonly string[]).includes(x);
}

/** Dimensioni fisse: i layout sono pensati per il 4:5 di Instagram. */
export const LARGHEZZA = 1080;
export const ALTEZZA = 1350;
const M = 88;
const CONTENUTO = LARGHEZZA - 2 * M;

// ── Colori ──────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

/** Mescola a con b: t = 0 → a, t = 1 → b. */
export function mescola(a: string, b: string, t: number): string {
  const x = hexToRgb(a) || [0, 0, 0];
  const y = hexToRgb(b) || [0, 0, 0];
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

function luminanza(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

export function contrasto(a: string, b: string): number {
  const la = luminanza(a);
  const lb = luminanza(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Scurisce (o schiarisce) c finché non contrasta almeno `minimo` con fondo. */
function leggibileSu(c: string, fondo: string, minimo: number): string {
  const verso = luminanza(fondo) > 0.4 ? '#000000' : '#ffffff';
  let out = c;
  for (let t = 0.08; contrasto(out, fondo) < minimo && t <= 1; t += 0.08) out = mescola(c, verso, t);
  return out;
}

function saturazione(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const max = Math.max(...rgb) / 255;
  const min = Math.min(...rgb) / 255;
  return max === 0 ? 0 : (max - min) / max;
}

/** Distanza fra due colori (0-441). */
function distanza(a: string, b: string): number {
  const x = hexToRgb(a) || [0, 0, 0];
  const y = hexToRgb(b) || [0, 0, 0];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

export const GIALLO_EVIDENZA = '#ffd43b';
const CARTA = '#f5f3ee';
const CARTA_CLINICA = '#f3efe6';

export type ColoriLayout = {
  /** Colore del brand così com'è. */
  primario: string;
  /** Colore delle parole chiave sui fondi scuri. */
  evidenza: string;
  /** A: fondo sfumato. */
  a_luce: string;
  a_medio: string;
  a_fondo: string;
  a_tenue: string;
  /** B e C: fondi chiari, inchiostro, accento leggibile sulla carta. */
  carta: string;
  carta_clinica: string;
  notte: string;
  inchiostro: string;
  accento_su_carta: string;
  grigio: string;
  linea: string;
};

/** Colori di riserva per l'evidenza quando né il secondario né il giallo vanno. */
const EVIDENZE_DI_RISERVA = ['#5eead4', '#93c5fd', '#f9a8d4'];

/**
 * Colore delle parole chiave sul fondo A: il secondario del kit (anche
 * schiarito), poi il giallo, poi una riserva. Deve leggersi sia sul fondo
 * scuro sia sul punto più chiaro e non somigliare al primario: con un brand
 * giallo l'evidenza gialla spariva nello sfondo.
 */
function sceltaEvidenza(p: string, s: string | null, luce: string, fondo: string): string {
  const va = (c: string) => contrasto(c, fondo) >= 4.5 && contrasto(c, luce) >= 2.2 && distanza(c, p) > 90;
  if (s && saturazione(s) > 0.35) {
    if (va(s)) return s;
    const chiaro = leggibileSu(s, fondo, 4.5);
    if (saturazione(chiaro) > 0.35 && va(chiaro)) return chiaro;
  }
  if (va(GIALLO_EVIDENZA)) return GIALLO_EVIDENZA;
  return EVIDENZE_DI_RISERVA.find(va) ?? GIALLO_EVIDENZA;
}

/**
 * Colori dei layout da due colori del Brand Kit. Il primario comanda; il
 * secondario diventa il colore di evidenza solo se si legge sul fondo scuro
 * e non è un doppione del primario, altrimenti giallo.
 */
export function coloriLayout(primario: string, secondario?: string | null): ColoriLayout {
  const p = hexToRgb(primario) ? primario.toLowerCase() : '#6d3cf0';
  const a_fondo = mescola(p, '#05030f', 0.8);
  // Il punto più chiaro dello sfondo A è il colore del brand: se è chiaro
  // (rosa, giallo, azzurro) lo si scurisce finché il bianco ci si legge
  // sopra. Prima i titoli bianchi sparivano (prova del 07/11/2026).
  const a_luce = leggibileSu(p, '#ffffff', 3.2);
  const s = secondario && hexToRgb(secondario) ? secondario.toLowerCase() : null;
  const evidenza = sceltaEvidenza(p, s, a_luce, a_fondo);
  const inchiostro = mescola(p, '#0d1326', 0.86);
  return {
    primario: p,
    evidenza,
    a_luce,
    a_medio: mescola(a_luce, '#05030f', 0.45),
    a_fondo,
    a_tenue: mescola(p, '#ffffff', 0.78),
    carta: CARTA,
    carta_clinica: CARTA_CLINICA,
    notte: mescola(p, '#0b1024', 0.88),
    inchiostro,
    accento_su_carta: leggibileSu(p, CARTA, 4.5),
    grigio: mescola(inchiostro, CARTA, 0.45),
    linea: mescola(inchiostro, CARTA_CLINICA, 0.78),
  };
}

// ── Testo ───────────────────────────────────────────────────────────

/** Toglie i segni di evidenza e gli a capo forzati. */
export function testoPiano(s: string): string {
  return String(s || '').replace(/\*/g, '').replace(/\s*\n\s*/g, ' ').trim();
}

type Famiglia = 'Inter' | 'Fraunces';

/** Larghezza stimata di un testo in em (Inter 800-900, Fraunces 600). */
function larghezzaEm(t: string, famiglia: Famiglia): number {
  let w = 0;
  for (const ch of t) {
    if (ch === ' ') w += 0.27;
    else if (/[A-ZÀ-Ý0-9€%]/.test(ch)) w += 0.68;
    else if (/[a-zà-ÿ]/.test(ch)) w += /[ijlrtf]/.test(ch) ? 0.33 : 0.56;
    else w += 0.32;
  }
  return w * (famiglia === 'Fraunces' ? 0.94 : 1);
}

/**
 * Corpo più grande (≤ base) con cui il testo sta in `maxRighe` righe di
 * `larghezza` px, rispettando gli a capo forzati.
 */
export function corpoAdatto(testo: string, base: number, maxRighe: number, larghezza: number, famiglia: Famiglia = 'Inter'): number {
  const righeForzate = String(testo || '').replace(/\*/g, '').split('\n').map((r) => r.trim()).filter(Boolean);
  const righe = (corpo: number) => {
    let n = 0;
    for (const r of righeForzate) {
      let riga = 0;
      n++;
      for (const p of r.split(/\s+/)) {
        const w = larghezzaEm(p, famiglia) * corpo;
        const spazio = 0.27 * corpo;
        if (riga > 0 && riga + spazio + w > larghezza * 0.97) { n++; riga = w; }
        else riga += (riga > 0 ? spazio : 0) + w;
      }
    }
    return Math.max(1, n);
  };
  // Con gli a capo forzati ogni riga scelta deve restare una riga sola.
  const limite = righeForzate.length > 1 ? Math.min(maxRighe, righeForzate.length) : maxRighe;
  let corpo = base;
  while (corpo > 36 && righe(corpo) > limite) corpo -= 4;
  // Una parola sola più larga della riga: si stringe finché ci sta.
  const piuLunga = Math.max(0, ...righeForzate.flatMap((r) => r.split(/\s+/)).map((p) => larghezzaEm(p, famiglia)));
  while (corpo > 36 && piuLunga * corpo > larghezza * 0.97) corpo -= 4;
  return corpo;
}

/**
 * Un dato da mettere in grande (es. «70%», «500 €», «3 settimane») preso dal
 * titolo: solo se ha un'unità, così un numero d'ordine non diventa un dato,
 * e solo se apre il titolo («70% dei pazienti…»): tolto da metà frase
 * («2 buchi a 50 € = 500 €») la frase resterebbe rotta.
 */
export function estraiDato(testo: string): { dato: string; resto: string } | null {
  const t = String(testo || '').trim();
  const m = /^\*?(\d{1,3}(?:[.,]\d{1,3})*\s?(?:%|€|euro\b|minuti\b|ore\b|giorni\b|settimane\b|mesi\b|anni\b|volte\b|sedute\b))\*?/i.exec(t);
  if (!m) return null;
  const dato = m[1].replace(/\s?euro\b/i, ' €').trim();
  let resto = t.slice(m[0].length).replace(/^[\s,.:;–-]+/, '').trim();
  // Evidenza spezzata dal taglio («*500 € a settimana* persi»): testo piano.
  if ((resto.match(/\*/g) || []).length % 2 !== 0) resto = testoPiano(resto);
  return testoPiano(resto).length >= 6 ? { dato, resto } : null;
}

// ── Albero per Satori ───────────────────────────────────────────────

export type Nodo = { type: string; props: Record<string, unknown> };
type Figlio = Nodo | string | null | false | undefined;

function el(type: string, style: Record<string, unknown>, ...figli: Figlio[]): Nodo {
  const pulito: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(style)) if (v !== undefined && v !== null) pulito[k] = v;
  const children = figli.filter((f): f is Nodo | string => f !== null && f !== false && f !== undefined && f !== '');
  return {
    type,
    props: {
      style: type === 'div' ? { display: 'flex', ...pulito } : pulito,
      children: children.length === 0 ? undefined : children.length === 1 ? children[0] : children,
    },
  };
}

function img(src: string, w: number, h: number, style: Record<string, unknown> = {}): Nodo {
  return { type: 'img', props: { src, width: w, height: h, style: { width: w, height: h, objectFit: 'cover', ...style } } };
}

/** Colore CSS (#rgb, #rrggbb, #rrggbbaa, rgba()) → stop SVG con opacità a parte. */
function stop(colore: string, offset: number): string {
  let col = colore.trim();
  let alfa = 1;
  const rgba = col.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i);
  if (rgba) {
    col = `rgb(${rgba[1]},${rgba[2]},${rgba[3]})`;
    alfa = rgba[4] === undefined ? 1 : Number(rgba[4]);
  } else if (/^#[0-9a-f]{8}$/i.test(col)) {
    alfa = parseInt(col.slice(7), 16) / 255;
    col = col.slice(0, 7);
  }
  return `<stop offset="${offset}" stop-color="${col}" stop-opacity="${Math.round(alfa * 1000) / 1000}"/>`;
}

/**
 * Sfumatura a tutta slide come SVG nativo. Satori trasforma i gradienti CSS
 * in pattern che Resvg dipinge due volte: ~300 ms di CPU a slide in locale,
 * che sulle edge function sforavano i 2 s (07/11/2026, layout B mai usciti).
 */
function sfumatura(gradiente: string): Nodo {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGHEZZA}" height="${ALTEZZA}"><defs>${gradiente}</defs>` +
    `<rect width="${LARGHEZZA}" height="${ALTEZZA}" fill="url(#g)"/></svg>`;
  return img(`data:image/svg+xml;base64,${btoa(svg)}`, LARGHEZZA, ALTEZZA, { position: 'absolute', left: 0, top: 0 });
}

/** Come `radial-gradient(circle at x% y%, …)`: raggio fino all'angolo più lontano. */
function radiale(x: number, y: number, stops: Array<[string, number]>): Nodo {
  const cx = (LARGHEZZA * x) / 100;
  const cy = (ALTEZZA * y) / 100;
  const r = Math.max(...[[0, 0], [LARGHEZZA, 0], [0, ALTEZZA], [LARGHEZZA, ALTEZZA]].map(([a, b]) => Math.hypot(a - cx, b - cy)));
  return sfumatura(`<radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${Math.round(r)}">` +
    stops.map(([c, o]) => stop(c, o)).join('') + '</radialGradient>');
}

/** Come `linear-gradient(180deg, …)`: dall'alto in basso. */
function verticale(stops: Array<[string, number]>): Nodo {
  return sfumatura('<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">' + stops.map(([c, o]) => stop(c, o)).join('') + '</linearGradient>');
}

type Evidenza = { color?: string; bg?: string };

/** Testo con *parole evidenziate* e a capo forzati; ogni parola va a capo da sola. */
function ricco(
  testo: string,
  o: { size: number; weight: number; color: string; family?: Famiglia; lh?: number; ls?: number; hl?: Evidenza; extra?: Record<string, unknown> },
): Nodo {
  type Pezzo = { p?: string; dentro?: boolean; capo?: boolean; attacca?: boolean };
  const pezzi: Pezzo[] = [];
  let dentro = false;
  let attaccato = false; // il pezzo prima finisce senza spazio
  for (const parte of String(testo || '').split(/(\*|\n)/)) {
    if (parte === '*') { dentro = !dentro; continue; }
    if (parte === '\n') { pezzi.push({ capo: true }); attaccato = false; continue; }
    if (!parte) continue;
    const parole = dentro && parte.trim().length <= 24 ? [parte.trim()] : parte.split(/\s+/).filter(Boolean);
    parole.forEach((p, k) => pezzi.push({ p, dentro, attacca: k === 0 && attaccato && !/^\s/.test(parte) }));
    attaccato = !/\s$/.test(parte);
  }
  // «L'» + «agenda», «lunedì» + «?»: pezzi attaccati vanno a capo insieme.
  const gruppi: Pezzo[][] = [];
  for (const x of pezzi) {
    const ultimo = gruppi[gruppi.length - 1];
    if (x.attacca && ultimo && !ultimo[0].capo) ultimo.push(x);
    else gruppi.push([x]);
  }
  const hl = o.hl || {};
  const parola = ({ p, dentro: d }: Pezzo) => !d
    ? el('span', {}, p)
    : el('span', {
      color: hl.color ?? o.color,
      backgroundColor: hl.bg,
      padding: hl.bg ? `0 ${Math.round(o.size * 0.1)}px` : undefined,
    }, p);
  return el('div', {
    flexWrap: 'wrap', columnGap: Math.round(o.size * 0.24), rowGap: Math.round(o.size * 0.04),
    fontFamily: o.family || 'Inter', fontSize: o.size, fontWeight: o.weight, lineHeight: o.lh ?? 1.04,
    letterSpacing: o.ls ?? 0, color: o.color, ...(o.extra || {}),
  }, ...gruppi.map((g) => {
    if (g[0].capo) return el('div', { width: '100%', height: 0 });
    return g.length === 1 ? parola(g[0]) : el('div', {}, ...g.map(parola));
  }));
}

export type Immagine = { src: string; w: number; h: number };

export type InputSlide = {
  layout: LayoutId;
  role: LayoutRole;
  colori: ColoriLayout;
  /** Nome dello studio: scritto al posto del logo se il logo manca. */
  nome: string;
  logo: Immagine | null;
  /** Foto o schermata (data URL); null = versione senza foto. */
  foto: string | null;
  /** Etichetta di copertina (es. «Studi e centri sanitari»). */
  etichetta: string;
  titolo: string;
  testo?: string;
  /**
   * Testo del pulsante della chiusura: il `bottone_cta` del copy («Commenta
   * VERTIGINI»). Se manca, il pulsante è l'ultima frase breve del testo.
   */
  azione?: string;
  /** Numero d'ordine («02») delle slide di contenuto. */
  numero?: string;
  indice: number;
  totale: number;
};

/**
 * Nome dello studio al posto del logo: parole intere, mai tagliate a metà
 * («Dott.ssa Laura Verdi Nutrizi» usciva così).
 */
export function nomeCorto(nome: string, max = 34): string {
  const t = testoPiano(nome);
  if (t.length <= max) return t;
  let out = '';
  for (const parola of t.split(' ')) {
    const prova = out ? `${out} ${parola}` : parola;
    if (prova.length > max) break;
    out = prova;
  }
  return out || t.slice(0, max);
}

/** Logo dentro una pillola bianca (o il nome se il logo non c'è). */
function marchio(i: InputSlide, sfondo: string | null, altezza = 64): Nodo {
  const h = sfondo ? altezza - 24 : altezza;
  const dentro = i.logo
    ? img(i.logo.src, Math.min(360, Math.round(i.logo.w * h / Math.max(1, i.logo.h))), h, { objectFit: 'contain' })
    : el('span', { fontFamily: 'Inter', fontSize: Math.round(altezza * (nomeCorto(i.nome).length <= 24 ? 0.42 : 0.36)), fontWeight: 800, color: i.colori.inchiostro, letterSpacing: -0.5 }, nomeCorto(i.nome));
  if (!sfondo) return el('div', { alignItems: 'center', height: altezza }, dentro);
  return el('div', { backgroundColor: sfondo, borderRadius: 18, padding: '12px 20px', alignItems: 'center' }, dentro);
}

function contatore(i: InputSlide, color: string): Nodo {
  return el('div', { fontFamily: 'Inter', fontSize: 26, fontWeight: 600, letterSpacing: 2, color }, `${i.indice + 1}/${i.totale}`);
}

function scorri(i: InputSlide, color: string): Nodo | null {
  if (i.indice >= i.totale - 1) return null;
  return el('div', { position: 'absolute', right: M, bottom: 64, fontFamily: 'Inter', fontSize: 26, fontWeight: 700, letterSpacing: 3, color }, 'SCORRI ›');
}

/** Colonna di testo centrata in verticale fra `da` e `a` (px dall'alto). */
function centrato(da: number, a: number, style: Record<string, unknown>, ...figli: Figlio[]): Nodo {
  return el('div', { position: 'absolute', left: M, top: da, width: CONTENUTO, height: a - da, flexDirection: 'column', justifyContent: 'center', ...style }, ...figli);
}

function numeroOrdine(i: InputSlide): string {
  const n = String(i.numero || i.indice + 1).replace(/\D/g, '');
  return (n || String(i.indice + 1)).padStart(2, '0');
}

/** Pulsante della chiusura: il testo corto diventa il pulsante, quello lungo resta testo. */
function divideChiusura(testo?: string): { sotto: string; azione: string } {
  const t = testoPiano(testo || '');
  if (!t) return { sotto: '', azione: '' };
  if (t.length <= 48) return { sotto: '', azione: t };
  const frasi = t.split(/(?<=[.!?])\s+/);
  const ultima = frasi[frasi.length - 1];
  if (frasi.length > 1 && ultima.length <= 48) return { sotto: frasi.slice(0, -1).join(' '), azione: ultima };
  return { sotto: t, azione: '' };
}

/** Oltre questa lunghezza un «pulsante» non è un pulsante: resta nel testo. */
const AZIONE_MAX = 64;

/**
 * Testo e pulsante dell'ultima slide. Il pulsante è l'azione del copy, la
 * stessa della didascalia: fino al 09/11/2026 non arrivava alle slide e il
 * post diceva «Commenta VERTIGINI» mentre la grafica diceva altro.
 */
export function chiusura(i: Pick<InputSlide, 'testo' | 'azione'>): { sotto: string; azione: string } {
  const azione = testoPiano(i.azione || '');
  if (!azione || azione.length > AZIONE_MAX) return divideChiusura(i.testo);
  const testo = testoPiano(i.testo || '');
  const piatto = (x: string) => x.toLocaleLowerCase('it').replace(/[\s.!?…:»«"']+$/u, '').trim();
  // Il testo ripete il pulsante: non si scrive due volte.
  if (piatto(testo) === piatto(azione)) return { sotto: '', azione };
  if (piatto(testo).endsWith(piatto(azione))) {
    const fin = testo.toLocaleLowerCase('it').lastIndexOf(piatto(azione));
    return { sotto: testo.slice(0, fin).replace(/[\s:,;–-]+$/u, '').trim(), azione };
  }
  return { sotto: testo, azione };
}

// ── A · Colore del brand ────────────────────────────────────────────

function layoutA(i: InputSlide): Figlio[] {
  const c = i.colori;
  const sfondo = (x: number, y: number) => radiale(x, y, [[c.a_luce, 0], [c.a_medio, 0.38], [c.a_fondo, 0.78]]);
  const testa = el('div', { position: 'absolute', left: M, top: 70, width: CONTENUTO, justifyContent: 'space-between', alignItems: 'center' },
    marchio(i, '#ffffff'), contatore(i, 'rgba(255,255,255,0.7)'));
  // Ombra a strati senza sfocatura: il boxShadow sfocato costava 3 s di CPU
  // a slide in Resvg, oltre il limite delle edge function.
  const ombra = (rot: number, top: number, dy: number, allarga: number, alfa: number) => el('div', {
    position: 'absolute', left: 90 - allarga, top: top + dy, width: 910 + 2 * allarga, height: 550 + allarga,
    borderRadius: 30 + allarga, backgroundColor: `rgba(0,0,0,${alfa})`, transform: `rotate(${rot}deg)`,
  });
  const card = (rot: number, top: number) => i.foto
    ? el('div', { position: 'absolute', left: 0, top: 0, width: LARGHEZZA, height: ALTEZZA },
      ombra(rot, top, 46, 14, 0.12), ombra(rot, top, 30, 6, 0.16), ombra(rot, top, 16, 0, 0.2),
      el('div', {
        position: 'absolute', left: 90, top, borderRadius: 30, overflow: 'hidden',
        border: '5px solid rgba(255,255,255,0.92)', transform: `rotate(${rot}deg)`,
      }, img(i.foto, 900, 540)))
    : null;
  const hl = { color: c.evidenza };

  if (i.role === 'cover') {
    const conFoto = !!i.foto;
    const corpo = corpoAdatto(i.titolo, conFoto ? 124 : 140, conFoto ? 3 : 5, CONTENUTO);
    return [
      sfondo(80, 25), testa,
      (conFoto
        ? (...f: Figlio[]) => el('div', { position: 'absolute', left: M, top: 210, width: CONTENUTO, flexDirection: 'column', gap: 34 }, ...f)
        : (...f: Figlio[]) => centrato(170, 1200, { gap: 34 }, ...f))(
        i.etichetta ? el('div', {},
          el('div', {
            alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.35)',
            borderRadius: 999, padding: '10px 26px 10px 18px', fontFamily: 'Inter', fontSize: 28, fontWeight: 800, color: '#ffffff',
          }, el('div', { width: 14, height: 14, borderRadius: 7, backgroundColor: c.evidenza }), testoPiano(i.etichetta))) : null,
        ricco(i.titolo, { size: corpo, weight: 900, color: '#ffffff', ls: -3, lh: 1.0, hl }),
        i.testo ? el('div', { fontFamily: 'Inter', fontSize: 40, fontWeight: 600, color: c.a_tenue, lineHeight: 1.3 }, testoPiano(i.testo)) : null),
      card(-3, 770),
      conFoto ? null : scorri(i, '#ffffff'),
    ];
  }

  if (i.role === 'content') {
    const dato = estraiDato(i.titolo);
    const titolo = dato ? dato.resto : i.titolo;
    return [
      sfondo(15, 85), testa,
      centrato(170, 1200, {},
        dato
          ? el('div', { fontFamily: 'Inter', fontSize: corpoAdatto(dato.dato, 250, 1, CONTENUTO), fontWeight: 900, letterSpacing: -10, color: c.evidenza, lineHeight: 1 }, dato.dato)
          : el('div', { fontFamily: 'Inter', fontSize: 120, fontWeight: 900, letterSpacing: -4, color: c.evidenza, lineHeight: 1 }, numeroOrdine(i)),
        ricco(titolo, { size: corpoAdatto(titolo, dato ? 64 : 100, dato ? 3 : 4, CONTENUTO), weight: dato ? 800 : 900, color: '#ffffff', ls: dato ? -1 : -2.5, hl, extra: { marginTop: dato ? 18 : 30 } }),
        i.testo ? ricco(i.testo, { size: corpoAdatto(i.testo, 44, 8, CONTENUTO), weight: 500, color: c.a_tenue, lh: 1.3, hl, extra: { marginTop: 48 } }) : null),
      scorri(i, '#ffffff'),
    ];
  }

  const { sotto, azione } = chiusura(i);
  const conFoto = !!i.foto;
  return [
    sfondo(50, 15), testa,
    (conFoto
      ? (...f: Figlio[]) => el('div', { position: 'absolute', left: M, top: 210, width: CONTENUTO, flexDirection: 'column', gap: 30 }, ...f)
      : (...f: Figlio[]) => centrato(170, 1200, { gap: 30 }, ...f))(
      ricco(i.titolo, { size: corpoAdatto(i.titolo, conFoto ? 100 : 116, conFoto ? 3 : 4, CONTENUTO), weight: 900, color: '#ffffff', ls: -3, hl }),
      sotto ? el('div', { fontFamily: 'Inter', fontSize: 40, fontWeight: 600, color: c.a_tenue, lineHeight: 1.3 }, sotto) : null,
      azione ? el('div', {}, el('div', {
        backgroundColor: c.evidenza, color: c.a_fondo, borderRadius: 999, padding: '22px 40px',
        fontFamily: 'Inter', fontSize: corpoAdatto(azione, 38, 1, CONTENUTO - 80), fontWeight: 900,
      }, azione)) : null),
    card(3, 860),
  ];
}

// ── B · Foto editoriale ─────────────────────────────────────────────

function layoutB(i: InputSlide): Figlio[] {
  const c = i.colori;
  if (i.role === 'cover') {
    const corpo = corpoAdatto(i.titolo, 116, 4, CONTENUTO);
    return [
      el('div', { position: 'absolute', left: 0, top: 0, width: LARGHEZZA, height: ALTEZZA, backgroundColor: c.notte }),
      i.foto ? img(i.foto, LARGHEZZA, 900, { position: 'absolute', left: 0, top: 0 }) : null,
      i.foto
        ? verticale([['rgba(0,0,0,0.18)', 0], ['rgba(0,0,0,0)', 0.22], [`${c.notte}8c`, 0.5], [c.notte, 0.68]])
        : radiale(85, 10, [[mescola(c.primario, c.notte, 0.55), 0], [c.notte, 0.6]]),
      el('div', { position: 'absolute', left: M, top: 70, width: CONTENUTO, justifyContent: 'space-between', alignItems: 'center' },
        marchio(i, '#ffffff'), contatore(i, '#ffffff')),
      el('div', { position: 'absolute', left: M, bottom: 150, width: CONTENUTO, flexDirection: 'column', gap: 28 },
        i.etichetta ? el('div', { fontFamily: 'Inter', fontSize: 26, fontWeight: 700, letterSpacing: 5, color: mescola(c.primario, '#ffffff', 0.55) }, testoPiano(i.etichetta).toLocaleUpperCase('it')) : null,
        ricco(i.titolo, { size: corpo, weight: 800, color: '#ffffff', ls: -3, lh: 1.02, hl: { bg: c.primario } }),
        i.testo ? el('div', { fontFamily: 'Inter', fontSize: 38, fontWeight: 500, color: '#c9cce0', lineHeight: 1.3 }, testoPiano(i.testo)) : null),
      scorri(i, '#ffffff'),
    ];
  }

  if (i.role === 'content') {
    const dato = estraiDato(i.titolo);
    const titolo = dato ? dato.resto : i.titolo;
    return [
      el('div', { position: 'absolute', left: 0, top: 0, width: LARGHEZZA, height: ALTEZZA, backgroundColor: c.carta }),
      el('div', { position: 'absolute', left: M, top: 70, width: CONTENUTO, justifyContent: 'space-between', alignItems: 'center' },
        marchio(i, null, 52), contatore(i, c.grigio)),
      el('div', { position: 'absolute', left: M, top: 200, width: CONTENUTO, flexDirection: 'column' },
        el('div', { fontFamily: 'Inter', fontSize: dato ? corpoAdatto(dato.dato, 250, 1, CONTENUTO) : 200, fontWeight: 900, letterSpacing: dato ? -12 : -8, color: c.accento_su_carta, lineHeight: 0.95 }, dato ? dato.dato : numeroOrdine(i)),
        ricco(titolo, { size: corpoAdatto(titolo, 88, 4, CONTENUTO), weight: 800, color: c.inchiostro, ls: -2.5, hl: { color: c.accento_su_carta }, extra: { marginTop: 24 } }),
        i.testo ? el('div', { width: CONTENUTO, height: 2, backgroundColor: c.inchiostro, marginTop: 50 }) : null,
        i.testo ? ricco(i.testo, { size: corpoAdatto(i.testo, 40, 8, CONTENUTO), weight: 500, color: c.inchiostro, lh: 1.32, hl: { color: c.accento_su_carta }, extra: { marginTop: 40 } }) : null),
      scorri(i, c.inchiostro),
    ];
  }

  const { sotto, azione } = chiusura(i);
  const alto = i.foto ? 690 : 0;
  return [
    el('div', { position: 'absolute', left: 0, top: 0, width: LARGHEZZA, height: ALTEZZA, backgroundColor: c.carta }),
    i.foto ? img(i.foto, LARGHEZZA, 760, { position: 'absolute', left: 0, top: 0 }) : null,
    el('div', { position: 'absolute', left: M, top: 70 }, marchio(i, i.foto ? '#ffffff' : null)),
    i.foto ? el('div', { position: 'absolute', left: 0, top: alto, width: LARGHEZZA, height: ALTEZZA - alto, backgroundColor: c.carta, borderRadius: '48px 48px 0 0' }) : null,
    el('div', { position: 'absolute', left: M, top: i.foto ? 760 : 340, width: CONTENUTO, flexDirection: 'column', gap: 26 },
      ricco(i.titolo, { size: corpoAdatto(i.titolo, i.foto ? 92 : 112, i.foto ? 3 : 5, CONTENUTO), weight: 800, color: c.inchiostro, ls: -2.5, hl: { color: c.accento_su_carta } }),
      sotto ? el('div', { fontFamily: 'Inter', fontSize: 36, fontWeight: 500, color: c.grigio, lineHeight: 1.3 }, sotto) : null,
      azione ? el('div', { marginTop: 10 }, el('div', {
        backgroundColor: c.inchiostro, color: '#ffffff', borderRadius: 999, padding: '22px 40px',
        fontFamily: 'Inter', fontSize: corpoAdatto(azione, 34, 1, CONTENUTO - 80), fontWeight: 800,
      }, azione)) : null),
  ];
}

// ── C · Carta clinica ───────────────────────────────────────────────

function layoutC(i: InputSlide): Figlio[] {
  const c = i.colori;
  const scura = i.role === 'cta';
  const fondo = scura ? c.inchiostro : c.carta_clinica;
  const inchiostro = scura ? c.carta_clinica : c.inchiostro;
  const accento = scura ? mescola(c.primario, '#ffffff', 0.45) : leggibileSu(c.primario, c.carta_clinica, 4.5);
  const tenue = scura ? 'rgba(243,239,230,0.72)' : mescola(c.inchiostro, c.carta_clinica, 0.42);
  const etichetta = i.role === 'cover' ? testoPiano(i.etichetta) : '';
  const testa = el('div', {
    position: 'absolute', left: M, top: 76, width: CONTENUTO, justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 26, borderBottom: `2px solid ${scura ? 'rgba(255,255,255,0.4)' : c.inchiostro}`,
  },
  marchio(i, scura ? '#ffffff' : null, scura ? 60 : 48),
  el('div', { gap: 26, alignItems: 'center', fontFamily: 'Inter', fontSize: 24, fontWeight: 700, letterSpacing: 3, color: inchiostro },
    etichetta ? el('span', {}, etichetta.toLocaleUpperCase('it').slice(0, 34)) : null,
    el('span', { color: tenue }, `${i.indice + 1}/${i.totale}`)));
  const base = el('div', { position: 'absolute', left: 0, top: 0, width: LARGHEZZA, height: ALTEZZA, backgroundColor: fondo });

  if (i.role === 'cover') {
    const conFoto = !!i.foto;
    return [
      base, testa,
      (conFoto
        ? (...f: Figlio[]) => el('div', { position: 'absolute', left: M, top: 230, width: CONTENUTO, flexDirection: 'column', gap: 30 }, ...f)
        : (...f: Figlio[]) => centrato(180, 1170, { gap: 30 }, ...f))(
        ricco(i.titolo, { size: corpoAdatto(i.titolo, conFoto ? 124 : 144, conFoto ? 4 : 5, CONTENUTO, 'Fraunces'), weight: 600, family: 'Fraunces', color: inchiostro, ls: -3, lh: 1.0, hl: { color: accento } }),
        i.testo ? el('div', { fontFamily: 'Inter', fontSize: 38, fontWeight: 500, color: tenue, lineHeight: 1.3 }, testoPiano(i.testo)) : null),
      conFoto ? el('div', { position: 'absolute', left: M, bottom: 90, borderRadius: 28, overflow: 'hidden' }, img(i.foto!, CONTENUTO, 430)) : null,
      conFoto ? null : el('div', {
        position: 'absolute', left: M, bottom: 80, width: CONTENUTO, justifyContent: 'space-between', paddingTop: 24,
        borderTop: `2px solid ${c.inchiostro}`, fontFamily: 'Inter', fontSize: 26, fontWeight: 700, letterSpacing: 3, color: inchiostro,
      }, el('span', {}, nomeCorto(i.nome, 30).toLocaleUpperCase('it')), el('span', {}, 'SCORRI ›')),
    ];
  }

  if (i.role === 'content') {
    const dato = estraiDato(i.titolo);
    const titolo = dato ? dato.resto : i.titolo;
    return [
      base, testa,
      el('div', { position: 'absolute', left: M, top: 220, width: CONTENUTO, flexDirection: 'column' },
        el('div', { fontFamily: 'Fraunces', fontSize: dato ? corpoAdatto(dato.dato, 270, 1, CONTENUTO, 'Fraunces') : 180, fontWeight: 600, letterSpacing: -8, color: accento, lineHeight: 0.95 }, dato ? dato.dato : numeroOrdine(i)),
        ricco(titolo, { size: corpoAdatto(titolo, 92, 4, CONTENUTO, 'Fraunces'), weight: 600, family: 'Fraunces', color: inchiostro, ls: -2, hl: { color: accento }, extra: { marginTop: 26 } }),
        i.testo ? el('div', { marginTop: 54, borderLeft: `6px solid ${accento}`, paddingLeft: 30 },
          ricco(i.testo, { size: corpoAdatto(i.testo, 38, 8, CONTENUTO - 40), weight: 500, color: inchiostro, lh: 1.32, hl: { color: accento } })) : null),
    ];
  }

  const { sotto, azione } = chiusura(i);
  return [
    base, testa,
    el('div', { position: 'absolute', left: M, top: 300, width: CONTENUTO, flexDirection: 'column', gap: 36 },
      ricco(i.titolo, { size: corpoAdatto(i.titolo, 120, 4, CONTENUTO, 'Fraunces'), weight: 600, family: 'Fraunces', color: inchiostro, ls: -3, lh: 1.0, hl: { color: accento } }),
      sotto ? el('div', { fontFamily: 'Inter', fontSize: 38, fontWeight: 500, color: tenue, lineHeight: 1.3 }, sotto) : null),
    azione ? el('div', {
      position: 'absolute', left: M, bottom: 120, width: CONTENUTO, justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: c.carta_clinica, borderRadius: 24, padding: '34px 40px',
    },
    el('div', { fontFamily: 'Inter', fontSize: corpoAdatto(azione, 34, 1, CONTENUTO - 160), fontWeight: 800, color: c.inchiostro }, azione),
    el('div', { fontFamily: 'Inter', fontSize: 44, fontWeight: 800, color: leggibileSu(c.primario, c.carta_clinica, 4.5) }, '›')) : null,
  ];
}

/** L'albero completo della slide, pronto per Satori (1080×1350). */
export function alberoSlide(i: InputSlide): Nodo {
  const figli = i.layout === 'brand_pieno' ? layoutA(i) : i.layout === 'foto_editoriale' ? layoutB(i) : layoutC(i);
  // Niente overflow hidden: Satori metterebbe una maschera annidata su ogni
  // elemento (20 maschere a slide, il grosso della CPU di Resvg). Taglia già l'SVG.
  return el('div', { position: 'relative', width: LARGHEZZA, height: ALTEZZA, fontFamily: 'Inter' }, ...figli);
}

/** Quali slide del layout vogliono una foto (le altre la ignorano). */
export function vuoleFoto(layout: LayoutId, role: LayoutRole): 'serve' | 'se_c_e' | 'no' {
  if (role === 'content') return 'no';
  if (layout === 'foto_editoriale') return 'serve';
  return 'se_c_e';
}

/**
 * Genoma del brand del pilota delle scoperte (campi `stile_pilota` o
 * `logo_slots`): ha una produzione sua e il suo template non si tocca.
 */
export function genomaDelPilota(genomaBrand: unknown): boolean {
  if (!genomaBrand || typeof genomaBrand !== 'object') return false;
  const g = genomaBrand as Record<string, unknown>;
  return g.stile_pilota != null || g.logo_slots != null;
}

/**
 * Le slide le disegna ancora il modello delle immagini (NB2) sul template
 * approvato? Dal 10/11/2026 solo per il brand del pilota. Per tutti gli altri
 * template approvati prima del 06/11/2026 la produzione passa ai layout, col
 * testo impaginato parola per parola: su quei template il modello scriveva
 * «CERVIVELLO», fondeva le righe e copriva le illustrazioni (revisione del
 * reparto social, 09/11/2026).
 */
export function produceConNb2(templateCompleto: boolean, layoutDellaVariante: unknown, genomaBrand: unknown): boolean {
  return templateCompleto && !isLayoutId(layoutDellaVariante) && genomaDelPilota(genomaBrand);
}

/**
 * Brand con un template approvato del tipo vecchio (disegnato dal modello),
 * che non comanda più le slide: la pagina glielo dice.
 */
export function templateVecchio(genesisStatus: unknown, genomaBrand: unknown): boolean {
  if (genesisStatus !== 'locked' || genomaDelPilota(genomaBrand)) return false;
  const layout = genomaBrand && typeof genomaBrand === 'object' ? (genomaBrand as { layout?: unknown }).layout : null;
  return !isLayoutId(layout);
}

/** Layout proposto per primo: chi ha foto proprie parte dalla foto. */
export function layoutConsigliato(haFoto: boolean): LayoutId {
  return haFoto ? 'foto_editoriale' : 'brand_pieno';
}

/**
 * Layout di base per un brand senza template scelto: le slide escono lo
 * stesso (Attilio, 07/11/2026: «se qualcuno non mette il brand, devi
 * comunque generare delle immagini fighe»). Vale il layout del genoma se
 * c'è, altrimenti A nei colori del brand; B solo con foto vere, perché
 * copertina e chiusura senza foto restano vuote.
 */
export function layoutDiBase(genomeLayout: unknown, haFoto: boolean): LayoutId {
  if (isLayoutId(genomeLayout) && (genomeLayout !== 'foto_editoriale' || haFoto)) return genomeLayout;
  return 'brand_pieno';
}

const PAROLE_VUOTE = new Set([
  'perché', 'perche', 'quanti', 'quante', 'quanto', 'quando', 'quale', 'quali', 'come', 'cosa', 'dove',
  'sempre', 'anche', 'ancora', 'molto', 'tutti', 'tutte', 'tutto', 'questo', 'questa', 'questi', 'prima',
  'dopo', 'senza', 'della', 'delle', 'degli', 'nella', 'nelle', 'nostro', 'nostra', 'vostro', 'vostra',
  'essere', 'fare', 'stai', 'sono', 'hanno', 'puoi', 'devi', 'ogni', 'oppure', 'però', 'perciò',
]);

/**
 * Titoli della produzione senza asterischi: si evidenzia la parola piena più
 * lunga (a parità, la più avanti), mai le parole di servizio.
 */
export function evidenziaAuto(titolo: string): string {
  const t = String(titolo || '');
  if (t.includes('*')) return t;
  const parole = [...t.matchAll(/[\p{L}][\p{L}'’]*/gu)];
  let scelta: { da: number; w: string } | null = null;
  for (const p of parole) {
    // «L'agenda» → si evidenzia «agenda».
    const w = p[0].replace(/^[\p{L}]+['’]/u, '');
    if (w.length < 5 || PAROLE_VUOTE.has(w.toLocaleLowerCase('it'))) continue;
    if (!scelta || w.length >= scelta.w.length) scelta = { da: (p.index ?? 0) + p[0].length - w.length, w };
  }
  if (!scelta) return t;
  return t.slice(0, scelta.da) + '*' + scelta.w + '*' + t.slice(scelta.da + scelta.w.length);
}
