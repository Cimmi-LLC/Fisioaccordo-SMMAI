// Libreria chiusa degli archetipi compositivi per Template Genesis.
//
// PRINCIPIO NON NEGOZIABILE: l'art director AI non progetta layout liberi.
// Sceglie UN archetipo da questa libreria e lo parametrizza col genoma.
// Se un archetipo rende male su NB2 lo si corregge qui, una volta per tutti
// i clienti. La differenziazione tra clienti nasce da palette, tipografia,
// motivo decorativo e densita, non dalla griglia sottostante.
//
// Le stringhe `composition` e `type_scale` sono in inglese perche finiscono
// nel prompt NB2. Tutto il resto in italiano.
//
// NOTA: questo file e PURO: zero import, zero API di piattaforma. Viene
// specchiato byte-identico in supabase/functions/_shared/brand/archetypes.ts
// per l'uso in Deno (vedi test mirrorSync).

export type ArchetypeId =
  | 'split_panel'
  | 'text_heavy_left'
  | 'centered_minimal'
  | 'numeric_grid'
  | 'quote_block'
  | 'diagonal_band';

export type SlideRole = 'cover' | 'content' | 'cta';

export type Slot = { x: number; y: number; w: number; h?: number };

export type RoleSpec = {
  /** Descrizione spaziale in inglese, entra nel prompt NB2. */
  composition: string;
  /** Gerarchia dimensionale, in inglese, entra nel prompt NB2. */
  type_scale: string;
  /** Elementi obbligatori della slide. */
  elements: string[];
  /** Coordinate dello slot logo su canvas 1080. */
  logo_slot: { x: number; y: number; w: number };
  /** Area riservata alla foto reale, solo per le slide cta. */
  photo_slot?: { x: number; y: number; w: number; h: number };
};

export type Archetype = {
  id: ArchetypeId;
  label_it: string;
  /** Tag di mood/settore usati dall'art director per la selezione. */
  best_for: string[];
  max_title_chars: number;
  max_body_chars: number;
  roles: { cover: RoleSpec; content: RoleSpec; cta: RoleSpec };
};

export const ARCHETYPES: Readonly<Record<ArchetypeId, Archetype>> = {
  split_panel: {
    id: 'split_panel',
    label_it: 'Pannelli divisi',
    best_for: ['clinico', 'strutturato', 'poliambulatorio', 'multi servizio'],
    max_title_chars: 55,
    max_body_chars: 200,
    roles: {
      cover: {
        composition:
          'Canvas split vertically 40/60. Left panel in accent color holds the kicker rotated 90 degrees along the edge. Right panel in background color holds the headline, left aligned, occupying the lower two thirds.',
        type_scale:
          'Kicker small uppercase with wide tracking. Headline extra large, bold, tight leading.',
        elements: ['kicker', 'headline'],
        logo_slot: { x: 810, y: 90, w: 180 },
      },
      content: {
        composition:
          'Canvas split horizontally 30/70. Top band in accent color holds a large index number and a short label. Lower area holds headline and body text, left aligned, with 90px margins.',
        type_scale:
          'Index number very large and bold. Headline large. Body medium with comfortable leading.',
        elements: ['index number', 'label', 'headline', 'body'],
        logo_slot: { x: 810, y: 90, w: 180 },
      },
      cta: {
        composition:
          'Canvas split vertically 55/45. Left panel holds the call to action headline and one supporting line. Right panel is a solid color block reserved as an empty portrait area.',
        type_scale:
          'Headline large and bold. Supporting line medium.',
        elements: ['headline', 'supporting line', 'empty portrait area'],
        logo_slot: { x: 810, y: 90, w: 180 },
        photo_slot: { x: 594, y: 0, w: 486, h: 1080 },
      },
    },
  },

  text_heavy_left: {
    id: 'text_heavy_left',
    label_it: 'Testo a sinistra',
    best_for: ['divulgativo', 'editoriale', 'autorevole', 'personal brand'],
    max_title_chars: 70,
    max_body_chars: 260,
    roles: {
      cover: {
        composition:
          'Full bleed solid background. All text left aligned, starting at 90px from the left edge. Kicker in small uppercase at the top, headline occupying the vertical center with tight line spacing, thin horizontal rule below it.',
        type_scale:
          'Kicker small uppercase. Headline extra large with tight line spacing. Rule thin.',
        elements: ['kicker', 'headline', 'horizontal rule'],
        logo_slot: { x: 90, y: 900, w: 200 },
      },
      content: {
        composition:
          'Full bleed solid background. Small index number top left. Headline left aligned in the upper half, body text left aligned in the lower half, separated by generous vertical whitespace.',
        type_scale:
          'Index number small. Headline large. Body medium with generous leading.',
        elements: ['index number', 'headline', 'body'],
        logo_slot: { x: 90, y: 900, w: 200 },
      },
      cta: {
        composition:
          'Full bleed solid background. Headline left aligned in the upper third, one supporting line below, circular empty area reserved in the lower right quadrant.',
        type_scale:
          'Headline large and bold. Supporting line medium.',
        elements: ['headline', 'supporting line', 'circular empty area'],
        logo_slot: { x: 90, y: 900, w: 200 },
        photo_slot: { x: 620, y: 620, w: 380, h: 380 },
      },
    },
  },

  centered_minimal: {
    id: 'centered_minimal',
    label_it: 'Minimale centrato',
    best_for: ['premium', 'wellness', 'minimalista', 'estetico'],
    max_title_chars: 45,
    max_body_chars: 160,
    roles: {
      cover: {
        composition:
          'Full bleed solid background. All content centered on both axes as a vertical stack: small kicker, headline in two or three short lines, thin divider mark below. Wide empty margins on all sides.',
        type_scale:
          'Kicker small with wide tracking. Headline large, elegant, airy leading. Divider thin.',
        elements: ['kicker', 'headline', 'divider mark'],
        logo_slot: { x: 465, y: 100, w: 150 },
      },
      content: {
        composition:
          'Full bleed solid background. Centered vertical stack: index number as a small circular badge, headline in two lines, body text in a narrow centered column no wider than 720px.',
        type_scale:
          'Index badge small. Headline large. Body medium in a narrow column.',
        elements: ['index badge', 'headline', 'body'],
        logo_slot: { x: 465, y: 100, w: 150 },
      },
      cta: {
        composition:
          'Full bleed solid background. Centered stack: headline, one supporting line, circular empty area centered in the lower portion.',
        type_scale:
          'Headline large. Supporting line medium.',
        elements: ['headline', 'supporting line', 'circular empty area'],
        logo_slot: { x: 465, y: 100, w: 150 },
        photo_slot: { x: 390, y: 640, w: 300, h: 300 },
      },
    },
  },

  numeric_grid: {
    id: 'numeric_grid',
    label_it: 'Griglia numerica',
    best_for: ['liste', 'segnali', 'cause', 'errori', 'sequenze'],
    max_title_chars: 50,
    max_body_chars: 220,
    roles: {
      cover: {
        composition:
          'Full bleed solid background. An oversized numeral occupies the left third, cropped by the canvas edge, in a very low opacity tint of the accent color. Headline sits on top of it, left aligned, in the vertical center.',
        type_scale:
          'Oversized numeral as background element. Headline extra large and bold on top.',
        elements: ['oversized numeral', 'headline'],
        logo_slot: { x: 810, y: 90, w: 180 },
      },
      content: {
        composition:
          'Full bleed solid background. Large solid numeral in the top left corner, roughly 200px tall, in accent color. Headline immediately to its right, body text below spanning the full text width.',
        type_scale:
          'Numeral very large and solid. Headline large. Body medium.',
        elements: ['numeral', 'headline', 'body'],
        logo_slot: { x: 810, y: 90, w: 180 },
      },
      cta: {
        composition:
          'Full bleed solid background. No numeral. Headline in the upper half, supporting line below, empty rectangular area reserved along the bottom edge.',
        type_scale:
          'Headline large and bold. Supporting line medium.',
        elements: ['headline', 'supporting line', 'empty rectangular area'],
        logo_slot: { x: 810, y: 90, w: 180 },
        photo_slot: { x: 0, y: 720, w: 1080, h: 360 },
      },
    },
  },

  quote_block: {
    id: 'quote_block',
    label_it: 'Blocco citazione',
    best_for: ['mito vs realta', 'affermazioni forti', 'autorevolezza', 'ribaltamenti'],
    max_title_chars: 90,
    max_body_chars: 120,
    roles: {
      cover: {
        composition:
          'Full bleed solid background. An oversized opening quotation mark in accent color anchors the top left. The headline runs beneath it in large type, left aligned, occupying the vertical center, with a thick accent color underline on the final line.',
        type_scale:
          'Quotation mark oversized. Headline large with strong presence. Underline thick.',
        elements: ['opening quotation mark', 'headline', 'accent underline'],
        logo_slot: { x: 90, y: 920, w: 180 },
      },
      content: {
        composition:
          'Full bleed solid background. Headline treated as a statement in large type, left aligned, upper two thirds. Short body line in the lower third, separated by a thick horizontal accent rule.',
        type_scale:
          'Headline large, statement weight. Body short and medium. Rule thick.',
        elements: ['headline', 'body', 'accent rule'],
        logo_slot: { x: 90, y: 920, w: 180 },
      },
      cta: {
        composition:
          'Full bleed solid background. Closing quotation mark in the top right. Headline centered vertically, supporting line below, empty circular area in the bottom left.',
        type_scale:
          'Headline large. Supporting line medium.',
        elements: ['closing quotation mark', 'headline', 'supporting line', 'circular empty area'],
        logo_slot: { x: 90, y: 920, w: 180 },
        photo_slot: { x: 90, y: 700, w: 320, h: 320 },
      },
    },
  },

  diagonal_band: {
    id: 'diagonal_band',
    label_it: 'Banda diagonale',
    best_for: ['sportivo', 'riabilitazione', 'performance', 'energico'],
    max_title_chars: 50,
    max_body_chars: 190,
    roles: {
      cover: {
        composition:
          'Full bleed solid background. A wide diagonal band in accent color crosses the canvas from lower left to upper right at a 15 degree angle. The headline sits inside the band, left aligned, rotated to match the band angle.',
        type_scale:
          'Headline extra large and bold inside the band.',
        elements: ['diagonal band', 'headline'],
        logo_slot: { x: 90, y: 90, w: 180 },
      },
      content: {
        composition:
          'Full bleed solid background. A narrow diagonal accent band crosses the upper portion holding the index number. Headline and body sit below in the flat area, left aligned.',
        type_scale:
          'Index number large inside the band. Headline large. Body medium.',
        elements: ['diagonal band', 'index number', 'headline', 'body'],
        logo_slot: { x: 90, y: 90, w: 180 },
      },
      cta: {
        composition:
          'Full bleed solid background. Diagonal band crosses the lower portion. Headline above the band, supporting line inside it, empty area reserved in the upper right.',
        type_scale:
          'Headline large. Supporting line medium inside the band.',
        elements: ['diagonal band', 'headline', 'supporting line', 'empty area'],
        logo_slot: { x: 90, y: 90, w: 180 },
        photo_slot: { x: 660, y: 80, w: 340, h: 340 },
      },
    },
  },
};

export function getArchetype(id: ArchetypeId): Archetype {
  const a = ARCHETYPES[id];
  if (!a) {
    throw new Error('Archetipo sconosciuto: ' + String(id));
  }
  return a;
}

export function isArchetypeId(x: unknown): x is ArchetypeId {
  return typeof x === 'string' && x in ARCHETYPES;
}

/**
 * Riassunto compatto della libreria, in inglese, per il prompt
 * dell'art director. Una riga per archetipo: id, mood tags, limiti testo.
 */
export function listArchetypesForPrompt(): string {
  return Object.values(ARCHETYPES)
    .map(
      (a) =>
        a.id +
        ': best for ' +
        a.best_for.join(', ') +
        '. Title up to ' +
        a.max_title_chars +
        ' chars, body up to ' +
        a.max_body_chars +
        ' chars.'
    )
    .join('\n');
}
