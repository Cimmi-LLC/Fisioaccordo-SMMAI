import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, RefreshCw, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { handleValido, normalizzaHandle, numeroBreve, piattaformaDaLink, urlProfilo, type Paese, type Piattaforma } from '@/lib/brand/virali';
import {
  aggiornaLibreria, aggiungiAccount, aggiungiRicerca, eliminaAccount, eliminaRicerca, modificaAccount, raccogliAccount,
  type AccountSeguito, type RicercaInserzioni,
} from '@/services/virali';
import { Filtro, OPZIONI_PROFESSIONE, dataBreve, etichettaPaese, etichettaPiattaforma, etichettaProfessione } from './comuni';

const OPZIONI_PAESE = [{ id: 'IT', label: 'Italia' }, { id: 'US', label: 'USA' }, { id: 'ALTRO', label: 'Altro' }];
const OPZIONI_PIATTAFORMA = [{ id: 'instagram', label: 'Instagram' }, { id: 'tiktok', label: 'TikTok' }];

const RigaAccount: React.FC<{
  a: AccountSeguito;
  modificabile: boolean;
  onCambia: () => void;
}> = ({ a, modificabile, onCambia }) => {
  const { toast } = useToast();
  const [lavoro, setLavoro] = useState(false);

  const aggiorna = async () => {
    setLavoro(true);
    try {
      const r = await raccogliAccount(a.id);
      toast({ title: r.errore ? `@${a.handle}: ${r.errore}` : `@${a.handle}: ${r.video ?? 0} video letti` });
      onCambia();
    } catch (e) {
      toast({ title: 'Lettura non riuscita', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setLavoro(false);
    }
  };
  const elimina = async () => {
    if (!window.confirm(`Togliere @${a.handle} dagli account seguiti?`)) return;
    try { await eliminaAccount(a.id); onCambia(); } catch (e) {
      toast({ title: 'Non eliminato', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    }
  };
  const attiva = async (attivo: boolean) => {
    try { await modificaAccount(a.id, { attivo }); onCambia(); } catch (e) {
      toast({ title: 'Non salvato', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 py-2 border-b last:border-0 text-sm" style={{ color: 'var(--ink)' }}>
      <a href={urlProfilo(a.piattaforma, a.handle)} target="_blank" rel="noopener noreferrer" className="font-bold flex items-center gap-1 w-[220px] shrink-0 truncate">
        @{a.handle} <ExternalLink className="h-3 w-3 shrink-0" style={{ color: 'var(--ink3)' }} />
      </a>
      <span className="text-xs min-w-0 flex-1 sm:truncate" style={{ color: 'var(--ink3)' }} title={a.vende || undefined}>
        {etichettaPiattaforma(a.piattaforma)} · {etichettaPaese(a.paese)} · {etichettaProfessione(a.professione)}
        {a.follower ? ` · ${numeroBreve(a.follower)} follower` : ''}
        {a.media_views ? ` · media ${numeroBreve(a.media_views)} visualizzazioni` : ''}
        {a.vende ? ` · vende: ${a.vende}` : ''}
        {a.ultimo_giro ? ` · letto il ${dataBreve(a.ultimo_giro)}` : ' · mai letto'}
      </span>
      {a.ultimo_errore && (
        <span className="flex items-center gap-1 text-xs shrink-0" style={{ color: 'var(--rosa)' }}><AlertTriangle className="h-3 w-3" /> {a.ultimo_errore}</span>
      )}
      {modificabile && (
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <Switch checked={a.attivo} onCheckedChange={attiva} title="Seguito" />
          <Button size="sm" variant="ghost" onClick={aggiorna} disabled={lavoro} title="Leggi adesso">
            {lavoro ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={elimina} title="Togli"><Trash2 className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
};

const AccountSeguitiTab: React.FC<{
  account: AccountSeguito[];
  ricerche: RicercaInserzioni[];
  onCambia: () => void;
}> = ({ account, ricerche, onCambia }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const { activeBrand, activeBrandId } = useActiveBrand();
  const professioneBrand = (activeBrand as { professione?: string | null } | null)?.professione || 'fisioterapista';

  const [link, setLink] = useState('');
  const [piattaforma, setPiattaforma] = useState<Piattaforma>('instagram');
  const [paese, setPaese] = useState<Paese>('IT');
  const [professione, setProfessione] = useState('');
  const [vende, setVende] = useState('');
  const [inLibreria, setInLibreria] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [aggiornoTutto, setAggiornoTutto] = useState(false);
  const [nuovaRicerca, setNuovaRicerca] = useState({ paese: 'IT' as Paese, professione: 'fisioterapista', ricerca: '' });

  const miei = account.filter((a) => a.user_id === user?.id && a.brand_id === activeBrandId);
  const libreria = account.filter((a) => a.brand_id === null);

  const aggiungi = async () => {
    const handle = normalizzaHandle(link);
    const p = piattaformaDaLink(link) || piattaforma;
    if (!handleValido(handle)) {
      toast({ title: 'Account non valido', description: 'Incolla il link del profilo o scrivi @nome.', variant: 'destructive' });
      return;
    }
    const libero = inLibreria && isAdmin;
    if (!libero && !activeBrandId) {
      toast({ title: 'Scegli prima un brand', variant: 'destructive' });
      return;
    }
    if (!libero && libreria.some((a) => a.piattaforma === p && a.handle === handle)) {
      toast({ title: `@${handle} è già nella libreria`, description: 'I suoi video li vedi già in «Video virali».' });
      return;
    }
    setSalvo(true);
    try {
      const nuovo = await aggiungiAccount({
        piattaforma: p,
        handle,
        paese,
        professione: professione || professioneBrand,
        vende: vende.trim() || null,
        brand_id: libero ? null : activeBrandId,
        user_id: libero ? null : user?.id || null,
      });
      setLink('');
      setVende('');
      onCambia();
      toast({ title: `@${handle} aggiunto`, description: 'Leggo i suoi video, ci vuole circa un minuto…' });
      const r = await raccogliAccount(nuovo.id);
      toast({ title: r.errore ? `@${handle}: ${r.errore}` : `@${handle}: ${r.video ?? 0} video letti` });
      onCambia();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'Non aggiunto', description: /duplicate|unico/i.test(msg) ? 'Lo segui già.' : msg, variant: 'destructive' });
    } finally {
      setSalvo(false);
    }
  };

  const aggiornaTutto = async () => {
    if (!window.confirm('Rileggo tutti gli account e le inserzioni adesso? Costa qualche dollaro di Apify, come il giro della domenica.')) return;
    setAggiornoTutto(true);
    try {
      const r = await aggiornaLibreria();
      toast({ title: r.messaggio || `Messi in coda ${r.giri ?? 0} giri`, description: 'I video arrivano nei prossimi 10-30 minuti.' });
    } catch (e) {
      toast({ title: 'Non avviato', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setAggiornoTutto(false);
    }
  };

  const salvaRicerca = async () => {
    if (!nuovaRicerca.ricerca.trim()) return;
    try {
      await aggiungiRicerca({ ...nuovaRicerca, ricerca: nuovaRicerca.ricerca.trim().toLowerCase() });
      setNuovaRicerca((r) => ({ ...r, ricerca: '' }));
      onCambia();
    } catch (e) {
      toast({ title: 'Ricerca non salvata', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    }
  };

  const gruppi = new Map<string, AccountSeguito[]>();
  for (const a of libreria) {
    const k = `${etichettaPaese(a.paese)} · ${etichettaProfessione(a.professione)}`;
    gruppi.set(k, [...(gruppi.get(k) || []), a]);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border p-4 space-y-3 bg-white">
        <div className="font-black" style={{ color: 'var(--ink)' }}>Aggiungi un competitor</div>
        <p className="text-sm" style={{ color: 'var(--ink3)' }}>
          Incolla il link del profilo Instagram o TikTok. Leggiamo i suoi ultimi 30 video e ti diciamo quali sono andati sopra la sua media.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold grow min-w-[220px]" style={{ color: 'var(--ink3)' }}>
            Link o @nome
            <Input value={link} onChange={(e) => {
              setLink(e.target.value);
              const p = piattaformaDaLink(e.target.value);
              if (p) setPiattaforma(p);
            }} placeholder="https://www.instagram.com/nome/" />
          </label>
          <Filtro etichetta="Piattaforma" valore={piattaforma} onChange={(v) => setPiattaforma(v as Piattaforma)} opzioni={OPZIONI_PIATTAFORMA} larghezza="w-36" />
          <Filtro etichetta="Paese" valore={paese} onChange={(v) => setPaese(v as Paese)} opzioni={OPZIONI_PAESE} larghezza="w-32" />
          {isAdmin && (
            <>
              <Filtro etichetta="Professione" valore={professione || professioneBrand} onChange={setProfessione} opzioni={OPZIONI_PROFESSIONE} larghezza="w-52" />
              <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: 'var(--ink3)' }}>
                Cosa vende
                <Input value={vende} onChange={(e) => setVende(e.target.value)} placeholder="corso, app, clinica…" className="w-44" />
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold pb-2" style={{ color: 'var(--ink3)' }}>
                <Switch checked={inLibreria} onCheckedChange={setInLibreria} /> Nella libreria di tutti
              </label>
            </>
          )}
          <Button onClick={aggiungi} disabled={salvo || !link.trim()}>
            {salvo ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />} Aggiungi
          </Button>
        </div>
        {miei.length > 0 && (
          <div className="pt-2">
            <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--ink3)' }}>I tuoi competitor</div>
            {miei.map((a) => <RigaAccount key={a.id} a={a} modificabile onCambia={onCambia} />)}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="font-black" style={{ color: 'var(--ink)' }}>Libreria: {libreria.length} account in Italia e in America</div>
          {isAdmin && (
            <Button size="sm" variant="outline" className="ml-auto" onClick={aggiornaTutto} disabled={aggiornoTutto}>
              {aggiornoTutto ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />} Aggiorna adesso
            </Button>
          )}
        </div>
        <p className="text-sm" style={{ color: 'var(--ink3)' }}>
          Professionisti della salute che fanno tante visualizzazioni e vendono con i video. Si rileggono da soli ogni domenica.
        </p>
        {[...gruppi.entries()].map(([titolo, lista]) => (
          <div key={titolo} className="rounded-2xl border p-4 bg-white">
            <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--ink3)' }}>{titolo} · {lista.length}</div>
            {lista.map((a) => <RigaAccount key={a.id} a={a} modificabile={isAdmin} onCambia={onCambia} />)}
          </div>
        ))}
      </section>

      {isAdmin && (
        <section className="rounded-2xl border p-4 space-y-3 bg-white">
          <div className="font-black" style={{ color: 'var(--ink)' }}>Parole cercate nella Libreria inserzioni</div>
          <p className="text-sm" style={{ color: 'var(--ink3)' }}>Ogni domenica si cercano le inserzioni video accese con queste parole, in Italia e in America.</p>
          <div className="flex flex-wrap items-end gap-3">
            <Filtro etichetta="Paese" valore={nuovaRicerca.paese} onChange={(v) => setNuovaRicerca((r) => ({ ...r, paese: v as Paese }))} opzioni={OPZIONI_PAESE.slice(0, 2)} larghezza="w-32" />
            <Filtro etichetta="Professione" valore={nuovaRicerca.professione} onChange={(v) => setNuovaRicerca((r) => ({ ...r, professione: v }))} opzioni={OPZIONI_PROFESSIONE} larghezza="w-52" />
            <label className="flex flex-col gap-1 text-xs font-semibold" style={{ color: 'var(--ink3)' }}>
              Parole
              <Input value={nuovaRicerca.ricerca} onChange={(e) => setNuovaRicerca((r) => ({ ...r, ricerca: e.target.value }))} placeholder="mal di schiena" className="w-52" />
            </label>
            <Button variant="outline" onClick={salvaRicerca} disabled={!nuovaRicerca.ricerca.trim()}><Plus className="h-4 w-4 mr-1" /> Aggiungi</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {ricerche.map((r) => (
              <span key={r.id} className="flex items-center gap-1 rounded-full border px-3 py-1 text-xs" style={{ color: 'var(--ink)' }}>
                {etichettaPaese(r.paese)} · {r.ricerca}
                <button onClick={async () => { await eliminaRicerca(r.id).catch(() => undefined); onCambia(); }} title="Togli"><Trash2 className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default AccountSeguitiTab;
