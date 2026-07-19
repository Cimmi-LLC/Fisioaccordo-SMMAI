import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { useToast } from '@/hooks/use-toast';

export const SLIDE_STYLES = [
  {
    value: 'foto',
    label: 'Fotografico',
    hint: 'Sfondo chiaro con fotografie realistiche di studio. Adatto ai contenuti educativi e rassicuranti.',
  },
  {
    value: 'neon',
    label: 'Notturno neon',
    hint: 'Fondo nero, titoli bianchi e turchesi, oggetti scontornati con bagliore. Adatto alle campagne e ai contenuti di posizionamento.',
  },
];

const SlideStyleCard: React.FC = () => {
  const { activeBrand, activeBrandId, reload } = useActiveBrand();
  const { toast } = useToast();
  const [value, setValue] = useState('foto');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const current = (activeBrand as any)?.slide_style;
    setValue(SLIDE_STYLES.some((s) => s.value === current) ? current : 'foto');
  }, [activeBrand]);

  const save = async (next: string) => {
    if (next === value) return;
    setValue(next);
    if (!activeBrandId) {
      toast({ title: 'Nessuno studio attivo', description: 'Seleziona prima uno studio.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('brands').update({ slide_style: next } as any).eq('id', activeBrandId);
    setSaving(false);
    if (error) {
      toast({ title: 'Errore nel salvataggio', description: error.message, variant: 'destructive' });
      return;
    }
    const scelto = SLIDE_STYLES.find((s) => s.value === next);
    toast({ title: 'Stile impostato: ' + (scelto ? scelto.label : next) });
    reload();
  };

  return (
    <Card className="panel-card">
      <CardHeader style={{ padding: '22px 24px', borderBottom: '1px solid var(--line)' }}>
        <CardTitle className="flex items-center gap-2" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
          <Palette className="h-4 w-4" style={{ color: 'var(--viola)' }} />
          Stile grafico delle slide
        </CardTitle>
      </CardHeader>
      <CardContent style={{ padding: '22px 24px' }}>
        <p className="text-xs mb-4" style={{ color: 'var(--ink3)' }}>
          Cambia sia la grafica delle slide sia il tipo di immagine che viene generata.
        </p>
        <div className="space-y-2">
          {SLIDE_STYLES.map((opt) => {
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
                <span className="block text-[12px] font-black uppercase" style={{ color: active ? 'var(--rosa)' : 'var(--ink2)', letterSpacing: '0.5px' }}>
                  {active ? '\u25CF ' : '\u25CB '}{opt.label}
                </span>
                <span className="block text-[11px] mt-1" style={{ color: 'var(--ink3)' }}>
                  {opt.hint}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default SlideStyleCard;
