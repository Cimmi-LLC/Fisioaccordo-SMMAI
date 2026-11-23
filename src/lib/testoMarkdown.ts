// Markdown semplice nei testi che arrivano dal modello (grassetto, elenchi,
// a capo). Il 18/11 il reparto social vedeva «**Rilevanza e curiosità:**»
// con gli asterischi in «Perché funziona»: qui il testo si divide in pezzi
// che TestoMarkdown mostra senza HTML grezzo, e senzaMarkdown lo ripulisce
// per gli appunti (Instagram non legge il markdown).

export type PezzoInline = { testo: string; grassetto: boolean };

export type BloccoMarkdown =
  | { tipo: 'paragrafo'; righe: PezzoInline[][] }
  | { tipo: 'elenco'; numerato: boolean; voci: PezzoInline[][] };

const PUNTO = /^\s*(?:[-*•]|\d+[.)])\s+/;
const NUMERO = /^\s*\d+[.)]\s+/;

/** Divide una riga in pezzi normali e in grassetto (**x** o __x__). */
export function pezziInline(riga: string): PezzoInline[] {
  const pezzi: PezzoInline[] = [];
  const re = /\*\*(.+?)\*\*|__(.+?)__/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(riga))) {
    if (m.index > ultimo) pezzi.push({ testo: riga.slice(ultimo, m.index), grassetto: false });
    pezzi.push({ testo: m[1] ?? m[2], grassetto: true });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < riga.length) pezzi.push({ testo: riga.slice(ultimo), grassetto: false });
  // Asterischi rimasti spaiati o corsivi (*x*) e titoletti (## x): via i segni.
  return pezzi
    .map((p) => ({ ...p, testo: p.testo.replace(/^#{1,6}\s+/, '').replace(/\*+/g, '') }))
    .filter((p) => p.testo.length > 0);
}

/** Divide il testo in paragrafi ed elenchi. */
export function blocchiMarkdown(testo: string): BloccoMarkdown[] {
  const blocchi: BloccoMarkdown[] = [];
  for (const riga of (testo || '').replace(/\r\n?/g, '\n').split('\n')) {
    if (!riga.trim()) {
      // Riga vuota: chiude il blocco aperto.
      blocchi.push({ tipo: 'paragrafo', righe: [] });
      continue;
    }
    const ultimo = blocchi[blocchi.length - 1];
    if (PUNTO.test(riga)) {
      const numerato = NUMERO.test(riga);
      const voce = pezziInline(riga.replace(PUNTO, ''));
      if (ultimo && ultimo.tipo === 'elenco' && ultimo.numerato === numerato) ultimo.voci.push(voce);
      else blocchi.push({ tipo: 'elenco', numerato, voci: [voce] });
    } else if (ultimo && ultimo.tipo === 'paragrafo') {
      ultimo.righe.push(pezziInline(riga));
    } else {
      blocchi.push({ tipo: 'paragrafo', righe: [pezziInline(riga)] });
    }
  }
  return blocchi.filter((b) => (b.tipo === 'paragrafo' ? b.righe.length > 0 : b.voci.length > 0));
}

/** Lo stesso testo senza i segni del markdown, per copiarlo. */
export function senzaMarkdown(testo: string): string {
  return (testo || '')
    .split('\n')
    .map((riga) => {
      const punto = riga.match(/^\s*[*•]\s+/) ? riga.replace(/^\s*[*•]\s+/, '- ') : riga;
      return pezziInline(punto).map((p) => p.testo).join('');
    })
    .join('\n');
}
