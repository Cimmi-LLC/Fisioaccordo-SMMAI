import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles } from 'lucide-react';
import {
  PROFESSIONS,
  detectProfession,
  getProfession,
  isProfessionId,
  type ProfessionId,
  type ProfessionSignals,
} from '@/lib/brand/profession';

const AUTO = '__auto__';

type Props = {
  /** Slug scelto dall'utente; null = rilevamento automatico. */
  value: ProfessionId | null | undefined;
  /** Etichetta libera quando value = 'altro'. */
  custom: string | undefined;
  /** Campi del brand su cui rilevare la professione in automatico. */
  signals: ProfessionSignals;
  onChange: (value: ProfessionId | null, custom: string) => void;
  /** Stile compatto per l'onboarding (etichetta maiuscola piccola). */
  label?: string;
  hint?: string;
};

/**
 * Selettore della professione del brand. Di default il codice la riconosce
 * dai campi del brand kit e lo dice ("Rilevata: Nutrizionista"); l'utente puo
 * confermare, scegliere un'altra voce o scrivere la propria con "Altro".
 */
const ProfessionSelect: React.FC<Props> = ({ value, custom, signals, onChange, label = 'Professione', hint }) => {
  const detected = useMemo(() => detectProfession(signals), [signals]);
  const detectedProfile = detected ? getProfession(detected.id) : null;
  const selected = isProfessionId(value) ? value : AUTO;

  const autoLabel = detectedProfile
    ? `Automatica · rilevata: ${detectedProfile.label}`
    : 'Automatica · la riconosco dai contenuti';

  return (
    <div>
      <label className="block text-[10px] font-black uppercase mb-1.5" style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}>
        {label}
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <Select
          value={selected}
          onValueChange={(v) => {
            if (v === AUTO) onChange(null, custom || '');
            else if (isProfessionId(v)) onChange(v, v === 'altro' ? (custom || '') : '');
          }}
        >
          <SelectTrigger className="h-9 text-xs flex-1" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '9px' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={AUTO}>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" style={{ color: 'var(--viola)' }} />
                {autoLabel}
              </span>
            </SelectItem>
            {PROFESSIONS.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected === 'altro' && (
          <Input
            value={custom || ''}
            onChange={(e) => onChange('altro', e.target.value)}
            placeholder="Es. Terapista occupazionale"
            maxLength={60}
            className="h-9 text-xs sm:w-56"
            style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '9px' }}
          />
        )}
      </div>
      <p className="text-[11px] mt-1.5" style={{ color: 'var(--ink3)' }}>
        {hint || (
          selected === AUTO
            ? (detectedProfile
              ? `Post, storie, reel e immagini useranno il linguaggio di: ${detectedProfile.label}. Se non è corretto, scegli tu dalla lista.`
              : 'Nome, descrizione e servizi non bastano ancora a capire il mestiere: scegli la professione dalla lista o completa i campi.')
            : 'Decide lessico, esempi, immagini e template dei contenuti generati.'
        )}
      </p>
    </div>
  );
};

export default ProfessionSelect;
