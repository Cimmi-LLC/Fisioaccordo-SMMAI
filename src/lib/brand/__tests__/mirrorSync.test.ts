// Guardia anti-drift: i 4 file prompt-critical devono essere byte-identici
// tra la sorgente (src/lib/brand) e la copia specchio usata da Deno
// (supabase/functions/_shared/brand). Se questo test fallisce, ricopia:
//   cp src/lib/brand/<file>.ts supabase/functions/_shared/brand/<file>.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../../..');
const MIRRORED = ['archetypes.ts', 'genome.ts', 'genesisPrompt.ts', 'artDirector.ts'];

describe('sincronizzazione mirror Vite <-> Deno', () => {
  it.each(MIRRORED)('%s e byte-identico tra src e _shared', (file) => {
    const src = readFileSync(resolve(ROOT, 'src/lib/brand', file), 'utf8');
    const mirror = readFileSync(resolve(ROOT, 'supabase/functions/_shared/brand', file), 'utf8');
    expect(mirror).toBe(src);
  });
});
