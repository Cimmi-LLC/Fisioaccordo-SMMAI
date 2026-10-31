import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Instagram, Loader2, Unlink } from 'lucide-react';
import { MetaService, type MetaConnectionData } from '@/services/metaService';
import { useToast } from '@/hooks/use-toast';

interface Props {
  brandId: string;
  brandName: string;
  connection: MetaConnectionData | null;
  /** Collegato adesso (ritorno da Instagram): la riga si evidenzia. */
  justConnected?: boolean;
  onChanged: () => void;
}

/**
 * Riga "Instagram" nella card di un brand: ogni brand ha il suo profilo.
 * Collegato → "Collegato @username" e Scollega; altrimenti un clic porta
 * su Instagram (si collega il profilo aperto lì) e si torna qui.
 */
const BrandInstagramConnect: React.FC<Props> = ({ brandId, brandName, connection, justConnected, onChanged }) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const connect = () => {
    setBusy(true);
    try {
      MetaService.initiateAuth(brandId);
    } catch (error) {
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : "Impossibile avviare l'autenticazione",
        variant: 'destructive',
      });
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!connection) return;
    setBusy(true);
    try {
      await MetaService.disconnect(connection.id);
      toast({ title: 'Disconnesso', description: `Instagram scollegato da ${brandName}` });
      onChanged();
    } catch {
      toast({ title: 'Errore', description: 'Impossibile disconnettere', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (connection) {
    return (
      <div
        className="flex items-center gap-2 mb-3 px-2.5 py-2 rounded-lg text-[12px]"
        style={{
          backgroundColor: justConnected ? 'rgba(22,163,74,0.12)' : 'rgba(22,163,74,0.06)',
          border: `1px solid rgba(22,163,74,${justConnected ? 0.5 : 0.2})`,
          color: 'var(--ink)',
        }}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: '#16a34a' }} />
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase" style={{ color: '#16a34a', letterSpacing: '0.5px' }}>
            {justConnected ? 'Appena collegato' : 'Instagram collegato'}
          </div>
          <div className="font-semibold truncate">@{connection.instagram_username || 'profilo collegato'}</div>
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
    <div className="mb-3">
      <button
        onClick={(e) => { e.stopPropagation(); connect(); }}
        disabled={busy}
        className="w-full text-[11px] font-black uppercase py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ border: '1px solid var(--rosa)', color: 'var(--rosa)', backgroundColor: 'transparent' }}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Instagram className="h-3.5 w-3.5" />}
        Collega Instagram
      </button>
      <p className="text-[10px] leading-snug mt-1.5" style={{ color: 'var(--ink3)' }}>
        Si collega il profilo aperto ora su Instagram. Continuando accetti{' '}
        <Link to="/privacy" className="underline" onClick={(e) => e.stopPropagation()}>Privacy</Link> e{' '}
        <Link to="/terms" className="underline" onClick={(e) => e.stopPropagation()}>Termini</Link>.
      </p>
    </div>
  );
};

export default BrandInstagramConnect;
