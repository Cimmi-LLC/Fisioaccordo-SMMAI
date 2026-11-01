import { describe, it, expect } from 'vitest';
import {
  normalizzaHandle,
  handleValido,
  piattaformaDaLink,
  urlIncorporato,
  urlRicercaInserzioni,
  leggiReelInstagram,
  leggiVideoTiktok,
  leggiInserzione,
  senzaSegnaposto,
  promptCategorie,
  leggiCategorie,
  handleInErrore,
  giorniFra,
  medieCanale,
  outlier,
  engagement,
  livelloSoldi,
  numeroBreve,
  leggiAnalisi,
  leggiCopione,
  paroleVietateIn,
  promptCopione,
  copioneDaLeggere,
  type AnalisiVideo,
} from '../virali';

const OGGI = new Date('2026-11-01T10:00:00Z');

describe('handle e link', () => {
  it('pulisce link, chiocciole e maiuscole', () => {
    expect(normalizzaHandle('@ThePrehabGuys')).toBe('theprehabguys');
    expect(normalizzaHandle('https://www.instagram.com/squat_university/?hl=it')).toBe('squat_university');
    expect(normalizzaHandle('https://www.tiktok.com/@bobandbrad/video/123')).toBe('bobandbrad');
    expect(normalizzaHandle('instagram.com/dr.jen')).toBe('dr.jen');
    expect(normalizzaHandle('  nome.cognome  ')).toBe('nome.cognome');
  });

  it('riconosce piattaforma e handle validi', () => {
    expect(piattaformaDaLink('https://vm.tiktok.com/@x')).toBe('tiktok');
    expect(piattaformaDaLink('instagram.com/x')).toBe('instagram');
    expect(piattaformaDaLink('@x')).toBeNull();
    expect(handleValido('nome.cognome_1')).toBe(true);
    expect(handleValido('nome con spazi')).toBe(false);
    expect(handleValido('')).toBe(false);
  });

  it('costruisce i link da incorporare e la ricerca inserzioni', () => {
    expect(urlIncorporato('instagram', '1', 'ABC')).toBe('https://www.instagram.com/reel/ABC/embed/');
    expect(urlIncorporato('instagram', '1', null)).toBeNull();
    expect(urlIncorporato('tiktok', '7300', null)).toBe('https://www.tiktok.com/embed/v2/7300');
    const u = new URL(urlRicercaInserzioni('IT', 'mal di schiena'));
    expect(u.searchParams.get('country')).toBe('IT');
    expect(u.searchParams.get('q')).toBe('mal di schiena');
    expect(u.searchParams.get('media_type')).toBe('video');
    expect(u.searchParams.get('active_status')).toBe('active');
  });
});

describe('lettura dati Apify', () => {
  it('legge un reel Instagram e scarta i like nascosti', () => {
    const v = leggiReelInstagram({
      id: '3500', shortCode: 'DAbc', url: 'https://www.instagram.com/reel/DAbc/', ownerUsername: 'Fisio.Mario',
      caption: 'Mal di schiena?', timestamp: '2026-10-20T08:00:00.000Z', videoDuration: 41.2,
      videoPlayCount: 250000, videoViewCount: 120000, likesCount: -1, commentsCount: 300,
      displayUrl: 'https://cdn/x.jpg', videoUrl: 'https://cdn/x.mp4', productType: 'clips',
    });
    expect(v).not.toBeNull();
    expect(v!.handle).toBe('fisio.mario');
    expect(v!.views).toBe(250000);
    expect(v!.likes).toBeNull();
    expect(v!.commenti).toBe(300);
    expect(v!.copertina_url).toBe('https://cdn/x.jpg');
  });

  it('scarta righe d\'errore e post che non sono video', () => {
    expect(leggiReelInstagram({ error: 'not_found', username: 'x' })).toBeNull();
    expect(leggiReelInstagram({ id: '1', shortCode: 'A', ownerUsername: 'x', type: 'Image' })).toBeNull();
  });

  it('legge un video TikTok con salvataggi e condivisioni', () => {
    const v = leggiVideoTiktok({
      id: '7400', text: 'Esercizio per il collo', createTime: 1761000000, playCount: 1_200_000,
      diggCount: 80000, shareCount: 5000, commentCount: 900, collectCount: 30000,
      videoMeta: { duration: 33, coverUrl: 'https://tt/c.jpg' }, webVideoUrl: 'https://www.tiktok.com/@dr.x/video/7400',
      authorMeta: { name: 'Dr.X', fans: 900000 },
    });
    expect(v!.handle).toBe('dr.x');
    expect(v!.salvataggi).toBe(30000);
    expect(v!.follower).toBe(900000);
    expect(v!.pubblicato_il).toBe(new Date(1761000000 * 1000).toISOString());
    expect(leggiVideoTiktok({ id: '1', isSlideshow: true, authorMeta: { name: 'x' } })).toBeNull();
  });

  it('trova gli handle non trovati da Apify', () => {
    expect(handleInErrore([
      { error: 'not_found', username: '@Sbagliato' },
      { error: 'private', inputUrl: 'https://www.instagram.com/privato/' },
      { id: '1', ownerUsername: 'ok' },
    ])).toEqual(['sbagliato', 'privato']);
  });

  it('legge un\'inserzione attiva e conta i giorni', () => {
    const a = leggiInserzione({
      adArchiveID: '123', pageName: 'Studio X', pageID: '99', isActive: true, collationCount: 4,
      startDate: Date.parse('2026-08-01T00:00:00Z') / 1000, endDate: Date.parse('2026-11-01T00:00:00Z') / 1000,
      publisherPlatform: ['FACEBOOK', 'INSTAGRAM'],
      snapshot: { body: { text: 'Hai mal di schiena?' }, title: 'Prenota', linkUrl: 'https://x.it', ctaText: 'Scopri di più',
        videos: [{ videoHdUrl: 'https://f/hd.mp4', videoSdUrl: 'https://f/sd.mp4', videoPreviewImageUrl: 'https://f/p.jpg' }] },
    }, OGGI);
    expect(a!.ad_id).toBe('123');
    expect(a!.giorni).toBe(93);
    expect(a!.varianti).toBe(4);
    expect(a!.video_url).toBe('https://f/sd.mp4');
    expect(a!.finita_il).toBeNull();
    expect(livelloSoldi(a!.giorni, a!.varianti)).toBe('forte');
  });

  it('prende il video dalle card del carosello e scarta le inserzioni senza video', () => {
    const a = leggiInserzione({
      adArchiveId: 5, pageName: 'P', isActive: false, startDateFormatted: '2026-10-01', endDateFormatted: '2026-10-10',
      snapshot: { cards: [{ body: 'testo card', videoHdUrl: 'https://f/hd.mp4' }] },
    }, OGGI);
    expect(a!.giorni).toBe(10);
    expect(a!.testo).toBe('testo card');
    expect(a!.finita_il).toBe('2026-10-10');
    expect(leggiInserzione({ adArchiveID: '1', snapshot: { images: [{}] } }, OGGI)).toBeNull();
  });

  it('toglie i segnaposto delle inserzioni di catalogo', () => {
    expect(senzaSegnaposto('{{product.brand}}')).toBe('');
    expect(senzaSegnaposto('Materasso {{product.name}} in offerta')).toBe('Materasso in offerta');
    const a = leggiInserzione({
      adArchiveID: '7', pageName: 'Negozio', isActive: true,
      snapshot: { body: { text: '{{product.brand}}' }, title: '{{product.name}}', videos: [{ videoSdUrl: 'https://f/sd.mp4' }] },
    }, OGGI);
    expect(a!.testo).toBe('');
    expect(a!.titolo).toBe('');
  });

  it('conta i giorni con gli estremi compresi', () => {
    expect(giorniFra('2026-10-01', '2026-10-01')).toBe(1);
    expect(giorniFra('2026-10-01', '2026-10-31T23:00:00Z')).toBe(31);
    expect(giorniFra('2026-10-10', '2026-10-01')).toBe(0);
  });
});

describe('punteggi', () => {
  const giorno = (n: number) => new Date(OGGI.getTime() - n * 86400000).toISOString();

  it('media sugli ultimi 90 giorni e outlier', () => {
    const video = [
      ...[10, 20, 30, 40, 50].map((d) => ({ handle: 'a', views: 10000, pubblicato_il: giorno(d) })),
      { handle: 'a', views: 1_000_000, pubblicato_il: giorno(200) }, // vecchio: fuori dalla media
      { handle: 'a', views: null, pubblicato_il: giorno(5) },
    ];
    const medie = medieCanale(video, OGGI);
    expect(medie.get('a')).toBe(10000);
    expect(outlier(120000, medie.get('a'))).toBe(12);
    expect(outlier(null, 10)).toBeNull();
    expect(outlier(10, undefined)).toBeNull();
  });

  it('con pochi video recenti usa tutti quelli letti', () => {
    const video = [
      { handle: 'b', views: 1000, pubblicato_il: giorno(10) },
      { handle: 'b', views: 3000, pubblicato_il: giorno(300) },
    ];
    expect(medieCanale(video, OGGI).get('b')).toBe(2000);
  });

  it('engagement e livelli di soldi', () => {
    expect(engagement({ views: 1000, likes: 30, commenti: 5, condivisioni: null, salvataggi: 5 })).toBe(0.04);
    expect(engagement({ views: 0, likes: 1, commenti: 1, condivisioni: null, salvataggi: null })).toBeNull();
    expect(engagement({ views: 100, likes: null, commenti: null, condivisioni: null, salvataggi: null })).toBeNull();
    expect(livelloSoldi(10, 1)).toBe('prova');
    expect(livelloSoldi(30, 1)).toBe('buono');
    expect(livelloSoldi(12, 6)).toBe('forte');
  });

  it('numeri brevi in italiano', () => {
    expect(numeroBreve(1_234_567)).toBe('1,2 Mln');
    expect(numeroBreve(45_300)).toBe('45,3 mila');
    expect(numeroBreve(980)).toBe('980');
    expect(numeroBreve(null)).toBe('–');
  });
});

const ANALISI: AnalisiVideo = {
  lingua: 'en', durata_s: 40,
  trascrizione: [{ t: '0:00', testo: 'Stop stretching your back', it: 'Smetti di allungare la schiena' }],
  testi_a_schermo: [{ t: '0:00', testo: 'STOP STRETCHING' }],
  format: 'Errore / trappola', topic: 'mal di schiena', seed: 'lo stretching peggiora', contrarian_take: 'allungare non serve',
  hook: { parlato: 'Stop stretching your back', testo: 'STOP STRETCHING', visivo: 'indica la schiena', tipo_parlato: 'negativo' },
  struttura: ['errore', 'perché', 'cosa fare'], cta: { testo: 'Comment BACK', tipo: 'lead' },
  layout: 'talking head', inquadratura: 'mezzo busto, camera fissa', elementi: ['sottotitoli'],
  perche_funziona: ['contrasto forte'], semplice: true, cosa_serve: ['telefono'],
};

describe('analisi e copione', () => {
  it('legge l\'analisi anche dentro ```json', () => {
    const a = leggiAnalisi('```json\n' + JSON.stringify({ ...ANALISI, semplice: 'sì' }) + '\n```');
    expect(a.format).toBe('Errore / trappola');
    expect(a.semplice).toBe(false); // solo true vale come semplice
    expect(a.trascrizione[0].it).toBe('Smetti di allungare la schiena');
  });

  it('rifiuta un\'analisi vuota', () => {
    expect(() => leggiAnalisi('{"format": "Tutorial"}')).toThrow();
    expect(() => leggiAnalisi('niente')).toThrow();
  });

  it('legge il copione e mette l\'hook in testa alle frasi', () => {
    const c = leggiCopione(JSON.stringify({
      titolo: 'Stretching', testo_in_alto: 'Smetti di allungarti',
      hook_parlato: 'Hai mal di schiena? Smetti di allungarti.',
      frasi: ['Lo stretching non basta.', 'Il problema è un altro.', 'Prova questo esercizio.'],
      cta: 'Scrivi SCHIENA nei commenti', semplice: true,
    }), 'esatta');
    expect(c.frasi[0]).toBe('Hai mal di schiena? Smetti di allungarti.');
    expect(c.frasi).toHaveLength(4);
    expect(copioneDaLeggere(c).split('\n')).toHaveLength(4);
    expect(c.tipo).toBe('esatta');
  });

  it('rifiuta un copione troppo corto', () => {
    expect(() => leggiCopione('{"frasi": ["una"]}', 'vicina')).toThrow();
  });

  it('trova le parole vietate, anche quelle del brand', () => {
    expect(paroleVietateIn('Ti sblocco la schiena in un minuto')).toEqual(['sbloccare']);
    expect(paroleVietateIn('Ti aiuto a risolvere prima', ['dolore cronico'])).toEqual([]);
    expect(paroleVietateIn('Il dolore cronico passa', ['dolore cronico'])).toEqual(['dolore cronico']);
  });

  it('il prompt dice cosa cambiare e da dove viene il video', () => {
    const p = promptCopione({
      analisi: ANALISI, tipo: 'esatta', brand: { nome_business: 'Studio Rossi', servizi: ['TECAR'] },
      bloccoProfessione: 'Professione: fisioterapista', origine: { piattaforma: 'tiktok', handle: 'dr.x', paese: 'US', views: 1000 },
    });
    expect(p).toContain('COPIA ESATTA');
    expect(p).toContain('non tradurre');
    expect(p).toContain('Studio Rossi');
    expect(p).toContain('Smetti di allungare la schiena');
    const v = promptCopione({
      analisi: ANALISI, tipo: 'vicina', brand: {}, bloccoProfessione: '',
      origine: { piattaforma: 'instagram', handle: 'x', paese: 'IT', views: null },
    });
    expect(v).toContain('COPIA VICINA');
    expect(v).toContain('non riusare le sue frasi');
  });
});

describe('categorie delle inserzioni', () => {
  const lista = [
    { pagina: 'MIND Fisioterapia', testo: 'Valutazione a 19 euro', titolo: '', link: 'https://www.mindfisio.it/prenota', professione: 'fisioterapista' },
    { pagina: 'Koprez', testo: 'Plantar fasciitis sleeves', titolo: 'Shop now', link: 'notaurl', professione: 'fisioterapista' },
    { pagina: 'Joel Osteen', testo: '', titolo: '', link: null, professione: 'fisioterapista' },
  ];

  it('numera le inserzioni e mostra il sito senza www', () => {
    const p = promptCategorie(lista);
    expect(p).toContain('1. Pagina: MIND Fisioterapia | Ricerca per: fisioterapista | Sito: mindfisio.it | Testo: Valutazione a 19 euro');
    expect(p).toContain('2. Pagina: Koprez | Ricerca per: fisioterapista | Testo: Shop now · Plantar fasciitis sleeves');
    expect(p).toContain('3. Pagina: Joel Osteen | Ricerca per: fisioterapista | Testo: (nessun testo)');
  });

  it('legge le categorie in ordine e scarta quelle non valide', () => {
    const raw = '```json\n{"risposte":[{"n":1,"categoria":"studio"},{"n":2,"categoria":"Prodotto"},{"n":3,"categoria":"fuori tema"},{"n":9,"categoria":"studio"}]}\n```';
    expect(leggiCategorie(raw, 3)).toEqual(['studio', 'prodotto', 'fuori_tema']);
    expect(leggiCategorie('{"risposte":[{"n":2,"categoria":"boh"}]}', 3)).toEqual([null, null, null]);
    expect(leggiCategorie('{"altro":1}', 2)).toEqual([null, null]);
  });
});
