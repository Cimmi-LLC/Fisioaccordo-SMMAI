import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { useToast } from '@/hooks/use-toast';

// 1 credito = 0,10 euro per il cliente finale.
const EURO_PER_CREDITO = 0.10;
export const IMAGE_MODELS = [
  {
    value: 'nano-2',
    label: 'Nano Banana 2',
    credits: 1,
    tag: 'Consigliato',
    hint: 'Immagini AI su misura per il contenuto, costo minimo. La scelta giusta per il lavoro di tutti i giorni.',
  },
  {
    value: 'nano-pro',
    label: 'Nano Banana Pro',
    credits: 3,
    tag: null,
    hint: 'Tiene lo stesso volto e lo stesso stile su tutte le slide. Da usare quando compare la faccia del cliente.',
  },
  {
    value: 'gpt-2',
    label: 'GPT Image 2',
    credits: 5,
    tag: null,
    hint: 'Massimo realismo fotografico. Richiede la chiave OpenAI configurata, altrimenti ripiega su Nano Banana 2.',
  },
  {
    value: 'stock',
    label: 'Foto di repertorio',
    credits: 0,
    tag: 'Gratis',
    hint: 'Nessuna immagine generata: pesca da una banca di foto stock. Piu generiche e a volte ripetute.',
  },
];

const ImageModelCard: React.FC = () => {
  const { activeBrand, activeBrandId, reload } = useActiveBrand();
  const { toast } = useToast();
  const [value, setValue] = useState('nano-2');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const current = (activeBrand as any)?.image_model;
    const valid = IMAGE_MODELS.some((m) => m.value === current);
    setValue(valid ? current : 'nano-2');
  }, [activeBrand]);

  const save = async (next: string) => {
    if (next === value) return;
    setValue(next);
    if (!activeBrandId) {
      toast({ title: 'Nessuno studio attivo', description: 'Seleziona prima uno studio.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('brands').update({ image_model: next } as any).eq('id', activeBrandId);
    setSaving(false);
    if (error) {
      toast({ title: 'Errore nel salvataggio', description: error.message, variant: 'destructive' });
      return;
    }
    const chosen = IMAGE_MODELS.find((m) => m.value === next);
    toast({ title: 'Generatore impostato: ' + (chosen ? chosen.label : next) });
    reload();
  };

  return (
    <Card className="panel-card">
      <CardHeader style={{ padding: '22px 24px', borderBottom: '1px solid var(--line)' }}>
        <CardTitle className="flex items-center gap-2" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
          <Sparkles className="h-4 w-4" style={{ color: 'var(--viola)' }} />
          Generatore di immagini
        </CardTitle>
      </CardHeader>
      <CardContent style={{ padding: '22px 24px' }}>
        <p className="text-xs mb-4" style={{ color: 'var(--ink3)' }}>
          Con quale motore vengono create le immagini di post, caroselli e storie di questo studio. Il costo e in crediti per singola immagine.
        </p>
        <div className="space-y-2">
          {IMAGE_MODELS.map((opt) => {
            const active = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={saving}
                onClick={() => save(opt.value)}
                className="w-full text-left rounded-lg transition-all"
                style={{
                  padding: '12px 14px',
                  border: active ? '2px solid var(--rosa)' : '1px solid var(--line)',
                  backgroundColor: active ? 'rgba(230,0,126,0.06)' : 'transparent',
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-[12px] font-black uppercase" style={{ color: active ? 'var(--rosa)' : 'var(--ink2)', letterSpacing: '0.5px' }}>
                    {active ? '● ' : '○ '}{opt.label}
                    {opt.tag && (
                      <span className="ml-2 text-[9px] font-bold" style={{ color: 'var(--viola)', backgroundColor: 'var(--viola-dim)', padding: '2px 6px', borderRadius: 999, letterSpacing: 0 }}>
                        {opt.tag}
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: active ? 'var(--rosa)' : 'var(--ink3)' }}>
                                                            {opt.credits === 0 ? 'Gratis' : opt.credits + (opt.credits === 1 ? ' credito' : ' crediti') + ' · ' + (opt.credits * EURO_PER_CREDITO).toFixed(2).replace('.', ',') + ' €'}
                  </span>
                </span>
                <span className="block text-[11px] mt-1" style={{ color: 'var(--ink3)' }}>
                  {opt.hint}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] mt-4" style={{ color: 'var(--ink3)' }}>
                              1 credito = 0,10 euro. Un carosello da 6 slide consuma 6 volte i crediti del motore scelto.
        </p>
      </CardContent>
    </Card>
  );
};

export default ImageModelCard;
