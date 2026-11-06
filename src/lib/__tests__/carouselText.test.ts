import { describe, expect, it } from 'vitest';
import type { CarouselData } from '@/types/carousel';
import { righeSlide, testoCarosello } from '../carouselText';

const carosello: CarouselData = {
  titolo_carosello: 'Mal di schiena da scrivania',
  hook_principale: 'Stai seduto 8 ore?',
  slides: [
    { numero: 1, tipo: 'cover', hook: 'Stai seduto 8 ore?', titolo: 'Stai seduto 8 ore?', testo: '' },
    { numero: 2, tipo: 'content', titolo: 'Alzati ogni 30 minuti', testo: 'Due minuti in piedi bastano.' },
    { numero: 3, tipo: 'cta', titolo: 'Ti aiutiamo noi', testo: '', testo_cta: 'Prenota la valutazione', bottone_cta: 'Prenota' },
  ],
  cta_finale: '',
  caption_instagram: 'La schiena ringrazia.\n\n#schiena',
  hashtag_suggeriti: ['schiena', 'postura'],
};

describe('righeSlide', () => {
  it('toglie i campi vuoti e quelli ripetuti', () => {
    expect(righeSlide(carosello.slides[0])).toEqual(['Stai seduto 8 ore?']);
    expect(righeSlide(carosello.slides[2])).toEqual(['Ti aiutiamo noi', 'Prenota la valutazione', 'Prenota']);
  });
});

describe('testoCarosello', () => {
  it('mette titolo, slide numerate e caption con un solo blocco di hashtag', () => {
    expect(testoCarosello(carosello)).toBe(
      'Mal di schiena da scrivania\n\n' +
      'Slide 1\nStai seduto 8 ore?\n\n' +
      'Slide 2\nAlzati ogni 30 minuti\nDue minuti in piedi bastano.\n\n' +
      'Slide 3\nTi aiutiamo noi\nPrenota la valutazione\nPrenota\n\n' +
      'Caption\nLa schiena ringrazia.\n\n#schiena #postura',
    );
  });

  it('funziona anche col post singolo senza caption', () => {
    const singolo: CarouselData = { ...carosello, slides: [carosello.slides[1]], caption_instagram: '', hashtag_suggeriti: [] };
    expect(testoCarosello(singolo)).toBe('Mal di schiena da scrivania\n\nSlide 2\nAlzati ogni 30 minuti\nDue minuti in piedi bastano.');
  });
});
