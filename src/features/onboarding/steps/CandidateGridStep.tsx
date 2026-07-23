// Step 3: griglia 3x3 dei candidati. Selezione radio per ruolo,
// aggiornamento progressivo (Realtime + polling), rigenerazione con feedback.
import React, { useState } from 'react';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import type { TemplateCandidate } from '../hooks/useTemplateCandidates.ts';
import type { SlideRole } from '@/lib/brand/archetypes.ts';

interface CandidateGridStepProps {
  busy: boolean;
  candidates: TemplateCandidate[];
  selection: Partial<Record<SlideRole, string>>;
  onSelect: (role: SlideRole, candidateId: string) => void;
  onRegenerate: (feedback: string) => void;
  onContinue: () => void;
}

const ROLE_LABELS: Record<SlideRole, string> = {
  cover: 'Copertina',
  content: 'Contenuto',
  cta: 'Chiusura (CTA)',
};

const ROLES: SlideRole[] = ['cover', 'content', 'cta'];

const CandidateGridStep: React.FC<CandidateGridStepProps> = ({
  busy, candidates, selection, onSelect, onRegenerate, onContinue,
}) => {
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  const byRole = (role: SlideRole) =>
    candidates.filter((c) => c.slide_role === role).sort((a, b) => a.variant_index - b.variant_index);

  const allSelected = ROLES.every((r) => !!selection[r]);
  const generating = candidates.some((c) => c.status === 'pending' || c.status === 'generating');

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-black mb-1" style={{ color: 'var(--ink)' }}>
          Scegli il tuo template
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--ink3)' }}>
          Tre varianti per ogni ruolo. Seleziona quella che ti rappresenta di piu.
          {generating && ' Le immagini appaiono man mano che vengono generate.'}
        </p>
      </div>

      {ROLES.map((role) => (
        <div key={role}>
          <div className="text-[11px] font-bold uppercase mb-2" style={{ color: 'var(--ink3)', letterSpacing: '0.6px' }}>
            {ROLE_LABELS[role]}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {byRole(role).map((c) => {
              const selected = selection[role] === c.id;
              const isLoading = c.status === 'pending' || c.status === 'generating';
              const isFailed = c.status === 'failed';
              return (
                <button
                  key={c.id}
                  onClick={() => c.status === 'done' && onSelect(role, c.id)}
                  disabled={c.status !== 'done'}
                  className="relative rounded-xl overflow-hidden transition-all"
                  style={{
                    aspectRatio: '1',
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
                      <AlertCircle className="h-5 w-5" style={{ color: '#ef4444' }} />
                      <span className="text-[9px] text-center" style={{ color: 'var(--ink3)' }}>
                        Generazione fallita
                      </span>
                    </div>
                  )}
                  {c.status === 'done' && c.image_url && (
                    <img
                      src={c.image_url}
                      alt={`${role} variante ${c.variant_index}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  )}
                  {selected && (
                    <div
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black"
                      style={{ backgroundColor: 'var(--rosa)' }}
                    >✓</div>
                  )}
                </button>
              );
            })}
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
              placeholder="Es: piu minimale, meno decorazioni, sfondo sempre chiaro…"
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
        {allSelected ? 'Continua col riepilogo' : 'Seleziona una variante per ogni ruolo'}
      </button>
    </div>
  );
};

export default CandidateGridStep;
