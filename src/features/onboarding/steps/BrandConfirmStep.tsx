// Step 2: conferma del brand estratto (palette + lettura semantica).
// I campi a bassa confidenza sono evidenziati.
import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { PaletteResult } from '@/lib/brand/extractor.ts';
import type { BrandSemantics } from '@/lib/brand/artDirector.ts';

interface BrandConfirmStepProps {
  busy: boolean;
  palette: PaletteResult;
  semantics: BrandSemantics | null;
  onPaletteChange: (p: PaletteResult) => void;
  onConfirm: () => void;
}

const SWATCH_KEYS: Array<{ key: keyof PaletteResult; label: string }> = [
  { key: 'bg_a', label: 'Sfondo chiaro' },
  { key: 'bg_b', label: 'Sfondo scuro' },
  { key: 'accent', label: 'Accento' },
  { key: 'text_on_light', label: 'Testo su chiaro' },
  { key: 'text_on_dark', label: 'Testo su scuro' },
];

const BrandConfirmStep: React.FC<BrandConfirmStepProps> = ({
  busy, palette, semantics, onPaletteChange, onConfirm,
}) => {
  const lowConfidence = (semantics?.confidence ?? 0) < 0.5;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-black mb-1" style={{ color: 'var(--ink)' }}>
          Conferma l'identita del brand
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--ink3)' }}>
          Palette estratta dai tuoi materiali. Correggi quello che vuoi.
        </p>
      </div>

      {/* Palette editabile */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="text-[11px] font-bold uppercase mb-3" style={{ color: 'var(--ink3)', letterSpacing: '0.6px' }}>
          Palette
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {SWATCH_KEYS.map(({ key, label }) => (
            <label key={key} className="flex flex-col items-center gap-1.5 cursor-pointer">
              <input
                type="color"
                value={String(palette[key])}
                onChange={(e) => onPaletteChange({ ...palette, [key]: e.target.value })}
                style={{ width: 48, height: 48, borderRadius: 12, border: '1px solid var(--line)', cursor: 'pointer', padding: 0 }}
              />
              <span className="text-[10px] font-semibold text-center" style={{ color: 'var(--ink2)' }}>{label}</span>
              <span className="text-[9px] font-mono" style={{ color: 'var(--ink3)' }}>{String(palette[key])}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Lettura semantica */}
      {semantics && (
        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase" style={{ color: 'var(--ink3)', letterSpacing: '0.6px' }}>
              Stile rilevato dai tuoi post
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: lowConfidence ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.1)',
                color: lowConfidence ? '#b45309' : '#047857',
              }}
            >
              Confidenza {(semantics.confidence * 100).toFixed(0)}%
            </span>
          </div>
          {lowConfidence && (
            <div className="flex items-start gap-2 p-3 rounded-xl mb-3" style={{ backgroundColor: 'rgba(245,158,11,0.08)' }}>
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#b45309' }} />
              <p className="text-[11px]" style={{ color: 'var(--ink2)' }}>
                L'AI ha poche informazioni sul tuo stile: il risultato sara piu generico.
                Puoi comunque continuare, o tornare indietro e caricare piu post.
              </p>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-2 text-[12px]" style={{ color: 'var(--ink2)' }}>
            <div>Titoli: <strong style={{ color: 'var(--ink)' }}>{semantics.typography.title_character}</strong></div>
            <div>Peso: <strong style={{ color: 'var(--ink)' }}>{semantics.typography.title_weight}</strong></div>
            <div>Mood: <strong style={{ color: 'var(--ink)' }}>{semantics.visual_mood.join(', ') || 'non rilevato'}</strong></div>
            <div>Decorazione ricorrente: <strong style={{ color: 'var(--ink)' }}>{semantics.decoration_motif || 'nessuna'}</strong></div>
          </div>
        </div>
      )}

      <button
        onClick={onConfirm}
        disabled={busy}
        className="w-full text-white text-[13px] font-black uppercase py-3.5 rounded-xl disabled:opacity-50"
        style={{ backgroundColor: 'var(--viola)', border: 'none', cursor: busy ? 'wait' : 'pointer', letterSpacing: '0.5px' }}
      >
        {busy ? 'Genero i template… (30-90s)' : 'Genera i template'}
      </button>
    </div>
  );
};

export default BrandConfirmStep;
