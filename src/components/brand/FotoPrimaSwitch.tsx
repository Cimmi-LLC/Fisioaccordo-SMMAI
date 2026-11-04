// «Usa prima le mie foto, sempre»: opzione secca chiesta dalla revisione del
// 03/11. Spenta: le foto caricate entrano solo quando combaciano con le
// keyword della slide. Accesa: ogni slide parte da una foto del pool.
// Salvataggio dedicato (colonna brands.foto_mie_sempre, migrazione 20261103150000).

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

const FotoPrimaSwitch: React.FC<{ brandId: string | null }> = ({ brandId }) => {
  const { toast } = useToast();
  const [attivo, setAttivo] = useState(false);
  const [nonDisponibile, setNonDisponibile] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!brandId) return;
    (async () => {
      const { data, error } = await (supabase as any)
        .from('brands')
        .select('foto_mie_sempre')
        .eq('id', brandId)
        .maybeSingle();
      if (error) { setNonDisponibile(true); return; }
      setAttivo(data?.foto_mie_sempre === true);
    })();
  }, [brandId]);

  const cambia = async (next: boolean) => {
    if (!brandId) return;
    setBusy(true);
    const prima = attivo;
    setAttivo(next);
    const { error } = await (supabase as any).from('brands').update({ foto_mie_sempre: next }).eq('id', brandId);
    setBusy(false);
    if (error) {
      setAttivo(prima);
      toast({ title: 'Opzione non salvata', description: error.message, variant: 'destructive' });
    }
  };

  if (nonDisponibile) {
    return (
      <p className="text-[11px] font-semibold mt-3" style={{ color: '#b45309' }}>
        L'opzione «usa prima le mie foto» sarà attiva dopo la migrazione del 03/11 (brand_kit_metodo_e_foto).
      </p>
    );
  }

  return (
    <label className="flex items-start gap-3 mt-4 cursor-pointer">
      <Switch checked={attivo} onCheckedChange={cambia} disabled={busy || !brandId} />
      <span>
        <span className="block text-[13px] font-bold" style={{ color: 'var(--ink)' }}>Usa prima le mie foto, sempre</span>
        <span className="block text-[11px]" style={{ color: 'var(--ink3)' }}>
          Spento: le tue foto entrano solo quando c'entrano col contenuto della slide. Acceso: ogni slide parte da una tua foto.
        </span>
      </span>
    </label>
  );
};

export default FotoPrimaSwitch;
