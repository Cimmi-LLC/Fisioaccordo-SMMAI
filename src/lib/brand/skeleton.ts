// Skeleton di produzione: il prompt BREVE che accompagna la reference image
// nella generazione delle slide reali. La reference porta il layout; il testo
// serve solo per copy e colori. Uno skeleton verboso sovrasta la reference e
// il layout va in drift.

import { getArchetype, type SlideRole, type Slot } from './archetypes.ts';
import { sanitize } from './genesisPrompt.ts';
import type { TemplateGenome } from './genome.ts';

/**
 * Produce lo skeleton con i placeholder {{...}} che la pipeline di
 * produzione risolvera con il copy generato e i colori del brand.
 */
export function skeletonFromGenome(_genome: TemplateGenome, role: SlideRole): string {
  const lines: string[] = [];

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
  } else {
    lines.push('Headline text: "{{title}}"');
    lines.push('Supporting line: "{{body}}"');
  }

  lines.push('Background color {{bg_color}}, title color {{title_color}}, body color {{body_color}}.');
  lines.push('Crisp legible typography. No logo, no watermark, no photography, no human figures.');

  return sanitize(lines.join('\n'));
}

/** Slot geometrici (canvas 1080) per il compositing di logo e foto. */
export function slotsForRole(
  genome: TemplateGenome,
  role: SlideRole
): { logo: Slot; photo: Slot | null } {
  const spec = getArchetype(genome.archetype).roles[role];
  return {
    logo: spec.logo_slot,
    photo: spec.photo_slot ?? null,
  };
}
