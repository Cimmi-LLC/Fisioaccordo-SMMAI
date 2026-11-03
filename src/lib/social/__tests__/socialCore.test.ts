import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  buildAuthUrl,
  dailyIncrement,
  explainSocialError,
  needsRefresh,
  planPostSnapshot,
  safeReturnTo,
  socialRedirectUri,
  tiktokChunkPlan,
  tiktokPostInfo,
  validateTikTokOptions,
  youtubeTitle,
  type TikTokOptions,
} from '../socialCore';

const ROOT = resolve(__dirname, '../../../..');
const MB = 1024 * 1024;

const base: TikTokOptions = {
  privacy_level: 'PUBLIC_TO_EVERYONE',
  allow_comment: false,
  allow_duet: false,
  allow_stitch: false,
  commercial: false,
  brand_organic: false,
  brand_content: false,
};

describe('specchio Vite <-> Deno', () => {
  it('socialCore.ts è identico in src e in _shared', () => {
    const src = readFileSync(resolve(ROOT, 'src/lib/social/socialCore.ts'), 'utf8');
    const mirror = readFileSync(resolve(ROOT, 'supabase/functions/_shared/social/socialCore.ts'), 'utf8');
    expect(mirror).toBe(src);
  });
});

describe('collegamento', () => {
  it('indirizzo di ritorno per piattaforma', () => {
    expect(socialRedirectUri('https://fisioaccordo-smm-ai.vercel.app/', 'tiktok'))
      .toBe('https://fisioaccordo-smm-ai.vercel.app/auth/social/tiktok/callback');
  });

  it('TikTok: client_key, permessi separati da virgola, state', () => {
    const u = new URL(buildAuthUrl('tiktok', 'abc', 'https://x.app/cb', 's1'));
    expect(u.host).toBe('www.tiktok.com');
    expect(u.searchParams.get('client_key')).toBe('abc');
    expect(u.searchParams.get('scope')).toContain('video.publish');
    expect(u.searchParams.get('scope')).not.toContain('video.upload');
    expect(u.searchParams.get('state')).toBe('s1');
  });

  it('Google: offline + consent per avere sempre il refresh token', () => {
    const u = new URL(buildAuthUrl('youtube', 'gid', 'https://x.app/cb', 's2'));
    expect(u.host).toBe('accounts.google.com');
    expect(u.searchParams.get('access_type')).toBe('offline');
    expect(u.searchParams.get('prompt')).toBe('consent');
    expect(u.searchParams.get('scope')).toContain('youtube.upload');
  });

  it('si torna solo a pagine interne', () => {
    expect(safeReturnTo('/brands')).toBe('/brands');
    expect(safeReturnTo('//evil.com')).toBe('/settings');
    expect(safeReturnTo('https://evil.com')).toBe('/settings');
    expect(safeReturnTo('/auth/social/tiktok/callback')).toBe('/settings');
    expect(safeReturnTo(undefined)).toBe('/settings');
  });

  it('token da rinnovare 5 minuti prima della scadenza', () => {
    const now = Date.parse('2026-11-03T10:00:00Z');
    expect(needsRefresh('2026-11-03T10:04:00Z', now)).toBe(true);
    expect(needsRefresh('2026-11-03T11:00:00Z', now)).toBe(false);
    expect(needsRefresh(null, now)).toBe(true);
  });
});

describe('caricamento a pezzi su TikTok', () => {
  it('sotto i 64 MB un pezzo solo', () => {
    expect(tiktokChunkPlan(3 * MB)).toEqual({ chunkSize: 3 * MB, totalChunks: 1, ranges: [[0, 3 * MB]] });
  });

  it('sopra i 64 MB pezzi da 10 MB, l\'ultimo prende il resto', () => {
    const size = 95 * MB + 123;
    const p = tiktokChunkPlan(size);
    expect(p.chunkSize).toBe(10 * MB);
    expect(p.totalChunks).toBe(9);
    expect(p.ranges[0]).toEqual([0, 10 * MB]);
    expect(p.ranges[8]).toEqual([80 * MB, size]);
    // ultimo pezzo sotto i 128 MB
    expect(p.ranges[8][1] - p.ranges[8][0]).toBeLessThan(128 * MB);
  });

  it('rifiuta dimensioni assurde', () => {
    expect(() => tiktokChunkPlan(0)).toThrow();
  });
});

describe('scelte di pubblicazione TikTok', () => {
  it('la visibilità va scelta (nessun valore di partenza)', () => {
    expect(validateTikTokOptions({ ...base, privacy_level: '' })).toMatch(/Scegli/);
  });

  it('solo visibilità ammesse dal profilo', () => {
    expect(validateTikTokOptions(base, ['SELF_ONLY'])).toMatch(/non è disponibile/);
    expect(validateTikTokOptions(base, ['PUBLIC_TO_EVERYONE'])).toBeNull();
  });

  it('promozionale acceso chiede per chi', () => {
    expect(validateTikTokOptions({ ...base, commercial: true })).toMatch(/promozionale/);
    expect(validateTikTokOptions({ ...base, commercial: true, brand_organic: true })).toBeNull();
  });

  it('sponsorizzato non può essere «solo io»', () => {
    expect(validateTikTokOptions({ ...base, privacy_level: 'SELF_ONLY', commercial: true, brand_content: true })).toMatch(/sponsorizzati/);
  });

  it('post_info: le foto non hanno duetti/stitch e hanno la musica', () => {
    const photo = tiktokPostInfo({ ...base, allow_comment: true }, 'x'.repeat(200), true);
    expect(photo.title).toHaveLength(90);
    expect(photo.disable_comment).toBe(false);
    expect(photo).not.toHaveProperty('disable_duet');
    expect(photo.auto_add_music).toBe(true);
    const video = tiktokPostInfo(base, 'ciao', false);
    expect(video.disable_duet).toBe(true);
    expect(video.brand_organic_toggle).toBe(false);
  });
});

describe('YouTube', () => {
  it('titolo pulito e al massimo 100 caratteri', () => {
    expect(youtubeTitle('  Mal di <schiena>  ')).toBe('Mal di schiena');
    expect(youtubeTitle('a'.repeat(150))).toHaveLength(98);
    expect(youtubeTitle('')).toBe('Nuovo video');
  });
});

describe('statistiche giornaliere', () => {
  it('aumento rispetto alla base, mai negativo', () => {
    expect(dailyIncrement({ views: 150, likes: 9 }, { views: 100, likes: 10 })).toMatchObject({ views: 50, likes: 0 });
    expect(dailyIncrement({ views: 150, shares: null }, null)).toMatchObject({ views: 150, shares: null });
  });

  it('video vecchio visto la prima volta: i numeri vanno sul giorno di pubblicazione', () => {
    const p = planPostSnapshot(null, { views: 1000 }, '2026-10-01', '2026-11-03');
    expect(p.snapshotDate).toBe('2026-10-01');
    expect(p.increment.views).toBe(1000);
    expect(p.base).toEqual({ views: 1000 });
  });

  it('video di oggi: base zero, la riga di oggi tiene il totale', () => {
    const p = planPostSnapshot(null, { views: 40 }, '2026-11-03', '2026-11-03');
    expect(p.snapshotDate).toBe('2026-11-03');
    expect(p.base).toEqual({});
    const again = planPostSnapshot({ totals: { views: 40 }, base: p.base, totals_date: '2026-11-03' }, { views: 90 }, '2026-11-03', '2026-11-03');
    expect(again.increment.views).toBe(90);
  });

  it('giorno nuovo: la base diventa il totale di ieri; due giri nello stesso giorno danno la stessa riga', () => {
    const stored = { totals: { views: 1000 }, base: { views: 900 }, totals_date: '2026-11-02' };
    const first = planPostSnapshot(stored, { views: 1100 }, '2026-10-01', '2026-11-03');
    expect(first).toMatchObject({ snapshotDate: '2026-11-03', base: { views: 1000 } });
    expect(first.increment.views).toBe(100);
    const second = planPostSnapshot({ totals: { views: 1100 }, base: first.base, totals_date: '2026-11-03' }, { views: 1150 }, '2026-10-01', '2026-11-03');
    expect(second.increment.views).toBe(150);
  });
});

describe('errori in chiaro', () => {
  it('app non ancora configurata', () => {
    expect(explainSocialError('tiktok', 'TikTok non configurato sul server')).toMatch(/non è ancora attivo/);
  });
  it('TikTok prima dell\'audit', () => {
    expect(explainSocialError('tiktok', 'unaudited_client_can_only_post_to_private_accounts')).toMatch(/Solo io/);
  });
  it('account Google senza canale', () => {
    expect(explainSocialError('youtube', 'Nessun canale YouTube su questo account Google')).toMatch(/non ha un canale/);
  });
});
