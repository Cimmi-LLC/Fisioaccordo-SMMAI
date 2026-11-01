import { describe, it, expect } from 'vitest';
import {
  normalizzaOrari,
  prossimiSlot,
  daOraRoma,
  leggiRicerca,
  leggiCopy,
  chiaveUrl,
  temiRicerca,
  richiestaRicerca,
  fontiConsultate,
  testoConFonti,
  richiestaEstrazione,
  dominioAutorevole,
  paroleVietateTrovate,
  promptCarosello,
} from '../scoperte';

describe('orari di pubblicazione', () => {
  it('tiene solo orari validi, ordinati, senza doppioni, massimo 3', () => {
    expect(normalizzaOrari(['18:00', '9:5', '09:00', '25:00', 'x', '09:00', '13:30', '20:00'])).toEqual(['09:00', '13:30', '18:00']);
    expect(normalizzaOrari([])).toEqual(['09:00']);
    expect(normalizzaOrari(null)).toEqual(['09:00']);
  });

  it('converte l’ora italiana in UTC con ora solare e legale', () => {
    // 1 novembre 2026: ora solare, Roma = UTC+1
    expect(daOraRoma(2026, 11, 1, 9, 0).toISOString()).toBe('2026-11-01T08:00:00.000Z');
    // 1 luglio 2026: ora legale, Roma = UTC+2
    expect(daOraRoma(2026, 7, 1, 9, 0).toISOString()).toBe('2026-07-01T07:00:00.000Z');
  });

  it('programma oggi se c’è tempo, altrimenti domani', () => {
    // 07:00 a Roma (06:00 UTC): le 09:00 sono oggi, le 07:15 no (meno di 30 minuti) → domani
    const adesso = new Date('2026-11-01T06:00:00Z');
    const slot = prossimiSlot(['09:00', '07:15'], adesso);
    expect(slot.map((d) => d.toISOString())).toEqual([
      '2026-11-01T08:00:00.000Z',
      '2026-11-02T06:15:00.000Z',
    ]);
  });

  it('a fine giornata passa al giorno dopo anche a cavallo del mese', () => {
    const adesso = new Date('2026-10-31T22:30:00Z'); // 23:30 a Roma del 31/10
    expect(prossimiSlot(['09:00'], adesso)[0].toISOString()).toBe('2026-11-01T08:00:00.000Z');
  });
});

describe('ricerca con Gemini + Google', () => {
  const grounded = {
    candidates: [{
      content: { parts: [{ text: 'Uno studio su The Lancet ' }, { text: 'mostra che camminare riduce il mal di schiena del 40%.' }] },
      groundingMetadata: {
        groundingChunks: [
          { web: { uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/A', title: 'thelancet.com' } },
          { web: { uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/B', title: 'blog.it' } },
          { web: {} },
        ],
        groundingSupports: [
          { segment: { text: 'camminare riduce il mal di schiena del 40%' }, groundingChunkIndices: [0, 1] },
          { segment: { text: 'senza fonte' }, groundingChunkIndices: [] },
        ],
      },
    }],
  };
  const estrazione = (items: unknown[]) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ items }) }] } }] });
  const voce = (fonte: number, titolo = 'Camminare e mal di schiena') => ({
    fonte, title: titolo, takeaways: ['Il 40% in meno di dolore', 'Bastano 30 minuti'], source: 'The Lancet', date: '2026-10-12', source_type: 'study',
  });

  it('numera le pagine consultate e lega le frasi alle fonti', () => {
    expect(fontiConsultate(grounded).map((f) => [f.n, f.title])).toEqual([[1, 'thelancet.com'], [2, 'blog.it']]);
    const { testo, frasi } = testoConFonti(grounded);
    expect(testo).toContain('The Lancet mostra');
    expect(frasi).toEqual([{ frase: 'camminare riduce il mal di schiena del 40%', fonti: [1, 2] }]);
    expect(fontiConsultate(null)).toEqual([]);
    expect(testoConFonti(null)).toEqual({ testo: '', frasi: [] });
  });

  it('prende l’indirizzo dalla pagina scelta, mai dal modello, e scarta i siti non autorevoli', () => {
    const fonti = [
      { n: 1, url: 'https://www.thelancet.com/journals/x' },
      { n: 2, url: 'https://blog-qualsiasi.it/post' },
    ];
    const r = estrazione([{ ...voce(1), url: 'https://inventato.com' }, voce(2), voce(9)]);
    const { scoperte, scartate } = leggiRicerca(r, fonti);
    expect(scoperte.map((s) => s.url)).toEqual(['https://www.thelancet.com/journals/x']);
    expect(scoperte[0].data).toBe('2026-10-12');
    expect(scartate).toEqual(['blog-qualsiasi.it']);
  });

  it('scarta pagine già usate, doppioni e voci incomplete', () => {
    const fonti = [{ n: 1, url: 'https://bmj.com/x?utm_source=a' }, { n: 2, url: 'https://bmj.com/y' }];
    const r = estrazione([voce(1), voce(1, 'Doppione'), voce(2), { fonte: 1, title: '', takeaways: [] }]);
    expect(leggiRicerca(r, fonti, ['https://www.bmj.com/y']).scoperte.map((s) => s.titolo)).toEqual(['Camminare e mal di schiena']);
    expect(leggiRicerca(null, fonti).scoperte).toEqual([]);
  });

  it('prima chiamata con Google e senza indirizzi chiesti al modello; seconda in JSON senza ricerca', () => {
    const ric = richiestaRicerca('mal di schiena', 4, ['Titolo già usato'], new Date('2026-11-01T06:00:00Z')) as Record<string, any>;
    expect(ric.tools).toEqual([{ google_search: {} }]);
    const t = ric.contents[0].parts[0].text as string;
    expect(t).toContain('2026-11-01');
    expect(t).toContain('Titolo già usato');
    expect(t).toContain('pubmed.ncbi.nlm.nih.gov');
    const estr = richiestaEstrazione('testo', [{ frase: 'f', fonti: [1] }], [{ n: 1, sito: 'bmj.com', url: 'https://bmj.com/a' }]) as Record<string, any>;
    expect(estr.tools).toBeUndefined();
    expect(estr.generationConfig.responseMimeType).toBe('application/json');
    expect(estr.contents[0].parts[0].text).toContain('[1] bmj.com https://bmj.com/a');
  });

  it('riconosce i domini autorevoli anche come sottodomini', () => {
    expect(dominioAutorevole('https://www.nature.com/articles/x')).toBe(true);
    expect(dominioAutorevole('https://news.harvard.edu/x')).toBe(false);
    expect(dominioAutorevole('https://pubmed.ncbi.nlm.nih.gov/123')).toBe(true);
    expect(dominioAutorevole('https://fakenature.com/x')).toBe(false);
  });

  it('normalizza gli URL per il confronto', () => {
    expect(chiaveUrl('https://www.Nature.com/articoli/1/?utm_medium=x#top')).toBe(chiaveUrl('https://nature.com/articoli/1'));
  });
});

describe('carosello', () => {
  it('sistema i ruoli: prima cover, ultima cta, in mezzo content', () => {
    const copy = leggiCopy(JSON.stringify({
      titolo_carosello: 'T',
      caption: 'Testo\nFonte: BMJ, 2026',
      hashtags: '#schiena',
      slides: [
        { role: 'content', title: 'Ultima scoperta: camminare aiuta', body: 'a' },
        { role: 'cover', title: 'Due', body: 'b' },
        { role: 'cta', title: 'Tre', body: 'c' },
        { role: 'content', title: 'Salva il post', body: 'd' },
      ],
    }));
    expect(copy?.slides.map((s) => s.role)).toEqual(['cover', 'content', 'content', 'cta']);
  });

  it('rifiuta un carosello senza caption o con meno di 3 slide', () => {
    expect(leggiCopy('{"caption":"","slides":[{"title":"a"},{"title":"b"},{"title":"c"}]}')).toBeNull();
    expect(leggiCopy('{"caption":"x","slides":[{"title":"a"}]}')).toBeNull();
    expect(leggiCopy('non è json')).toBeNull();
  });

  it('trova le parole vietate, anche coniugate, e sempre «sbloccare»', () => {
    const copy = leggiCopy(JSON.stringify({
      caption: 'Così risolvi in fretta',
      slides: [{ title: 'a' }, { title: 'b miracolosa' }, { title: 'c' }],
    }))!;
    expect(paroleVietateTrovate(copy, { parole_da_evitare: ['miracoloso'] })).toEqual([]);
    expect(paroleVietateTrovate(copy, { parole_da_evitare: ['miracolos'] })).toEqual(['miracolos']);
    expect(paroleVietateTrovate({ ...copy, caption: 'Ti aiutiamo a sbloccare il collo' }, {})).toContain('sbloccare');
    expect(paroleVietateTrovate({ ...copy, caption: 'Così sblocchiamo la schiena' }, {})).toContain('sblocchi');
  });

  it('il prompt usa i temi del brand e la fonte della scoperta', () => {
    expect(temiRicerca({ auto_temi: '  cefalea  ' })).toBe('cefalea');
    expect(temiRicerca({ temi_chiave: ['spalla'], servizi: ['tecar', 'spalla'] })).toBe('spalla, tecar');
    const p = promptCarosello({ nome_business: 'Terapista Stellato' }, {
      titolo: 'Camminare e lombalgia', sintesi: ['dato'], fonte: 'The Lancet', url: 'https://thelancet.com/a', data: '2026-10-12', tipo_fonte: 'study',
    });
    expect(p).toContain('Terapista Stellato');
    expect(p).toContain('Fonte: The Lancet, 2026');
    expect(p).toContain('sbloccare');
  });
});
