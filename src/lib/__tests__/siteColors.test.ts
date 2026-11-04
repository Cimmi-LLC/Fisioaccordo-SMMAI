import { describe, expect, it } from 'vitest';
import { siteGroundedColors } from '../siteColors';

const FALLBACK = { primario: '#554697', secondario: '#e6007e', terziario: '#1a1a2e' };

describe('siteGroundedColors', () => {
  it('tiene i colori proposti quando sono davvero nel sito', () => {
    const out = siteGroundedColors(
      { colore_primario: '#123A8F', colore_secondario: '#FF7A00', colore_terziario: '#111111' },
      ['#123a8f', '#ff7a00', '#111111'],
      FALLBACK,
    );
    expect(out).toEqual({ colore_primario: '#123a8f', colore_secondario: '#ff7a00', colore_terziario: '#111111' });
  });

  it('sostituisce un colore inventato col colore reale successivo', () => {
    const out = siteGroundedColors(
      { colore_primario: '#8b5cf6', colore_secondario: '#22c55e' }, // viola e verde inventati
      ['#123a8f', '#ff7a00'],
      FALLBACK,
    );
    expect(out.colore_primario).toBe('#123a8f');
    expect(out.colore_secondario).toBe('#ff7a00');
  });

  it('con un solo colore del sito NON riempie col fucsia dei default: deriva dal primario', () => {
    const out = siteGroundedColors({}, ['#123a8f'], FALLBACK);
    expect(out.colore_primario).toBe('#123a8f');
    expect(out.colore_secondario).not.toBe('#e6007e');
    expect(out.colore_secondario).toMatch(/^#[0-9a-f]{6}$/);
    expect(out.colore_terziario).toBe('#1a1a2e');
  });

  it('senza colori dal sito restano i fallback (che il wizard ignora)', () => {
    expect(siteGroundedColors({}, [], FALLBACK)).toEqual({
      colore_primario: '#554697', colore_secondario: '#e6007e', colore_terziario: '#1a1a2e',
    });
  });
});
