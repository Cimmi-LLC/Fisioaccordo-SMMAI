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
  paroleVietateTrovate,
  promptCarosello,
  DOMINI_AUTOREVOLI,
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

describe('ricerca su Perplexity', () => {
  const risposta = (items: unknown[], extra: Record<string, unknown> = {}) => ({
    choices: [{ message: { content: JSON.stringify({ items }) } }],
    ...extra,
  });
  const voce = (url: string, titolo = 'Studio sul mal di schiena') => ({
    title: titolo,
    takeaways: ['Il 60% migliora camminando', 'Bastano 30 minuti'],
    source: 'The Lancet',
    url,
    date: '2026-10-12',
    source_type: 'study',
  });

  it('tiene solo URL davvero consultati da Perplexity', () => {
    const r = risposta(
      [voce('https://www.thelancet.com/a'), voce('https://inventato.com/b')],
      { search_results: [{ url: 'https://thelancet.com/a/', date: '2026-10-12' }] },
    );
    const out = leggiRicerca(r);
    expect(out).toHaveLength(1);
    expect(out[0].url).toBe('https://www.thelancet.com/a');
    expect(out[0].data).toBe('2026-10-12');
  });

  it('scarta gli URL già usati e i doppioni', () => {
    const r = risposta([voce('https://bmj.com/x?utm_source=a'), voce('https://bmj.com/x'), voce('https://bmj.com/y')]);
    const out = leggiRicerca(r, ['https://www.bmj.com/y']);
    expect(out.map((s) => s.url)).toEqual(['https://bmj.com/x?utm_source=a']);
  });

  it('regge JSON dentro ```json e voci incomplete', () => {
    const r = { choices: [{ message: { content: '```json\n{"items":[{"title":"","url":"https://a.it"},' +
      JSON.stringify(voce('https://nih.gov/z')) + ']}\n```' } }] };
    expect(leggiRicerca(r).map((s) => s.url)).toEqual(['https://nih.gov/z']);
    expect(leggiRicerca(null)).toEqual([]);
  });

  it('chiede solo domini autorevoli, ultimo mese, e passa gli URL da escludere', () => {
    const body = richiestaRicerca('mal di schiena', 4, ['https://bmj.com/old']) as Record<string, any>;
    expect(body.model).toBe('sonar');
    expect(body.search_recency_filter).toBe('month');
    expect(body.search_domain_filter).toEqual(DOMINI_AUTOREVOLI);
    expect(DOMINI_AUTOREVOLI.length).toBeLessThanOrEqual(20);
    expect(body.messages[1].content).toContain('https://bmj.com/old');
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
