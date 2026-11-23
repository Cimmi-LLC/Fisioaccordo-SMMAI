import { describe, expect, it } from 'vitest';
import { blocchiMarkdown, pezziInline, senzaMarkdown } from '../testoMarkdown';

describe('testoMarkdown', () => {
  it('rende il grassetto senza lasciare asterischi (caso del 18/11)', () => {
    expect(pezziInline('**Rilevanza e curiosità:** il tema tocca tutti')).toEqual([
      { testo: 'Rilevanza e curiosità:', grassetto: true },
      { testo: ' il tema tocca tutti', grassetto: false },
    ]);
  });

  it('toglie asterischi spaiati, corsivi e titoletti', () => {
    expect(pezziInline('## Hook *forte* e **chiaro')).toEqual([{ testo: 'Hook forte e chiaro', grassetto: false }]);
  });

  it('divide paragrafi ed elenchi', () => {
    const b = blocchiMarkdown('Perché funziona:\n\n- **Uno:** primo\n* Due\n1. Tre\n\nFine riga\nsotto');
    expect(b.map((x) => x.tipo)).toEqual(['paragrafo', 'elenco', 'elenco', 'paragrafo']);
    expect(b[1]).toMatchObject({ tipo: 'elenco', numerato: false });
    expect(b[1].tipo === 'elenco' && b[1].voci.length).toBe(2);
    expect(b[2]).toMatchObject({ tipo: 'elenco', numerato: true });
    expect(b[3].tipo === 'paragrafo' && b[3].righe.length).toBe(2);
  });

  it('ripulisce il testo da copiare', () => {
    expect(senzaMarkdown('**Titolo:** testo\n* voce\n- altra')).toBe('Titolo: testo\n- voce\n- altra');
  });

  it('regge il testo vuoto', () => {
    expect(blocchiMarkdown('')).toEqual([]);
    expect(senzaMarkdown('')).toBe('');
  });
});
