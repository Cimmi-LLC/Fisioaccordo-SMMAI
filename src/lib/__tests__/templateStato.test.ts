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

  it('in ogni stato dice che le slide escono comunque, nello stile di base', () => {
    for (const s of ['awaiting_approval', 'generating', 'draft', null]) {
      const t = testiTemplate(s);
      expect(t.testo).toMatch(/escono comunque/);
      expect(t.sottoCarosello).toMatch(/stile di base/);
      expect(t.sottoCarosello).not.toMatch(/partono appena|non c'è ancora/);
    }
  });

  it('template del tipo vecchio: dice che le slide hanno il testo esatto, senza pulsante verso il wizard', () => {
    const t = testiTemplate('locked', { templateVecchio: true });
    expect(t.titolo).toMatch(/parola per parola/);
    expect(t.testo).toMatch(/stile di base/);
    expect(t.bottone).toBe('');
  });
});
