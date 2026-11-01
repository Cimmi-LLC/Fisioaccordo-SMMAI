import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROFESSIONS } from '@/lib/brand/profession';
import { OUTLIER_DA_STUDIARE, OUTLIER_FORTE, type Paese, type Piattaforma } from '@/lib/brand/virali';
import { urlCopertina } from '@/services/virali';
import { Film } from 'lucide-react';

export const OPZIONI_PROFESSIONE = PROFESSIONS.filter((p) => p.id !== 'altro').map((p) => ({ id: p.id as string, label: p.label }));

export function etichettaProfessione(id: string): string {
  return OPZIONI_PROFESSIONE.find((p) => p.id === id)?.label || id;
}

export function etichettaPaese(p: Paese | string): string {
  return p === 'IT' ? 'Italia' : p === 'US' ? 'USA' : 'Estero';
}

export function etichettaPiattaforma(p: Piattaforma | string): string {
  return p === 'tiktok' ? 'TikTok' : 'Instagram';
}

export function dataBreve(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: '2-digit' });
}

export const Copertina: React.FC<{ percorso: string | null; alt: string; className?: string }> = ({ percorso, alt, className }) => {
  const url = urlCopertina(percorso);
  if (!url) {
    return (
      <div className={`flex items-center justify-center ${className || ''}`} style={{ backgroundColor: 'var(--viola-dim)' }}>
        <Film className="h-8 w-8" style={{ color: 'var(--viola)' }} />
      </div>
    );
  }
  return <img src={url} alt={alt} loading="lazy" className={`object-cover ${className || ''}`} />;
};

/** «×12» sulla copertina: rosa dal 10x (outlier forte), viola dal 5x. */
export const BadgeOutlier: React.FC<{ valore: number | null }> = ({ valore }) => {
  if (valore === null || valore === undefined) return null;
  const colore = valore >= OUTLIER_FORTE ? 'var(--rosa)' : valore >= OUTLIER_DA_STUDIARE ? 'var(--viola)' : 'rgba(0,0,0,0.55)';
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-black text-white"
      style={{ backgroundColor: colore }}
      title={`${String(valore).replace('.', ',')} volte la media del canale`}
    >
      ×{String(valore).replace('.', ',')}
    </span>
  );
};

export type Opzione = { id: string; label: string };

export const Filtro: React.FC<{
  etichetta: string;
  valore: string;
  opzioni: Opzione[];
  onChange: (v: string) => void;
  larghezza?: string;
}> = ({ etichetta, valore, opzioni, onChange, larghezza }) => (
  <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: 'var(--ink3)' }}>
    {etichetta}
    <Select value={valore} onValueChange={onChange}>
      <SelectTrigger className={larghezza || 'w-40'}><SelectValue /></SelectTrigger>
      <SelectContent>
        {opzioni.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  </label>
);
