// Test dei 3 layout disegnati dal server e dei testi di prova.
import { describe, it, expect } from 'vitest';
import {
  LAYOUT_IDS, alberoSlide, coloriLayout, contrasto, corpoAdatto, estraiDato, evidenziaAuto,
  GIALLO_EVIDENZA, layoutConsigliato, vuoleFoto, type InputSlide, type Nodo,
} from '../layouts.ts';
import { genomaPerLayout, validateGenome } from '../genome.ts';
import { leggiTestiProva, promptTestiProva, testiDaSegnaposto } from '../layoutCopy.ts';
import { PLACEHOLDER } from '../genesisPrompt.ts';

/** Tutto il testo dell'albero, nell'ordine. */
function testi(n: Nodo | string | undefined): string[] {
  if (n === undefined) return [];
  if (typeof n === 'string') return [n];
  const c = n.props.children as Nodo | string | Array<Nodo | string> | undefined;
  return (Array.isArray(c) ? c : [c]).flatMap((x) => testi(x));
}

/** Nessuno stile undefined/null: Satori va in crash («reading 'trim'»). */
function stiliPuliti(n: Nodo | string | undefined): boolean {
  if (n === undefined || typeof n === 'string') return true;
  const st = (n.props.style || {}) as Record<string, unknown>;
  if (Object.values(st).some((v) => v === undefined || v === null)) return false;
  const c = n.props.children as Nodo | string | Array<Nodo | string> | undefined;
  return (Array.isArray(c) ? c : [c]).every((x) => stiliPuliti(x));
}

const BASE: Omit<InputSlide, 'layout' | 'role'> = {
  colori: coloriLayout('#6d3cf0', '#ffd43b'),
  nome: 'GestioMed',
  logo: null,
  foto: null,
  etichetta: 'Studi e centri sanitari',
  titolo: 'Quanti *buchi* hai nel lunedì?',
  testo: 'Commenta PROVA e ti mando il link',
  indice: 0,
  totale: 5,
};

describe('coloriLayout', () => {
  it('usa il secondario come evidenza se si legge sul fondo ed è diverso dal primario', () => {
    const c = coloriLayout('#6d3cf0', '#ffd43b');
    expect(c.evidenza).toBe('#ffd43b');
    expect(contrasto(c.evidenza, c.a_fondo)).toBeGreaterThanOrEqual(4.5);
  });

  it('il grigio Tailwind del kit sbagliato non diventa evidenza: giallo', () => {
    expect(coloriLayout('#dc2626', '#9ca3af').evidenza).toBe(GIALLO_EVIDENZA);
  });

  it('colore non valido: ripiega sul viola', () => {
    expect(coloriLayout('rosso').primario).toBe('#6d3cf0');
  });

  it("l'accento su carta si legge sempre (anche con un primario chiaro)", () => {
    const c = coloriLayout('#ffe066');
    expect(contrasto(c.accento_su_carta, c.carta)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('corpoAdatto', () => {
  it('rimpicciolisce i titoli lunghi', () => {
    const corto = corpoAdatto('Buchi in agenda', 140, 4, 904);
    const lungo = corpoAdatto('Perché i pazienti saltano gli appuntamenti del lunedì mattina in studio', 140, 4, 904);
    expect(lungo).toBeLessThan(corto);
  });

  it('con gli a capo forzati il limite è il numero di righe forzate', () => {
    const due = corpoAdatto('Prova *14 giorni*\ngratis', 140, 4, 904);
    expect(due).toBeLessThanOrEqual(140);
  });
});

describe('estraiDato', () => {
  it('prende il dato solo se apre il titolo', () => {
    expect(estraiDato('70% dei pazienti non torna')).toEqual({ dato: '70%', resto: 'dei pazienti non torna' });
    expect(estraiDato('2 buchi al giorno a 50 € = *500 € a settimana*')).toBeNull();
    expect(estraiDato('Perché 3 sedute non bastano')).toBeNull();
  });

  it("«euro» diventa €, l'evidenza spezzata diventa testo piano", () => {
    expect(estraiDato('500 euro persi ogni settimana')?.dato).toBe('500 €');
    expect(estraiDato('*500 € a settimana* persi così')?.resto).toBe('a settimana persi così');
  });

  it('un numero senza unità non è un dato', () => {
    expect(estraiDato('3 errori da evitare')).toBeNull();
  });
});

describe('evidenziaAuto', () => {
  it('evidenzia la parola piena più lunga, mai le parole di servizio', () => {
    expect(evidenziaAuto('Perché la spalla fa male')).toBe('Perché la *spalla* fa male');
    expect(evidenziaAuto("L'agenda piena non basta")).toBe("L'*agenda* piena non basta");
  });

  it('non tocca un titolo già marcato o senza parole adatte', () => {
    expect(evidenziaAuto('Il *mal* di schiena')).toBe('Il *mal* di schiena');
    expect(evidenziaAuto('Fa male')).toBe('Fa male');
  });
});

describe('alberoSlide', () => {
  for (const layout of LAYOUT_IDS) {
    for (const role of ['cover', 'content', 'cta'] as const) {
      it(`${layout} ${role}: testo esatto, una volta sola, stili puliti`, () => {
        const titolo = role === 'content' ? '70% dei pazienti *non torna*' : BASE.titolo;
        const albero = alberoSlide({ ...BASE, layout, role, titolo, indice: role === 'cta' ? 4 : role === 'content' ? 1 : 0 });
        const tutto = testi(albero).join(' ');
        const atteso = role === 'content' ? 'non torna' : 'buchi';
        expect(tutto.split(atteso).length - 1).toBe(1);
        expect(tutto).not.toContain('*');
        expect(stiliPuliti(albero)).toBe(true);
      });
    }
  }

  it('la chiusura con un testo breve lo mette nel pulsante, l\'ultima slide non dice SCORRI', () => {
    const albero = alberoSlide({ ...BASE, layout: 'brand_pieno', role: 'cta', titolo: 'Prova GestioMed', indice: 4 });
    const tutto = testi(albero);
    expect(tutto).toContain('Commenta PROVA e ti mando il link');
    expect(tutto.join(' ')).not.toContain('SCORRI');
  });

  it('senza logo scrive il nome dello studio', () => {
    expect(testi(alberoSlide({ ...BASE, layout: 'carta_clinica', role: 'cover' }))).toContain('GestioMed');
  });
});

describe('foto e layout consigliato', () => {
  it('B vuole la foto in copertina e chiusura, nessuno nel contenuto', () => {
    expect(vuoleFoto('foto_editoriale', 'cover')).toBe('serve');
    expect(vuoleFoto('brand_pieno', 'cover')).toBe('se_c_e');
    for (const l of LAYOUT_IDS) expect(vuoleFoto(l, 'content')).toBe('no');
  });

  it('chi ha foto proprie parte dalla foto editoriale, gli altri dal colore', () => {
    expect(layoutConsigliato(true)).toBe('foto_editoriale');
    expect(layoutConsigliato(false)).toBe('brand_pieno');
  });

  it('il genoma di ogni layout è valido', () => {
    for (const l of LAYOUT_IDS) {
      const r = validateGenome(genomaPerLayout(l, 'Studi e centri sanitari'));
      expect(r.errors).toEqual([]);
    }
  });

  it('un layout inventato non passa la validazione', () => {
    const r = validateGenome({ ...genomaPerLayout('brand_pieno', ''), layout: 'poster' });
    expect(r.ok).toBe(false);
  });
});

describe('testi di prova', () => {
  const buono = JSON.stringify({
    etichetta: 'Studi e centri sanitari',
    copertina: { titolo: 'Quanti *buchi* hai nel lunedì?', sotto: 'Il conto che nessuno fa' },
    contenuto: { titolo: '2 buchi al giorno fanno *500 € a settimana*', testo: 'Un promemoria il giorno prima riempie l’agenda.' },
    chiusura: { titolo: 'Prova GestioMed 14 giorni', testo: 'Commenta PROVA e ti mando il link' },
  });

  it('legge una risposta valida, anche dentro un blocco ```json', () => {
    expect(leggiTestiProva(buono)?.copertina.titolo).toBe('Quanti *buchi* hai nel lunedì?');
    expect(leggiTestiProva('```json\n' + buono + '\n```')).not.toBeNull();
  });

  it('scarta asterischi spaiati, titoli mancanti e JSON rotto', () => {
    const o = JSON.parse(buono);
    expect(leggiTestiProva(JSON.stringify({ ...o, copertina: { titolo: 'Quanti *buchi hai?', sotto: '' } }))).toBeNull();
    expect(leggiTestiProva(JSON.stringify({ ...o, chiusura: { titolo: '', testo: 'x' } }))).toBeNull();
    expect(leggiTestiProva('non è json')).toBeNull();
  });

  it('toglie le lineette lunghe', () => {
    const o = JSON.parse(buono);
    o.copertina.sotto = 'Il conto — che nessuno fa';
    expect(leggiTestiProva(JSON.stringify(o))?.copertina.sotto).toBe('Il conto: che nessuno fa');
  });

  it('il prompt porta il pubblico, le parole dei clienti e il feedback', () => {
    const p = promptTestiProva({
      nome_business: 'GestioMed', target_pazienti: 'Titolari di studi sanitari',
      frasi_pazienti: ['ho sempre buchi il lunedì'], cta_suggerite: ['Commenta PROVA'],
    }, 'più diretto');
    expect(p).toContain('Titolari di studi sanitari');
    expect(p).toContain('ho sempre buchi il lunedì');
    expect(p).toContain('più diretto');
    expect(p).toContain('mai inventarli');
  });

  it('la riserva porta il segnaposto in minuscolo normale', () => {
    const t = testiDaSegnaposto(PLACEHOLDER);
    expect(t.copertina.titolo).not.toBe(t.copertina.titolo.toUpperCase());
    expect(t.chiusura.testo).toBe(PLACEHOLDER.cta.body);
  });
});
