import { describe, expect, it } from 'vitest';
import { captionConHashtag, senzaBloccoHashtag } from '../caption';

describe('senzaBloccoHashtag', () => {
  it('toglie il blocco di hashtag in coda', () => {
    expect(senzaBloccoHashtag('Hook forte.\n\nCTA 👉\n\n#schiena #postura'))
      .toBe('Hook forte.\n\nCTA 👉');
  });

  it('non tocca gli hashtag in mezzo al testo', () => {
    const caption = 'Parliamo di #postura ogni giorno.\n\nCTA';
    expect(senzaBloccoHashtag(caption)).toBe(caption);
  });

  it('toglie più righe di soli hashtag', () => {
    expect(senzaBloccoHashtag('Testo\n\n#uno #due\n#tre')).toBe('Testo');
  });

  it('caption vuota resta vuota', () => {
    expect(senzaBloccoHashtag('')).toBe('');
  });
});

describe('captionConHashtag', () => {
  it('un solo blocco di hashtag anche se la caption lo conteneva già', () => {
    const out = captionConHashtag('Hook.\n\n#schiena #postura', ['schiena', '#postura', 'cervicale']);
    expect(out).toBe('Hook.\n\n#schiena #postura #cervicale');
    expect(out.match(/#schiena/g)).toHaveLength(1);
  });

  it('senza hashtag suggeriti resta il testo pulito', () => {
    expect(captionConHashtag('Testo.\n\n#vecchio', [])).toBe('Testo.');
  });

  it('deduplica gli hashtag suggeriti', () => {
    expect(captionConHashtag('Testo.', ['a', 'a', '#a', 'b'])).toBe('Testo.\n\n#a #b');
  });
});
