import { describe, expect, it } from 'vitest';
import { frequenzaDaDate, nonDeducibile, togliNonDeducibili } from '../analisiCompetitor';

const giorniFa = (n: number) => new Date(Date.UTC(2026, 10, 20) - n * 86_400_000).toISOString();

describe('nonDeducibile', () => {
  it('riconosce le frasi del modello quando il dato manca', () => {
    expect(nonDeducibile('Non deducibile dai dati forniti')).toBe(true);
    expect(nonDeducibile('non determinabile')).toBe(true);
    expect(nonDeducibile('Frequenza non è stimabile con questi post')).toBe(true);
    expect(nonDeducibile('N/D')).toBe(true);
    expect(nonDeducibile('engagement_rate non calcolabile: dati profilo non disponibili')).toBe(true);
    expect(nonDeducibile('Profilo con dati insufficienti: 2 post estratti')).toBe(true);
  });

  it('lascia stare i testi veri', () => {
    expect(nonDeducibile('Il link in bio non è chiaro')).toBe(false);
    expect(nonDeducibile('Reel con domanda in apertura')).toBe(false);
    expect(nonDeducibile(42)).toBe(false);
  });
});

describe('togliNonDeducibili', () => {
  it('toglie campi e voci, tiene il resto', () => {
    const fuori = togliNonDeducibili({
      content_strategy: { posting_frequency: 'Non deducibile dai dati forniti', tone_of_voice: 'Amichevole' },
      strengths: ['Hook forti', 'non determinabile'],
      overall_score: 70,
    });
    expect(fuori).toEqual({ content_strategy: { tone_of_voice: 'Amichevole' }, strengths: ['Hook forti'], overall_score: 70 });
  });
});

describe('frequenzaDaDate', () => {
  it('senza abbastanza date non dice niente', () => {
    expect(frequenzaDaDate([])).toBeNull();
    expect(frequenzaDaDate(['', null, 'non una data', giorniFa(1)])).toBeNull();
  });

  it('conta a settimana con la distanza mediana', () => {
    expect(frequenzaDaDate([0, 2, 4, 6, 8, 10].map(giorniFa))).toBe('circa 4 post a settimana');
    expect(frequenzaDaDate([0, 1, 2, 3, 4].map(giorniFa), 'video')).toBe('circa un video al giorno');
  });

  it('un post fissato vecchio non falsa il conto', () => {
    expect(frequenzaDaDate([0, 7, 14, 21, 700].map(giorniFa))).toBe('circa un post a settimana');
  });

  it('pochi post: al mese', () => {
    expect(frequenzaDaDate([0, 15, 30, 45].map(giorniFa))).toBe('circa 2 post al mese');
    expect(frequenzaDaDate([0, 60, 120].map(giorniFa))).toBe('meno di un post al mese');
  });
});
