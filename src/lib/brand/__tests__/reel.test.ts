import { describe, it, expect } from 'vitest';
import {
  validaVideo,
  validaCopertina,
  validaDidascalia,
  contaHashtag,
  oraRomaInUtc,
  partiRoma,
  formatoRoma,
  erroreInstagram,
  codiceDaStato,
  parametriContainer,
  avviaReel,
  avanzaReel,
  REEL_LIMITI,
  type ReelIO,
  type ReelRiga,
} from '../reel';

const MB = 1024 * 1024;

describe('validaVideo', () => {
  const buono = { tipo: 'video/mp4', byte: 40 * MB, durata: 45, larghezza: 1080, altezza: 1920 };

  it('accetta un mp4 verticale 9:16 da 40 MB', () => {
    expect(validaVideo(buono)).toEqual({ errori: [], avvisi: [] });
  });

  it('accetta il MOV dell\'iPhone', () => {
    expect(validaVideo({ ...buono, tipo: 'video/quicktime' }).errori).toEqual([]);
  });

  it('rifiuta formati diversi da mp4/mov', () => {
    expect(validaVideo({ ...buono, tipo: 'video/webm' }).errori[0]).toMatch(/MP4 o MOV/);
  });

  it('rifiuta oltre 100 MB', () => {
    expect(validaVideo({ ...buono, byte: 101 * MB }).errori[0]).toMatch(/101 MB.*100 MB/);
  });

  it('rifiuta sotto 3 secondi e sopra 15 minuti', () => {
    expect(validaVideo({ ...buono, durata: 2.5 }).errori[0]).toMatch(/almeno 3 secondi/);
    expect(validaVideo({ ...buono, durata: 15 * 60 + 1 }).errori[0]).toMatch(/15 minuti/);
  });

  it('avvisa (senza bloccare) se il video è orizzontale o non 9:16', () => {
    const orizz = validaVideo({ ...buono, larghezza: 1920, altezza: 1080 });
    expect(orizz.errori).toEqual([]);
    expect(orizz.avvisi[0]).toMatch(/non è verticale/);
    expect(validaVideo({ ...buono, larghezza: 1080, altezza: 1350 }).avvisi[0]).toMatch(/non è 9:16/);
  });

  it('avvisa se la durata non si legge', () => {
    const v = validaVideo({ ...buono, durata: null });
    expect(v.errori).toEqual([]);
    expect(v.avvisi[0]).toMatch(/durata/);
  });
});

describe('validaCopertina e didascalia', () => {
  it('copertina: solo jpg/png fino a 8 MB', () => {
    expect(validaCopertina({ tipo: 'image/jpeg', byte: MB }).errori).toEqual([]);
    expect(validaCopertina({ tipo: 'image/webp', byte: MB }).errori[0]).toMatch(/JPG o PNG/);
    expect(validaCopertina({ tipo: 'image/png', byte: 9 * MB }).errori[0]).toMatch(/8 MB/);
  });

  it('conta gli hashtag e ignora # dentro le parole', () => {
    expect(contaHashtag('Schiena? #fisio #postura\n#salute')).toBe(3);
    expect(contaHashtag('prezzo C#5 e mail a#b')).toBe(0);
  });

  it('didascalia: massimo 2.200 caratteri e 30 hashtag', () => {
    expect(validaDidascalia('Ciao 👋 #fisio').errori).toEqual([]);
    expect(validaDidascalia('a'.repeat(2201)).errori[0]).toMatch(/2201 caratteri/);
    const tanti = Array.from({ length: 31 }, (_, i) => `#h${i}`).join(' ');
    expect(validaDidascalia(tanti).errori[0]).toMatch(/31 hashtag/);
  });
});

describe('ora italiana', () => {
  it('converte l\'ora di Roma in UTC con ora solare e legale', () => {
    expect(oraRomaInUtc('2026-11-08', '17:00')?.toISOString()).toBe('2026-11-08T16:00:00.000Z');
    expect(oraRomaInUtc('2026-07-01', '17:00')?.toISOString()).toBe('2026-07-01T15:00:00.000Z');
  });

  it('regge i giorni del cambio d\'ora', () => {
    // 29/03/2026: alle 02:00 si va alle 03:00. 25/10/2026: si torna indietro.
    expect(oraRomaInUtc('2026-03-29', '12:00')?.toISOString()).toBe('2026-03-29T10:00:00.000Z');
    expect(oraRomaInUtc('2026-10-25', '12:00')?.toISOString()).toBe('2026-10-25T11:00:00.000Z');
  });

  it('rifiuta date e ore non valide', () => {
    expect(oraRomaInUtc('2026-02-31', '10:00')).toBeNull();
    expect(oraRomaInUtc('2026-11-08', '25:00')).toBeNull();
    expect(oraRomaInUtc('', '10:00')).toBeNull();
  });

  it('va e torna senza perdere minuti', () => {
    const d = oraRomaInUtc('2026-12-24', '09:45') as Date;
    expect(partiRoma(d)).toEqual({ data: '2026-12-24', ora: '09:45' });
    expect(formatoRoma(d)).toMatch(/24 dic.*09:45/);
  });
});

describe('erroreInstagram', () => {
  it('traduce i sottocodici noti', () => {
    expect(erroreInstagram({ code: 9004, error_subcode: 2207026, message: 'x' }).messaggio).toMatch(/Formato video/);
    expect(erroreInstagram({ code: 9, error_subcode: 2207042 })).toEqual(
      expect.objectContaining({ temporaneo: false }),
    );
  });

  it('token scaduto e permessi: definitivi, con cosa fare', () => {
    expect(erroreInstagram({ code: 190 }).messaggio).toMatch(/ricollega/);
    expect(erroreInstagram({ code: 190 }).temporaneo).toBe(false);
    expect(erroreInstagram({ code: 10 }).messaggio).toMatch(/permesso/);
  });

  it('limiti di frequenza e server: temporanei', () => {
    expect(erroreInstagram({ code: 4 }).temporaneo).toBe(true);
    expect(erroreInstagram({ code: 2 }).temporaneo).toBe(true);
  });

  it('legge il codice dentro lo stato del container', () => {
    expect(codiceDaStato('Error: Media upload has failed with error code 2207026')).toBe(2207026);
    expect(erroreInstagram('Error: Media upload has failed with error code 2207026').messaggio).toMatch(/Formato video/);
    expect(erroreInstagram('Error: qualcosa').messaggio).toMatch(/rifiutato il video: Error: qualcosa/);
  });

  it('errore sconosciuto con messaggio di Meta: lo riporta', () => {
    expect(erroreInstagram({ code: 100, message: 'Invalid parameter' }).messaggio).toMatch(/Invalid parameter/);
  });
});

describe('parametriContainer', () => {
  const riga = baseRiga();

  it('REELS, didascalia con hashtag, condivisione nel feed attiva', () => {
    expect(parametriContainer(riga, 'https://v', null)).toEqual({
      media_type: 'REELS',
      video_url: 'https://v',
      caption: 'Mal di schiena?\n\n#fisio',
      share_to_feed: true,
    });
  });

  it('la copertina caricata vince sul fotogramma', () => {
    const p = parametriContainer({ ...riga, thumb_offset_ms: 4000 }, 'https://v', 'https://c');
    expect(p.cover_url).toBe('https://c');
    expect(p.thumb_offset).toBeUndefined();
    expect(parametriContainer({ ...riga, thumb_offset_ms: 4000 }, 'https://v', null).thumb_offset).toBe(4000);
  });
});

// ── Flusso completo con un Instagram finto ────────────────────────────────

function baseRiga(over: Partial<ReelRiga> = {}): ReelRiga {
  return {
    id: 'r1',
    content: 'Mal di schiena?',
    hashtags: '#fisio',
    video_path: 'utente/reel.mp4',
    cover_path: null,
    thumb_offset_ms: null,
    share_to_feed: true,
    attempts: 0,
    status: 'scheduled',
    ig_container_id: null,
    container_created_at: null,
    ...over,
  };
}

/** Database di una riga + Instagram finto: ogni chiamata è registrata. */
function finto(riga: ReelRiga, ig: Partial<Pick<ReelIO, 'creaContainer' | 'statoContainer' | 'pubblica'>> = {}) {
  let adesso = new Date('2026-11-08T16:00:00Z');
  const db: Record<string, unknown> = { ...riga, publish_claimed_at: null };
  const chiamate: string[] = [];
  const io: ReelIO = {
    ora: () => adesso,
    urlFirmato: async (p, s) => { chiamate.push(`firma ${p} ${s}`); return `https://firmato/${p}`; },
    creaContainer: ig.creaContainer ?? (async (p) => { chiamate.push(`crea ${p.media_type}`); return { id: 'c1' }; }),
    statoContainer: ig.statoContainer ?? (async () => ({ status_code: 'FINISHED' })),
    pubblica: ig.pubblica ?? (async (id) => { chiamate.push(`pubblica ${id}`); return { id: 'm1' }; }),
    aggiorna: async (campi, cond) => {
      if (cond?.seStato && db.status !== cond.seStato) return false;
      if (cond?.claimLiberoPrimaDi && db.publish_claimed_at && String(db.publish_claimed_at) >= cond.claimLiberoPrimaDi) return false;
      Object.assign(db, campi);
      return true;
    },
  };
  const riga2 = () => db as unknown as ReelRiga & { error_message?: string; blotato_post_id?: string };
  return { io, db, chiamate, riga: riga2, avanti: (min: number) => { adesso = new Date(adesso.getTime() + min * 60000); } };
}

describe('flusso Reel', () => {
  it('programmato → container → elaborazione → pubblicato', async () => {
    const f = finto(baseRiga());
    let stato = 'IN_PROGRESS';
    f.io.statoContainer = async () => ({ status_code: stato });

    expect(await avviaReel(f.riga(), f.io)).toEqual({ esito: 'in_elaborazione' });
    expect(f.db.status).toBe('processing');
    expect(f.db.ig_container_id).toBe('c1');
    expect(f.db.attempts).toBe(1);
    expect(f.chiamate).toContain(`firma utente/reel.mp4 ${REEL_LIMITI.urlFirmatoSecondi}`);

    // Giro del cron dopo 2 minuti: Instagram sta ancora elaborando.
    f.avanti(2);
    expect(await avanzaReel(f.riga(), f.io)).toEqual({ esito: 'in_elaborazione' });
    expect(f.chiamate.some((c) => c.startsWith('pubblica'))).toBe(false);

    // Giro dopo: pronto → pubblica.
    stato = 'FINISHED';
    f.avanti(2);
    expect(await avanzaReel(f.riga(), f.io)).toEqual({ esito: 'pubblicato', mediaId: 'm1' });
    expect(f.db.status).toBe('published');
    expect(f.db.blotato_post_id).toBe('m1');
    expect(f.db.error_message).toBeNull();
  });

  it('due giri sovrapposti non pubblicano due volte', async () => {
    const f = finto(baseRiga());
    await avviaReel(f.riga(), f.io);
    const fotografia = { ...f.riga() };
    const [a, b] = await Promise.all([avanzaReel(fotografia, f.io), avanzaReel(fotografia, f.io)]);
    expect([a.esito, b.esito].sort()).toEqual(['pubblicato', 'saltato']);
    expect(f.chiamate.filter((c) => c.startsWith('pubblica'))).toHaveLength(1);
  });

  it('una riga già presa da un altro giro non crea un secondo container', async () => {
    const f = finto(baseRiga());
    const fotografia = { ...f.riga() };
    await avviaReel(fotografia, f.io);
    expect(await avviaReel(fotografia, f.io)).toEqual({ esito: 'saltato' });
    expect(f.chiamate.filter((c) => c.startsWith('crea'))).toHaveLength(1);
  });

  it('formato sbagliato: fallisce subito, in italiano, senza riprovare', async () => {
    const f = finto(baseRiga());
    f.io.statoContainer = async () => ({ status_code: 'ERROR', status: 'Error: Media upload has failed with error code 2207026' });
    await avviaReel(f.riga(), f.io);
    const esito = await avanzaReel(f.riga(), f.io);
    expect(esito.esito).toBe('fallito');
    expect(f.db.status).toBe('failed');
    expect(String(f.db.error_message)).toMatch(/Formato video non accettato/);
  });

  it('errore temporaneo nel creare il container: torna in coda, poi dopo 3 tentativi fallisce', async () => {
    const f = finto(baseRiga(), {
      creaContainer: async () => ({ error: { code: 2, message: 'Service temporarily unavailable' } }),
    });
    expect((await avviaReel(f.riga(), f.io)).esito).toBe('riprova');
    expect(f.db.status).toBe('scheduled');
    expect(String(f.db.error_message)).toMatch(/Nuovo tentativo/);
    await avviaReel(f.riga(), f.io);
    expect((await avviaReel(f.riga(), f.io)).esito).toBe('fallito');
    expect(f.db.attempts).toBe(3);
    expect(f.db.status).toBe('failed');
  });

  it('token scaduto: fallisce al primo tentativo col messaggio da ricollegare', async () => {
    const f = finto(baseRiga(), { creaContainer: async () => ({ error: { code: 190, message: 'Error validating access token' } }) });
    expect((await avviaReel(f.riga(), f.io)).esito).toBe('fallito');
    expect(String(f.db.error_message)).toMatch(/ricollega il profilo/);
  });

  it('elaborazione oltre 30 minuti: nuovo container al giro dopo', async () => {
    const f = finto(baseRiga());
    f.io.statoContainer = async () => ({ status_code: 'IN_PROGRESS' });
    await avviaReel(f.riga(), f.io);
    f.avanti(31);
    expect((await avanzaReel(f.riga(), f.io)).esito).toBe('riprova');
    expect(f.db.status).toBe('scheduled');
    expect(f.db.ig_container_id).toBeNull();
  });

  it('pubblicazione «non ancora pronto»: libera il claim e riprova al giro dopo', async () => {
    let volte = 0;
    const f = finto(baseRiga(), {
      pubblica: async () => (++volte === 1 ? { error: { code: 9007, error_subcode: 2207027 } } : { id: 'm2' }),
    });
    await avviaReel(f.riga(), f.io);
    expect((await avanzaReel(f.riga(), f.io)).esito).toBe('in_elaborazione');
    expect(f.db.publish_claimed_at).toBeNull();
    f.avanti(2);
    expect(await avanzaReel(f.riga(), f.io)).toEqual({ esito: 'pubblicato', mediaId: 'm2' });
  });

  it('copertina caricata: firma anche la copertina e la passa a Instagram', async () => {
    let parametri: Record<string, unknown> = {};
    const f = finto(baseRiga({ cover_path: 'utente/cop.jpg' }), {
      creaContainer: async (p) => { parametri = p; return { id: 'c9' }; },
    });
    await avviaReel(f.riga(), f.io);
    expect(parametri.cover_url).toBe('https://firmato/utente/cop.jpg');
    expect(parametri.share_to_feed).toBe(true);
  });

  it('video mancante nell\'archivio: fallisce con messaggio chiaro', async () => {
    const f = finto(baseRiga());
    f.io.urlFirmato = async () => { throw new Error('Object not found'); };
    expect((await avviaReel(f.riga(), f.io)).esito).toBe('fallito');
    expect(String(f.db.error_message)).toMatch(/caricalo di nuovo/);
  });
});
