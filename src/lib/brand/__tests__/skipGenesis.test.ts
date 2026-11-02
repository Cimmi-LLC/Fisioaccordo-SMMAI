import { describe, it, expect } from 'vitest';
import { coloriDaCompletare, COLORI_PARTENZA } from '../skipGenesis.ts';

describe('coloriDaCompletare', () => {
  it('brand senza colori: mette tutti quelli di partenza', () => {
    expect(coloriDaCompletare({})).toEqual(COLORI_PARTENZA);
    expect(coloriDaCompletare(null)).toEqual(COLORI_PARTENZA);
  });
  it('non tocca i colori gia scelti', () => {
    expect(coloriDaCompletare({ colore_primario: '#ff0000', colore_secondario: ' ', colore_terziario: null }))
      .toEqual({ colore_secondario: COLORI_PARTENZA.colore_secondario, colore_terziario: COLORI_PARTENZA.colore_terziario });
  });
  it('brand completo: niente da scrivere', () => {
    expect(coloriDaCompletare({ colore_primario: '#1', colore_secondario: '#2', colore_terziario: '#3' })).toEqual({});
  });
  it('i colori di partenza non sono quelli FisioAccordo', () => {
    expect(Object.values(COLORI_PARTENZA)).not.toContain('#554697');
    expect(Object.values(COLORI_PARTENZA)).not.toContain('#E6007E');
  });
});
