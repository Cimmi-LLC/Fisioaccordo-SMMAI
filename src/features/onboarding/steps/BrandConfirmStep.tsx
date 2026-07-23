// Step 2: conferma del brand estratto (palette + lettura semantica) e
// scelta dello stile visual delle slide content (icone vs realistiche).
// I campi a bassa confidenza sono evidenziati.
import React from 'react';
import { AlertCircle, PenTool, Camera, Square, RectangleVertical } from 'lucide-react';
import type { PaletteResult } from '@/lib/brand/extractor.ts';
import type { BrandSemantics } from '@/lib/brand/artDirector.ts';
import type { VisualStyle, SlideFormat } from '@/lib/brand/genome.ts';

interface BrandConfirmStepProps {
  busy: boolean;
  palette: PaletteResult;
  semantics: BrandSemantics | null;
  visualStyle: VisualStyle;
  format: SlideFormat;
  onPaletteChange: (p: PaletteResult) => void;
  onVisualStyleChange: (s: VisualStyle) => void;
  onFormatChange: (f: SlideFormat) => void;
  onConfirm: () => void;
}

const FORMAT_OPTIONS: Array<{
  value: SlideFormat;
  label: string;
  description: string;
  Icon: typeof Square;
}> = [
  {
    value: '4:5',
    label: 'Verticale 4:5 (consigliato)',
    description: '1080x1350: occupa piu schermo nel feed, il formato che performa meglio.',
    Icon: RectangleVertical,
  },
  {
    value: '1:1',
    label: 'Quadrato 1:1',
    description: '1080x1080: il formato classico dei caroselli.',
    Icon: Square,
  },
];

const VISUAL_STYLE_OPTIONS: Array<{
  value: VisualStyle;
  label: string;
  description: string;
  Icon: typeof PenTool;
}> = [
  {
    value: 'flat_icon',
    label: 'Icone e illustrazioni',
    description: 'Grafica piatta e pulita nel colore del brand. Stile editoriale, sempre coerente.',
    Icon: PenTool,
  },
  {
    value: 'realistic',
    label: 'Immagini realistiche',
    description: 'Immagini in stile fotografico scontornate sullo sfondo. Piu concrete e dirette.',
    Icon: Camera,
  },
];

const SWATCH_KEYS: Array<{ key: keyof PaletteResult; label: string }> = [
  { key: 'bg_a', label: 'Sfondo chiaro' },
  { key: 'bg_b', label: 'Sfondo scuro' },
  { key: 'accent', label: 'Accento' },
  { key: 'text_on_light', label: 'Testo su chiaro' },
  { key: 'text_on_dark', label: 'Testo su scuro' },
];

const BrandConfirmStep: React.FC<BrandConfirmStepProps> = ({
  busy, palette, semantics, visualStyle, format, onPaletteChange, onVisualStyleChange, onFormatChange, onConfirm,
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

      {/* Stile visual delle slide content */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="text-[11px] font-bold uppercase mb-1" style={{ color: 'var(--ink3)', letterSpacing: '0.6px' }}>
          Immagini nelle slide
        </div>
        <p className="text-[11px] mb-3" style={{ color: 'var(--ink3)' }}>
          Ogni slide di contenuto avra un visual che spiega l'argomento. Scegli lo stile.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {VISUAL_STYLE_OPTIONS.map(({ value, label, description, Icon }) => {
            const active = visualStyle === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onVisualStyleChange(value)}
                className="text-left rounded-xl p-4 transition-all"
                style={{
                  border: active ? '2px solid var(--viola)' : '1px solid var(--line)',
                  backgroundColor: active ? 'var(--viola-dim)' : 'var(--bg)',
                  cursor: 'pointer',
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="h-4 w-4" style={{ color: active ? 'var(--viola)' : 'var(--ink3)' }} />
                  <span className="text-[13px] font-black" style={{ color: active ? 'var(--viola)' : 'var(--ink)' }}>
                    {label}
                  </span>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--ink2)' }}>{description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Formato slide */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="text-[11px] font-bold uppercase mb-3" style={{ color: 'var(--ink3)', letterSpacing: '0.6px' }}>
          Formato slide
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {FORMAT_OPTIONS.map(({ value, label, description, Icon }) => {
            const active = format === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onFormatChange(value)}
                className="text-left rounded-xl p-4 transition-all"
                style={{
                  border: active ? '2px solid var(--viola)' : '1px solid var(--line)',
                  backgroundColor: active ? 'var(--viola-dim)' : 'var(--bg)',
                  cursor: 'pointer',
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="h-4 w-4" style={{ color: active ? 'var(--viola)' : 'var(--ink3)' }} />
                  <span className="text-[13px] font-black" style={{ color: active ? 'var(--viola)' : 'var(--ink)' }}>
                    {label}
                  </span>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--ink2)' }}>{description}</p>
              </button>
            );
          })}
        </div>
      </div>

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
