import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Loader2, Unlink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { MetaService, type MetaConnectionData } from '@/services/metaService';
import { useToast } from '@/hooks/use-toast';

interface Props {
  brandId: string;
  brandName: string;
  connection: MetaConnectionData | null;
  onChanged: () => void;
}

/**
 * Riga "Instagram" nella card di un brand: ogni brand ha il suo profilo.
 * Collegato → @username e Scollega; altrimenti "Collega Instagram" con il
 * consenso (lo stesso delle Impostazioni) prima di andare su Instagram.
 */
const BrandInstagramConnect: React.FC<Props> = ({ brandId, brandName, connection, onChanged }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
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
      <div className="flex items-center gap-2 mb-3 text-[12px]" style={{ color: 'var(--ink)' }}>
        <Instagram className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--rosa)' }} />
        <span className="font-semibold truncate">@{connection.instagram_username || 'profilo collegato'}</span>
        <button
          onClick={(e) => { e.stopPropagation(); disconnect(); }}
          disabled={busy}
          className="ml-auto flex items-center gap-1 text-[10px] font-bold uppercase disabled:opacity-50"
          style={{ color: 'var(--ink3)' }}
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
          Scollega
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="w-full mb-3 text-[11px] font-black uppercase py-2 rounded-lg flex items-center justify-center gap-2"
        style={{ border: '1px solid var(--rosa)', color: 'var(--rosa)', backgroundColor: 'transparent' }}
      >
        <Instagram className="h-3.5 w-3.5" />
        Collega Instagram
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setAgreed(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Instagram className="h-5 w-5" style={{ color: 'var(--rosa)' }} />
              Collega Instagram a {brandName}
            </DialogTitle>
            <DialogDescription>
              Su Instagram entra con il profilo di questo brand: i post e i numeri di {brandName} useranno quel profilo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-start space-x-2">
              <Checkbox
                id={`consent-${brandId}`}
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor={`consent-${brandId}`} className="text-xs leading-snug cursor-pointer" style={{ color: 'var(--ink3)' }}>
                Acconsento a condividere i miei dati Instagram (username, access token) con questa app come descritto nella{' '}
                <Link to="/privacy" className="underline" style={{ color: 'var(--viola)' }}>Privacy Policy</Link> e nei{' '}
                <Link to="/terms" className="underline" style={{ color: 'var(--viola)' }}>Termini di Servizio</Link>.
              </label>
            </div>

            <button
              onClick={connect}
              disabled={busy || !agreed}
              className="w-full text-white text-[11px] font-black uppercase py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: 'var(--rosa)', border: '1px solid var(--rosa)', letterSpacing: '0.5px' }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4" />}
              Continua su Instagram
            </button>

            <p className="text-xs" style={{ color: 'var(--ink3)' }}>
              Si collega il profilo aperto adesso su instagram.com: se è un altro, prima passa a quello di {brandName} su Instagram (foto profilo → Cambia account). Serve un account Business o Creator, con profilo pubblico.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BrandInstagramConnect;
