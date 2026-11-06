// Testi di prova delle 3 slide del template a layout.
//
// Prima il template mostrava una frase fissa per paziente («Perché rimandi
// sempre quel controllo») anche a chi vende un gestionale agli studi. Qui i
// testi li scrive Gemini dal Brand Kit, rivolti al pubblico vero del brand,
// con le parole dei clienti quando ci sono; se la risposta non è valida si
// usa il segnaposto della professione.
//
// File PURO, specchiato in supabase/functions/_shared/brand/layoutCopy.ts.

import type { PlaceholderCopy } from './genesisPrompt.ts';

export type TestiProva = {
  etichetta: string;
  copertina: { titolo: string; sotto: string };
  contenuto: { titolo: string; testo: string };
  chiusura: { titolo: string; testo: string };
};

export type BrandPerTesti = {
  nome_business?: string | null;
  professione?: string | null;
  descrizione?: string | null;
  target_pazienti?: string | null;
  servizi?: string[] | null;
  vantaggi_competitivi?: string[] | null;
  cta_suggerite?: string[] | null;
  frasi_pazienti?: string[] | null;
  convinzione_da_ribaltare?: string | null;
};

function lista(v: string[] | null | undefined, max: number): string {
  return (Array.isArray(v) ? v : []).filter((x) => typeof x === 'string' && x.trim()).slice(0, max).join('; ');
}

export function promptTestiProva(b: BrandPerTesti, feedback?: string): string {
  const righe = [
    'Scrivi i testi di prova di un carosello Instagram per questo brand. Servono a far vedere il template: devono sembrare un post vero, pubblicabile così.',
    '',
    'BRAND',
    'Nome: ' + (b.nome_business || 'Studio'),
    b.professione ? 'Attività: ' + b.professione : '',
    b.descrizione ? 'Descrizione: ' + b.descrizione : '',
    b.target_pazienti ? 'A chi parla (il pubblico dei post): ' + b.target_pazienti : '',
    lista(b.servizi, 6) ? 'Servizi: ' + lista(b.servizi, 6) : '',
    lista(b.vantaggi_competitivi, 4) ? 'Vantaggi: ' + lista(b.vantaggi_competitivi, 4) : '',
    lista(b.cta_suggerite, 3) ? 'Inviti all\'azione del brand: ' + lista(b.cta_suggerite, 3) : '',
    lista(b.frasi_pazienti, 8) ? 'Parole vere dei clienti (usale): ' + lista(b.frasi_pazienti, 8) : '',
    b.convinzione_da_ribaltare ? 'Convinzione da ribaltare: ' + b.convinzione_da_ribaltare : '',
    feedback ? '\nRICHIESTA DEL CLIENTE (ha la precedenza): ' + feedback : '',
    '',
    'REGOLE',
    '- Italiano semplice e corretto, frasi che direbbe una persona, rivolte al pubblico del brand (non ad altri).',
    '- Copertina: un aggancio di massimo 8 parole, una domanda o un\'affermazione controcorrente su un problema concreto del pubblico. Metti UNA parola chiave fra asterischi, es. «Quanti *buchi* hai nel lunedì?».',
    '- Sottotitolo di copertina: massimo 10 parole.',
    '- Slide di contenuto: titolo di massimo 9 parole e testo di massimo 30 parole con un consiglio o un fatto concreto. Puoi mettere fra asterischi UNA frase breve del testo.',
    '- Chiusura: titolo di massimo 6 parole con un\'azione; testo di massimo 45 caratteri che diventa il pulsante (es. «Scrivici in direct per parlarne»).',
    '- Etichetta: chi è il pubblico in massimo 4 parole (es. «Studi e centri sanitari», «Per chi ha mal di schiena»).',
    '- Numeri, prezzi e durate solo se sono scritti qui sopra nel brand: mai inventarli. Niente statistiche inventate.',
    '- Niente emoji, niente lineette lunghe, niente «sbloccare», niente parole in inglese se c\'è quella italiana.',
    '',
    'Rispondi solo con JSON:',
    '{"etichetta":"…","copertina":{"titolo":"…","sotto":"…"},"contenuto":{"titolo":"…","testo":"…"},"chiusura":{"titolo":"…","testo":"…"}}',
  ];
  return righe.filter((r) => r !== '').join('\n');
}

function pulisci(s: unknown, max: number): string {
  const t = String(s ?? '')
    .replace(/\s+[‒–—―]\s+/g, ': ')
    .replace(/[‒–—―]/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? '' : t;
}

/** Testo valido o null: lunghezze massime e asterischi in coppia. */
export function leggiTestiProva(raw: string): TestiProva | null {
  try {
    const o = JSON.parse(String(raw || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    const t: TestiProva = {
      etichetta: pulisci(o?.etichetta, 34),
      copertina: { titolo: pulisci(o?.copertina?.titolo, 70), sotto: pulisci(o?.copertina?.sotto, 80) },
      contenuto: { titolo: pulisci(o?.contenuto?.titolo, 80), testo: pulisci(o?.contenuto?.testo, 220) },
      chiusura: { titolo: pulisci(o?.chiusura?.titolo, 50), testo: pulisci(o?.chiusura?.testo, 60) },
    };
    if (!t.copertina.titolo || !t.contenuto.titolo || !t.chiusura.titolo) return null;
    for (const s of [t.copertina.titolo, t.copertina.sotto, t.contenuto.titolo, t.contenuto.testo, t.chiusura.titolo, t.chiusura.testo]) {
      if ((s.match(/\*/g) || []).length % 2 !== 0) return null;
    }
    return t;
  } catch {
    return null;
  }
}

/** «PERCHÉ LA SPALLA FA MALE» → «Perché la spalla fa male». */
function frase(s: string): string {
  const t = s.trim();
  if (t !== t.toLocaleUpperCase('it')) return t;
  const basso = t.toLocaleLowerCase('it');
  return basso.charAt(0).toLocaleUpperCase('it') + basso.slice(1);
}

/** Riserva: il segnaposto della professione, in minuscolo normale. */
export function testiDaSegnaposto(copy: PlaceholderCopy): TestiProva {
  return {
    etichetta: frase(copy.cover.kicker),
    copertina: { titolo: frase(copy.cover.title), sotto: '' },
    contenuto: { titolo: frase(copy.content.title), testo: copy.content.body },
    chiusura: { titolo: frase(copy.cta.title), testo: copy.cta.body },
  };
}
