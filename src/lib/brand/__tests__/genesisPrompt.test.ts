// Test del costruttore prompt di genesi + sanitize.
import { describe, it, expect } from 'vitest';
import {
  buildGenesisPrompt,
  sanitize,
  PLACEHOLDER,
  type GenesisBrandKit,
} from '../genesisPrompt.ts';
import type { TemplateGenome } from '../genome.ts';
import { ARCHETYPES, type ArchetypeId, type SlideRole } from '../archetypes.ts';

const KIT: GenesisBrandKit = {
  nome_business: 'Studio Fisio Demo',
  palette: {
    bg_a: '#F5F2EC',
    bg_b: '#1E2A32',
    accent: '#2A688C',
    text_on_light: '#1A1A1A',
    text_on_dark: '#FFFFFF',
  },
};

function genomeFor(archetype: ArchetypeId): TemplateGenome {
  return {
    archetype,
    decoration_motif: 'thin concentric arcs radiating from the corner',
    decoration_scale: 'subtle',
    decoration_anchor: 'corner',
    decoration_opacity: 0.12,
    type_pairing: { title: 'geometric sans serif, heavy', body: 'humanist sans serif, regular' },
    type_contrast: 'high',
    density: 'balanced',
    alignment: 'left',
    bg_strategy: 'alternating_solid',
    rationale: 'test',
  };
}

const ALL_IDS = Object.keys(ARCHETYPES) as ArchetypeId[];
const ROLES: SlideRole[] = ['cover', 'content', 'cta'];
const DASH = /[‒–—―]/;

describe('sanitize', () => {
  it('sostituisce em dash tra spazi con due punti', () => {
    expect(sanitize('layout pulito — molto leggibile')).toBe('layout pulito: molto leggibile');
  });
  it('sostituisce en dash tra parole con trattino semplice', () => {
    expect(sanitize('range 5–10')).toBe('range 5-10');
  });
  it('rimuove ogni dash residuo', () => {
    expect(sanitize('a—')).not.toMatch(DASH);
    expect(sanitize('–b')).not.toMatch(DASH);
  });
  it('lascia intatto il testo pulito', () => {
    expect(sanitize('PERCHÉ LA SPALLA FA MALE')).toBe('PERCHÉ LA SPALLA FA MALE');
  });
});

describe('buildGenesisPrompt', () => {
  it('inizia con la LANGUAGE DIRECTIVE', () => {
    const p = buildGenesisPrompt(KIT, genomeFor('split_panel'), 'cover', 1);
    expect(p.startsWith('LANGUAGE DIRECTIVE:')).toBe(true);
    expect(p).toContain('ITALIAN');
  });

  it('termina con i negative constraints', () => {
    const p = buildGenesisPrompt(KIT, genomeFor('split_panel'), 'cover', 1);
    expect(p.trimEnd().endsWith('no drop shadows, no gradients unless specified.')).toBe(true);
    expect(p).toContain('Safe margins of 90px');
  });

  it('contiene il copy segnaposto italiano del ruolo', () => {
    const cover = buildGenesisPrompt(KIT, genomeFor('split_panel'), 'cover', 1);
    expect(cover).toContain(PLACEHOLDER.cover.title);
    const content = buildGenesisPrompt(KIT, genomeFor('split_panel'), 'content', 1);
    expect(content).toContain(PLACEHOLDER.content.body);
    const cta = buildGenesisPrompt(KIT, genomeFor('split_panel'), 'cta', 1);
    expect(cta).toContain(PLACEHOLDER.cta.title);
  });

  it('la zona illustrazione esplicativa c\'e solo sulle slide content', () => {
    const content = buildGenesisPrompt(KIT, genomeFor('split_panel'), 'content', 1);
    expect(content).toContain('ILLUSTRATION:');
    expect(content).toContain('explanatory diagram');
    const cover = buildGenesisPrompt(KIT, genomeFor('split_panel'), 'cover', 1);
    expect(cover).not.toContain('ILLUSTRATION:');
    const cta = buildGenesisPrompt(KIT, genomeFor('split_panel'), 'cta', 1);
    expect(cta).not.toContain('ILLUSTRATION:');
  });

  it('il formato 4:5 cambia il canvas del master template', () => {
    const vertical = buildGenesisPrompt(
      KIT, { ...genomeFor('split_panel'), format: '4:5' }, 'cover', 1
    );
    expect(vertical).toContain('1080x1350');
    expect(vertical).toContain('vertical 4:5 portrait');
    const square = buildGenesisPrompt(KIT, genomeFor('split_panel'), 'cover', 1);
    expect(square).toContain('1080x1080');
  });

  it('visual_style realistic cambia direttiva e vincoli, flat_icon e il default', () => {
    const realistic = buildGenesisPrompt(
      KIT, { ...genomeFor('split_panel'), visual_style: 'realistic' }, 'content', 1
    );
    expect(realistic).toContain('realistic photographic style render');
    expect(realistic).toContain('no identifiable human faces');
    expect(realistic).not.toContain('no photographic imagery');
    expect(realistic.trimEnd().endsWith('no drop shadows, no gradients unless specified.')).toBe(true);

    const flat = buildGenesisPrompt(KIT, genomeFor('split_panel'), 'content', 1);
    expect(flat).toContain('simple flat illustration');
    expect(flat).toContain('no photographic imagery');
  });

  it('ogni combinazione archetipo x ruolo x variante e dash-free e senza placeholder {{...}}', () => {
    for (const id of ALL_IDS) {
      for (const role of ROLES) {
        for (const variant of [1, 2, 3] as const) {
          const p = buildGenesisPrompt(KIT, genomeFor(id), role, variant);
          expect(p, `${id}/${role}/v${variant} contiene dash`).not.toMatch(DASH);
          expect(p, `${id}/${role}/v${variant} contiene {{...}}`).not.toMatch(/\{\{.*?\}\}/);
        }
      }
    }
  });

  it('le 3 varianti dello stesso ruolo differiscono solo per l\'hint', () => {
    const v1 = buildGenesisPrompt(KIT, genomeFor('split_panel'), 'content', 1);
    const v2 = buildGenesisPrompt(KIT, genomeFor('split_panel'), 'content', 2);
    expect(v1).not.toBe(v2);
    expect(v2).toContain('stronger typographic hierarchy');
  });

  it('accent_cover inverte i colori sulla cover', () => {
    const g = { ...genomeFor('split_panel'), bg_strategy: 'accent_cover' as const };
    const cover = buildGenesisPrompt(KIT, g, 'cover', 1);
    expect(cover).toContain('background ' + KIT.palette.accent);
    const content = buildGenesisPrompt(KIT, g, 'content', 1);
    expect(content).toContain('background ' + KIT.palette.bg_a);
  });

  // Artefatto del checkpoint: stampa il prompt richiesto dalla spec.
  it('CHECKPOINT: stampa il prompt split_panel / content / variante 2', () => {
    const p = buildGenesisPrompt(KIT, genomeFor('split_panel'), 'content', 2);
    // eslint-disable-next-line no-console
    console.log('\n===== PROMPT DI GENESI: split_panel / content / v2 =====\n');
    // eslint-disable-next-line no-console
    console.log(p);
    // eslint-disable-next-line no-console
    console.log('\n===== FINE PROMPT =====\n');
    expect(p.length).toBeGreaterThan(400);
  });
});
