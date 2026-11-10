import { describe, expect, it } from 'vitest';
import {
  SLIDE_NON_ARRIVATA, TENTATIVI_SCRITTURA, applicaSlide, chiudiPendenti, chiudiProduzione, contaFatte, scriviSlides,
  statoFinale, versioneSuccessiva,
  type IoRiga, type RigaSlides, type SlideStato,
} from '../carouselSlides';

const pending = (index: number): SlideStato => ({ index, path: null, error: null, status: 'pending' });
const done = (index: number): SlideStato => ({ index, path: `u/r/slide_${index + 1}.png`, error: null, status: 'done' });
const failed = (index: number, error = 'nessuna immagine dal modello'): SlideStato => ({ index, path: null, error, status: 'failed' });

describe('applicaSlide e contaFatte', () => {
  it('cambia solo la slide con lo stesso indice', () => {
    const slides = [pending(0), pending(1), pending(2)];
    const dopo = applicaSlide(slides, done(1));
    expect(dopo.map((s) => s.status)).toEqual(['pending', 'done', 'pending']);
    expect(contaFatte(dopo)).toBe(1);
  });

  it('una slide «done» senza immagine non conta', () => {
    expect(contaFatte([{ index: 0, path: '', status: 'done' }, done(1)])).toBe(1);
  });
});

describe('statoFinale', () => {
  it('ready solo con tutte le slide fatte', () => {
    expect(statoFinale([done(0), done(1)])).toBe('ready');
    expect(statoFinale([done(0), failed(1)])).toBe('partial');
    expect(statoFinale([failed(0), failed(1)])).toBe('failed');
    expect(statoFinale([])).toBe('failed');
  });
});

describe('versioneSuccessiva', () => {
  it('usa l\'ora di adesso quando è dopo la precedente', () => {
    expect(versioneSuccessiva('2026-11-09T16:58:38.142925+00:00', Date.parse('2026-11-09T16:59:00.000Z')))
      .toBe('2026-11-09T16:59:00.000Z');
  });

  it('va comunque avanti di un millisecondo se l\'orologio è indietro o uguale', () => {
    const prima = '2026-11-09T16:59:08.774+00:00';
    expect(versioneSuccessiva(prima, Date.parse(prima))).toBe('2026-11-09T16:59:08.775Z');
    expect(versioneSuccessiva(prima, Date.parse(prima) - 5000)).toBe('2026-11-09T16:59:08.775Z');
  });

  it('senza versione precedente usa l\'ora di adesso', () => {
    expect(versioneSuccessiva(null, 0)).toBe('1970-01-01T00:00:00.000Z');
  });
});

describe('chiudiProduzione', () => {
  it('caso del 09/11: riga con 1 slide salvata su 5, le altre 4 tornano dai risultati', () => {
    const salvate = [pending(0), pending(1), pending(2), done(3), pending(4)];
    const risultati = [done(0), done(1), done(2), done(3), done(4)];
    const chiusa = chiudiProduzione(salvate, risultati);
    expect(chiusa.status).toBe('ready');
    expect(chiusa.okCount).toBe(5);
    expect(chiusa.slides.every((s) => s.status === 'done' && s.path)).toBe(true);
  });

  it('non lascia mai una slide «pending»: quella senza risultato diventa fallita', () => {
    const chiusa = chiudiProduzione([done(0), pending(1)], [done(0)]);
    expect(chiusa.status).toBe('partial');
    expect(chiusa.slides[1]).toMatchObject({ status: 'failed', path: null, error: SLIDE_NON_ARRIVATA });
  });

  it('i layout tornano «done» senza percorso: vale quello che c\'è nella riga', () => {
    const risultati = [{ index: 0, path: '', error: null, status: 'done' }, { index: 1, path: '', error: null, status: 'done' }];
    const chiusa = chiudiProduzione([done(0), pending(1)], risultati);
    expect(chiusa.slides[0].path).toBe('u/r/slide_1.png');
    expect(chiusa.slides[1].status).toBe('failed');
    expect(chiusa.status).toBe('partial');
  });

  it('tiene l\'errore vero di una slide fallita', () => {
    const chiusa = chiudiProduzione([pending(0), failed(1, 'il titolo è uscito doppio')], [failed(0, 'nessuna immagine dal modello')]);
    expect(chiusa.slides.map((s) => s.error)).toEqual(['nessuna immagine dal modello', 'il titolo è uscito doppio']);
    expect(chiusa.status).toBe('failed');
  });

  it('una slide già salvata non viene toccata da un risultato fallito', () => {
    const chiusa = chiudiProduzione([done(0)], [failed(0)]);
    expect(chiusa.slides[0].status).toBe('done');
  });
});

describe('chiudiPendenti (sito)', () => {
  it('dà l\'errore alle slide senza immagine e le conta', () => {
    const { slides, quante } = chiudiPendenti([
      { path: 'a.png', error: null }, { path: null, error: null }, { path: null, error: 'fallita' },
    ]);
    expect(quante).toBe(1);
    expect(slides.map((s) => s.error)).toEqual([null, SLIDE_NON_ARRIVATA, 'fallita']);
  });
});

/** Riga in memoria con lo stesso contratto del database: letture lente, scrittura con confronto di versione. */
function rigaFinta(slides: SlideStato[], opzioni: { rifiutaSempre?: boolean } = {}) {
  const riga: RigaSlides<SlideStato> = { slides, updated_at: '2026-11-09T16:58:38.142925+00:00', status: 'producing' };
  let orologio = Date.parse('2026-11-09T16:58:40.000Z');
  let scritture = 0;
  const attesa = () => new Promise<void>((r) => setTimeout(r, Math.random() * 3));
  const io: IoRiga<SlideStato> = {
    leggi: async () => { await attesa(); return { ...riga, slides: [...(riga.slides || [])] }; },
    scrivi: async (campi, seVersione) => {
      await attesa();
      if (opzioni.rifiutaSempre && seVersione) return false;
      if (seVersione && seVersione !== riga.updated_at) return false;
      Object.assign(riga, campi);
      scritture++;
      return true;
    },
    adesso: () => orologio++,
    pausa: () => Promise.resolve(),
  };
  return { riga, io, scritture: () => scritture };
}

describe('scriviSlides', () => {
  it('6 slide scritte insieme: nessuna si perde (era il carosello fermo a 1 su 5)', async () => {
    for (let giro = 0; giro < 20; giro++) {
      const { riga, io } = rigaFinta([0, 1, 2, 3, 4, 5].map(pending));
      await Promise.all([0, 1, 2, 3, 4, 5].map((i) => scriviSlides(io, (r) => {
        const slides = applicaSlide(r.slides || [], done(i));
        return { slides, ok_count: contaFatte(slides) };
      })));
      expect(contaFatte(riga.slides || [])).toBe(6);
      expect((riga as { ok_count?: number }).ok_count).toBe(6);
    }
  });

  it('senza confronto di versione le slide si perdono davvero (il difetto di prima)', async () => {
    let perse = 0;
    for (let giro = 0; giro < 20; giro++) {
      const { riga, io } = rigaFinta([0, 1, 2, 3, 4, 5].map(pending));
      await Promise.all([0, 1, 2, 3, 4, 5].map(async (i) => {
        const letta = await io.leggi();
        await io.scrivi({ slides: applicaSlide(letta?.slides || [], done(i)) }, null);
      }));
      if (contaFatte(riga.slides || []) < 6) perse++;
    }
    expect(perse).toBeGreaterThan(0);
  });

  it('ogni scrittura porta avanti la versione', async () => {
    const { riga, io } = rigaFinta([pending(0)]);
    const prima = riga.updated_at!;
    await scriviSlides(io, (r) => ({ slides: applicaSlide(r.slides || [], done(0)) }));
    expect(Date.parse(riga.updated_at!)).toBeGreaterThan(Date.parse(prima));
  });

  it('se il confronto non passa mai, all\'ultimo giro scrive comunque', async () => {
    const { riga, io, scritture } = rigaFinta([pending(0)], { rifiutaSempre: true });
    const esito = await scriviSlides(io, (r) => ({ slides: applicaSlide(r.slides || [], done(0)) }));
    expect(esito).not.toBeNull();
    expect(scritture()).toBe(1);
    expect(contaFatte(riga.slides || [])).toBe(1);
    expect(TENTATIVI_SCRITTURA).toBeGreaterThan(1);
  });

  it('riga sparita: non scrive e torna null', async () => {
    const io: IoRiga<SlideStato> = { leggi: async () => null, scrivi: async () => true, adesso: () => 0, pausa: async () => {} };
    expect(await scriviSlides(io, () => ({ slides: [] }))).toBeNull();
  });
});
