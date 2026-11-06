import { describe, expect, it } from 'vitest';
import { testiTemplate } from '../templateStato';

describe('testiTemplate', () => {
  it('con le proposte pronte chiede di scegliere, non di creare', () => {
    const t = testiTemplate('awaiting_approval');
    expect(t.bottone).toBe('Scegli il template');
    expect(t.titolo).not.toMatch(/non c'è/);
  });

  it('mentre si genera lo dice', () => {
    expect(testiTemplate('generating').titolo).toBe('Il template è in preparazione');
  });

  it('senza template (o stato sconosciuto) invita a crearlo', () => {
    for (const s of ['draft', 'failed', null, undefined]) {
      expect(testiTemplate(s).bottone).toBe('Crea il template');
    }
  });
});
