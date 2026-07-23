// Skeleton di produzione: il prompt BREVE che accompagna la reference image
// nella generazione delle slide reali. La reference porta il layout; il testo
// serve solo per copy e colori. Uno skeleton verboso sovrasta la reference e
// il layout va in drift.

import { getArchetype, type SlideRole, type Slot } from './archetypes.ts';
import { sanitize } from './genesisPrompt.ts';
import { canvasForFormat, type TemplateGenome } from './genome.ts';

/**
 * Produce lo skeleton con i placeholder {{...}} che la pipeline di
 * produzione risolvera con il copy generato e i colori del brand.
 */
export function skeletonFromGenome(genome: TemplateGenome, role: SlideRole): string {
  const lines: string[] = [];
  const realistic = genome.visual_style === 'realistic';

  lines.push(
    'Follow the attached reference image EXACTLY: same layout, same spacing, same proportions, same decorative motif. Replace only the text content.'
  );
  lines.push(
    'All rendered text must be in ITALIAN, exactly as written below, no translation, no additions.'
  );

  if (role === 'cover') {
    lines.push('Headline text: "{{title}}"');
  } else if (role === 'content') {
    lines.push('Index number: "{{number}}"');
    lines.push('Headline text: "{{title}}"');
    lines.push('Body text: "{{body}}"');
    lines.push(
      realistic
        ? 'Image: replace the subject of the placeholder image with ONE realistic photographic style image that visually explains this topic: "{{illustration}}". THE IMAGE MUST BE A CUTOUT: subject isolated along its own silhouette directly on the flat background, like a sticker, in the same position and size as in the reference. Never a rectangular photo, never a photo box, frame or visible photo edges. It must be immediately understandable and support the text.'
        : 'Illustration: replace the subject of the placeholder illustration with ONE simple flat illustration that visually explains this topic: "{{illustration}}". Keep the same style, the same single accent color and the same position and size as in the reference. It must be immediately understandable, like an explanatory diagram.'
    );
  } else {
    lines.push('Headline text: "{{title}}"');
    lines.push('Supporting line: "{{body}}"');
  }

  lines.push('Background color {{bg_color}}, title color {{title_color}}, body color {{body_color}}.');
  lines.push(
    realistic
      ? 'Crisp legible typography. No logo, no watermark, no identifiable human faces.'
      : 'Crisp legible typography. No logo, no watermark, no photographic imagery, no realistic human faces.'
  );

  return sanitize(lines.join('\n'));
}

/**
 * Slot geometrici per il compositing di logo e foto, scalati sul formato
 * del genoma. Gli archetipi definiscono gli slot sul canvas quadrato 1080:
 * in 4:5 (1080x1350) la larghezza resta invariata e le coordinate verticali
 * si riproporzionano per mantenere la posizione relativa.
 */
export function slotsForRole(
  genome: TemplateGenome,
  role: SlideRole
): { logo: Slot; photo: Slot | null } {
  const spec = getArchetype(genome.archetype).roles[role];
  const { h } = canvasForFormat(genome.format);
  const yScale = h / 1080;
  const scale = (s: Slot): Slot => ({
    ...s,
    y: Math.round(s.y * yScale),
    ...(s.h !== undefined ? { h: Math.round(s.h * yScale) } : {}),
  });
  return {
    logo: scale(spec.logo_slot),
    photo: spec.photo_slot ? scale(spec.photo_slot) : null,
  };
}
