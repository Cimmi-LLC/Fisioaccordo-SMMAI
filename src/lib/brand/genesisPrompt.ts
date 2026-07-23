// Costruttore del prompt di genesi per NB2 (gemini-3.1-flash-image).
//
// Il prompt genera il TEMPLATE MASTER di una slide: conta il layout, non il
// contenuto. Il copy e un segnaposto realistico in italiano; il testo
// renderizzato DEVE restare in italiano (LANGUAGE DIRECTIVE in testa).
//
// File PURO, specchiato in supabase/functions/_shared/brand/genesisPrompt.ts.

import { getArchetype, type SlideRole } from './archetypes.ts';
import { genomeToPromptFragment, type TemplateGenome } from './genome.ts';

/** Palette risolta del brand: input del prompt, prodotta dall'extractor. */
export type GenesisPalette = {
  bg_a: string;         // colore chiaro dominante
  bg_b: string;         // colore scuro dominante
  accent: string;       // colore piu saturo
  text_on_light: string;
  text_on_dark: string;
};

/** Sottoinsieme del brand kit necessario alla genesi. */
export type GenesisBrandKit = {
  nome_business: string;
  palette: GenesisPalette;
};

export type GenesisVariant = 1 | 2 | 3;

/**
 * Rimuove em dash, en dash e i loro sosia da qualsiasi testo destinato a un
 * prompt. Sostituzione contestuale: tra spazi diventa due punti, altrimenti
 * virgola o trattino semplice.
 */
export function sanitize(s: string): string {
  return s
    // " — " oppure " – " come inciso: diventa ": "
    .replace(/\s+[‒–—―]\s+/g, ': ')
    // dash attaccato tra parole (raro): trattino semplice
    .replace(/([^\s])[‒–—―]([^\s])/g, '$1-$2')
    // qualsiasi residuo: virgola con spazio
    .replace(/[‒–—―]/g, ', ');
}

/** Copy segnaposto realistico, mai lorem ipsum. Lunghezze da spec. */
export const PLACEHOLDER = {
  cover: {
    kicker: 'FISIOTERAPIA',
    title: 'PERCHÉ LA SPALLA FA MALE ANCHE DA FERMA',
  },
  content: {
    number: '02',
    label: 'IL METODO',
    title: 'LA POSTURA NON È LA CAUSA',
    body:
      'Il dolore persistente dipende da più fattori che agiscono insieme. Ridurlo a un solo elemento porta a scelte poco efficaci.',
  },
  cta: {
    title: 'PRENOTA UNA VALUTAZIONE',
    body: 'Scrivici in direct per parlarne.',
  },
} as const;

const VARIANT_HINTS: Record<GenesisVariant, string> = {
  1: 'Faithful interpretation of the spec.',
  2: 'Variant with stronger typographic hierarchy and larger headline.',
  3: 'Variant with more prominent decoration and a more asymmetric composition.',
};

/**
 * Vincoli negativi in coda al prompt. La clausola sulle foto dipende dallo
 * stile visual: con flat_icon il fotografico e vietato del tutto, con
 * realistic e ammesso ma senza volti riconoscibili.
 */
function negativeConstraints(style: 'flat_icon' | 'realistic'): string {
  const photoClause = style === 'realistic'
    ? 'no identifiable human faces, '
    : 'no photographic imagery, no realistic human faces, ';
  return (
    'Safe margins of 90px on all sides. Crisp perfectly legible typography. ' +
    'No logo, no watermark, ' + photoClause + 'no UI chrome, ' +
    'no drop shadows, no gradients unless specified.'
  );
}

// Zona visual esplicativa: solo le slide content la prevedono. Il segnaposto
// e un soggetto fisso (colonna vertebrale) che la produzione sostituira con
// il soggetto della slide reale. Due versioni, una per stile.
const ILLUSTRATION_DIRECTIVE_FLAT =
  'ILLUSTRATION: reserve one clearly visible zone of the layout for a spot illustration. ' +
  'Draw a placeholder there: a simple flat illustration of a human spine seen from the side, ' +
  'single color using the accent color, clean minimal stroke style consistent with the decoration motif, ' +
  'isolated directly on the background with no frame and no container box. ' +
  'It must read as an explanatory diagram that supports the text, not as decoration.';

const ILLUSTRATION_DIRECTIVE_REALISTIC =
  'ILLUSTRATION: reserve one clearly visible zone of the layout for a realistic image. ' +
  'Draw a placeholder there: a realistic photographic style render of a human spine anatomical model, ' +
  'softly and naturally lit. THE IMAGE MUST BE A CUTOUT: the subject isolated along its own silhouette ' +
  'directly on the flat background color, like a sticker. Absolutely no rectangular photo, no square crop, ' +
  'no photo box, no frame, no visible photo edges: around the subject there must be only the flat background color. ' +
  'It must read as an explanatory visual that supports the text, not as decoration.';

/**
 * Risolve i colori concreti di sfondo e testo per il ruolo, secondo la
 * bg_strategy del genoma.
 */
function resolveColors(
  palette: GenesisPalette,
  genome: TemplateGenome,
  role: SlideRole
): { background: string; text: string; accent: string } {
  const { bg_a, bg_b, accent, text_on_light, text_on_dark } = palette;

  if (genome.bg_strategy === 'accent_cover') {
    if (role === 'cover') {
      return { background: accent, text: text_on_dark, accent: bg_a };
    }
    return { background: bg_a, text: text_on_light, accent };
  }

  if (genome.bg_strategy === 'alternating_solid') {
    // La cover e la cta usano lo sfondo scuro, le content quello chiaro:
    // nel set finale le slide si alternano visivamente.
    if (role === 'content') {
      return { background: bg_a, text: text_on_light, accent };
    }
    return { background: bg_b, text: text_on_dark, accent };
  }

  // mono_with_accent_blocks
  return { background: bg_a, text: text_on_light, accent };
}

function placeholderBlock(role: SlideRole): string {
  if (role === 'cover') {
    return (
      'Kicker text: "' + PLACEHOLDER.cover.kicker + '"\n' +
      'Headline text: "' + PLACEHOLDER.cover.title + '"'
    );
  }
  if (role === 'content') {
    return (
      'Index number: "' + PLACEHOLDER.content.number + '"\n' +
      'Small label next to the index number, if the archetype includes one: "' + PLACEHOLDER.content.label + '"\n' +
      'Headline text: "' + PLACEHOLDER.content.title + '"\n' +
      'Body text: "' + PLACEHOLDER.content.body + '"'
    );
  }
  return (
    'Headline text: "' + PLACEHOLDER.cta.title + '"\n' +
    'Supporting line: "' + PLACEHOLDER.cta.body + '"'
  );
}

/**
 * Costruisce il prompt di genesi completo per (archetipo del genoma, ruolo,
 * variante). Ordine fisso da spec. Ogni stringa passa da sanitize().
 */
export function buildGenesisPrompt(
  kit: GenesisBrandKit,
  genome: TemplateGenome,
  role: SlideRole,
  variant: GenesisVariant
): string {
  const archetype = getArchetype(genome.archetype);
  const spec = archetype.roles[role];
  const colors = resolveColors(kit.palette, genome, role);
  const visualStyle = genome.visual_style === 'realistic' ? 'realistic' : 'flat_icon';

  const sections: string[] = [];

  // 1. LANGUAGE DIRECTIVE
  sections.push(
    'LANGUAGE DIRECTIVE: every piece of text rendered inside the image must be in ITALIAN, exactly as written below, with no translation, no paraphrase, no additions.'
  );

  // 2. Dichiarazione TEMPLATE MASTER
  sections.push(
    'This is a MASTER TEMPLATE for an Instagram carousel slide, 1080x1080 pixels. What matters is layout, spacing and proportions: the design system, not the specific content. Flat graphic design, vector style.'
  );

  // 3. Spec compositiva del ruolo
  sections.push(
    'COMPOSITION (' + role + ' slide): ' + spec.composition + '\n' +
    'TYPE SCALE: ' + spec.type_scale + '\n' +
    'REQUIRED ELEMENTS: ' + spec.elements.join(', ') + '.'
  );

  // 4. Colori risolti secondo bg_strategy
  sections.push(
    'COLORS: background ' + colors.background + ', text ' + colors.text +
    ', accent ' + colors.accent +
    '. Text against background must keep a contrast ratio of at least 4.5 to 1.'
  );

  // 5 + 6. Decorazione e tipografia dal genoma
  sections.push(genomeToPromptFragment(genome));

  // 7. Copy segnaposto del ruolo
  sections.push(
    'RENDER THIS PLACEHOLDER COPY, in Italian, exactly as written:\n' +
    placeholderBlock(role)
  );

  // 7b. Zona visual esplicativa (solo content), nello stile scelto dall'utente
  if (role === 'content') {
    sections.push(
      visualStyle === 'realistic' ? ILLUSTRATION_DIRECTIVE_REALISTIC : ILLUSTRATION_DIRECTIVE_FLAT
    );
  }

  // 8. Hint di variante
  sections.push('VARIANT ' + variant + ' OF 3: ' + VARIANT_HINTS[variant]);

  // 9. Negative constraints
  sections.push(negativeConstraints(visualStyle));

  return sanitize(sections.join('\n\n'));
}
