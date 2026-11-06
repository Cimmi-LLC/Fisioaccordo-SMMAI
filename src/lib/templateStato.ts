// Testi del riquadro «template» nella pagina Post, secondo brands.genesis_status.
//
// Prima diceva sempre «il template non c'è ancora», anche quando le proposte
// erano pronte e mancava solo la scelta (GestioMed, 06/11): sembrava che le
// immagini non funzionassero.

export type TestiTemplate = {
  titolo: string;
  testo: string;
  /** Riga corta sotto un carosello già scritto. */
  sottoCarosello: string;
  bottone: string;
};

export function testiTemplate(stato: string | null | undefined): TestiTemplate {
  if (stato === 'awaiting_approval') {
    return {
      titolo: 'Il template è pronto: manca la tua scelta',
      testo: "L'AI ha preparato le proposte per copertina, slide interne e chiusura. Scegline una per tipo e le slide grafiche partono da sole.",
      sottoCarosello: 'Le slide grafiche partono appena scegli il template: le proposte sono pronte.',
      bottone: 'Scegli il template',
    };
  }
  if (stato === 'generating') {
    return {
      titolo: 'Il template è in preparazione',
      testo: "L'AI sta disegnando le proposte. Intanto puoi scrivere i testi dei caroselli.",
      sottoCarosello: 'Le slide grafiche partono quando il template è pronto e lo hai scelto.',
      bottone: 'Guarda le proposte',
    };
  }
  return {
    titolo: "Il template di questo brand non c'è ancora",
    testo: "Puoi già scrivere i testi dei caroselli. Per le slide grafiche crea il template: carichi il logo e qualche post, l'AI lo progetta, tu approvi. Bastano 5 minuti.",
    sottoCarosello: "Le slide grafiche si creano sul template del brand, che non c'è ancora.",
    bottone: 'Crea il template',
  };
}
