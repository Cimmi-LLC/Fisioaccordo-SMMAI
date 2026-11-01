// Pilota automatico delle scoperte scientifiche: ogni giorno cerca studi e
// notizie autorevoli, ne fa un carosello col template del brand e lo mette
// in programmazione su Instagram agli orari scelti.
//
// Salva da solo i suoi tre campi (pubblicazione_automatica, auto_orari,
// auto_temi) e li verifica rileggendo il database; onSaved li riporta nella
// pagina del brand così il salvataggio del Brand Kit non li sovrascrive.

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, X, FlaskConical, ExternalLink, Check, AlertTriangle } from 'lucide-react';
import { normalizzaOrari, temiRicerca, MAX_ORARI } from '@/lib/brand/scoperte';

type Campi = { pubblicazione_automatica: boolean; auto_orari: string[]; auto_temi: string };

type ScopertaRow = {
  id: string;
  titolo: string;
  fonte: string;
  url: string;
  data_pubblicazione: string | null;
  stato: 'nuova' | 'in_produzione' | 'programmata' | 'errore' | 'scartata';
  errore: string | null;
  programmata_per: string | null;
  created_at: string;
};

type Props = {
  brandId: string;
  pubblicazioneAutomatica: boolean;
  autoOrari?: string[] | null;
  autoTemi?: string | null;
  temiChiave: string[];
  servizi: string[];
  onSaved: (campi: Campi) => void;
};

const STATO: Record<ScopertaRow['stato'], { label: string; color: string }> = {
  nuova: { label: 'Trovata', color: 'var(--ink3)' },
  in_produzione: { label: 'In preparazione', color: 'var(--viola)' },
  programmata: { label: 'Programmata', color: '#15803d' },
  errore: { label: 'Non riuscita', color: '#b91c1c' },
  scartata: { label: 'Scartata', color: 'var(--ink3)' },
};

const quando = (iso: string) =>
  new Date(iso).toLocaleString('it-IT', { timeZone: 'Europe/Rome', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function PilotaScoperteCard(props: Props) {
  const { toast } = useToast();
  const [acceso, setAcceso] = useState(props.pubblicazioneAutomatica);
  const [orari, setOrari] = useState<string[]>(normalizzaOrari(props.autoOrari));
  const [temi, setTemi] = useState(props.autoTemi || '');
  const [modificato, setModificato] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [provando, setProvando] = useState(false);
  const [requisiti, setRequisiti] = useState<{ instagram: string | null; template: boolean } | null>(null);
  const [scoperte, setScoperte] = useState<ScopertaRow[]>([]);
  const [anteprima, setAnteprima] = useState<{
    temi: string;
    scoperte: Array<{ titolo: string; sintesi: string[]; fonte: string; url: string; data: string | null }>;
    diagnosi?: { termini: string[]; trovati: number; letti: number; tenute: number };
  } | null>(null);
  const [cercando, setCercando] = useState(false);

  const caricaScoperte = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('scoperte')
      .select('id, titolo, fonte, url, data_pubblicazione, stato, errore, programmata_per, created_at')
      .eq('brand_id', props.brandId)
      .order('created_at', { ascending: false })
      .limit(15);
    setScoperte((data || []) as ScopertaRow[]);
  }, [props.brandId]);

  useEffect(() => {
    (async () => {
      const [{ data: conn }, { data: tpl }] = await Promise.all([
        (supabase as any).from('meta_connections').select('instagram_username').eq('brand_id', props.brandId).eq('is_active', true).limit(1).maybeSingle(),
        (supabase as any).from('template_variants').select('slide_role').eq('brand_id', props.brandId),
      ]);
      const ruoli = new Set(((tpl || []) as Array<{ slide_role: string }>).map((t) => t.slide_role));
      setRequisiti({
        instagram: (conn as { instagram_username?: string } | null)?.instagram_username || null,
        template: ruoli.has('cover') && ruoli.has('content') && ruoli.has('cta'),
      });
    })();
    caricaScoperte();
  }, [props.brandId, caricaScoperte]);

  // Mentre un carosello è in preparazione, aggiorna la lista ogni 15 secondi.
  useEffect(() => {
    if (!scoperte.some((s) => s.stato === 'in_produzione') && !provando) return;
    const t = setInterval(caricaScoperte, 15000);
    return () => clearInterval(t);
  }, [scoperte, provando, caricaScoperte]);

  const pronto = !!requisiti?.instagram && !!requisiti?.template;

  const salva = async (campiNuovi?: Partial<Campi>) => {
    const campi: Campi = {
      pubblicazione_automatica: campiNuovi?.pubblicazione_automatica ?? acceso,
      auto_orari: normalizzaOrari(campiNuovi?.auto_orari ?? orari),
      auto_temi: (campiNuovi?.auto_temi ?? temi).trim(),
    };
    setSalvando(true);
    try {
      const { error } = await (supabase as any).from('brands').update(campi).eq('id', props.brandId);
      if (error) throw error;
      const { data: check, error: readErr } = await (supabase as any)
        .from('brands').select('pubblicazione_automatica, auto_orari, auto_temi').eq('id', props.brandId).single();
      if (readErr || !check) throw new Error(readErr?.message || 'Non riesco a rileggere il brand');
      const ok = check.pubblicazione_automatica === campi.pubblicazione_automatica
        && JSON.stringify(check.auto_orari) === JSON.stringify(campi.auto_orari)
        && check.auto_temi === campi.auto_temi;
      if (!ok) throw new Error('Il database non conferma le impostazioni');
      setAcceso(campi.pubblicazione_automatica);
      setOrari(campi.auto_orari);
      setTemi(campi.auto_temi);
      setModificato(false);
      props.onSaved(campi);
      toast({
        title: campi.pubblicazione_automatica ? 'Pilota automatico acceso' : 'Impostazioni salvate',
        description: campi.pubblicazione_automatica
          ? `Ogni giorno ${campi.auto_orari.length === 1 ? 'un carosello' : `${campi.auto_orari.length} caroselli`} alle ${campi.auto_orari.join(', ')}.`
          : 'Salvate e verificate.',
      });
    } catch (e: any) {
      toast({ title: 'Non salvato', description: e.message, variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const prova = async () => {
    setProvando(true);
    try {
      const { data, error } = await supabase.functions.invoke('scoperte-automatiche', { body: { brandId: props.brandId } });
      if (error) {
        let msg = error.message;
        try { msg = (await (error as any).context?.json())?.error || msg; } catch { /* resta il messaggio generico */ }
        throw new Error(msg);
      }
      toast({
        title: 'Ricerca avviata',
        description: `Il carosello sarà pronto in qualche minuto e uscirà ${quando((data as any).programmatoPer)}. Lo vedi qui sotto e nel Calendario.`,
      });
      setTimeout(caricaScoperte, 20000);
    } catch (e: any) {
      toast({ title: 'Non avviato', description: e.message, variant: 'destructive' });
    } finally {
      setTimeout(() => setProvando(false), 20000);
    }
  };

  const vediAnteprima = async () => {
    setCercando(true);
    try {
      const { data, error } = await supabase.functions.invoke('scoperte-automatiche', { body: { brandId: props.brandId, soloRicerca: true } });
      if (error) {
        let msg = error.message;
        try { msg = (await (error as any).context?.json())?.error || msg; } catch { /* resta il messaggio generico */ }
        throw new Error(msg);
      }
      setAnteprima(data as any);
    } catch (e: any) {
      toast({ title: 'Ricerca non riuscita', description: e.message, variant: 'destructive' });
    } finally {
      setCercando(false);
    }
  };

  const scarta = async (id: string) => {
    await (supabase as any).from('scoperte').update({ stato: 'scartata', updated_at: new Date().toISOString() }).eq('id', id);
    caricaScoperte();
  };

  const box = { backgroundColor: 'var(--surface)', border: '1px solid var(--line)' };
  const segnaposto = temiRicerca({ temi_chiave: props.temiChiave, servizi: props.servizi });

  return (
    <div className="rounded-2xl p-6 space-y-5" style={box}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--ink)' }}>
            <FlaskConical className="h-5 w-5" /> Pubblicazione automatica: scoperte scientifiche
          </h2>
          <p className="text-[12px] mt-1" style={{ color: 'var(--ink3)' }}>
            Ogni mattina cerca su PubMed gli studi dell'ultimo mese (studi clinici, meta-analisi, linee guida), sceglie quelli utili ai tuoi pazienti, scrive il carosello in italiano
            con la fonte, crea le slide col tuo template e lo programma su Instagram agli orari che scegli.
          </p>
        </div>
        <button
          onClick={() => { if (pronto || acceso) salva({ pubblicazione_automatica: !acceso }); }}
          disabled={salvando || (!pronto && !acceso)}
          aria-label="Pubblicazione automatica"
          style={{
            width: 44, height: 24, borderRadius: 12, padding: 2, flexShrink: 0,
            backgroundColor: acceso ? 'var(--viola)' : 'var(--line)',
            border: 'none', cursor: pronto || acceso ? 'pointer' : 'not-allowed', transition: 'background-color 0.2s',
            display: 'flex', alignItems: 'center', opacity: !pronto && !acceso ? 0.5 : 1,
          }}
        >
          <span style={{
            width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff',
            transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transform: acceso ? 'translateX(20px)' : 'translateX(0)',
          }} />
        </button>
      </div>

      {requisiti && (
        <div className="space-y-1 text-[13px]">
          <div className="flex items-center gap-2" style={{ color: requisiti.instagram ? '#15803d' : '#b91c1c' }}>
            {requisiti.instagram ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {requisiti.instagram ? `Pubblica su @${requisiti.instagram}` : 'Collega un profilo Instagram a questo brand (I miei Brand → Collega Instagram)'}
          </div>
          <div className="flex items-center gap-2" style={{ color: requisiti.template ? '#15803d' : '#b91c1c' }}>
            {requisiti.template ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {requisiti.template ? 'Template delle slide approvato' : 'Approva il template delle slide (crea un carosello e completa il Template Genesis)'}
          </div>
        </div>
      )}

      <div>
        <div className="text-[14px] font-bold mb-2" style={{ color: 'var(--ink)' }}>Orari di pubblicazione (ora italiana)</div>
        <div className="flex flex-wrap items-center gap-2">
          {orari.map((o, i) => (
            <div key={i} className="flex items-center gap-1">
              <Input
                type="time"
                value={o}
                onChange={(e) => { const n = [...orari]; n[i] = e.target.value; setOrari(n); setModificato(true); }}
                className="w-[110px] text-sm"
                style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9 }}
              />
              {orari.length > 1 && (
                <button onClick={() => { setOrari(orari.filter((_, j) => j !== i)); setModificato(true); }} aria-label="Togli orario">
                  <X className="h-4 w-4" style={{ color: 'var(--ink3)' }} />
                </button>
              )}
            </div>
          ))}
          {orari.length < MAX_ORARI && (
            <button
              onClick={() => { setOrari([...orari, orari.includes('18:00') ? '13:00' : '18:00']); setModificato(true); }}
              className="flex items-center gap-1 text-[13px] font-bold px-3 py-2 rounded-lg"
              style={{ color: 'var(--viola)', border: '1px dashed var(--line)' }}
            >
              <Plus className="h-4 w-4" /> Aggiungi orario
            </button>
          )}
        </div>
        <div className="text-[12px] mt-1" style={{ color: 'var(--ink3)' }}>
          Un carosello per ogni orario: {orari.length} al giorno.
        </div>
      </div>

      <div>
        <div className="text-[14px] font-bold mb-2" style={{ color: 'var(--ink)' }}>Su cosa cercare</div>
        <Textarea
          value={temi}
          onChange={(e) => { setTemi(e.target.value); setModificato(true); }}
          rows={2}
          className="text-sm"
          style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9 }}
          placeholder={`Se lo lasci vuoto: ${segnaposto}`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {modificato && (
          <button
            onClick={() => salva()}
            disabled={salvando}
            className="flex items-center gap-2 text-[13px] font-bold px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: 'var(--viola)' }}
          >
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Salva orari e argomenti
          </button>
        )}
        <button
          onClick={prova}
          disabled={!pronto || provando || modificato}
          className="flex items-center gap-2 text-[13px] font-bold px-4 py-2 rounded-lg"
          style={{ color: 'var(--ink)', border: '1px solid var(--line)', opacity: !pronto || modificato ? 0.5 : 1 }}
          title={modificato ? 'Salva prima le modifiche' : undefined}
        >
          {provando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
          Prova adesso con un carosello
        </button>
        <button
          onClick={vediAnteprima}
          disabled={cercando || modificato}
          className="flex items-center gap-2 text-[13px] font-bold px-4 py-2 rounded-lg"
          style={{ color: 'var(--ink)', border: '1px solid var(--line)', opacity: modificato ? 0.5 : 1 }}
          title={modificato ? 'Salva prima le modifiche' : 'Solo la ricerca: non crea né programma niente'}
        >
          {cercando && <Loader2 className="h-4 w-4 animate-spin" />} Vedi cosa troverebbe oggi
        </button>
      </div>

      {anteprima && (
        <div className="rounded-xl p-3 space-y-3" style={{ backgroundColor: 'var(--bg)', border: '1px dashed var(--line)' }}>
          <div className="text-[12px]" style={{ color: 'var(--ink3)' }}>
            Anteprima, niente salvato. Cercato su: {anteprima.temi}
            {anteprima.diagnosi && (
              <> · su PubMed: {anteprima.diagnosi.termini.join(', ')} · studi trovati {anteprima.diagnosi.trovati}, letti {anteprima.diagnosi.letti}, scelti {anteprima.diagnosi.tenute}</>
            )}
          </div>
          {anteprima.scoperte.length === 0 && (
            <div className="text-[13px]" style={{ color: 'var(--ink)' }}>Nessuno studio nuovo adatto ai tuoi pazienti.</div>
          )}
          {anteprima.scoperte.map((s) => (
            <div key={s.url} className="text-[13px]">
              <div className="font-bold" style={{ color: 'var(--ink)' }}>{s.titolo}</div>
              <ul className="list-disc pl-5" style={{ color: 'var(--ink)' }}>
                {s.sintesi.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] underline" style={{ color: 'var(--ink3)' }}>
                {s.fonte}{s.data ? ` · ${new Date(s.data).toLocaleDateString('it-IT')}` : ''} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))}
        </div>
      )}

      {scoperte.length > 0 && (
        <div>
          <div className="text-[14px] font-bold mb-2" style={{ color: 'var(--ink)' }}>Ultime scoperte trovate</div>
          <div className="space-y-2">
            {scoperte.map((s) => (
              <div key={s.id} className="rounded-xl p-3 text-[13px]" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold" style={{ color: 'var(--ink)' }}>{s.titolo}</div>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] underline" style={{ color: 'var(--ink3)' }}>
                      {s.fonte}{s.data_pubblicazione ? ` · ${new Date(s.data_pubblicazione).toLocaleDateString('it-IT')}` : ''} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[12px] font-bold" style={{ color: STATO[s.stato].color }}>{STATO[s.stato].label}</div>
                    {s.stato === 'programmata' && s.programmata_per && (
                      <div className="text-[12px]" style={{ color: 'var(--ink3)' }}>{quando(s.programmata_per)}</div>
                    )}
                    {(s.stato === 'nuova' || s.stato === 'errore') && (
                      <button onClick={() => scarta(s.id)} className="text-[12px] underline" style={{ color: 'var(--ink3)' }}>Scarta</button>
                    )}
                  </div>
                </div>
                {s.stato === 'errore' && s.errore && (
                  <div className="text-[12px] mt-1" style={{ color: '#b91c1c' }}>{s.errore}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
