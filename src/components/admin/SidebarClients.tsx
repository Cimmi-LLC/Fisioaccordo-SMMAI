import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

export interface ClientBrand {
  id: string;
  user_id: string;
  nome_business: string;
  instagram_username: string | null;
  /** Stable accent color derived from the id for the round avatar. */
  color: string;
}

interface SidebarClientsProps {
  selectedId: string | null;
  onSelect: (brand: ClientBrand) => void;
}

const PALETTE = [
  '#037D9F', '#117A82', '#C0392B', '#6D28D9', '#B7791F',
  '#1A3557', '#DB2777', '#0E7490', '#1F4A1F', '#7C2D12',
];

function pickColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

/**
 * Admin sidebar — lists every brand in the system (cross-customer).
 * Server-side RLS allows this only because `is_admin()` is true; non-admin
 * users get 0 rows back, but the page itself is already guarded by route.
 *
 * Click = parent handler swaps the active dashboard.
 */
const SidebarClients: React.FC<SidebarClientsProps> = ({ selectedId, onSelect }) => {
  const [brands, setBrands] = useState<ClientBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      // brands JOIN meta_connections (latest active connection per user) for IG handle.
      // `as any` casts here are required because the auto-generated types.ts
      // narrows the table union and currently doesn't include `brands` and
      // `meta_connections` — the runtime works fine. See `useActiveBrand.ts`
      // for the same pattern.
      const { data: rows, error } = await (supabase as any)
        .from('brands')
        .select('id, user_id, nome_business')
        .order('nome_business', { ascending: true });
      if (error) {
        console.error('[SidebarClients] load failed:', error.message);
        setLoading(false);
        return;
      }
      const userIds = Array.from(new Set((rows || []).map((b: any) => b.user_id)));
      const handleMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: conns } = await (supabase as any)
          .from('meta_connections')
          .select('user_id, instagram_username')
          .in('user_id', userIds)
          .eq('is_active', true);
        for (const c of (conns || []) as any[]) {
          if (c.instagram_username) handleMap[c.user_id] = c.instagram_username;
        }
      }
      const list: ClientBrand[] = (rows || []).map((b: any) => ({
        id: b.id,
        user_id: b.user_id,
        nome_business: b.nome_business || '(senza nome)',
        instagram_username: handleMap[b.user_id] || null,
        color: pickColor(b.id),
      }));
      setBrands(list);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) =>
      b.nome_business.toLowerCase().includes(q) ||
      (b.instagram_username || '').toLowerCase().includes(q)
    );
  }, [brands, query]);

  return (
    <aside
      style={{
        width: 280,
        flexShrink: 0,
        borderRight: '1px solid var(--line)',
        backgroundColor: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div style={{ padding: '16px 16px 8px' }}>
        <div className="text-[11px] font-bold uppercase mb-2" style={{ color: 'var(--ink3)', letterSpacing: '0.6px' }}>
          Clienti · {filtered.length}
        </div>
        <div style={{ position: 'relative' }}>
          <Search className="h-3.5 w-3.5" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink3)' }} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca cliente"
            style={{ paddingLeft: 30 }}
            className="h-9 text-sm"
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 16px' }}>
        {loading ? (
          <div className="text-center text-sm py-6" style={{ color: 'var(--ink3)' }}>
            Caricamento…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm py-6" style={{ color: 'var(--ink3)' }}>
            {brands.length === 0 ? 'Nessun cliente.' : 'Nessun risultato.'}
          </div>
        ) : (
          filtered.map((b) => {
            const active = b.id === selectedId;
            return (
              <button
                key={b.id}
                onClick={() => onSelect(b)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
                style={{
                  backgroundColor: active ? 'var(--ink)' : 'transparent',
                  color: active ? '#fff' : 'var(--ink2)',
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: 2,
                }}
              >
                <span
                  style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: b.color, color: '#fff', fontWeight: 700, fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {initials(b.nome_business)}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="block truncate text-sm font-medium">{b.nome_business}</span>
                  <span
                    className="block truncate text-[11px]"
                    style={{ color: active ? 'rgba(255,255,255,0.7)' : 'var(--ink3)' }}
                  >
                    {b.instagram_username ? `@${b.instagram_username}` : '— senza IG'}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default SidebarClients;
