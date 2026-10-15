import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sparkles, Plus, Loader2, Check } from 'lucide-react';
import {
  PROFESSIONS,
  detectProfession,
  getProfession,
  isProfessionId,
  type ProfessionId,
  type ProfessionSignals,
} from '@/lib/brand/profession';
import { useUserProfessions, cleanProfessionLabel } from '@/hooks/useUserProfessions';

const AUTO = '__auto__';
const NEW = 'altro';
const MINE = 'mia::';

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
  /** Lista personale condivisa col chiamante (es. la card Impostazioni), cosi resta allineata. */
  userProfessions?: ReturnType<typeof useUserProfessions>;
};

/**
 * Selettore della professione del brand. Di default il codice la riconosce
 * dai campi del brand kit e lo dice ("Rilevata: Nutrizionista"); l'utente puo
 * confermare, scegliere un'altra voce o scrivere la propria.
 *
 * Le professioni scritte a mano finiscono nella lista personale dell'account
 * (tabella user_professions) e da li vengono riproposte, solo a quell'utente.
 * Sul brand restano salvate come professione = 'altro' + professione_custom,
 * che e il caso gia gestito da tutta la pipeline di generazione.
 */
const ProfessionSelect: React.FC<Props> = ({ value, custom, signals, onChange, label = 'Professione', hint, userProfessions }) => {
  const detected = useMemo(() => detectProfession(signals), [signals]);
  const detectedProfile = detected ? getProfession(detected.id) : null;
  const ownList = useUserProfessions();
  const mine = userProfessions || ownList;
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const customLabel = cleanProfessionLabel(custom || '');
  const savedMatch = value === 'altro' && customLabel
    ? mine.items.find((p) => p.label.toLowerCase() === customLabel.toLowerCase())
    : undefined;

  // Valore mostrato nel menu: automatica, una predefinita, una delle mie, o "aggiungi".
  let selected: string = AUTO;
  if (value === 'altro') selected = savedMatch ? MINE + savedMatch.id : NEW;
  else if (isProfessionId(value)) selected = value;

  // Brand vecchi con un'etichetta scritta prima che esistesse la lista personale.
  const legacyCustom = value === 'altro' && customLabel && !savedMatch ? customLabel : '';

  const autoLabel = detectedProfile
    ? `Automatica · rilevata: ${detectedProfile.label}`
    : 'Automatica · la riconosco dai contenuti';

  const addAndSelect = async (raw: string) => {
    const clean = cleanProfessionLabel(raw);
    if (clean.length < 2) return;
    setAdding(true);
    try {
      const saved = await mine.add(clean);
      const final = saved || clean;
      onChange('altro', final);
      setDraft('');
      setJustAdded(final);
      setTimeout(() => setJustAdded(null), 2500);
    } finally {
      setAdding(false);
    }
  };

  const builtIn = PROFESSIONS.filter((p) => p.id !== 'altro');

  return (
    <div>
      <label className="block text-[10px] font-black uppercase mb-1.5" style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}>
        {label}
      </label>
      <div className="flex flex-col gap-2">
        <Select
          value={selected}
          onValueChange={(v) => {
            if (v === AUTO) onChange(null, '');
            else if (v === NEW) { setDraft(legacyCustom || ''); onChange('altro', legacyCustom || ''); }
            else if (v.startsWith(MINE)) {
              const item = mine.items.find((p) => MINE + p.id === v);
              if (item) onChange('altro', item.label);
            } else if (isProfessionId(v)) onChange(v, '');
          }}
        >
          <SelectTrigger className="h-9 text-xs w-full" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '9px' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={AUTO}>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" style={{ color: 'var(--viola)' }} />
                {autoLabel}
              </span>
            </SelectItem>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel className="text-[10px] uppercase" style={{ color: 'var(--ink3)' }}>Professioni</SelectLabel>
              {builtIn.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectGroup>
            {mine.items.length > 0 && (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase" style={{ color: 'var(--ink3)' }}>Le tue professioni</SelectLabel>
                  {mine.items.map((p) => (
                    <SelectItem key={p.id} value={MINE + p.id}>{p.label}</SelectItem>
                  ))}
                </SelectGroup>
              </>
            )}
            <SelectSeparator />
            <SelectItem value={NEW}>
              <span className="inline-flex items-center gap-1.5">
                <Plus className="h-3 w-3" style={{ color: 'var(--rosa)' }} />
                {legacyCustom ? `${legacyCustom} (da salvare nella lista)` : 'Non c\'è la mia: la scrivo io'}
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        {selected === NEW && (
          <div className="flex gap-1.5 w-full">
            <Input
              value={draft || legacyCustom}
              onChange={(e) => { setDraft(e.target.value); onChange('altro', e.target.value); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAndSelect(draft || legacyCustom); } }}
              onBlur={() => { const t = draft || legacyCustom; if (cleanProfessionLabel(t).length >= 2) addAndSelect(t); }}
              placeholder="Es. Terapista occupazionale"
              maxLength={60}
              className="h-9 text-xs flex-1"
              style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '9px' }}
            />
            <button
              type="button"
              onClick={() => addAndSelect(draft || legacyCustom)}
              disabled={adding || cleanProfessionLabel(draft || legacyCustom).length < 2}
              className="h-9 px-3 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 disabled:opacity-40"
              style={{ backgroundColor: 'var(--viola-dim)', color: 'var(--viola)', border: 'none', cursor: 'pointer' }}
            >
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Aggiungi
            </button>
          </div>
        )}
      </div>
      <p className="text-[11px] mt-1.5" style={{ color: justAdded ? '#047857' : 'var(--ink3)' }}>
        {justAdded ? (
          <span className="inline-flex items-center gap-1">
            <Check className="h-3 w-3" /> «{justAdded}» aggiunta alla tua lista: la ritrovi nel menu, solo nel tuo account.
          </span>
        ) : hint || (
          selected === AUTO
            ? (detectedProfile
              ? `Post, storie, reel e immagini useranno il linguaggio di: ${detectedProfile.label}. Se non è corretto, scegli tu dalla lista.`
              : 'Nome, descrizione e servizi non bastano ancora a capire il mestiere: scegli la professione dalla lista o scrivila tu.')
            : selected === NEW
              ? 'Scrivi la professione e premi Aggiungi: entra nella tua lista e la ritrovi nel menu.'
              : 'Decide lessico, esempi, immagini e template dei contenuti generati.'
        )}
      </p>
    </div>
  );
};

export default ProfessionSelect;
