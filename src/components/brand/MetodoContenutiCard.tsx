// Campi del Brand Kit richiesti dal metodo Short Form Academy (Kallaway):
// le frasi testuali dei pazienti, la convinzione del settore da ribaltare
// (contrarian take) e il profilo di riferimento detestato. Vanno nei prompt
// di generazione: senza, il copy resta la parafrasi del sito.
//
// Fino al 18/11/2026 la card aveva un suo pulsante «Salva metodo», che
// salvava solo queste tre voci: chi lo premeva credeva di aver salvato anche
// Persona e Cose da non dire (stessa scheda), che restavano perse; e «Salva
// modifiche» della pagina riscriveva le frasi lette all'apertura. Ora i campi
// stanno nel modulo del Brand Kit e si salvano tutti col pulsante della pagina.

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Quote, X, Plus } from 'lucide-react';

const MAX_FRASI = 5;

type Campo = 'frasi_pazienti' | 'convinzione_da_ribaltare' | 'profilo_detestato';

const MetodoContenutiCard: React.FC<{
  frasi: string[];
  convinzione: string;
  profilo: string;
  onChange: (campo: Campo, valore: string[] | string) => void;
}> = ({ frasi, convinzione, profilo, onChange }) => {
  const [nuovaFrase, setNuovaFrase] = useState('');

  const addFrase = () => {
    const v = nuovaFrase.trim();
    if (!v || frasi.includes(v) || frasi.length >= MAX_FRASI) return;
    onChange('frasi_pazienti', [...frasi, v]);
    setNuovaFrase('');
  };

  return (
    <div className="rounded-2xl p-6 space-y-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
      <div className="flex items-center gap-2">
        <Quote className="h-4 w-4" style={{ color: 'var(--ink3)' }} />
        <h2 className="text-lg font-black" style={{ color: 'var(--ink)' }}>Le parole che fanno il copy</h2>
      </div>
      <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>
        Senza questi campi i contenuti ripetono il sito. Con questi parlano come i tuoi pazienti.
      </p>

          <div>
            <label className="text-[10px] font-black uppercase" style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}>
              Le frasi dei tuoi pazienti (come le dicono loro, parola per parola)
            </label>
            <p className="text-[11px] mb-2" style={{ color: 'var(--ink3)' }}>
              es. «mi sveglio già stanco», «ho provato di tutto», «mi hanno detto di conviverci». Almeno 3.
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {frasi.map((f, i) => (
                <Badge key={i} variant="secondary" className="text-[11px] pl-2 pr-1 py-0.5 gap-1">
                  «{f}»
                  <button onClick={() => onChange('frasi_pazienti', frasi.filter((_, j) => j !== i))} className="hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-1.5">
              <Input
                value={nuovaFrase}
                onChange={e => setNuovaFrase(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFrase(); } }}
                onBlur={() => { if (nuovaFrase.trim()) addFrase(); }}
                placeholder="Scrivi una frase del paziente"
                className="text-xs h-8"
                style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '8px' }}
              />
              <button onClick={addFrase} disabled={!nuovaFrase.trim() || frasi.length >= MAX_FRASI} className="px-2 h-8 rounded-lg text-xs font-bold disabled:opacity-30" style={{ backgroundColor: 'var(--viola-dim)', color: 'var(--viola)', border: 'none', cursor: 'pointer' }}>
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase" style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}>
              La convinzione del settore da ribaltare
            </label>
            <p className="text-[11px] mb-2" style={{ color: 'var(--ink3)' }}>
              Cosa crede la gente che tu sai essere sbagliato (es. «il mal di schiena si cura col riposo»).
            </p>
            <Input value={convinzione} onChange={e => onChange('convinzione_da_ribaltare', e.target.value)} className="text-sm" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9 }} />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase" style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}>
              Il profilo da cui vuoi distinguerti
            </label>
            <p className="text-[11px] mb-2" style={{ color: 'var(--ink3)' }}>
              Il tipo di profilo che detesti e a cui NON vuoi somigliare (es. «il collega che posta frasi motivazionali con foto stock»).
            </p>
            <Input value={profilo} onChange={e => onChange('profilo_detestato', e.target.value)} className="text-sm" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9 }} />
          </div>

    </div>
  );
};

export default MetodoContenutiCard;
