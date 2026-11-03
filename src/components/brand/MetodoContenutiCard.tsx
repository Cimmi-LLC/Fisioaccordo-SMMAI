// Campi del Brand Kit richiesti dal metodo Short Form Academy (Kallaway):
// le frasi testuali dei pazienti, la convinzione del settore da ribaltare
// (contrarian take) e il profilo di riferimento detestato. Vanno nei prompt
// di generazione: senza, il copy resta la parafrasi del sito.
//
// Card con salvataggio proprio (stesso schema di ImageModelCard): se la
// migrazione 20261103150000 non è ancora applicata, fallisce solo questa
// card con un messaggio chiaro, non tutto il Brand Kit.

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Quote, X, Plus } from 'lucide-react';

const MAX_FRASI = 5;

const MetodoContenutiCard: React.FC<{ brandId: string | null }> = ({ brandId }) => {
  const { toast } = useToast();
  const [frasi, setFrasi] = useState<string[]>([]);
  const [nuovaFrase, setNuovaFrase] = useState('');
  const [convinzione, setConvinzione] = useState('');
  const [profilo, setProfilo] = useState('');
  const [nonDisponibile, setNonDisponibile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!brandId) return;
    (async () => {
      const { data, error } = await (supabase as any)
        .from('brands')
        .select('frasi_pazienti, convinzione_da_ribaltare, profilo_detestato')
        .eq('id', brandId)
        .maybeSingle();
      if (error) { setNonDisponibile(true); return; }
      setFrasi(Array.isArray(data?.frasi_pazienti) ? data.frasi_pazienti : []);
      setConvinzione(data?.convinzione_da_ribaltare || '');
      setProfilo(data?.profilo_detestato || '');
    })();
  }, [brandId]);

  const addFrase = () => {
    const v = nuovaFrase.trim();
    if (!v || frasi.includes(v) || frasi.length >= MAX_FRASI) return;
    setFrasi([...frasi, v]);
    setNuovaFrase('');
    setDirty(true);
  };

  const save = async () => {
    if (!brandId) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('brands')
        .update({
          frasi_pazienti: frasi,
          convinzione_da_ribaltare: convinzione.trim(),
          profilo_detestato: profilo.trim(),
        })
        .eq('id', brandId);
      if (error) throw error;
      setDirty(false);
      toast({ title: 'Metodo salvato', description: 'Questi campi entrano nei prossimi post, storie e script.' });
    } catch (e) {
      toast({
        title: 'Non salvato',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
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

      {nonDisponibile ? (
        <p className="text-[12px] font-semibold" style={{ color: '#b45309' }}>
          Questi campi non sono ancora attivi sul database: serve la migrazione del 03/11 (brand_kit_metodo_e_foto).
        </p>
      ) : (
        <>
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
                  <button onClick={() => { setFrasi(frasi.filter((_, j) => j !== i)); setDirty(true); }} className="hover:text-red-500">
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
            <Input value={convinzione} onChange={e => { setConvinzione(e.target.value); setDirty(true); }} className="text-sm" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9 }} />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase" style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}>
              Il profilo da cui vuoi distinguerti
            </label>
            <p className="text-[11px] mb-2" style={{ color: 'var(--ink3)' }}>
              Il tipo di profilo che detesti e a cui NON vuoi somigliare (es. «il collega che posta frasi motivazionali con foto stock»).
            </p>
            <Input value={profilo} onChange={e => { setProfilo(e.target.value); setDirty(true); }} className="text-sm" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9 }} />
          </div>

          <button
            onClick={save}
            disabled={saving || !dirty || !brandId}
            className="text-white text-[12px] font-black uppercase px-6 py-2.5 rounded-xl disabled:opacity-40"
            style={{ backgroundColor: 'var(--rosa)', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin inline" /> : 'Salva metodo'}
          </button>
        </>
      )}
    </div>
  );
};

export default MetodoContenutiCard;
