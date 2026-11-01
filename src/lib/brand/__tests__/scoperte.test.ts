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
