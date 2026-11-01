import { describe, it, expect } from 'vitest';
import {
  normalizzaOrari,
  prossimiSlot,
  daOraRoma,
  leggiCopy,
  chiaveUrl,
  temiRicerca,
  leggiArticoliPubmed,
  leggiScelta,
  leggiTermini,
  leggiIdPubmed,
  urlCercaPubmed,
  urlAbstractPubmed,
  richiestaScelta,
  richiestaTermini,
  paroleVietateTrovate,
  promptCarosello,
  slotLogoScalato,
  posizioneLogo,
  slotLogoDelBrand,
  slotPiuLibero,
  problemiDelTesto,
  etichettaContenuto,
  segmenti,
  testoPiano,
  leggiCopyEditoriale,
  numeriFuoriFonte,
  problemiEditoriale,
  leggiGiudizio,
  promptCaroselloEditoriale,
  etichettaEditoriale,
  type CopyScoperta,
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

describe('ricerca su PubMed', () => {
  const risposta = (json: unknown) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] } }] });
  const xml = `<?xml version="1.0"?><PubmedArticleSet>
<PubmedArticle><MedlineCitation><PMID Version="1">111</PMID><Article><Journal><JournalIssue><PubDate><Year>2026</Year><Month>Nov</Month></PubDate></JournalIssue>
<Title>The spine journal : official journal of the North American Spine Society</Title><ISOAbbreviation>Spine J</ISOAbbreviation></Journal>
<ArticleTitle>Walking &amp; <i>exercise</i> for low back pain: a randomized trial.</ArticleTitle>
<Abstract><AbstractText Label="METHODS">200 adults walked 30 minutes.</AbstractText><AbstractText Label="RESULTS">Pain fell by 40%.</AbstractText></Abstract>
<ArticleDate DateType="Electronic"><Year>2026</Year><Month>10</Month><Day>7</Day></ArticleDate>
<PublicationTypeList><PublicationType UI="D016428">Journal Article</PublicationType><PublicationType UI="D016449">Randomized Controlled Trial</PublicationType></PublicationTypeList>
</Article></MedlineCitation></PubmedArticle>
<PubmedArticle><MedlineCitation><PMID Version="1">222</PMID><Article><Journal><JournalIssue><PubDate><Year>2026</Year><Month>Sep</Month></PubDate></JournalIssue><Title>BMJ</Title></Journal>
<ArticleTitle>Neck pain exercises: meta-analysis.</ArticleTitle><Abstract><AbstractText>Exercise helps.</AbstractText></Abstract>
<PublicationTypeList><PublicationType UI="D017418">Meta-Analysis</PublicationType></PublicationTypeList></Article></MedlineCitation></PubmedArticle>
<PubmedArticle><MedlineCitation><PMID Version="1">333</PMID><Article><ArticleTitle>Senza abstract</ArticleTitle></Article></MedlineCitation></PubmedArticle>
</PubmedArticleSet>`;

  it('legge dall’XML PMID, titolo, rivista, data, tipo e abstract', () => {
    const studi = leggiArticoliPubmed(xml);
    expect(studi.map((s) => s.pmid)).toEqual(['111', '222']);
    expect(studi[0]).toMatchObject({
      titolo: 'Walking & exercise for low back pain: a randomized trial.',
      rivista: 'The spine journal',
      data: '2026-10-07',
      abstract: 'METHODS: 200 adults walked 30 minutes. RESULTS: Pain fell by 40%.',
    });
    expect(studi[1].data).toBe('2026-09-01');
    expect(leggiArticoliPubmed('')).toEqual([]);
  });

  it('prende indirizzo, rivista e data da PubMed, mai dal modello', () => {
    const studi = leggiArticoliPubmed(xml);
    const r = risposta({ items: [
      { pmid: '111', title: 'Camminare toglie il mal di schiena', takeaways: ['Il 40% in meno di dolore'], url: 'https://inventato.com', source: 'Lancet' },
      { pmid: '999', title: 'Studio inventato', takeaways: ['x'] },
      { pmid: 'PMID 222', title: 'Collo ed esercizio', takeaways: ['Aiuta'] },
      { pmid: '111', title: 'Doppione', takeaways: ['x'] },
    ] });
    const scoperte = leggiScelta(r, studi);
    expect(scoperte.map((s) => s.url)).toEqual(['https://pubmed.ncbi.nlm.nih.gov/111/', 'https://pubmed.ncbi.nlm.nih.gov/222/']);
    expect(scoperte[0]).toMatchObject({ fonte: 'The spine journal', data: '2026-10-07', tipo_fonte: 'study' });
    expect(scoperte[1].tipo_fonte).toBe('meta-analysis');
    expect(leggiScelta(r, studi, ['https://pubmed.ncbi.nlm.nih.gov/111']).map((s) => s.titolo)).toEqual(['Collo ed esercizio']);
    expect(leggiScelta(null, studi)).toEqual([]);
  });

  it('termini puliti, massimo 5, con un ripiego se mancano', () => {
    expect(leggiTermini(risposta({ termini: ['Low back pain', 'low back pain', 'neck "pain" AND x', 'a'] }))).toEqual(['low back pain', 'neck pain and x']);
    expect(leggiTermini(null)).toEqual(['musculoskeletal pain']);
    expect(leggiIdPubmed({ esearchresult: { idlist: ['42105106', 'x1', 7] } })).toEqual(['42105106', '7']);
  });

  it('cerca solo studi clinici, meta-analisi e linee guida, con abstract', () => {
    const u = decodeURIComponent(urlCercaPubmed('neck pain', 30));
    expect(u).toContain('reldate=30');
    expect(u).toContain('(neck pain) AND (randomized controlled trial[pt]');
    expect(u).toContain('hasabstract');
    expect(urlAbstractPubmed(['1', '2'])).toContain('id=1,2');
    const scelta = richiestaScelta('mal di schiena', 3, leggiArticoliPubmed(xml), ['Titolo già usato']) as Record<string, any>;
    expect(scelta.tools).toBeUndefined();
    const t = scelta.contents[0].parts[0].text as string;
    expect(t).toContain('[PMID 111] The spine journal');
    expect(t).toContain('Titolo già usato');
    expect(t).toContain('iniezioni');
    expect((richiestaTermini('cervicale') as Record<string, any>).generationConfig.responseMimeType).toBe('application/json');
  });

  it('normalizza gli URL per il confronto', () => {
    expect(chiaveUrl('https://www.Nature.com/articoli/1/?utm_medium=x#top')).toBe(chiaveUrl('https://nature.com/articoli/1'));
  });
});

describe('logo sulle slide del pilota', () => {
  it('porta lo slot dal canvas 1080 al 4:5 come fa l’app', () => {
    expect(slotLogoScalato({ x: 90, y: 900, w: 200 }, 1350)).toEqual({ x: 90, y: 1125, w: 200 });
    expect(slotLogoScalato({ x: 620, y: 620, w: 380, h: 380 }, 1350)).toEqual({ x: 620, y: 775, w: 380, h: 475 });
    expect(slotLogoScalato({ x: 90, y: 900, w: 200 }, 1080)).toEqual({ x: 90, y: 900, w: 200 });
  });

  it('adatta il logo allo slot senza deformarlo e lo centra', () => {
    // Logo orizzontale 1400x400 in uno slot 200 di lato: largo 200, alto 57, centrato in verticale.
    expect(posizioneLogo({ x: 90, y: 1125, w: 200 }, 1400, 400)).toEqual({ x: 90, y: 1197, w: 200, h: 57 });
    // Logo quadrato: occupa tutto lo slot.
    expect(posizioneLogo({ x: 90, y: 1125, w: 200 }, 512, 512)).toEqual({ x: 90, y: 1125, w: 200, h: 200 });
  });

  it('tiene solo le posizioni del brand valide', () => {
    expect(slotLogoDelBrand({
      archetype: 'text_heavy_left',
      logo_slots: [
        { x: 90, y: 924, w: 200, h: 46 },
        { x: 950, y: 56, w: 200 }, // esce dal bordo destro
        { x: '790', y: 56, w: 200 }, // non numerico
        { x: 440, y: 1050, w: 200, h: 40 }, // esce dal fondo
        { x: 790, y: 56, w: 200, h: 46 },
      ],
    })).toEqual([{ x: 90, y: 924, w: 200, h: 46 }, { x: 790, y: 56, w: 200, h: 46 }]);
    expect(slotLogoDelBrand({ archetype: 'text_heavy_left' })).toEqual([]);
    expect(slotLogoDelBrand(null)).toEqual([]);
  });

  it('sceglie la posizione più libera, a parità la prima', () => {
    expect(slotPiuLibero([0.3, 0, 0.1])).toBe(1);
    expect(slotPiuLibero([0, 0, 0.2])).toBe(0);
    expect(slotPiuLibero([0.5])).toBe(0);
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

describe('correzioni dopo la prova del 01/11 su Terapista Stellato', () => {
  const scoperta = {
    titolo: 'Colloquio motivazionale e mal di schiena',
    sintesi: ['Meta-analisi di 12 studi su 1.480 persone.', 'Effetto moderato sull\'attività fisica.'],
    fonte: 'Annals of behavioral medicine', url: 'https://pubmed.ncbi.nlm.nih.gov/1/', data: '2026-10-20', tipo_fonte: 'meta-analysis',
  };
  const copy = (slides: CopyScoperta['slides'], caption = 'Hook. Fonte: Annals, 2026'): CopyScoperta =>
    ({ titolo_carosello: 't', caption, hashtags: '', slides });

  it('la chiusura tiene una sola frase sotto il titolo', () => {
    const c = leggiCopy(JSON.stringify({
      caption: 'c',
      slides: [
        { role: 'cover', title: 'A', body: '' },
        { role: 'content', title: 'B', body: 'b' },
        { role: 'cta', title: 'Non restare fermo!', body: 'Salva questo post. Segui la pagina e condividi.' },
      ],
    }))!;
    expect(c.slides[2].body).toBe('Salva questo post.');
  });

  it('blocca le sigle statistiche e le slide senza numeri quando lo studio li ha', () => {
    const senzaNumeri = copy([{ role: 'content', title: 'Lo studio', body: 'Risultati significativi.' }]);
    expect(problemiDelTesto(senzaNumeri, scoperta)).toEqual(['nessun numero dello studio nelle slide']);
    const conSigla = copy([{ role: 'content', title: 'Lo studio', body: '12 studi, SMD: 0.57.' }]);
    expect(problemiDelTesto(conSigla, scoperta)).toEqual(['sigle statistiche nel testo']);
    const buono = copy([{ role: 'content', title: 'Lo studio', body: '12 studi su 1.480 persone: si muovono di più.' }]);
    expect(problemiDelTesto(buono, scoperta)).toEqual([]);
    // L'anno della fonte non conta come numero dello studio.
    expect(problemiDelTesto(copy([{ role: 'content', title: 'Studio del 2026', body: 'x' }]), scoperta))
      .toEqual(['nessun numero dello studio nelle slide']);
    expect(problemiDelTesto(senzaNumeri, { ...scoperta, sintesi: ['Senza numeri.'] })).toEqual([]);
  });

  it('etichette fisse sulle slide di contenuto', () => {
    expect([0, 1, 2, 3, 4].map(etichettaContenuto)).toEqual(['LA SITUAZIONE', 'LO STUDIO', 'PERCHÉ SUCCEDE', 'COSA PUOI FARE', 'IN PRATICA']);
  });

  it('il prompt non dà per scontato uno studio e usa la descrizione del brand', () => {
    const p = promptCarosello({ nome_business: 'Terapista Stellato', descrizione: 'Piattaforma che seleziona i migliori terapisti.' }, scoperta);
    expect(p).toContain('CHI SIETE\nPiattaforma che seleziona i migliori terapisti.');
    expect(p).not.toContain('(noi, nel nostro studio)');
    expect(p).toContain('Non scrivere "nel nostro studio"');
    expect(p).toContain('UNA sola azione');
  });
});

describe('carosello editoriale (template approvato il 01/11 sul laser)', () => {
  const studio = {
    titolo: 'Laser e mal di schiena', sintesi: ['148 persone, differenza di dolore di 0,4 punti.'],
    fonte: 'Journal of physiotherapy', url: 'https://pubmed.ncbi.nlm.nih.gov/42864195/', data: '2026-10-01', tipo_fonte: 'study',
    abstract: 'A total of 148 participants were randomised (74 per group). Pain intensity (0 to 10). MD -0.4 points. 6 weeks. 12 months. 3 months.',
  };
  const slides = [
    { tipo: 'copertina', sopra: 'Mal di schiena · 148 persone · 12 mesi', titolo: 'Il laser [[spento]] ha funzionato uguale' },
    { tipo: 'riconosci', titolo: 'Ti [[riconosci?]]', righe: ['Sdraiato sul lettino.', 'Esci e va meglio.', 'Poi il dolore torna.'], chiusa: 'Ti riguarda.' },
    { tipo: 'confronto', titolo: 'Un laser vero. Un laser [[spento]].', testo: 'Esercizi per 6 settimane.', a: { numero: '74', etichetta: 'laser vero' }, b: { numero: '74', etichetta: 'laser spento' }, nota: 'Nessuno sapeva quale.' },
    { tipo: 'numero', titolo: 'Differenza di [[dolore]]', numero: '0,4', unita: 'su 10', scala: 10, testo: 'Dopo 12 mesi: **ancora uguale**.' },
    { tipo: 'punto', titolo: 'Il laser non ha [[aggiunto]] niente', testo: 'Stesso punto.', citazione: '' },
    { tipo: 'passi', titolo: 'Provalo stasera: il [[bird dog]]', sottotitolo: 'Controllo motorio.', passi: ['A quattro zampe.', 'Tieni 5 secondi.', '8 volte per lato, fermati se fa male.'] },
    { tipo: 'domanda', titolo: 'Se ti propongono il laser, [[chiedi:]]', domanda: '«Quali esercizi farò?»', nota: 'Nello studio: 6 settimane.' },
    { tipo: 'cta', titolo: '[[Mandalo]] a chi sta pagando il laser', testo: 'Così chiede quali esercizi farà.' },
  ];
  const json = (over: Record<string, unknown> = {}) => JSON.stringify({ caption: 'Il laser spento. Fonte: Journal, 2026', hashtags: '#a', foto_copertina: 'laser', foto_passi: 'bird dog', slides, ...over });

  it('legge le 8 slide e rifiuta quelle fuori posto', () => {
    const c = leggiCopyEditoriale(json())!;
    expect(c.slides).toHaveLength(8);
    expect(c.titolo_carosello).toBe('Il laser spento ha funzionato uguale');
    expect(leggiCopyEditoriale(json({ slides: [...slides].reverse() }))).toBeNull();
    expect(leggiCopyEditoriale(json({ slides: slides.slice(0, 7) }))).toBeNull();
    expect(leggiCopyEditoriale(json({ caption: '' }))).toBeNull();
  });

  it('fascia intera, accento e punteggiatura attaccata', () => {
    expect(segmenti('Provalo: il [[bird dog]].')).toEqual([
      { testo: 'Provalo:', stile: 'normale' }, { testo: 'il', stile: 'normale' },
      { testo: 'bird dog', stile: 'fascia' }, { testo: '.', stile: 'normale', attacca: true },
    ]);
    expect(segmenti('torna. **E prenoti.**').map((x) => x.attacca ?? false)).toEqual([false, false, false]);
    expect(segmenti('durato **6 settimane**.')[3]).toEqual({ testo: '.', stile: 'normale', attacca: true });
    expect(testoPiano('Il [[laser]] **spento**')).toBe('Il laser spento');
  });

  it('ogni numero deve venire dallo studio, tranne i passi e gli anni', () => {
    const c = leggiCopyEditoriale(json())!;
    expect(numeriFuoriFonte(c, studio)).toEqual([]);
    const inventato = leggiCopyEditoriale(json({ caption: 'Il 70% sta meglio. Fonte: 2026' }))!;
    expect(numeriFuoriFonte(inventato, studio)).toEqual(['70']);
    expect(problemiEditoriale(inventato, studio, {})).toContain('numeri che non sono nello studio: 70');
    const sigla = leggiCopyEditoriale(json({ caption: 'SMD: 0.57' }))!;
    expect(problemiEditoriale(sigla, studio, {})).toContain('sigle statistiche nel testo');
    const vietata = leggiCopyEditoriale(json({ caption: 'Ti sblocchiamo la schiena' }))!;
    expect(problemiEditoriale(vietata, studio, {})[0]).toMatch(/parole vietate/);
  });

  it('il giudice passa solo con tutti i voti almeno a 4', () => {
    const voti = { aggancio: 5, riconoscibile: 4, pratico: 4, non_ovvio: 4, fedele: 5, italiano: 5 };
    expect(leggiGiudizio(JSON.stringify({ voti, problemi: [] })).ok).toBe(true);
    const basso = leggiGiudizio(JSON.stringify({ voti: { ...voti, pratico: 3 }, problemi: ['slide 6 vaga'] }));
    expect(basso.ok).toBe(false);
    expect(basso.problemi).toEqual(['slide 6 vaga']);
    expect(leggiGiudizio('non json').ok).toBe(false);
  });

  it('prompt col metodo e etichette fisse', () => {
    const p = promptCaroselloEditoriale({ nome_business: 'Terapista Stellato', descrizione: 'Piattaforma.' }, studio);
    expect(p).toContain('RICONOSCERSI');
    expect(p).toContain('MAI una categoria di persone');
    expect(p).toContain('A total of 148 participants');
    expect(etichettaEditoriale(0, 'Terapista Stellato')).toBe('NUOVO STUDIO');
    expect(etichettaEditoriale(7, 'Terapista Stellato')).toBe('TERAPISTA STELLATO');
  });
});
