import { describe, expect, it } from 'vitest';
import { decodificaEntita, nomeAutore, nomeDaCampi, testoRecensione } from '../recensioni';

describe('nomeAutore', () => {
  it('caso del 18/11: «2 recensioni» non è un nome', () => {
    expect(nomeAutore('2 recensioni')).toBeNull();
    expect(nomeAutore('1 recensione')).toBeNull();
    expect(nomeAutore('Una recensione')).toBeNull();
    expect(nomeAutore('Local Guide · 45 recensioni · 120 foto')).toBeNull();
    expect(nomeAutore('Local Guide')).toBeNull();
    expect(nomeAutore('1.234 recensioni')).toBeNull();
    expect(nomeAutore('12 foto')).toBeNull();
    expect(nomeAutore('3 reviews')).toBeNull();
    expect(nomeAutore('42')).toBeNull();
  });

  it('i nomi veri restano, anche con accenti ed entità', () => {
    expect(nomeAutore('Maria Rossi')).toBe('Maria Rossi');
    expect(nomeAutore('  Niccolò   D&#39;Angelo ')).toBe("Niccolò D'Angelo");
    expect(nomeAutore('Andrea R.')).toBe('Andrea R.');
  });

  it('nome seguito dal contatore: resta il nome', () => {
    expect(nomeAutore('Mario Rossi · 3 recensioni')).toBe('Mario Rossi');
  });

  it('vuoto o non testo: null', () => {
    expect(nomeAutore('')).toBeNull();
    expect(nomeAutore('   ')).toBeNull();
    expect(nomeAutore(null)).toBeNull();
    expect(nomeAutore(5)).toBeNull();
  });

  it('dai campi di Apify: salta il contatore e prende il primo nome valido', () => {
    expect(nomeDaCampi({ name: '2 recensioni', reviewerName: 'Giulia B.' })).toBe('Giulia B.');
    expect(nomeDaCampi({ name: 'Luca Verdi', reviewerNumberOfReviews: 2 })).toBe('Luca Verdi');
    expect(nomeDaCampi({ name: '5 recensioni' })).toBeNull();
    expect(nomeDaCampi(null)).toBeNull();
  });
});

describe('testoRecensione', () => {
  it('caso del 18/11: i <br> diventano a capo, gli altri tag spariscono', () => {
    expect(testoRecensione('Bravissima.<br>Mi ha risolto il torcicollo.<br/><br />Consigliata!'))
      .toBe('Bravissima.\nMi ha risolto il torcicollo.\n\nConsigliata!');
    expect(testoRecensione('<p>Ottimo <b>studio</b></p><p>Tornerò</p>')).toBe('Ottimo studio\nTornerò');
  });

  it('entità decodificate, anche i tag scritti come entità', () => {
    expect(testoRecensione('Professionalit&agrave; e cortesia &amp; puntualit&#224;')).toBe('Professionalità e cortesia & puntualità');
    expect(testoRecensione('Prima&lt;br&gt;dopo')).toBe('Prima\ndopo');
    expect(testoRecensione('L&#x27;ho consigliata')).toBe("L'ho consigliata");
  });

  it('non mangia il testo che sembra un tag ma non lo è', () => {
    expect(testoRecensione('Voto <3 e mal di schiena < prima')).toBe('Voto <3 e mal di schiena < prima');
  });

  it('spazi doppi e righe vuote in eccesso tolti', () => {
    expect(testoRecensione('  Uno   due \r\n\r\n\r\n\r\n tre  ')).toBe('Uno due\n\ntre');
    expect(testoRecensione(undefined)).toBe('');
  });

  it('decodifica in un passaggio solo (&amp;lt; resta &lt;)', () => {
    expect(decodificaEntita('&amp;lt;')).toBe('&lt;');
    expect(decodificaEntita('&inventata;')).toBe('&inventata;');
  });
});
