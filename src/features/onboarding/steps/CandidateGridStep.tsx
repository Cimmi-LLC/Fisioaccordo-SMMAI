// Step 3: griglia 3x3 dei candidati, aggiornamento progressivo (Realtime +
// polling), rigenerazione con feedback e «Riprova» sulla singola variante.
//
// Template a layout (dal 06/11/2026): una riga per layout (A, B, C) con
// copertina, contenuto e chiusura; lo studio sceglie la riga intera.
// I candidati generati prima restano col vecchio schema: scelta per ruolo.
import React, { useState } from 'react';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TemplateCandidate } from '../hooks/useTemplateCandidates.ts';
import type { SlideRole } from '@/lib/brand/archetypes.ts';
import { LAYOUT_IDS, LAYOUT_INFO, isLayoutId, type LayoutId } from '@/lib/brand/layouts.ts';

interface CandidateGridStepProps {
  busy: boolean;
  candidates: TemplateCandidate[];
  selection: Partial<Record<SlideRole, string>>;
  onSelect: (role: SlideRole, candidateId: string) => void;
  onRegenerate: (feedback: string) => void;
  onContinue: () => void;
  /** Layout proposto per primo (badge «Consigliato»). */
  consigliato?: LayoutId | null;
}

const ROLE_LABELS: Record<SlideRole, string> = {
  cover: 'Copertina',
  content: 'Contenuto',
  cta: 'Chiusura (CTA)',
};

const ROLES: SlideRole[] = ['cover', 'content', 'cta'];

const CandidateGridStep: React.FC<CandidateGridStepProps> = ({
  busy, candidates, selection, onSelect, onRegenerate, onContinue, consigliato,
}) => {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  // Rigenera UNA variante: lo stato torna «generating» sul DB e la griglia
  // si aggiorna da sola via Realtime/polling.
  const retryOne = async (c: TemplateCandidate) => {
    setRetrying(c.id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-template', {
        body: { action: 'riprova_candidato', brandId: c.brand_id, candidateId: c.id },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
    } catch (e) {
      toast({
        title: 'Variante non rigenerata',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
    } finally {
      setRetrying(null);
    }
  };

  const byRole = (role: SlideRole) =>
    candidates.filter((c) => c.slide_role === role).sort((a, b) => a.variant_index - b.variant_index);

  const allSelected = ROLES.every((r) => !!selection[r]);
  const aLayout = candidates.some((c) => isLayoutId(c.genome?.layout));
  const delLayout = (l: LayoutId) => ROLES
    .map((r) => candidates.find((c) => c.genome?.layout === l && c.slide_role === r))
    .filter((c): c is TemplateCandidate => !!c);
  // Il layout si sceglie intero: i suoi 3 ruoli in un colpo solo.
  const scegliLayout = (l: LayoutId) => {
    for (const c of delLayout(l)) if (c.status === 'done') onSelect(c.slide_role, c.id);
  };
  // Un candidato fermo in coda da piu di 4 minuti non arrivera piu: la
  // generazione in background e stata interrotta. Senza questo controllo il
  // wizard restava in attesa per sempre (caso reale: 7 su 9 pronti, 2 in coda).
  const STALL_MS = 4 * 60 * 1000;
  const isStalled = (c: TemplateCandidate) =>
    (c.status === 'pending' || c.status === 'generating') &&
    Date.now() - new Date(c.updated_at).getTime() > STALL_MS;
  const stalledCount = candidates.filter(isStalled).length;
  const generating = candidates.some((c) => (c.status === 'pending' || c.status === 'generating') && !isStalled(c));

  const cella = (c: TemplateCandidate, selected: boolean, onPick: () => void, ratio: string) => {
    const isLoading = (c.status === 'pending' || c.status === 'generating') && !isStalled(c);
    const isFailed = c.status === 'failed' || isStalled(c);
    return (
      // Non è un <button> disabilitato: dentro c'è il «Riprova»
      // delle varianti fallite, che deve restare cliccabile.
      <div
        key={c.id}
        role="button"
        tabIndex={c.status === 'done' ? 0 : -1}
        onClick={() => c.status === 'done' && onPick()}
        onKeyDown={(e) => { if (e.key === 'Enter' && c.status === 'done') onPick(); }}
        className="relative rounded-xl overflow-hidden transition-all"
        style={{
          aspectRatio: ratio,
          border: selected ? '3px solid var(--rosa)' : '1px solid var(--line)',
          backgroundColor: 'var(--bg)',
          cursor: c.status === 'done' ? 'pointer' : 'default',
          boxShadow: selected ? '0 4px 16px rgba(230,0,126,0.25)' : 'none',
          padding: 0,
        }}
      >
        {isLoading && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--viola)' }} />
            <span className="text-[10px]" style={{ color: 'var(--ink3)' }}>
              {c.status === 'generating' ? 'Genero…' : 'In coda'}
            </span>
          </div>
        )}
        {isFailed && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
            {retrying === c.id ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--viola)' }} />
                <span className="text-[9px] text-center" style={{ color: 'var(--ink3)' }}>Riprovo…</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5" style={{ color: '#ef4444' }} />
                <span className="text-[9px] text-center" style={{ color: 'var(--ink3)' }}>
                  Generazione fallita
                </span>
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); void retryOne(c); }}
                  className="text-[10px] font-bold px-3 py-1 rounded-lg text-white"
                  style={{ backgroundColor: 'var(--viola)', cursor: 'pointer' }}
                >
                  Riprova
                </span>
              </>
            )}
          </div>
        )}
        {c.status === 'done' && c.image_url && (
          <img
            src={c.image_url}
            alt={`${ROLE_LABELS[c.slide_role]} variante ${c.variant_index}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
        {selected && (
          <div
            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black"
            style={{ backgroundColor: 'var(--rosa)' }}
          >✓</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-black mb-1" style={{ color: 'var(--ink)' }}>
          {aLayout ? 'Scegli il tuo layout' : 'Scegli il tuo template'}
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--ink3)' }}>
          {aLayout
            ? 'Tre layout, ognuno con copertina, contenuto e chiusura. I testi sono un esempio: nei caroselli cambiano ogni volta.'
            : 'Tre varianti per ogni ruolo. Seleziona quella che ti rappresenta di piu.'}
          {generating && ' Le immagini appaiono man mano che vengono generate.'}
        </p>
        {stalledCount > 0 && !generating && (
          <p className="text-[12px] mt-2 p-2 rounded-lg" style={{ color: '#b45309', backgroundColor: 'rgba(245,158,11,0.1)' }}>
            {stalledCount === 1 ? '1 variante non è stata completata' : `${stalledCount} varianti non sono state completate`}:
            premi «Riprova» sulla variante, scegli tra quelle pronte, oppure usa «Rigenera tutto».
          </p>
        )}
        {generating && (
          <p className="text-[11px] mt-1" style={{ color: 'var(--ink3)' }}>
            Ci vogliono 1-2 minuti in tutto: puoi restare su questa pagina.
          </p>
        )}
      </div>

      {aLayout && LAYOUT_IDS.map((l) => {
        const celle = delLayout(l);
        if (celle.length === 0) return null;
        const scelto = celle.every((c) => selection[c.slide_role] === c.id);
        return (
          <div
            key={l}
            className="rounded-2xl p-3 transition-all"
            style={{
              border: scelto ? '2px solid var(--rosa)' : '1px solid var(--line)',
              backgroundColor: scelto ? 'rgba(230,0,126,0.04)' : 'transparent',
            }}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="text-[14px] font-black" style={{ color: 'var(--ink)' }}>
                  {LAYOUT_INFO[l].lettera} · {LAYOUT_INFO[l].nome}
                  {consigliato === l && (
                    <span
                      className="ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white align-middle"
                      style={{ backgroundColor: 'var(--viola)', letterSpacing: '0.4px' }}
                    >
                      Consigliato
                    </span>
                  )}
                </div>
                <div className="text-[12px]" style={{ color: 'var(--ink3)' }}>{LAYOUT_INFO[l].descrizione}</div>
              </div>
              <button
                onClick={() => scegliLayout(l)}
                disabled={!celle.every((c) => c.status === 'done')}
                className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-40"
                style={{
                  backgroundColor: scelto ? 'var(--rosa)' : 'var(--surface)',
                  color: scelto ? '#fff' : 'var(--ink)',
                  border: scelto ? 'none' : '1px solid var(--line)',
                  cursor: 'pointer',
                }}
              >
                {scelto ? 'Scelto ✓' : 'Scegli questo'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {celle.map((c) => cella(c, false, () => scegliLayout(l), '4 / 5'))}
            </div>
          </div>
        );
      })}

      {!aLayout && ROLES.map((role) => (
        <div key={role}>
          <div className="text-[11px] font-bold uppercase mb-2" style={{ color: 'var(--ink3)', letterSpacing: '0.6px' }}>
            {ROLE_LABELS[role]}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {byRole(role).map((c) => cella(c, selection[role] === c.id, () => onSelect(role, c.id), '1'))}
          </div>
        </div>
      ))}

      {/* Rigenera con feedback */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)' }}>
        {!showFeedback ? (
          <button
            onClick={() => setShowFeedback(true)}
            className="flex items-center gap-2 text-[12px] font-bold"
            style={{ color: 'var(--viola)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Non ti convince? Rigenera tutto con un feedback
          </button>
        ) : (
          <div className="space-y-2">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={aLayout
                ? 'Es: testi piu diretti, parla ai titolari degli studi, cita la prova gratuita…'
                : 'Es: piu minimale, meno decorazioni, sfondo sempre chiaro…'}
              rows={2}
              className="w-full text-[13px] p-3 rounded-xl"
              style={{ border: '1px solid var(--line)', backgroundColor: 'var(--surface)', resize: 'vertical' }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { onRegenerate(feedback); setShowFeedback(false); setFeedback(''); }}
                disabled={busy || generating}
                className="text-[12px] font-bold px-4 py-2 rounded-xl text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--viola)', border: 'none', cursor: 'pointer' }}
              >
                Rigenera tutto
              </button>
              <button
                onClick={() => setShowFeedback(false)}
                className="text-[12px] font-semibold px-4 py-2"
                style={{ color: 'var(--ink3)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onContinue}
        disabled={!allSelected || busy}
        className="w-full text-white text-[13px] font-black uppercase py-3.5 rounded-xl disabled:opacity-50"
        style={{ backgroundColor: 'var(--rosa)', border: 'none', cursor: allSelected ? 'pointer' : 'not-allowed', letterSpacing: '0.5px' }}
      >
        {allSelected ? 'Continua col riepilogo' : aLayout ? 'Scegli uno dei tre layout' : 'Seleziona una variante per ogni ruolo'}
      </button>
    </div>
  );
};

export default CandidateGridStep;
