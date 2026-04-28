export interface SlideImage {
  promptUsed: string;
  url: string;
  generatedAt: string;
  fallback: boolean;
}

export interface CarouselSlideData {
  numero: number;
  tipo: 'cover' | 'content' | 'cta';
  titolo: string;
  testo: string;
  hook?: string;
  sottotitolo?: string;
  testo_cta?: string;
  bottone_cta?: string;
  keywords_stock?: string[];
  prompt_immagine?: string;
  imageUrl?: string;
  imageAlternatives?: string[];
  immagine?: SlideImage;
}

export interface CarouselData {
  titolo_carosello: string;
  hook_principale: string;
  slides: CarouselSlideData[];
  cta_finale: string;
  caption_instagram: string;
  hashtag_suggeriti: string[];
}

export interface SlideRenderConfig {
  format: '1:1' | '9:16';
  brandColor: string;
  brandColorSecondary: string;
  brandFont: string;
  logoUrl: string;
  overlayOpacity: number;
}

export const DEFAULT_RENDER_CONFIG: SlideRenderConfig = {
  format: '1:1',
  brandColor: '#554697',
  brandColorSecondary: '#E6007E',
  brandFont: 'Montserrat',
  logoUrl: '',
  overlayOpacity: 0.55,
};
