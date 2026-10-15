import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Loader2, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { useToast } from '@/hooks/use-toast';
import { useUserProfessions } from '@/hooks/useUserProfessions';
import ProfessionSelect from '@/components/brand/ProfessionSelect';
import { isProfessionId, type ProfessionId } from '@/lib/brand/profession';

/**
 * Impostazioni: professione dello studio attivo. Stesso selettore del Brand
 * Kit, con salvataggio verificato (rilegge la riga dopo l'update) e la
 * gestione delle professioni personali dell'account.
 */
const ProfessionCard: React.FC = () => {
  const { activeBrand, activeBrandId, reload } = useActiveBrand();
  const { toast } = useToast();
  const mine = useUserProfessions();
  const [value, setValue] = useState<ProfessionId | null>(null);
  const [custom, setCustom] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const b = activeBrand as any;

  useEffect(() => {
    setValue(isProfessionId(b?.professione) ? b.professione : null);
    setCustom(b?.professione_custom || '');
    setDirty(false);
  }, [b?.id, b?.professione, b?.professione_custom]);

  const signals = useMemo(() => ({
    nome_business: b?.nome_business,
    descrizione: b?.descrizione,
    categorie: b?.categorie,
    servizi: b?.servizi,
    target_pazienti: b?.target_pazienti,
    temi_chiave: b?.temi_chiave,
    mission: b?.mission,
    identita_core: b?.identita_core,
    website_url: b?.website_url,
  }), [b]);

  const save = async () => {
    if (!activeBrandId) {
      toast({ title: 'Nessuno studio attivo', description: 'Seleziona prima uno studio.', variant: 'destructive' });
      return;
    }
    if (value === 'altro' && custom.trim().length < 2) {
      toast({ title: 'Scrivi la professione', description: 'Almeno 2 lettere.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        professione: value,
        professione_custom: value === 'altro' ? custom.trim() : '',
      };
      const { error } = await (supabase as any).from('brands').update(payload).eq('id', activeBrandId);
      if (error) throw error;
      // Verifica: rileggo dal database, non mi fido del solo click.
      const { data: check, error: readErr } = await (supabase as any)
        .from('brands').select('professione, professione_custom').eq('id', activeBrandId).single();
      if (readErr) throw readErr;
      const ok = (check?.professione ?? null) === payload.professione
        && (check?.professione_custom || '') === payload.professione_custom;
      if (!ok) throw new Error('Il salvataggio non risulta nel database. Riprova.');
      setDirty(false);
      toast({ title: 'Professione salvata', description: 'Verificata nel database: i prossimi contenuti useranno questo linguaggio.' });
      reload();
    } catch (e: any) {
      toast({ title: 'Errore nel salvataggio', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="panel-card">
      <CardHeader style={{ padding: '22px 24px', borderBottom: '1px solid var(--line)' }}>
        <CardTitle className="flex items-center gap-2" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
          <Briefcase className="h-4 w-4" style={{ color: 'var(--viola)' }} />
          Professione
        </CardTitle>
      </CardHeader>
      <CardContent style={{ padding: '22px 24px' }} className="space-y-4">
        <p className="text-xs" style={{ color: 'var(--ink3)' }}>
          Scegli il mestiere di questo studio. Se non è in lista, scrivilo: lo aggiungiamo alla tua lista personale.
        </p>

        <ProfessionSelect
          label={b?.nome_business ? `Professione di ${b.nome_business}` : 'Professione'}
          value={value}
          custom={custom}
          signals={signals}
          onChange={(v, c) => { setValue(v); setCustom(c); setDirty(true); }}
          userProfessions={mine}
        />

        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 text-[12px] font-bold uppercase px-4 py-2.5 rounded-lg transition-all disabled:opacity-40"
          style={{ backgroundColor: 'var(--rosa)', color: '#fff', border: 'none', cursor: dirty && !saving ? 'pointer' : 'default', letterSpacing: '0.5px' }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salva professione
        </button>

        {mine.items.length > 0 && (
          <div className="pt-3" style={{ borderTop: '1px solid var(--line)' }}>
            <p className="text-[10px] font-black uppercase mb-2" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
              Le tue professioni personalizzate
            </p>
            <div className="flex flex-wrap gap-1.5">
              {mine.items.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 text-[11px] font-medium pl-2.5 pr-1 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--viola-dim)', color: 'var(--viola)' }}
                >
                  {p.label}
                  <button
                    type="button"
                    title="Togli dalla lista"
                    onClick={async () => {
                      const ok = await mine.remove(p.id);
                      toast(ok
                        ? { title: `«${p.label}» tolta dalla lista`, description: 'Gli studi che la usano la mantengono finché non la cambi.' }
                        : { title: 'Non riesco a toglierla', variant: 'destructive' });
                    }}
                    className="rounded-full p-0.5 hover:bg-white/60"
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--viola)' }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfessionCard;
