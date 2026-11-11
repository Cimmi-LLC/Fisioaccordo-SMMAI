import { describe, expect, it } from 'vitest';
import {
  TAG_TESTO, TAG_VISTA, TAG_VOLTO, daGuardare, haTestoSopra, leggiEtichette, scegliFoto, tagDaEtichette, tagVisibili,
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
