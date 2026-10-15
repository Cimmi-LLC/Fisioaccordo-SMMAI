// Scala colori personalizzata dentro il passo "Conferma l'identita del brand".
// L'utente genera una scala da un colore base (o incolla i suoi codici) e
// clicca i colori per assegnarli ai 5 ruoli della palette del template.
import React, { useMemo, useState } from 'react';
import { Wand2, Plus, AlertTriangle } from 'lucide-react';
import type { PaletteResult } from '@/lib/brand/extractor.ts';
import { contrastRatio } from '@/lib/brand/extractor.ts';
import { generateScale, normalizeHex, paletteFromScale, parseHexList, type ScaleStop } from '@/lib/brand/colorScale.ts';

type RoleKey = 'bg_a' | 'bg_b' | 'accent' | 'text_on_light' | 'text_on_dark';

const ROLES: Array<{ key: RoleKey; label: string }> = [
  { key: 'bg_a', label: 'Sfondo chiaro' },
  { key: 'bg_b', label: 'Sfondo scuro' },
  { key: 'accent', label: 'Accento' },
  { key: 'text_on_light', label: 'Testo su chiaro' },
  { key: 'text_on_dark', label: 'Testo su scuro' },
];

interface Props {
  palette: PaletteResult;
  onPaletteChange: (p: PaletteResult) => void;
}

function mergeCandidates(fresh: string[], old: string[] | undefined): string[] {
  const out: string[] = [];
  for (const c of [...fresh, ...(old || [])]) if (c && out.indexOf(c) === -1) out.push(c);
  return out.slice(0, 40);
}

const Swatch: React.FC<{ hex: string; caption?: string; onClick: () => void; title: string }> = ({ hex, caption, onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className="flex flex-col items-center gap-1"
    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
  >
    <span style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: hex, border: '1px solid var(--line)', display: 'block' }} />
    {caption && <span className="text-[9px] font-mono" style={{ color: 'var(--ink3)' }}>{caption}</span>}
  </button>
);

const CustomScalePanel: React.FC<Props> = ({ palette, onPaletteChange }) => {
  const [base, setBase] = useState<string>(normalizeHex(String(palette.accent)) || '#554697');
  const [baseText, setBaseText] = useState<string>(base);
  const [scale, setScale] = useState<ScaleStop[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [pasted, setPasted] = useState<string[]>([]);
  const [target, setTarget] = useState<RoleKey>('accent');

  const extracted = useMemo(
    () => (palette.candidates || []).filter((c) => !scale.some((s) => s.hex === c) && pasted.indexOf(c) === -1).slice(0, 16),
    [palette.candidates, scale, pasted]
  );

  const assign = (hex: string) => {
    onPaletteChange({ ...palette, [target]: hex });
  };

  const buildScale = (hexInput: string) => {
    const hex = normalizeHex(hexInput);
    if (!hex) return;
    const next = generateScale(hex);
    setBase(hex);
    setBaseText(hex);
    setScale(next);
    onPaletteChange({ ...palette, candidates: mergeCandidates(next.map((s) => s.hex), palette.candidates) });
  };

  const applyWholeScale = () => {
    const p = paletteFromScale(scale);
    if (p) onPaletteChange({ ...palette, ...p });
  };

  const addPasted = () => {
    const list = parseHexList(pasteText);
    if (list.length === 0) return;
    const merged = mergeCandidates(list, pasted);
    setPasted(merged);
    setPasteText('');
    onPaletteChange({ ...palette, candidates: mergeCandidates(list, palette.candidates) });
  };

  const lightContrast = contrastRatio(String(palette.text_on_light), String(palette.bg_a));
  const darkContrast = contrastRatio(String(palette.text_on_dark), String(palette.bg_b));

  return (
    <div className="mt-5 pt-5 space-y-4" style={{ borderTop: '1px solid var(--line)' }}>
      <div>
        <div className="text-[11px] font-bold uppercase" style={{ color: 'var(--ink3)', letterSpacing: '0.6px' }}>
          Scala colori personalizzata
        </div>
        <p className="text-[11px] mt-1" style={{ color: 'var(--ink3)' }}>
          Parti da un tuo colore e genera tutte le tonalità, oppure incolla i tuoi codici. Poi clicca un colore per metterlo nel ruolo scelto.
        </p>
      </div>

      {/* Colore base */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          value={base}
          onChange={(e) => { setBase(e.target.value); setBaseText(e.target.value); }}
          style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid var(--line)', cursor: 'pointer', padding: 0 }}
        />
        <input
          value={baseText}
          onChange={(e) => setBaseText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buildScale(baseText); } }}
          placeholder="#0B7834"
          maxLength={7}
          className="h-9 w-28 px-3 text-xs font-mono rounded-lg"
          style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)' }}
        />
        <button
          type="button"
          onClick={() => buildScale(baseText || base)}
          disabled={!normalizeHex(baseText || base)}
          className="h-9 px-3 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 disabled:opacity-40"
          style={{ backgroundColor: 'var(--viola)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          <Wand2 className="h-3.5 w-3.5" /> Genera scala
        </button>
      </div>

      {/* Ruolo di destinazione */}
      <div>
        <div className="text-[10px] font-semibold mb-1.5" style={{ color: 'var(--ink2)' }}>Clicca un colore per metterlo su:</div>
        <div className="flex flex-wrap gap-1.5">
          {ROLES.map(({ key, label }) => {
            const active = target === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTarget(key)}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{
                  border: active ? '2px solid var(--viola)' : '1px solid var(--line)',
                  backgroundColor: active ? 'var(--viola-dim)' : 'var(--bg)',
                  color: active ? 'var(--viola)' : 'var(--ink2)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: String(palette[key]), border: '1px solid var(--line)', display: 'inline-block' }} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scala generata */}
      {scale.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {scale.map((s) => (
              <Swatch
                key={s.stop}
                hex={s.hex}
                caption={String(s.stop)}
                title={`${s.hex} → ${ROLES.find((r) => r.key === target)?.label}`}
                onClick={() => assign(s.hex)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={applyWholeScale}
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: 'var(--viola-dim)', color: 'var(--viola)', border: 'none', cursor: 'pointer' }}
          >
            Usa la scala per tutta la palette (sfondi, accento e testi leggibili)
          </button>
        </div>
      )}

      {/* Codici incollati */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPasted(); } }}
            placeholder="Incolla i tuoi codici: #0B7834, #92BB93, #F4F1EA"
            className="h-9 flex-1 min-w-[220px] px-3 text-xs rounded-lg"
            style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)' }}
          />
          <button
            type="button"
            onClick={addPasted}
            disabled={parseHexList(pasteText).length === 0}
            className="h-9 px-3 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 disabled:opacity-40"
            style={{ backgroundColor: 'var(--viola-dim)', color: 'var(--viola)', border: 'none', cursor: 'pointer' }}
          >
            <Plus className="h-3.5 w-3.5" /> Aggiungi
          </button>
        </div>
        {pasted.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pasted.map((hex) => (
              <Swatch key={hex} hex={hex} caption={hex} title={`${hex} → ${ROLES.find((r) => r.key === target)?.label}`} onClick={() => assign(hex)} />
            ))}
          </div>
        )}
      </div>

      {/* Colori estratti dai materiali */}
      {extracted.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold mb-1.5" style={{ color: 'var(--ink2)' }}>Colori trovati nei tuoi materiali</div>
          <div className="flex flex-wrap gap-2">
            {extracted.map((hex) => (
              <Swatch key={hex} hex={hex} title={`${hex} → ${ROLES.find((r) => r.key === target)?.label}`} onClick={() => assign(hex)} />
            ))}
          </div>
        </div>
      )}

      {(lightContrast < 4.5 || darkContrast < 4.5) && (
        <div className="flex items-start gap-2 p-3 rounded-xl" style={{ backgroundColor: 'rgba(245,158,11,0.08)' }}>
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#b45309' }} />
          <p className="text-[11px]" style={{ color: 'var(--ink2)' }}>
            {lightContrast < 4.5 && <>Il testo su sfondo chiaro si legge poco (contrasto {lightContrast.toFixed(1)}:1, minimo 4,5). </>}
            {darkContrast < 4.5 && <>Il testo su sfondo scuro si legge poco (contrasto {darkContrast.toFixed(1)}:1, minimo 4,5).</>}
          </p>
        </div>
      )}
    </div>
  );
};

export default CustomScalePanel;
