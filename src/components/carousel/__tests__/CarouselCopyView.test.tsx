import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CarouselCopyView from '../CarouselCopyView';
import { caroselloDaRisposta } from '@/lib/carouselText';

describe('CarouselCopyView', () => {
  it('mostra i testi di ogni slide e la caption, non solo il titolo', () => {
    const carosello = caroselloDaRisposta({
      titolo_carosello: 'Software per poliambulatori',
      slides: [
        { numero: 1, titolo: 'Agenda piena, studio vuoto?', testo: '' },
        { numero: 2, titolo: 'Promemoria automatici', testo: 'Meno disdette, zero telefonate.' },
      ],
      caption_instagram: 'Prova 14 giorni gratis.',
      hashtag_suggeriti: ['gestionale'],
    }, 'riserva');
    const html = renderToStaticMarkup(<CarouselCopyView carousel={carosello} />);
    expect(html).toContain('Agenda piena, studio vuoto?');
    expect(html).toContain('Meno disdette, zero telefonate.');
    expect(html).toContain('#gestionale');
    expect(html).toContain('Copia tutto il testo');
  });
});
