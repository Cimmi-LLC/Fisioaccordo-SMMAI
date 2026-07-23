// Test della libreria archetipi: invarianti strutturali.
import { describe, it, expect } from 'vitest';
import { ARCHETYPES, getArchetype, isArchetypeId, listArchetypesForPrompt, type ArchetypeId } from '../archetypes.ts';

const CANVAS = 1080;
const IDS: ArchetypeId[] = [
  'split_panel', 'text_heavy_left', 'centered_minimal',
  'numeric_grid', 'quote_block', 'diagonal_band',
];
const DASH_REGEX = /[‒–—―]/;

describe('archetypes', () => {
  it('contiene esattamente i 6 archetipi previsti', () => {
    expect(Object.keys(ARCHETYPES).sort()).toEqual([...IDS].sort());
  });

  it.each(IDS)('%s ha i 3 ruoli cover/content/cta', (id) => {
    const a = getArchetype(id);
    expect(a.roles.cover).toBeDefined();
    expect(a.roles.content).toBeDefined();
    expect(a.roles.cta).toBeDefined();
  });

  it.each(IDS)('%s ha logo_slot dentro il canvas 1080 in ogni ruolo', (id) => {
    const a = getArchetype(id);
    for (const role of ['cover', 'content', 'cta'] as const) {
      const slot = a.roles[role].logo_slot;
      expect(slot.x).toBeGreaterThanOrEqual(0);
      expect(slot.y).toBeGreaterThanOrEqual(0);
      expect(slot.w).toBeGreaterThan(0);
      expect(slot.x + slot.w).toBeLessThanOrEqual(CANVAS);
      expect(slot.y).toBeLessThanOrEqual(CANVAS);
    }
  });

  it.each(IDS)('%s ha photo_slot valido sulla slide cta', (id) => {
    const a = getArchetype(id);
    const slot = a.roles.cta.photo_slot;
    expect(slot).toBeDefined();
    if (slot) {
      expect(slot.x).toBeGreaterThanOrEqual(0);
      expect(slot.y).toBeGreaterThanOrEqual(0);
      expect(slot.x + slot.w).toBeLessThanOrEqual(CANVAS);
      expect(slot.y + slot.h).toBeLessThanOrEqual(CANVAS);
    }
  });

  it.each(IDS)('%s non contiene em/en dash in nessuna stringa', (id) => {
    const a = getArchetype(id);
    const all = JSON.stringify(a);
    expect(all).not.toMatch(DASH_REGEX);
  });

  it('isArchetypeId distingue id validi da invalidi', () => {
    expect(isArchetypeId('split_panel')).toBe(true);
    expect(isArchetypeId('libero_stile')).toBe(false);
    expect(isArchetypeId(42)).toBe(false);
    expect(isArchetypeId(null)).toBe(false);
  });

  it('listArchetypesForPrompt elenca tutti gli id su righe separate', () => {
    const summary = listArchetypesForPrompt();
    for (const id of IDS) expect(summary).toContain(id);
    expect(summary.split('\n')).toHaveLength(6);
  });
});
