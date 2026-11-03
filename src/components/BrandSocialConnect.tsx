import React, { useState } from 'react';
import { CheckCircle2, Loader2, Music2, Unlink, Youtube, type LucideIcon } from 'lucide-react';
import { SocialService, type SocialConnectionData } from '@/services/socialService';
import { PLATFORM_LABEL, type SocialPlatform } from '@/lib/social/socialCore';
import { useToast } from '@/hooks/use-toast';

export const PLATFORM_ICON: Record<SocialPlatform, LucideIcon> = { tiktok: Music2, youtube: Youtube };
export const PLATFORM_COLOR: Record<SocialPlatform, string> = { tiktok: '#111111', youtube: '#FF0000' };

export function connectionName(c: Pick<SocialConnectionData, 'username' | 'display_name'>): string {
  if (c.username) return c.username.startsWith('@') ? c.username : `@${c.username}`;
  return c.display_name || 'account collegato';
}

interface Props {
  platform: SocialPlatform;
  brandId: string;
  brandName: string;
  connection: SocialConnectionData | null;
  /** false: l'app sviluppatore non è ancora configurata sul server */
  enabled: boolean;
  justConnected?: boolean;
  onChanged: () => void;
}

/**
 * Riga «TikTok» / «YouTube» nella card di un brand. Un clic porta su
 * TikTok o Google, si dà il permesso e si torna qui con la riga verde.
 */
const BrandSocialConnect: React.FC<Props> = ({ platform, brandId, brandName, connection, enabled, justConnected, onChanged }) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const label = PLATFORM_LABEL[platform];
  const Icon = PLATFORM_ICON[platform];
  const color = PLATFORM_COLOR[platform];

  const connect = async () => {
    setBusy(true);
    try {
      await SocialService.connect(platform, brandId);
    } catch (e) {
      toast({ title: `${label} non collegato`, description: e instanceof Error ? e.message : 'Errore', variant: 'destructive' });
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!connection) return;
    setBusy(true);
    try {
      await SocialService.disconnect(connection.id);
      toast({ title: 'Scollegato', description: `${label} scollegato da ${brandName}` });
      onChanged();
    } catch {
      toast({ title: 'Errore', description: 'Impossibile scollegare', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (connection) {
    return (
      <div
        className="flex items-center gap-2 mb-2 px-2.5 py-2 rounded-lg text-[12px]"
        style={{
          backgroundColor: justConnected ? 'rgba(22,163,74,0.12)' : 'rgba(22,163,74,0.06)',
          border: `1px solid rgba(22,163,74,${justConnected ? 0.5 : 0.2})`,
          color: 'var(--ink)',
        }}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: '#16a34a' }} />
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase" style={{ color: '#16a34a', letterSpacing: '0.5px' }}>
            {justConnected ? 'Appena collegato' : `${label} collegato`}
          </div>
          <div className="font-semibold truncate">{connectionName(connection)}</div>
          {connection.last_error && (
            <div className="text-[10px] truncate" style={{ color: '#d97706' }} title={connection.last_error}>
              Da ricollegare: il permesso è scaduto
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); disconnect(); }}
          disabled={busy}
          className="ml-auto shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase disabled:opacity-50"
          style={{ color: 'var(--ink3)' }}
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
          Scollega
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); if (enabled) connect(); }}
      disabled={busy || !enabled}
      title={enabled ? undefined : `Il collegamento con ${label} sarà attivo appena ${label} approva l'app`}
      className="w-full mb-2 text-[11px] font-black uppercase py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
      style={{ border: `1px solid ${color}`, color, backgroundColor: 'transparent', cursor: enabled ? 'pointer' : 'not-allowed' }}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      Collega {label}
      {!enabled && <span className="text-[9px] normal-case font-semibold" style={{ color: 'var(--ink3)' }}>· in arrivo</span>}
    </button>
  );
};

export default BrandSocialConnect;
