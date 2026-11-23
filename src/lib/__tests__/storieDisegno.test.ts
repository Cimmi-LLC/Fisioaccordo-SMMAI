import { describe, expect, it } from 'vitest';
import { aCapo, impaginaRecensioni, impaginaStoria, type Elemento, type Misura } from '../storieDisegno';

// Misura finta: ogni carattere è largo poco più di metà del corpo del font.
const misura: Misura = (t, font) => {
  const corpo = Number((/(\d+)px/.exec(font) || [])[1] || 40);
  return t.length * corpo * 0.56;
};
const W = 1080, H = 1920;
const base = { W, H, font: "'Montserrat', sans-serif", primary: '#2d6a2d', secondary: '#c2410c', misura };
const testi = (el: Elemento[]) => el.filter((e): e is Extract<Elemento, { tipo: 'testo' }> => e.tipo === 'testo');

const storie = {
  quiz_domanda: { typeLabel: 'Quiz', cardType: 'quiz_domanda', headline: 'Le vertigini vengono dal collo?', text: 'A. Sempre\nB. A volte\nC. Mai' },
  quiz_risposta: { typeLabel: 'Quiz', cardType: 'quiz_risposta', headline: 'Risposta: B', text: 'A volte la cervicale c\'entra, ma serve una visita per capirlo.' },
  domanda_aperta: { typeLabel: 'Domanda aperta', emoji: '💬', headline: 'Ti gira la testa quando ti alzi?', text: 'Scrivici la tua esperienza.' },
  consiglio: { typeLabel: 'Consiglio', headline: 'Lo schermo all\'altezza degli occhi', text: 'Il collo lavora meno.\nFai una pausa ogni ora.\nMuovi le spalle.' },
  mito_verita: { typeLabel: 'Mito o verità?', headline: 'Il cuscino alto fa bene', text: 'Mito: tiene il collo piegato tutta la notte.' },
};

describe('aCapo', () => {
  it('spazi doppi e in fondo non restano nella riga (spostavano il testo a sinistra)', () => {
    expect(aCapo('Ciao   mondo ', 10_000, '40px x', misura)).toEqual(['Ciao mondo']);
  });
  it('rispetta gli a capo scritti e manda a capo le righe lunghe', () => {
    const righe = aCapo('uno due tre quattro\ncinque', 200, '40px x', misura);
    expect(righe[righe.length - 1]).toBe('cinque');
    expect(righe.length).toBeGreaterThan(2);
    for (const r of righe) expect(misura(r, '40px x')).toBeLessThanOrEqual(200 + misura('quattro', '40px x'));
  });
});

describe('impaginaStoria: testo centrato su tutti i tipi e gli sfondi', () => {
  for (const [tipo, storia] of Object.entries(storie)) {
    for (const conTemplate of [false, true]) {
      for (const conFoto of [false, true]) {
        it(`${tipo}, ${conTemplate ? 'template caricato' : 'sfondo pronto'}, ${conFoto ? 'con foto' : 'senza foto'}`, () => {
          const { elementi, zona, blocco } = impaginaStoria(storia, { ...base, conTemplate, conFoto });
          // In orizzontale: ogni riga sulla metà della storia, foto e badge centrati.
          for (const t of testi(elementi)) expect(t.x).toBe(W / 2);
          for (const e of elementi) {
            if (e.tipo === 'foto' || e.tipo === 'pillola') expect(e.x + e.w / 2).toBeCloseTo(W / 2, 5);
          }
          // In verticale: stesso spazio sopra e sotto nella zona libera.
          expect(blocco.alto - zona.alto).toBeCloseTo(zona.basso - blocco.basso, 5);
          expect(blocco.alto).toBeGreaterThan(zona.alto);
          // Niente fuori dal blocco.
          for (const e of elementi) {
            expect(e.y).toBeGreaterThanOrEqual(blocco.alto - 1);
            expect(e.y).toBeLessThanOrEqual(blocco.basso + 1);
          }
        });
      }
    }
  }

  it('prima del 18/11 il quiz partiva dal 12% e lasciava vuota la metà di sotto: ora no', () => {
    const { zona, blocco } = impaginaStoria(storie.quiz_domanda, { ...base, conTemplate: false, conFoto: false });
    const sopra = blocco.alto - zona.alto, sotto = zona.basso - blocco.basso;
    expect(sopra).toBeGreaterThan(200);
    expect(Math.abs(sopra - sotto)).toBeLessThan(1);
  });

  it('testo troppo lungo: riempie la zona dall\'alto, non sale mai sopra', () => {
    const lunga = { typeLabel: 'Consiglio', headline: 'Titolo', text: Array.from({ length: 40 }, () => 'Una frase lunga che riempie la storia.').join('\n') };
    const { zona, blocco } = impaginaStoria(lunga, { ...base, conTemplate: false, conFoto: true });
    expect(blocco.alto).toBeGreaterThanOrEqual(zona.alto);
    expect(blocco.alto - zona.alto).toBeLessThan(20);
  });
});

describe('impaginaRecensioni: card centrate', () => {
  const colori = { titolo: '#2d6a2d', autore: '#2d6a2d', testo: '#2a2a2a', p1: '#2d6a2d', p2: '#7bc67b', card: '#fff', stellaVuota: '#ddd', pillolaTitolo: '#fff' };
  const r = (text: string, name: string | null = 'Maria R.') => ({ text, name, stars: 5 });
  for (const lista of [[r('Bravissima, mi ha risolto il torcicollo in due sedute.')], [r('Ottimo.'), r('Gentile e preciso.', null)], [r('Ottimo.'), r('Consigliato.'), r('Professionale e attento.')]]) {
    for (const conTemplate of [false, true]) {
      it(`${lista.length} recensioni, ${conTemplate ? 'template caricato' : 'sfondo pronto'}`, () => {
        const { elementi, zona, blocco } = impaginaRecensioni(lista, { W, H, conTemplate, font: base.font, misura, colori });
        const righe = testi(elementi).filter((t) => t.testo !== '★');
        for (const t of righe) expect(t.x).toBe(W / 2);
        // Le 5 stelle di ogni card sono simmetriche rispetto al centro.
        const stelle = testi(elementi).filter((t) => t.testo === '★');
        for (let c = 0; c < stelle.length; c += 5) {
          expect((stelle[c].x + stelle[c + 4].x) / 2).toBe(W / 2);
        }
        expect(blocco.alto - zona.alto).toBeCloseTo(zona.basso - blocco.basso, 5);
        for (const e of elementi) if (e.tipo === 'card') expect(e.x + e.w / 2).toBe(W / 2);
      });
    }
  }

  it('recensione senza nome: «Paziente», mai vuoto', () => {
    const { elementi } = impaginaRecensioni([r('Ottimo', null)], { W, H, conTemplate: false, font: base.font, misura, colori });
    expect(testi(elementi).some((t) => t.testo === '- Paziente')).toBe(true);
  });
});
