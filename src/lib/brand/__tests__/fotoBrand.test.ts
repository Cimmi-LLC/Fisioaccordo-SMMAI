import { describe, expect, it } from 'vitest';
import {
  TAG_TESTO, TAG_VISTA, TAG_VOLTO, assegnaFoto, daGuardare, haTestoSopra, leggiEtichette, scegliFoto, tagDaEtichette, tagVisibili,
  type FotoPool,
} from '../fotoBrand';

const foto = (url: string, tags: string[] = [], caption: string | null = null): FotoPool => ({ url, tags, caption });

describe('etichette automatiche', () => {
  it('legge la risposta del modello, anche dentro un blocco ```json', () => {
    const e = leggiEtichette('```json\n{"descrizione":"Terapista che tratta il collo di una paziente","parole":["collo / neck","terapia manuale","lettino"],"testo_sopra":false,"volto":true}\n```');
    expect(e).toEqual({
      descrizione: 'Terapista che tratta il collo di una paziente',
      parole: ['collo', 'neck', 'terapia manuale', 'lettino'],
      testoSopra: false,
      volto: true,
    });
  });

  it('risposta rotta: null', () => {
    expect(leggiEtichette('non è json')).toBeNull();
    expect(leggiEtichette('')).toBeNull();
  });

  it('i tag salvati tengono quelli scritti a mano e segnano la foto come vista', () => {
    const tags = tagDaEtichette({ descrizione: '', parole: ['collo', 'neck'], testoSopra: true, volto: false }, ['studio', TAG_VISTA]);
    expect(tags).toEqual(['studio', 'collo', 'neck', TAG_VISTA, TAG_TESTO]);
    expect(daGuardare(tags)).toBe(false);
    expect(daGuardare([])).toBe(true);
    expect(haTestoSopra(tags)).toBe(true);
    expect(tagVisibili([...tags, TAG_VOLTO])).toEqual(['studio', 'collo', 'neck']);
  });
});

describe('scegliFoto', () => {
  const pool = [
    foto('spalla.jpg', ['spalla', 'shoulder', TAG_VISTA, TAG_TESTO], 'Copertina del video «Dolore alla spalla»'),
    foto('collo.jpg', ['collo', 'neck', 'terapia manuale', TAG_VISTA]),
    foto('studio.jpg', ['sala d\'attesa', 'reception', TAG_VISTA]),
  ];

  it('caso del 09/11: su una storia di vertigini non esce più la copertina «Dolore alla spalla»', () => {
    for (let giro = 0; giro < 30; giro++) {
      expect(scegliFoto(pool, ['neck pain', 'vertigini', 'collo'], new Set(), true)).toBe('collo.jpg');
    }
  });

  it('una foto con testo o logo sopra non si usa mai, nemmeno se è l\'unica che c\'entra', () => {
    expect(scegliFoto(pool, ['spalla', 'shoulder'], new Set(), true)).not.toBe('spalla.jpg');
    expect(scegliFoto([pool[0]], ['spalla'], new Set(), true)).toBeNull();
  });

  it('se nessuna c\'entra: con «sempre» va a rotazione, senza «sempre» nessuna', () => {
    const usate = new Set<string>();
    const prima = scegliFoto(pool, ['ginocchio'], usate, true)!;
    usate.add(prima);
    const seconda = scegliFoto(pool, ['ginocchio'], usate, true)!;
    expect(new Set([prima, seconda])).toEqual(new Set(['collo.jpg', 'studio.jpg']));
    expect(scegliFoto(pool, ['ginocchio'], new Set(), false)).toBeNull();
  });

  it('finite le foto nuove riparte da quelle già usate', () => {
    expect(scegliFoto(pool, ['collo'], new Set(['collo.jpg', 'studio.jpg']), false)).toBe('collo.jpg');
  });

  it('conta anche la didascalia scritta dallo studio; pool vuoto = nessuna foto', () => {
    expect(scegliFoto([foto('a.jpg', [], 'Esercizio per il ginocchio')], ['ginocchio'], new Set(), false)).toBe('a.jpg');
    expect(scegliFoto([], ['collo'], new Set(), true)).toBeNull();
  });
});

describe('assegnaFoto (tutte le storie di una generazione insieme)', () => {
  // Il brand della prova del 18/11: cervicale e vertigini, 5 foto in galleria.
  const galleria = [
    foto('collo-1.jpg', ['collo', 'neck', 'terapia manuale', TAG_VISTA]),
    foto('collo-2.jpg', ['collo', 'neck', 'cervicale', TAG_VISTA]),
    foto('vertigini.jpg', ['vertigini', 'dizzy', 'testa', TAG_VISTA]),
    foto('studio.jpg', ['studio', 'lettino', TAG_VISTA]),
    foto('esercizio.jpg', ['esercizio', 'exercise', 'collo', TAG_VISTA]),
    foto('copertina.jpg', ['collo', 'neck', 'cervicale', TAG_VISTA, TAG_TESTO], 'Copertina del video'),
  ];
  const storie = [
    ['neck', 'pain'], ['collo', 'cervicale'], ['dizzy', 'vertigini'], ['neck', 'exercise'], ['collo'],
    ['neck', 'stiff'], ['vertigini', 'testa'], ['collo', 'terapia manuale'], ['neck'], ['esercizio', 'collo'],
  ];
  const conta = (urls: Array<string | null>) => {
    const m = new Map<string, number>();
    for (const u of urls) if (u) m.set(u, (m.get(u) || 0) + 1);
    return m;
  };

  it('caso del 18/11: 5 foto e 10 storie, ogni foto al massimo 2 volte e mai su due storie vicine', () => {
    const r = assegnaFoto(galleria, storie, true);
    expect(r.every(Boolean)).toBe(true);
    const usi = conta(r);
    expect(usi.size).toBe(5);
    expect(Math.max(...usi.values())).toBe(2);
    for (let i = 1; i < r.length; i++) expect(r[i]).not.toBe(r[i - 1]);
    expect(r).not.toContain('copertina.jpg');
  });

  it('prima si usano tutte le foto: le prime 5 storie hanno 5 foto diverse', () => {
    const r = assegnaFoto(galleria, storie.slice(0, 5), true);
    expect(new Set(r).size).toBe(5);
  });

  it('a parità di usi vince la foto che c\'entra con la storia', () => {
    const r = assegnaFoto(galleria, [['vertigini', 'dizzy']], true);
    expect(r).toEqual(['vertigini.jpg']);
  });

  it('senza «sempre»: solo foto che c\'entrano, e nessuna si ripete finché ce ne sono di mai usate', () => {
    const r = assegnaFoto(galleria, [['vertigini'], ['vertigini'], ['vertigini']], false);
    expect(r[0]).toBe('vertigini.jpg');
    expect(r.filter((u) => u === 'vertigini.jpg')).toHaveLength(1);
    expect(r.filter(Boolean)).toHaveLength(1);
  });

  it('una foto sola: mai su due storie vicine, le altre restano senza', () => {
    const r = assegnaFoto([foto('unica.jpg', ['collo'])], [['collo'], ['collo'], ['collo'], ['collo']], true);
    expect(r).toEqual(['unica.jpg', null, 'unica.jpg', null]);
  });

  it('le foto con testo o logo sopra non escono mai; galleria vuota = nessuna foto', () => {
    expect(assegnaFoto([galleria[5]], [['collo'], ['neck']], true)).toEqual([null, null]);
    expect(assegnaFoto([], [['collo']], true)).toEqual([null]);
    expect(assegnaFoto(galleria, [], true)).toEqual([]);
  });

  it('stesso ingresso, stessa spartizione (ogni storia la ricalcola da sola sul server)', () => {
    expect(assegnaFoto(galleria, storie, true)).toEqual(assegnaFoto(galleria, storie, true));
  });
});
