// Testi del riquadro «template» nella pagina Post, secondo brands.genesis_status.
//
// Prima diceva sempre «il template non c'è ancora», anche quando le proposte
// erano pronte e mancava solo la scelta (GestioMed, 06/11): sembrava che le
// immagini non funzionassero.
//
// Dal 07/11 le slide escono anche senza template, con il layout di base nei
// colori del brand: il riquadro lo dice e il template resta un di più.

export type TestiTemplate = {
  titolo: string;
  testo: string;
  /** Riga corta sotto un carosello già scritto. */
  sottoCarosello: string;
  bottone: string;
};

const BASE = 'Le slide grafiche escono comunque, nello stile di base e nei colori del tuo brand.';

export function testiTemplate(stato: string | null | undefined): TestiTemplate {
  if (stato === 'awaiting_approval') {
    return {
      titolo: 'Il template è pronto: manca la tua scelta',
      testo: BASE + " L'AI ha preparato le proposte per copertina, slide interne e chiusura: scegline una per tipo e dalla prossima volta le slide usano il tuo template.",
      sottoCarosello: 'Queste slide sono nello stile di base: scegli il template quando vuoi e le prossime usano il tuo.',
      bottone: 'Scegli il template',
    };
  }
  if (stato === 'generating') {
    return {
      titolo: 'Il template è in preparazione',
      testo: BASE + " Intanto l'AI sta disegnando le proposte del tuo template.",
      sottoCarosello: 'Queste slide sono nello stile di base: quando il template è pronto, scegli le proposte.',
      bottone: 'Guarda le proposte',
    };
  }
  return {
    titolo: 'Il template su misura non c\'è ancora',
    testo: BASE + ' Quando vuoi, carica il logo e qualche post: l\'AI progetta il template su misura, tu approvi. Bastano 5 minuti.',
    sottoCarosello: 'Queste slide sono nello stile di base: con logo e template su misura diventano tue.',
    bottone: 'Crea il template',
  };
}
