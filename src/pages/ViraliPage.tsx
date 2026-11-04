import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { listaAccount, listaRicerche, type AccountSeguito, type RicercaInserzioni } from '@/services/virali';
import VideoViraliTab from '@/components/virali/VideoViraliTab';
import InserzioniTab from '@/components/virali/InserzioniTab';
import AccountSeguitiTab from '@/components/virali/AccountSeguitiTab';
import CopioniTab from '@/components/virali/CopioniTab';

const ViraliPage = () => {
  const { user } = useAuth();
  const { activeBrandId } = useActiveBrand();
  const [account, setAccount] = useState<AccountSeguito[]>([]);
  const [ricerche, setRicerche] = useState<RicercaInserzioni[]>([]);
  const [soloMiei, setSoloMiei] = useState(false);

  const carica = useCallback(async () => {
    try {
      const [a, r] = await Promise.all([listaAccount(), listaRicerche()]);
      setAccount(a);
      setRicerche(r);
    } catch (e) {
      console.error('Video virali: account non caricati', e);
    }
  }, []);

  useEffect(() => { void carica(); }, [carica]);

  // Lista stabile: la griglia ricarica i video solo quando cambia davvero.
  const mieiHandle = useMemo(
    () => account.filter((a) => a.user_id === user?.id && a.brand_id === activeBrandId).map((a) => a.handle),
    [account, user?.id, activeBrandId],
  );
  const soloHandle = useMemo(() => (soloMiei && mieiHandle.length ? mieiHandle : null), [soloMiei, mieiHandle]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--ink)', letterSpacing: '-0.5px' }}>
        Video virali
      </h1>
      <p className="text-sm mb-3 max-w-3xl" style={{ color: 'var(--ink3)' }}>
        I video che fanno più visualizzazioni nel tuo settore, in Italia e in America, e le inserzioni che restano accese da mesi.
        Trova quello giusto e premi «Duplica questo video»: ti scriviamo il copione per il tuo studio.
      </p>

      {/* Mini tutorial: la sezione è potente ma non intuitiva (revisione 03/11). */}
      <details className="mb-6 max-w-3xl rounded-2xl" style={{ backgroundColor: 'var(--viola-dim)', border: '1px solid var(--viola)' }}>
        <summary className="cursor-pointer px-4 py-3 text-sm font-bold" style={{ color: 'var(--ink)' }}>
          Come si usa questa sezione (1 minuto)
        </summary>
        <ol className="list-decimal px-9 pb-4 space-y-1.5 text-sm" style={{ color: 'var(--ink)' }}>
          <li><span className="font-semibold">Filtra per la tua professione</span>: vedi i video del tuo settore, non di tutti.</li>
          <li><span className="font-semibold">Guarda il badge «×N»</span>: ×10 vuol dire 10 volte le visualizzazioni medie di quel canale. Più è alto, più il video ha funzionato davvero: è quello da copiare, non quello col canale più grosso.</li>
          <li><span className="font-semibold">Apri il video</span>: ti diciamo perché ha funzionato (format, hook, struttura).</li>
          <li><span className="font-semibold">Scrivi il TUO argomento</span> nella casella e premi «Copia esatta»: prendiamo la struttura dell'originale e la applichiamo al tuo tema. «Copia vicina» cambia anche angolo e hook.</li>
          <li><span className="font-semibold">Il copione compare lì sotto</span>, frase per frase, con testi a schermo e indicazioni di ripresa. Resta salvato in «I miei copioni».</li>
          <li><span className="font-semibold">«Inserzioni che fanno soldi»</span>: le ads accese da settimane o mesi. Nessuno paga per mesi un video che non rende: sono le ads da studiare.</li>
        </ol>
      </details>

      <Tabs defaultValue="video">
        <TabsList className="mb-5 flex-wrap h-auto">
          <TabsTrigger value="video">Video virali</TabsTrigger>
          <TabsTrigger value="inserzioni">Inserzioni che fanno soldi</TabsTrigger>
          <TabsTrigger value="account">Account seguiti</TabsTrigger>
          <TabsTrigger value="copioni">I miei copioni</TabsTrigger>
        </TabsList>

        <TabsContent value="video" className="space-y-4">
          {mieiHandle.length > 0 && (
            <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              <Switch checked={soloMiei} onCheckedChange={setSoloMiei} /> Solo i miei competitor ({mieiHandle.length})
            </label>
          )}
          <VideoViraliTab soloHandle={soloHandle} />
        </TabsContent>
        <TabsContent value="inserzioni"><InserzioniTab /></TabsContent>
        <TabsContent value="account"><AccountSeguitiTab account={account} ricerche={ricerche} onCambia={carica} /></TabsContent>
        <TabsContent value="copioni"><CopioniTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default ViraliPage;
