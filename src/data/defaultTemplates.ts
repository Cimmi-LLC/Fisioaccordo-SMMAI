// Default HTML/CSS-based templates (no PNG backgrounds)
// These are used as fallback when DB templates don't have the new layers format

export interface DesignTemplateBackground {
  type: 'solid' | 'gradient' | 'photo';
  value: string; // color, CSS gradient, or 'user' for photo
}

export interface DesignTemplatePhotoZone {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  objectFit: string;
}

export interface DesignTemplateLayer {
  id: string;
  type: 'title' | 'number' | 'subtitle' | 'body' | 'cta' | 'banner' | 'image' | 'logo' | 'footer';
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  textAlign?: string;
  textTransform?: string;
  shadow?: { enabled: boolean; color: string; blur: number; offsetX?: number; offsetY?: number };
  backgroundColor?: string;
  borderRadius?: number;
  padding?: number;
  lineHeight?: number;
  letterSpacing?: number;
  opacity?: number;
  defaultText?: string; // Static text that doesn't get replaced by AI
}

export interface DesignTemplate {
  id: string;
  name: string;
  background: DesignTemplateBackground;
  photoZone?: DesignTemplatePhotoZone;
  overlayColor?: string;
  layers: DesignTemplateLayer[];
}

// Generate slide-specific layers based on position
function generateSlideLayers(
  slideIndex: number,
  totalSlides: number,
  template: DesignTemplate
): DesignTemplateLayer[] {
  // For templates with explicit layers, use per-slide variations
  const accent = template.layers.find(l => l.backgroundColor)?.backgroundColor || '#E91E63';
  const textColor = template.layers.find(l => l.type === 'title')?.color || '#FFFFFF';
  const brandText = template.layers.find(l => l.defaultText)?.defaultText;

  if (slideIndex === 0) {
    // Opening slide - big hook
    return [
      ...(brandText ? [{ id: 'brand', type: 'logo' as const, x: 10, y: 3, width: 80, height: 7, fontSize: 20, fontFamily: 'Montserrat, sans-serif', fontWeight: '800' as string, color: accent, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 3, defaultText: brandText }] : []),
      { id: 'title', type: 'title', x: 5, y: 14, width: 90, height: 22, fontSize: 32, fontFamily: 'Arial Black, sans-serif', fontWeight: '900', color: textColor, textAlign: 'center', textTransform: 'uppercase', shadow: { enabled: true, offsetX: 0, offsetY: 2, blur: 8, color: 'rgba(0,0,0,0.6)' } },
      { id: 'subtitle', type: 'subtitle', x: 10, y: 40, width: 80, height: 8, fontSize: 15, fontFamily: 'Arial, sans-serif', fontWeight: '600', color: accent, textAlign: 'center' },
      { id: 'body', type: 'body', x: 8, y: 52, width: 84, height: 26, fontSize: 13, fontFamily: 'Arial, sans-serif', fontWeight: '400', color: textColor, textAlign: 'center', lineHeight: 1.5 },
      { id: 'footer', type: 'footer', x: 10, y: 88, width: 80, height: 7, fontSize: 10, fontFamily: 'Arial, sans-serif', fontWeight: '500', color: textColor, textAlign: 'center', opacity: 0.6 },
    ];
  }

  if (slideIndex === totalSlides - 1) {
    // CTA slide
    return [
      { id: 'title', type: 'title', x: 8, y: 10, width: 84, height: 16, fontSize: 26, fontFamily: 'Arial Black, sans-serif', fontWeight: '900', color: textColor, textAlign: 'center', textTransform: 'uppercase', shadow: { enabled: true, offsetX: 0, offsetY: 2, blur: 6, color: 'rgba(0,0,0,0.5)' } },
      { id: 'body', type: 'body', x: 10, y: 30, width: 80, height: 26, fontSize: 14, fontFamily: 'Arial, sans-serif', fontWeight: '400', color: textColor, textAlign: 'center', lineHeight: 1.5 },
      { id: 'cta', type: 'cta', x: 10, y: 62, width: 80, height: 10, fontSize: 18, fontFamily: 'Arial Black, sans-serif', fontWeight: '800', color: '#ffffff', textAlign: 'center', textTransform: 'uppercase', backgroundColor: accent, borderRadius: 8 },
      { id: 'footer', type: 'footer', x: 10, y: 80, width: 80, height: 10, fontSize: 12, fontFamily: 'Arial, sans-serif', fontWeight: '600', color: textColor, textAlign: 'center' },
      ...(brandText ? [{ id: 'partner', type: 'footer' as const, x: 10, y: 92, width: 80, height: 5, fontSize: 9, fontFamily: 'Arial, sans-serif', fontWeight: '500' as string, color: textColor, textAlign: 'center', opacity: 0.5, defaultText: `By partnering with FISIOACCORDO` }] : []),
    ];
  }

  // Content slides - big number
  return [
    { id: 'title', type: 'title', x: 5, y: 5, width: 90, height: 12, fontSize: 18, fontFamily: 'Arial, sans-serif', fontWeight: '700', color: textColor, textAlign: 'center', textTransform: 'uppercase', shadow: { enabled: true, offsetX: 0, offsetY: 1, blur: 4, color: 'rgba(0,0,0,0.4)' } },
    { id: 'number', type: 'number', x: 20, y: 18, width: 60, height: 30, fontSize: 64, fontFamily: 'Arial Black, sans-serif', fontWeight: '900', color: accent, textAlign: 'center', shadow: { enabled: true, offsetX: 0, offsetY: 3, blur: 10, color: 'rgba(0,0,0,0.5)' } },
    { id: 'body', type: 'body', x: 8, y: 50, width: 84, height: 24, fontSize: 12, fontFamily: 'Arial, sans-serif', fontWeight: '400', color: textColor, textAlign: 'center', lineHeight: 1.5 },
    { id: 'banner', type: 'banner', x: 0, y: 78, width: 100, height: 8, fontSize: 10, fontFamily: 'Arial, sans-serif', fontWeight: '700', color: '#ffffff', textAlign: 'center', textTransform: 'uppercase', backgroundColor: accent, opacity: 0.9 },
    { id: 'footer', type: 'footer', x: 10, y: 90, width: 80, height: 6, fontSize: 9, fontFamily: 'Arial, sans-serif', fontWeight: '500', color: textColor, textAlign: 'center', opacity: 0.5 },
  ];
}

// =================== DEFAULT TEMPLATES ===================

export const FISIOACCORDO_ROSA: DesignTemplate = {
  id: 'default-fisioaccordo-rosa',
  name: 'Fisioaccordo Rosa',
  background: { type: 'solid', value: '#1a1a2e' },
  photoZone: { x: 0, y: 0, width: 100, height: 100, opacity: 0.25, objectFit: 'cover' },
  overlayColor: 'rgba(26, 26, 46, 0.55)',
  layers: [
    { id: 'brand', type: 'logo', x: 10, y: 3, width: 80, height: 7, fontSize: 22, fontFamily: 'Montserrat, sans-serif', fontWeight: '800', color: '#E91E63', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 4, defaultText: 'ASSUMIAMO' },
    { id: 'title', type: 'title', x: 5, y: 14, width: 90, height: 20, fontSize: 30, fontFamily: 'Arial Black, sans-serif', fontWeight: '900', color: '#FFFFFF', textAlign: 'center', textTransform: 'uppercase', shadow: { enabled: true, color: 'rgba(0,0,0,0.7)', blur: 6, offsetX: 0, offsetY: 2 } },
    { id: 'subtitle', type: 'subtitle', x: 10, y: 36, width: 80, height: 8, fontSize: 15, fontFamily: 'Arial, sans-serif', fontWeight: '600', color: '#E91E63', textAlign: 'center' },
    { id: 'body', type: 'body', x: 5, y: 46, width: 90, height: 24, fontSize: 12, fontFamily: 'Arial, sans-serif', fontWeight: '400', color: '#FFFFFF', textAlign: 'center', lineHeight: 1.5 },
    { id: 'banner', type: 'banner', x: 5, y: 73, width: 90, height: 8, fontSize: 11, fontFamily: 'Arial Black, sans-serif', fontWeight: '800', color: '#FFFFFF', textAlign: 'center', textTransform: 'uppercase', backgroundColor: '#E91E63', borderRadius: 4 },
    { id: 'footer', type: 'footer', x: 5, y: 84, width: 90, height: 5, fontSize: 8, fontFamily: 'Arial, sans-serif', fontWeight: '400', color: '#FFFFFF', textAlign: 'center', opacity: 0.5 },
    { id: 'partner', type: 'footer', x: 10, y: 91, width: 80, height: 6, fontSize: 9, fontFamily: 'Arial, sans-serif', fontWeight: '600', color: '#FFFFFF', textAlign: 'center', defaultText: 'By partnering with FISIOACCORDO' },
  ],
};

export const MINIMALISTA: DesignTemplate = {
  id: 'default-minimalista',
  name: 'Minimalista',
  background: { type: 'solid', value: '#FAFAFA' },
  overlayColor: undefined,
  layers: [
    { id: 'title', type: 'title', x: 8, y: 12, width: 84, height: 18, fontSize: 28, fontFamily: 'Montserrat, sans-serif', fontWeight: '900', color: '#1a1a1a', textAlign: 'center', textTransform: 'uppercase' },
    { id: 'subtitle', type: 'subtitle', x: 15, y: 34, width: 70, height: 8, fontSize: 14, fontFamily: 'Arial, sans-serif', fontWeight: '600', color: '#0891b2', textAlign: 'center' },
    { id: 'body', type: 'body', x: 10, y: 46, width: 80, height: 26, fontSize: 13, fontFamily: 'Arial, sans-serif', fontWeight: '400', color: '#333333', textAlign: 'center', lineHeight: 1.6 },
    { id: 'banner', type: 'banner', x: 15, y: 76, width: 70, height: 8, fontSize: 11, fontFamily: 'Arial, sans-serif', fontWeight: '700', color: '#FFFFFF', textAlign: 'center', textTransform: 'uppercase', backgroundColor: '#0891b2', borderRadius: 6 },
    { id: 'footer', type: 'footer', x: 10, y: 90, width: 80, height: 6, fontSize: 10, fontFamily: 'Arial, sans-serif', fontWeight: '500', color: '#999999', textAlign: 'center' },
  ],
};

export const BOLD_DARK: DesignTemplate = {
  id: 'default-bold-dark',
  name: 'Bold Dark',
  background: { type: 'gradient', value: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%)' },
  photoZone: { x: 0, y: 0, width: 100, height: 100, opacity: 0.15, objectFit: 'cover' },
  overlayColor: 'rgba(0,0,0,0.4)',
  layers: [
    { id: 'title', type: 'title', x: 5, y: 8, width: 90, height: 20, fontSize: 34, fontFamily: 'Impact, sans-serif', fontWeight: '900', color: '#FFFFFF', textAlign: 'center', textTransform: 'uppercase', shadow: { enabled: true, color: 'rgba(0,0,0,0.8)', blur: 10, offsetX: 0, offsetY: 3 } },
    { id: 'number', type: 'number', x: 15, y: 30, width: 70, height: 25, fontSize: 72, fontFamily: 'Arial Black, sans-serif', fontWeight: '900', color: '#f59e0b', textAlign: 'center', shadow: { enabled: true, color: 'rgba(0,0,0,0.6)', blur: 8, offsetX: 0, offsetY: 2 } },
    { id: 'body', type: 'body', x: 8, y: 58, width: 84, height: 20, fontSize: 13, fontFamily: 'Arial, sans-serif', fontWeight: '400', color: '#e2e8f0', textAlign: 'center', lineHeight: 1.5 },
    { id: 'banner', type: 'banner', x: 0, y: 80, width: 100, height: 8, fontSize: 11, fontFamily: 'Arial Black, sans-serif', fontWeight: '800', color: '#FFFFFF', textAlign: 'center', textTransform: 'uppercase', backgroundColor: '#f59e0b' },
    { id: 'footer', type: 'footer', x: 10, y: 91, width: 80, height: 6, fontSize: 9, fontFamily: 'Arial, sans-serif', fontWeight: '500', color: '#94a3b8', textAlign: 'center' },
  ],
};

export const DEFAULT_TEMPLATES: DesignTemplate[] = [FISIOACCORDO_ROSA, MINIMALISTA, BOLD_DARK];

export { generateSlideLayers };
