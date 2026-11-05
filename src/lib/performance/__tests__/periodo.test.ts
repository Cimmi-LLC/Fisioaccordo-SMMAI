import { describe, expect, it } from 'vitest';
import { dayLabel, inWindow, localToday, resolveWindow, toIncrements } from '../periodo';

const row = (date: string, post: string, v: Record<string, number | null>, account = false) => ({
  snapshot_date: date, external_post_id: post, is_account_level: account,
  reach: null, impressions: null, engagement: null, likes: null, comments: null,
  saves: null, shares: null, video_views: null, watch_minutes: null, ...v,
});

describe('resolveWindow', () => {
  it('7 giorni: oggi incluso, periodo precedente subito prima', () => {
    expect(resolveWindow(7, '', '', '2026-11-05')).toEqual({
      from: '2026-10-30', to: '2026-11-05', days: 7, prevFrom: '2026-10-23', prevTo: '2026-10-29',
    });
  });

  it('90 giorni', () => {
    const w = resolveWindow(90, '', '', '2026-11-05');
    expect(w.from).toBe('2026-08-08');
    expect(w.days).toBe(90);
    expect(w.prevTo).toBe('2026-08-07');
  });

  it('personalizzato con date invertite le scambia', () => {
    const w = resolveWindow('custom', '2026-10-20', '2026-10-01', '2026-11-05');
    expect([w.from, w.to, w.days]).toEqual(['2026-10-01', '2026-10-20', 20]);
  });

  it('personalizzato con data vuota torna a 28 giorni, mai oltre oggi', () => {
    expect(resolveWindow('custom', '', '2026-12-31', '2026-11-05')).toMatchObject({
      from: '2026-10-09', to: '2026-11-05', days: 28,
    });
  });
});

describe('toIncrements', () => {
  it('i totali di Instagram diventano aumenti per post', () => {
    const out = toIncrements([
      row('2026-11-02', 'A', { engagement: 5, reach: 509 }),
      row('2026-11-01', 'A', { engagement: 3, reach: 431 }),
      row('2026-11-03', 'A', { engagement: 6, reach: 552 }),
      row('2026-11-03', 'B', { engagement: 16 }),
    ]);
    expect(out.map((r) => [r.external_post_id, r.snapshot_date, r.engagement, r.reach])).toEqual([
      ['A', '2026-11-01', 3, 431],
      ['A', '2026-11-02', 2, 78],
      ['A', '2026-11-03', 1, 43],
      ['B', '2026-11-03', 16, null],
    ]);
  });

  it('un post fermo non conta più a ogni giro', () => {
    const out = toIncrements([
      row('2026-10-11', 'C', { likes: 16 }),
      row('2026-10-18', 'C', { likes: 16 }),
      row('2026-10-25', 'C', { likes: 16 }),
    ]);
    const settimana = inWindow(out, '2026-10-19', '2026-10-25');
    expect(settimana.reduce((a, r) => a + (r.likes || 0), 0)).toBe(0);
  });

  it('like nascosti (-1) e totali che scendono non tolgono nulla', () => {
    const out = toIncrements([
      row('2026-10-01', 'D', { likes: 3 }),
      row('2026-10-08', 'D', { likes: -1 }),
      row('2026-10-15', 'D', { likes: 2 }),
      row('2026-10-22', 'D', { likes: 5 }),
    ]);
    expect(out.map((r) => r.likes)).toEqual([3, null, 0, 2]);
  });

  it('le righe account restano uguali', () => {
    const acc = row('2026-11-05', 'account', { engagement: 7 }, true);
    expect(toIncrements([acc])[0]).toBe(acc);
  });
});

describe('date', () => {
  it('oggi nel fuso locale', () => {
    expect(localToday(new Date(2026, 10, 5, 0, 30))).toBe('2026-11-05');
  });

  it('etichetta del giorno senza scivolare al giorno prima', () => {
    expect(dayLabel('2026-11-05')).toMatch(/^05/);
  });
});
