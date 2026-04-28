import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Briefcase, Check, ChevronDown, Plus, Loader2 } from 'lucide-react';
import { useActiveBrand } from '@/hooks/useActiveBrand';

const BrandSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const { brands, activeBrand, activeBrandId, loading, setActiveBrand } = useActiveBrand();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', borderRadius: 10,
          backgroundColor: 'var(--bg)', border: '1px solid var(--line)',
          marginBottom: 8,
        }}
      >
        <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'var(--ink3)' }} />
        <span className="text-[11px]" style={{ color: 'var(--ink3)' }}>Caricamento brand...</span>
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <button
        onClick={() => navigate('/brands')}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', borderRadius: 10,
          backgroundColor: 'var(--rosa-dim)',
          border: '1px solid rgba(230,0,126,0.25)',
          color: 'var(--rosa)',
          fontSize: 11, fontWeight: 700, cursor: 'pointer',
          marginBottom: 8,
        }}
      >
        <Plus style={{ width: 14, height: 14 }} />
        Crea il tuo brand
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 10,
            backgroundColor: 'var(--bg)', border: '1px solid var(--line)',
            cursor: 'pointer',
            marginBottom: 8,
            transition: 'background-color 0.15s',
          }}
        >
          <div
            style={{
              width: 26, height: 26, borderRadius: 8,
              backgroundColor: 'var(--rosa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Briefcase style={{ width: 13, height: 13, color: '#fff' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
              Brand attivo
            </div>
            <div
              className="text-[12px] font-bold"
              style={{
                color: 'var(--ink)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {activeBrand?.nome_business || 'Senza nome'}
            </div>
          </div>
          <ChevronDown style={{ width: 12, height: 12, color: 'var(--ink3)', flexShrink: 0 }} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start" side="right">
        <div className="text-[10px] font-bold uppercase mb-2 px-2" style={{ color: 'var(--ink3)', letterSpacing: '0.8px' }}>
          I tuoi brand ({brands.length})
        </div>
        <div className="space-y-0.5 max-h-64 overflow-y-auto">
          {brands.map((b) => {
            const isActive = b.id === activeBrandId;
            return (
              <button
                key={b.id}
                onClick={async () => {
                  if (b.id) await setActiveBrand(b.id);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors"
                style={{
                  backgroundColor: isActive ? 'var(--rosa-dim)' : 'transparent',
                  cursor: 'pointer',
                  border: 'none',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[12px] font-semibold"
                    style={{
                      color: isActive ? 'var(--rosa)' : 'var(--ink)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                  >
                    {b.nome_business || 'Senza nome'}
                  </div>
                  {b.target_pazienti && (
                    <div className="text-[10px]" style={{ color: 'var(--ink3)' }}>
                      {b.target_pazienti.substring(0, 40)}
                    </div>
                  )}
                </div>
                {isActive && <Check className="h-3.5 w-3.5" style={{ color: 'var(--rosa)' }} />}
              </button>
            );
          })}
        </div>
        <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
          <button
            onClick={() => { setOpen(false); navigate('/brands'); }}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-[12px] font-semibold transition-colors"
            style={{ color: 'var(--rosa)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--rosa-dim)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Plus className="h-3.5 w-3.5" />
            Gestisci brand
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default BrandSwitcher;
