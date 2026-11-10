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
  /** Vuoto = nessun pulsante. */
  bottone: string;
};

const BASE = 'Le slide grafiche escono comunque, nello stile di base e nei colori del tuo brand.';

/**
 * Template approvato del tipo vecchio (disegnato dal modello delle immagini,
 * prima del 06/11/2026): dal 10/11 non comanda più le slide, perché il
 * modello sbagliava le parole. Il template approvato è immutabile, quindi
 * niente pulsante verso il wizard: per sceglierne uno dei 3 layout nuovi va
 * prima sbloccato dal database (come GestioMed il 07/11).
 */
const VECCHIO: TestiTemplate = {
  titolo: 'Le slide ora hanno il testo impaginato, parola per parola',
  testo: 'Il template di prima lo disegnava l\'AI insieme al testo, e a volte sbagliava le parole. Ora le slide escono nello stile di base, nei colori e col logo del tuo brand, col testo esatto.',
  sottoCarosello: 'Slide nello stile di base, nei colori del tuo brand, col testo esatto.',
  bottone: '',
};

export function testiTemplate(stato: string | null | undefined, opzioni: { templateVecchio?: boolean } = {}): TestiTemplate {
  if (opzioni.templateVecchio) return VECCHIO;
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
