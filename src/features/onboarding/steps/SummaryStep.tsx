// Step 4: riepilogo del genoma in italiano + conferma finale.
import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { getArchetype } from '@/lib/brand/archetypes.ts';
import type { TemplateGenome } from '@/lib/brand/genome.ts';
import type { TemplateCandidate } from '../hooks/useTemplateCandidates.ts';
import type { SlideRole } from '@/lib/brand/archetypes.ts';

interface SummaryStepProps {
  busy: boolean;
  genome: TemplateGenome;
  candidates: TemplateCandidate[];
  selection: Partial<Record<SlideRole, string>>;
  onApprove: () => void;
}

const IT: Record<string, string> = {
  subtle: 'discreta', medium: 'media', dominant: 'dominante',
  corner: 'angolo', edge: 'bordo', behind_text: 'dietro il testo', full_bleed: 'a tutta tela',
  low: 'basso', high: 'alto', extreme: 'estremo',
  airy: 'ariosa', balanced: 'bilanciata', packed: 'compatta',
  left: 'a sinistra', center: 'centrato',
  alternating_solid: 'sfondi pieni alternati',
  accent_cover: 'copertina in colore accento',
  mono_with_accent_blocks: 'monocromo con blocchi accento',
  flat_icon: 'icone e illustrazioni',
  realistic: 'immagini realistiche',
};

const SummaryStep: React.FC<SummaryStepProps> = ({ busy, genome, candidates, selection, onApprove }) => {
  const archetype = getArchetype(genome.archetype);
  const selected = (['cover', 'content', 'cta'] as SlideRole[])
    .map((role) => candidates.find((c) => c.id === selection[role]))
    .filter((c): c is TemplateCandidate => !!c);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-black mb-1" style={{ color: 'var(--ink)' }}>
          Il tuo sistema visivo
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--ink3)' }}>
          Questo template diventera la base di TUTTI i tuoi caroselli. Una volta confermato e definitivo.
        </p>
      </div>

      {/* Anteprima dei 3 selezionati */}
      <div className="grid grid-cols-3 gap-3">
        {selected.map((c) => (
          <img
            key={c.id}
            src={c.image_url}
            alt={c.slide_role}
            className="rounded-xl"
            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', border: '1px solid var(--line)' }}
          />
        ))}
      </div>

      {/* Genoma leggibile */}
      <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div>
          <div className="text-[11px] font-bold uppercase mb-1" style={{ color: 'var(--ink3)', letterSpacing: '0.6px' }}>
            Archetipo scelto
          </div>
          <div className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>{archetype.label_it}</div>
          <p className="text-[12px] mt-1 italic" style={{ color: 'var(--ink2)' }}>"{genome.rationale}"</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-[12px] pt-2" style={{ color: 'var(--ink2)', borderTop: '1px solid var(--line)' }}>
          <div>Decorazione: <strong style={{ color: 'var(--ink)' }}>{genome.decoration_motif}</strong></div>
          <div>Presenza: <strong style={{ color: 'var(--ink)' }}>{IT[genome.decoration_scale]}</strong>, {IT[genome.decoration_anchor]}</div>
          <div>Densita: <strong style={{ color: 'var(--ink)' }}>{IT[genome.density]}</strong></div>
          <div>Allineamento: <strong style={{ color: 'var(--ink)' }}>{IT[genome.alignment]}</strong></div>
          <div className="sm:col-span-2">Sfondi: <strong style={{ color: 'var(--ink)' }}>{IT[genome.bg_strategy]}</strong></div>
          <div className="sm:col-span-2">Immagini nelle slide: <strong style={{ color: 'var(--ink)' }}>{IT[genome.visual_style ?? 'flat_icon']}</strong></div>
          <div className="sm:col-span-2">Formato: <strong style={{ color: 'var(--ink)' }}>{genome.format === '4:5' ? 'verticale 4:5 (1080x1350)' : 'quadrato 1:1 (1080x1080)'}</strong></div>
        </div>
      </div>

      <button
        onClick={onApprove}
        disabled={busy || selected.length < 3}
        className="w-full flex items-center justify-center gap-2 text-white text-[13px] font-black uppercase py-3.5 rounded-xl disabled:opacity-50"
        style={{ backgroundColor: 'var(--rosa)', border: 'none', cursor: busy ? 'wait' : 'pointer', letterSpacing: '0.5px' }}
      >
        <CheckCircle2 className="h-4 w-4" />
        {busy ? 'Approvo…' : 'Conferma e blocca il template'}
      </button>
    </div>
  );
};

export default SummaryStep;
