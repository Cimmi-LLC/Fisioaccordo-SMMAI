import { describe, it, expect } from 'vitest';
import { pickSnapshot, diffSnapshot, preview, SNAPSHOT_FIELDS } from '../../brandSnapshot.ts';

const base = {
  id: 'x', user_id: 'u', nome_business: 'Studio', descrizione: 'Testo', servizi: ['A', 'B'],
  colore_primario: '#feca57', gallery_photos: ['data:image/png;base64,AAAA'], genome: { a: 1 },
};

describe('pickSnapshot', () => {
  it('tiene solo i campi del Brand Kit, niente foto ne genoma', () => {
    const s = pickSnapshot(base);
    expect(Object.keys(s).sort()).toEqual([...SNAPSHOT_FIELDS].sort());
    expect((s as Record<string, unknown>).gallery_photos).toBeUndefined();
    expect((s as Record<string, unknown>).genome).toBeUndefined();
  });
  it('copia gli array (non condivide il riferimento)', () => {
    const s = pickSnapshot(base);
    (base.servizi as string[]).push('C');
    expect(s.servizi).toEqual(['A', 'B']);
    (base.servizi as string[]).pop();
  });
});

describe('diffSnapshot', () => {
  it('trova solo i campi cambiati', () => {
    const a = pickSnapshot(base);
    const b = pickSnapshot({ ...base, descrizione: 'Nuovo', colore_primario: '#000000' });
    expect(diffSnapshot(a, b)).toEqual(['descrizione', 'colore_primario']);
  });
  it('ignora spazi e null vs stringa vuota', () => {
    const a = pickSnapshot({ ...base, mission: null, descrizione: 'Testo ' });
    const b = pickSnapshot({ ...base, mission: '', descrizione: 'Testo' });
    expect(diffSnapshot(a, b)).toEqual([]);
  });
});

describe('preview', () => {
  it('unisce le liste e accorcia i testi lunghi', () => {
    expect(preview(['A', 'B'])).toBe('A · B');
    expect(preview('x'.repeat(200), 10)).toHaveLength(10);
    expect(preview(null)).toBe('—');
  });
});
