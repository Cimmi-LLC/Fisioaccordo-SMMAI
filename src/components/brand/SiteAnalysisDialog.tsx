// Risultato della rianalisi di un sito: per ogni sezione mostra il valore
// attuale e quello trovato, e l'utente spunta cosa portare nel Brand Kit.
// Niente viene salvato qui: i dati scelti vanno nel modulo, e si salvano
// solo con "Salva modifiche" (che prima conserva una versione).
import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowRight } from 'lucide-react';
import type { BrandProfile } from '@/types/brand';
import type { SiteAnalysis } from '@/services/siteAnalysis';
import { preview } from '@/lib/brandSnapshot';

type SectionKey = 'colori' | 'nome_business' | 'descrizione' | 'servizi' | 'target_pazienti' | 'vantaggi_competitivi'
  | 'mission' | 'temi_chiave' | 'cta_suggerite' | 'categorie';

const SECTIONS: Array<{ key: SectionKey; label: string }> = [
  { key: 'colori', label: 'Colori' },
  { key: 'nome_business', label: 'Nome' },
  { key: 'descrizione', label: 'Descrizione' },
  { key: 'servizi', label: 'Servizi' },
  { key: 'target_pazienti', label: 'Target' },
  { key: 'vantaggi_competitivi', label: 'Vantaggi competitivi' },
  { key: 'mission', label: 'Mission' },
  { key: 'temi_chiave', label: 'Temi chiave' },
  { key: 'cta_suggerite', label: 'Call to action' },
  { key: 'categorie', label: 'Categorie' },
];

const HEX = /^#[0-9a-f]{6}$/i;
const isEmpty = (v: unknown) => v == null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === '');

interface Props {
  result: SiteAnalysis | null;
  current: BrandProfile;
  onCancel: () => void;
  /** Applica al modulo le sezioni scelte. */
  onApply: (patch: Partial<BrandProfile>, chosen: string[]) => void;
}

const Swatches: React.FC<{ colors: string[] }> = ({ colors }) => (
  <span className="inline-flex gap-1">
    {colors.map((c, i) => (
      <span key={i} title={c || 'non trovato'} style={{ width: 18, height: 18, borderRadius: 5, backgroundColor: HEX.test(c) ? c : 'transparent', border: HEX.test(c) ? '1px solid var(--line)' : '1px dashed var(--line)', display: 'inline-block' }} />
    ))}
  </span>
);

const SiteAnalysisDialog: React.FC<Props> = ({ result, current, onCancel, onApply }) => {
  const proposed = useMemo(() => {
    if (!result) return {} as Record<SectionKey, unknown>;
    const p = result.profile;
    return {
      colori: [p.colore_primario, p.colore_secondario, p.colore_terziario],
      nome_business: p.nome_business, descrizione: p.descrizione, servizi: p.servizi,
      target_pazienti: p.target_pazienti, vantaggi_competitivi: p.vantaggi_competitivi, mission: p.mission,
      temi_chiave: p.temi_chiave, cta_suggerite: p.cta_suggerite, categorie: p.categorie,
    } as Record<SectionKey, unknown>;
  }, [result]);

  const currentValues = useMemo(() => ({
    colori: [current.colore_primario, current.colore_secondario, current.colore_terziario],
    nome_business: current.nome_business, descrizione: current.descrizione, servizi: current.servizi,
    target_pazienti: current.target_pazienti, vantaggi_competitivi: current.vantaggi_competitivi, mission: current.mission,
    temi_chiave: current.temi_chiave, cta_suggerite: current.cta_suggerite, categorie: current.categorie,
  } as Record<SectionKey, unknown>), [current]);

  // Sezioni proponibili: c'e un valore nuovo ed e diverso dall'attuale.
  const available = useMemo(() => (result ? SECTIONS : []).filter(({ key }) => {
    const v = proposed[key];
    if (key === 'colori') return Array.isArray(v) && v.some((c) => HEX.test(c || '')) && JSON.stringify(v) !== JSON.stringify(currentValues.colori);
    return !isEmpty(v) && JSON.stringify(v) !== JSON.stringify(currentValues[key]);
  }), [result, proposed, currentValues]);

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  useEffect(() => {
    // Preselezione prudente: colori, e le sezioni oggi vuote. Il nome mai.
    const init: Record<string, boolean> = {};
    for (const { key } of available) init[key] = key === 'colori' || (key !== 'nome_business' && isEmpty(currentValues[key]));
    setChecked(init);
  }, [available, currentValues]);

  if (!result) return null;
  const chosen = available.filter(({ key }) => checked[key]).map(({ key }) => key);

  const apply = () => {
    const p = result.profile;
    const patch: Partial<BrandProfile> = {};
    for (const key of chosen) {
      if (key === 'colori') {
        if (HEX.test(p.colore_primario || '')) patch.colore_primario = p.colore_primario;
        if (HEX.test(p.colore_secondario || '')) patch.colore_secondario = p.colore_secondario;
        if (HEX.test(p.colore_terziario || '')) patch.colore_terziario = p.colore_terziario;
      } else {
        (patch as Record<string, unknown>)[key] = p[key];
      }
    }
    onApply(patch, chosen.map((k) => SECTIONS.find((s) => s.key === k)!.label));
  };

  return (
    <Dialog open={!!result} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--ink)', fontWeight: 800 }}>Cosa ho trovato su {result.url.replace(/^https?:\/\//, '')}</DialogTitle>
          <DialogDescription style={{ color: 'var(--ink3)' }}>
            Spunta cosa portare nel Brand Kit. Niente viene salvato finché non premi "Salva modifiche", e la versione attuale resta nello storico.
          </DialogDescription>
        </DialogHeader>

        {result.siteColors.length === 0 && (
          <p className="text-[11px] p-2 rounded-lg" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#b45309' }}>
            Il sito non permette di leggerne la grafica: i colori non sono stati trovati e restano quelli attuali.
          </p>
        )}

        {available.length === 0 ? (
          <p className="text-[13px] py-4 text-center" style={{ color: 'var(--ink2)' }}>Nessuna differenza rispetto al Brand Kit attuale.</p>
        ) : (
          <div className="space-y-2" data-testid="analysis-sections">
            <div className="flex justify-end gap-3 text-[11px]">
              <button type="button" onClick={() => setChecked(Object.fromEntries(available.map(({ key }) => [key, true])))} style={{ color: 'var(--viola)', background: 'transparent', border: 'none', cursor: 'pointer' }}>Seleziona tutto</button>
              <button type="button" onClick={() => setChecked({})} style={{ color: 'var(--ink3)', background: 'transparent', border: 'none', cursor: 'pointer' }}>Nessuno</button>
            </div>
            {available.map(({ key, label }) => (
              <label key={key} className="flex gap-3 p-3 rounded-xl cursor-pointer" data-section={key}
                style={{ border: checked[key] ? '1.5px solid var(--viola)' : '1px solid var(--line)', backgroundColor: checked[key] ? 'var(--viola-dim)' : 'var(--bg)' }}>
                <input type="checkbox" checked={!!checked[key]} onChange={(e) => setChecked((c) => ({ ...c, [key]: e.target.checked }))} className="mt-1 h-4 w-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-black uppercase mb-1" style={{ color: 'var(--ink2)', letterSpacing: '0.5px' }}>{label}</div>
                  {key === 'colori' ? (
                    <div className="flex items-center gap-2"><Swatches colors={currentValues.colori as string[]} /><ArrowRight className="h-3.5 w-3.5" style={{ color: 'var(--ink3)' }} /><Swatches colors={proposed.colori as string[]} /></div>
                  ) : (
                    <div className="text-[12px] space-y-1">
                      <div style={{ color: 'var(--ink3)' }}><span className="font-semibold">Ora:</span> {preview(currentValues[key], 120)}</div>
                      <div style={{ color: 'var(--ink)' }}><span className="font-semibold">Dal sito:</span> {preview(proposed[key], 160)}</div>
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
          <button type="button" onClick={onCancel}
            className="flex-1 text-[12px] font-bold uppercase py-3 rounded-xl"
            style={{ backgroundColor: 'transparent', color: 'var(--ink2)', border: '1px solid var(--line)', cursor: 'pointer' }}>
            Annulla
          </button>
          <button type="button" onClick={apply} disabled={chosen.length === 0}
            className="flex-1 text-white text-[12px] font-black uppercase py-3 rounded-xl disabled:opacity-40"
            style={{ backgroundColor: 'var(--rosa)', border: 'none', cursor: 'pointer' }}>
            Porta nel Brand Kit ({chosen.length})
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SiteAnalysisDialog;
