import { describe, expect, it } from 'vitest';
import {
  controllaTesti,
  controllaVideo,
  maxByteVideo,
  testoPer,
  titoloEsiti,
  type EsitoDestinazione,
} from '../videoUnico';

const MB = 1024 * 1024;
const verticale = { tipo: 'video/mp4', byte: 40 * MB, durata: 45, larghezza: 1080, altezza: 1920 };

describe('controllaVideo', () => {
  it('un video verticale di 45 s va bene ovunque', () => {
    expect(controllaVideo(verticale, ['instagram', 'youtube', 'tiktok'], 600)).toEqual({ errori: [], avvisi: [] });
  });

  it('il peso massimo è quello della destinazione più stretta', () => {
    expect(maxByteVideo(['youtube', 'tiktok'])).toBe(200 * MB);
    expect(maxByteVideo(['instagram', 'tiktok'])).toBe(100 * MB);
    const pesante = { ...verticale, byte: 150 * MB };
    expect(controllaVideo(pesante, ['youtube', 'tiktok']).errori).toEqual([]);
    expect(controllaVideo(pesante, ['instagram', 'youtube']).errori[0]).toMatch(/massimo è 100 MB/);
  });

  it('WebM va su TikTok e YouTube ma non su Instagram', () => {
    const webm = { ...verticale, tipo: 'video/webm' };
    expect(controllaVideo(webm, ['youtube', 'tiktok']).errori).toEqual([]);
    expect(controllaVideo(webm, ['instagram']).errori[0]).toMatch(/MP4 o MOV/);
  });

  it('oltre 3 minuti o orizzontale: avviso che non sarà uno Short', () => {
    const lungo = controllaVideo({ ...verticale, durata: 200 }, ['youtube']);
    expect(lungo.errori).toEqual([]);
    expect(lungo.avvisi[0]).toMatch(/più di 3 minuti/);
    const orizzontale = controllaVideo({ ...verticale, larghezza: 1920, altezza: 1080 }, ['youtube']);
    expect(orizzontale.avvisi[0]).toMatch(/Non è verticale/);
  });

  it('rispetta la durata massima del profilo TikTok', () => {
    const r = controllaVideo({ ...verticale, durata: 120 }, ['tiktok'], 60);
    expect(r.errori[0]).toMatch(/al massimo 60 secondi/);
  });

  it('non ripete lo stesso messaggio due volte', () => {
    const corto = controllaVideo({ ...verticale, durata: 2 }, ['instagram', 'tiktok']);
    expect(corto.errori).toHaveLength(2); // Reel e TikTok hanno frasi diverse
    expect(new Set(corto.errori).size).toBe(corto.errori.length);
  });
});

describe('testi per piattaforma', () => {
  it('senza testo proprio vale quello comune', () => {
    expect(testoPer('tiktok', ' Comune ', {})).toBe('Comune');
    expect(testoPer('tiktok', 'Comune', { tiktok: 'Solo TikTok' })).toBe('Solo TikTok');
    expect(testoPer('tiktok', 'Comune', { tiktok: null })).toBe('Comune');
  });

  it('Instagram vuole la didascalia, YouTube il titolo', () => {
    const r = controllaTesti(['instagram', 'youtube'], '', {}, '');
    expect(r.errori).toContain('Scrivi la didascalia per Instagram.');
    expect(r.errori).toContain('Scrivi il titolo per YouTube.');
  });

  it('i limiti di lunghezza sono per piattaforma', () => {
    const lungo = 'a'.repeat(2300);
    expect(controllaTesti(['youtube'], lungo, {}, 'Titolo').errori).toEqual([]);
    expect(controllaTesti(['tiktok'], lungo, {}, '').errori[0]).toMatch(/TikTok supera 2200/);
    expect(controllaTesti(['tiktok'], lungo, { tiktok: 'Corto' }, '').errori).toEqual([]);
  });

  it('titolo YouTube: massimo 100 caratteri e niente < >', () => {
    expect(controllaTesti(['youtube'], '', {}, 'x'.repeat(101)).errori[0]).toMatch(/100 caratteri/);
    expect(controllaTesti(['youtube'], '', {}, 'Spalla <libera>').errori[0]).toMatch(/< e >/);
  });
});

describe('titoloEsiti', () => {
  const e = (stato: EsitoDestinazione['stato']): EsitoDestinazione => ({ destinazione: 'tiktok', stato, messaggio: '' });
  it('riassume come è andata', () => {
    expect(titoloEsiti([e('pubblicato'), e('pubblicato')])).toBe('Fatto');
    expect(titoloEsiti([e('programmato'), e('programmato')])).toBe('Programmato');
    expect(titoloEsiti([e('pubblicato'), e('in_elaborazione')])).toBe('Inviato, quasi fatto');
    expect(titoloEsiti([e('pubblicato'), e('fallito')])).toBe('Andato in parte');
    expect(titoloEsiti([e('fallito')])).toBe('Non è andato');
  });
});
