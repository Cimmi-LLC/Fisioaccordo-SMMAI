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
      <p className="text-sm mb-6 max-w-3xl" style={{ color: 'var(--ink3)' }}>
        I video che fanno più visualizzazioni nel tuo settore, in Italia e in America, e le inserzioni che restano accese da mesi.
        Trova quello giusto e premi «Duplica questo video»: ti scriviamo il copione per il tuo studio.
      </p>

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
