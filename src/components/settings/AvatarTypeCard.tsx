import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { useToast } from '@/hooks/use-toast';

type AvatarType = 'B2C' | 'B2B';

const OPTIONS: { value: AvatarType; label: string; hint: string }[] = [
  { value: 'B2C', label: 'B2C - Pazienti', hint: 'Copy emotivo: desiderio, vita quotidiana, frasi corte, tanto "tu".' },
  { value: 'B2B', label: 'B2B - Aziende e professionisti', hint: 'Copy razionale: rischio, costi, tempo, KPI, casi studio e numeri.' },
];

const AvatarTypeCard: React.FC = () => {
  const { activeBrand, activeBrandId, reload } = useActiveBrand();
  const { toast } = useToast();
  const [value, setValue] = useState<AvatarType>('B2C');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const current = (activeBrand as any)?.avatar_type;
    setValue(current === 'B2B' ? 'B2B' : 'B2C');
  }, [activeBrand]);

  const save = async (next: AvatarType) => {
    if (next === value) return;
    setValue(next);
    if (!activeBrandId) {
      toast({ title: 'Nessuno studio attivo', description: 'Seleziona prima uno studio.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('brands').update({ avatar_type: next } as any).eq('id', activeBrandId);
    setSaving(false);
    if (error) {
      toast({ title: 'Errore nel salvataggio', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: next === 'B2B' ? 'Copy impostato su B2B' : 'Copy impostato su B2C' });
    reload();
  };

  return (
    <Card className="panel-card">
      <CardHeader style={{ padding: '22px 24px', borderBottom: '1px solid var(--line)' }}>
        <CardTitle className="flex items-center gap-2" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
          <Users className="h-4 w-4" style={{ color: 'var(--viola)' }} />
          Tipo di copy
        </CardTitle>
      </CardHeader>
      <CardContent style={{ padding: '22px 24px' }}>
        <p className="text-xs mb-4" style={{ color: 'var(--ink3)' }}>
          Scegli a chi si rivolge il copy generato per questo studio. Nel dubbio lascia B2C.
        </p>
        <div className="space-y-2">
          {OPTIONS.map((opt) => {
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
                  {active ? '● ' : '○ '}{opt.label}
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

export default AvatarTypeCard;
