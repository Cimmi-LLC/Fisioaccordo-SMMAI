/**
 * Post background templates — vector SVG designs.
 * Each template is a 1080x1350-friendly SVG used as the background of a slide.
 * The visual is preserved as-is; brand color is applied via CSS `mix-blend-mode: color`
 * in PostTemplateOverlay (preserves luminosity, replaces hue+saturation with brand).
 */

import tpl1 from '@/assets/postTemplates/template-1.svg';
import tpl2 from '@/assets/postTemplates/template-2.svg';
import tpl3 from '@/assets/postTemplates/template-3.svg';
import tpl4 from '@/assets/postTemplates/template-4.svg';
import tpl5 from '@/assets/postTemplates/template-5.svg';
import tpl6 from '@/assets/postTemplates/template-6.svg';
import tpl7 from '@/assets/postTemplates/template-7.svg';

export interface PostTemplate {
  id: string;
  name: string;
  description: string;
  src: string;
}

export const POST_TEMPLATES: PostTemplate[] = [
  { id: '1', name: 'Composizione astratta',  description: 'Composizione editoriale astratta full-bleed', src: tpl1 },
  { id: '2', name: 'Texture morbida',         description: 'Texture sfumata morbida professionale',       src: tpl2 },
  { id: '3', name: 'Geometrico mind',         description: 'Pattern geometrico minimale',                 src: tpl3 },
  { id: '4', name: 'Editoriale accent',       description: 'Design editoriale con accento colorato',      src: tpl4 },
  { id: '5', name: 'Poligoni angolari',       description: 'Poligoni angolari, decorazione bordo basso',  src: tpl5 },
  { id: '6', name: 'Ink moderno',             description: 'Texture ink moderna full-cover',              src: tpl6 },
  { id: '7', name: 'Onda fluida',             description: 'Forma fluida ondulata, decorazione basso',    src: tpl7 },
];

export const POST_TEMPLATE_RANDOM = 'random';
export const POST_TEMPLATE_NONE = 'none';

export function getTemplateById(id: string | null | undefined): PostTemplate | null {
  if (!id || id === POST_TEMPLATE_NONE) return null;
  if (id === POST_TEMPLATE_RANDOM) {
    return POST_TEMPLATES[Math.floor(Math.random() * POST_TEMPLATES.length)];
  }
  return POST_TEMPLATES.find((t) => t.id === id) || null;
}
