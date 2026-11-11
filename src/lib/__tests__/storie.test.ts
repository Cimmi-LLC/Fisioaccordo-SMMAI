import { describe, expect, it, vi } from 'vitest';
import { INCHIOSTRO_STORIE, coloreLeggibile, creaCercaFoto, fraseSenzaFoto, messaggioErroreStorie, rispostaNonLeggibile, type RispostaFoto } from '../storie';

const lenta = (risposta: RispostaFoto, ms = 5) => new Promise<RispostaFoto>((r) => setTimeout(() => r(risposta), ms));

describe('creaCercaFoto', () => {
  it('10 richieste della stessa foto mentre è in corso: una sola chiamata', async () => {
    const chiama = vi.fn(() => lenta({ url: 'https://x/foto.jpg' }));
    const { cerca } = creaCercaFoto({ chiama });
    const esiti = await Promise.all(Array.from({ length: 10 }, () => cerca('neck pain', 'brand-1')));
    expect(chiama).toHaveBeenCalledTimes(1);
    expect(esiti.every((e) => e.url === 'https://x/foto.jpg')).toBe(true);
  });

  it('una foto riuscita non si richiede più; brand diversi non si mescolano', async () => {
    const chiama = vi.fn((q: string, b: string | null) => lenta({ url: `https://x/${b}/${q}.jpg` }));
    const { cerca } = creaCercaFoto({ chiama });
    await cerca('yoga', 'a');
    await cerca('yoga', 'a');
    const altro = await cerca('yoga', 'b');
    expect(chiama).toHaveBeenCalledTimes(2);
    expect(altro.url).toBe('https://x/b/yoga.jpg');
  });

  it('non più di 3 ricerche insieme', async () => {
    let attive = 0;
    let massimo = 0;
    const chiama = vi.fn(async () => {
      attive++;
      massimo = Math.max(massimo, attive);
      await new Promise((r) => setTimeout(r, 5));
      attive--;
      return { url: 'https://x/f.jpg' };
    });
    const { cerca } = creaCercaFoto({ chiama });
    await Promise.all(Array.from({ length: 12 }, (_, i) => cerca('foto ' + i, 'brand')));
    expect(chiama).toHaveBeenCalledTimes(12);
    expect(massimo).toBe(3);
  });

  it('oltre il tempo massimo la storia esce senza foto, con il motivo', async () => {
    const chiama = vi.fn(() => lenta({ url: 'https://x/tardi.jpg' }, 60));
    const { cerca } = creaCercaFoto({ chiama, tempoMassimoMs: 10 });
    expect(await cerca('back pain', 'b')).toEqual({ url: null, motivo: 'tempo' });
  });

  it('dopo un errore la stessa ricerca non riparte da sola (era la valanga del 09/11)', async () => {
    let ora = 0;
    const chiama = vi.fn(async () => { throw new Error('504'); });
    const { cerca } = creaCercaFoto({ chiama, adesso: () => ora, riposoErroreMs: 60_000 });
    expect((await cerca('knee pain', 'b')).motivo).toBe('errore');
    for (let i = 0; i < 9; i++) await cerca('knee pain', 'b');
    expect(chiama).toHaveBeenCalledTimes(1);
    ora = 61_000;
    await cerca('knee pain', 'b');
    expect(chiama).toHaveBeenCalledTimes(2);
  });

  it('«Riprova la foto» riparte subito anche dopo un errore', async () => {
    const chiama = vi.fn<() => Promise<RispostaFoto>>()
      .mockResolvedValueOnce({ url: null, errore: 'exception' })
      .mockResolvedValueOnce({ url: 'https://x/ok.jpg' });
    const { cerca } = creaCercaFoto({ chiama });
    expect((await cerca('posture', 'b')).motivo).toBe('errore');
    expect((await cerca('posture', 'b', { forza: true })).url).toBe('https://x/ok.jpg');
    expect(chiama).toHaveBeenCalledTimes(2);
  });

  it('senza ricerca non chiama nessuno; risposta vuota = nessuna foto adatta', async () => {
    const chiama = vi.fn(async () => ({ url: null }));
    const { cerca } = creaCercaFoto({ chiama });
    expect(await cerca('', 'b')).toEqual({ url: null, motivo: 'nessuna' });
    expect(chiama).not.toHaveBeenCalled();
    expect((await cerca('stretching', 'b')).motivo).toBe('nessuna');
  });
});

describe('messaggi', () => {
  it('la frase del server arriva a schermo così com\'è', () => {
    const frase = 'Gemini è temporaneamente sovraccarico. Riprova tra 30 secondi.';
    expect(messaggioErroreStorie(new Error(frase))).toBe(frase);
  });

  it('gli errori tecnici diventano una frase che dice cosa fare', () => {
    expect(messaggioErroreStorie(new Error('No JSON array'))).toMatch(/formato che non riesco a leggere/);
    expect(messaggioErroreStorie(new SyntaxError('Unexpected token } in JSON at position 812'))).toMatch(/formato/);
    expect(messaggioErroreStorie(new Error('Edge Function returned a non-2xx status code'))).toMatch(/non ha risposto in tempo/);
    expect(messaggioErroreStorie(new Error('AI API error: 500'))).toMatch(/ha dato errore/);
    expect(messaggioErroreStorie(null)).toMatch(/non sono arrivate/);
  });

  it('non dice mai solo «Errore. Riprova.»', () => {
    for (const e of [new Error(''), new Error('boh'), 'stringa', undefined]) {
      expect(messaggioErroreStorie(e)).not.toBe('Errore. Riprova.');
      expect(messaggioErroreStorie(e).length).toBeGreaterThan(2);
    }
  });

  it('ritenta da solo soltanto le risposte non leggibili', () => {
    expect(rispostaNonLeggibile(new Error('No JSON array'))).toBe(true);
    expect(rispostaNonLeggibile(new Error('Quota Gemini superata. Riprova tra qualche minuto.'))).toBe(false);
  });

  it('frase sulla storia senza foto', () => {
    expect(fraseSenzaFoto('tempo')).toMatch(/in tempo/);
    expect(fraseSenzaFoto('nessuna')).toMatch(/Nessuna foto adatta/);
    expect(fraseSenzaFoto('errore')).toBe('La foto non è arrivata');
  });
});

describe('coloreLeggibile (storie su fondo chiaro)', () => {
  it('un giallo o una menta non si leggono sul chiaro: inchiostro', () => {
    expect(coloreLeggibile('#ffd700')).toBe(INCHIOSTRO_STORIE);
    expect(coloreLeggibile('#b6e3d4')).toBe(INCHIOSTRO_STORIE);
  });
  it('i colori che si leggono restano quelli del brand', () => {
    for (const c of ['#00539e', '#554697', '#e6007e', '#f0853d']) expect(coloreLeggibile(c)).toBe(c);
  });
  it('colore mancante o scritto male: inchiostro', () => {
    expect(coloreLeggibile(null)).toBe(INCHIOSTRO_STORIE);
    expect(coloreLeggibile('blu')).toBe(INCHIOSTRO_STORIE);
  });
});
