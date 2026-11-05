// Testo completo di un carosello generato (funzione pura).
//
// Senza template approvato le slide grafiche non si producono: prima si
// vedeva solo il titolo e i testi scritti dall'AI andavano persi (05/11).
// Questo è il testo che si legge, si copia e si salva nei contenuti.

import type { CarouselData, CarouselSlideData } from '@/types/carousel';
import { captionConHashtag } from './caption';

/** Righe di una slide, senza campi vuoti né ripetuti. */
export function righeSlide(s: CarouselSlideData): string[] {
  const campi = [s.hook, s.titolo, s.sottotitolo, s.testo, s.testo_cta, s.bottone_cta]
    .map((c) => (c || '').trim())
    .filter(Boolean);
  return Array.from(new Set(campi));
}

/** Caption pronta da pubblicare (testo + un solo blocco di hashtag). */
export function captionCarosello(c: CarouselData): string {
  return captionConHashtag(c.caption_instagram || '', c.hashtag_suggeriti);
}

/** Tutto il testo: titolo, slide numerate e caption. */
export function testoCarosello(c: CarouselData): string {
  const parti: string[] = [];
  if (c.titolo_carosello?.trim()) parti.push(c.titolo_carosello.trim());
  c.slides.forEach((s, i) => {
    const righe = righeSlide(s);
    if (righe.length) parti.push(`Slide ${s.numero || i + 1}\n${righe.join('\n')}`);
  });
  const caption = captionCarosello(c);
  if (caption) parti.push(`Caption\n${caption}`);
  return parti.join('\n\n');
}

/** Risposta di generate-content → CarouselData (campi mancanti riempiti). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function caroselloDaRisposta(raw: any, titoloRiserva: string): CarouselData {
  const slides = raw?.slides || [];
  return {
    titolo_carosello: raw?.titolo_carosello || titoloRiserva,
    hook_principale: raw?.hook_principale || '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    slides: slides.map((s: any, i: number) => ({
      numero: s.numero || i + 1,
      tipo: s.tipo || (i === 0 ? 'cover' : i === slides.length - 1 ? 'cta' : 'content'),
      hook: s.hook || '',
      sottotitolo: s.sottotitolo || '',
      titolo: s.titolo || s.title || '',
      testo: s.testo || s.body || '',
      testo_cta: s.testo_cta || '',
      bottone_cta: s.bottone_cta || '',
      keywords_stock: s.keywords_stock || [],
    })),
    cta_finale: raw?.cta_finale || '',
    caption_instagram: raw?.caption_instagram || raw?.content || '',
    hashtag_suggeriti: raw?.hashtag_suggeriti || [],
  };
}
