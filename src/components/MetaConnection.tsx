
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Instagram, Link2, Unlink, Loader2, Pencil, Check, X } from "lucide-react";
import { MetaService, type MetaConnectionData } from '@/services/metaService';
import { useToast } from '@/hooks/use-toast';
import PersonalAccountGuide from './PersonalAccountGuide';
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from '@/integrations/supabase/client';

const MetaConnection: React.FC = () => {
  const [connections, setConnections] = useState<MetaConnectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showPersonalGuide, setShowPersonalGuide] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [agreedToConnect, setAgreedToConnect] = useState(false);
  const { toast } = useToast();

  const loadConnections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await MetaService.getConnections();
      setConnections(data);
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'meta-auth-error' && event.data?.error_type === 'PERSONAL_ACCOUNT') {
        setShowPersonalGuide(true);
        setConnecting(false);
      }
      if (event.data?.type === 'meta-auth-success' || event.data?.type === 'meta-auth-error') {
        setConnecting(false);
        loadConnections();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loadConnections]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const handleConnect = () => {
    setConnecting(true);
    try {
      MetaService.initiateAuth();
    } catch (error) {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Impossibile avviare l'autenticazione",
        variant: "destructive"
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      await MetaService.disconnect(connectionId);
      toast({ title: "Disconnesso", description: "Account Meta disconnesso con successo" });
      loadConnections();
    } catch {
      toast({ title: "Errore", description: "Impossibile disconnettere", variant: "destructive" });
    }
  };

  const handleSaveUsername = async (connectionId: string) => {
    const cleaned = usernameInput.replace(/^@/, '').trim();
    if (!cleaned) {
      toast({ title: "Errore", description: "Inserisci un username valido", variant: "destructive" });
      return;
    }
    setSavingUsername(true);
    try {
      const { error } = await supabase
        .from('meta_connections' as any)
        .update({ instagram_username: cleaned } as any)
        .eq('id', connectionId);
      if (error) throw error;
      toast({ title: "Salvato!", description: `Username @${cleaned} aggiornato` });
      setEditingUsername(false);
      setUsernameInput('');
      loadConnections();
    } catch {
      toast({ title: "Errore", description: "Impossibile salvare l'username", variant: "destructive" });
    } finally {
      setSavingUsername(false);
    }
  };

  const activeConnection = connections.find(c => c.is_active);

  if (loading) {
    return (
      <Card className="panel-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--ink3)' }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="panel-card">
      <CardHeader style={{ padding: '22px 24px', borderBottom: '1px solid var(--line)' }}>
        <CardTitle
          className="flex items-center gap-2"
          style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}
        >
          <Link2 className="h-4 w-4" style={{ color: 'var(--viola)' }} />
          Connessione Social
        </CardTitle>
      </CardHeader>
      <CardContent style={{ padding: '22px 24px' }}>
        {activeConnection ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: 'rgba(22,163,74,0.1)',
                  color: '#16a34a',
                  border: '1px solid rgba(22,163,74,0.2)',
                }}
              >
                Connesso
              </span>
            </div>

            {editingUsername ? (
              <div className="flex items-center gap-2">
                <Instagram className="h-4 w-4 shrink-0" style={{ color: 'var(--rosa)' }} />
                <Input
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="yourusername"
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveUsername(activeConnection.id);
                    if (e.key === 'Escape') setEditingUsername(false);
                  }}
                />
                <button
                  className="h-8 w-8 shrink-0 flex items-center justify-center"
                  onClick={() => handleSaveUsername(activeConnection.id)}
                  disabled={savingUsername}
                >
                  {savingUsername ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" style={{ color: '#16a34a' }} />}
                </button>
                <button className="h-8 w-8 shrink-0 flex items-center justify-center" onClick={() => setEditingUsername(false)}>
                  <X className="h-3 w-3" style={{ color: 'var(--ink3)' }} />
                </button>
              </div>
            ) : activeConnection.instagram_username ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink)' }}>
                <Instagram className="h-4 w-4" style={{ color: 'var(--rosa)' }} />
                <span className="font-medium">@{activeConnection.instagram_username}</span>
                <button
                  className="h-6 w-6 flex items-center justify-center"
                  onClick={() => { setUsernameInput(activeConnection.instagram_username || ''); setEditingUsername(true); }}
                >
                  <Pencil className="h-3 w-3" style={{ color: 'var(--ink3)' }} />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium" style={{ color: '#d97706' }}>
                  Username non recuperato automaticamente. Inseriscilo manualmente:
                </p>
                <div className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 shrink-0" style={{ color: 'var(--rosa)' }} />
                  <Input
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="tuousername"
                    className="h-8 text-sm"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveUsername(activeConnection.id); }}
                  />
                  <button
                    onClick={() => handleSaveUsername(activeConnection.id)}
                    disabled={savingUsername || !usernameInput.trim()}
                    className="shrink-0 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                    style={{ backgroundColor: 'var(--viola)' }}
                  >
                    {savingUsername ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salva'}
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => handleDisconnect(activeConnection.id)}
              className="w-full text-[11px] font-black uppercase py-2.5 rounded-lg flex items-center justify-center gap-2 mt-2 transition-colors"
              style={{
                border: '1px solid var(--line)',
                color: 'var(--ink3)',
                backgroundColor: 'transparent',
              }}
            >
              <Unlink className="h-3.5 w-3.5" />
              Disconnetti
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--ink3)' }}>
              Connetti il tuo account Instagram Business per pubblicare direttamente.
            </p>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="consent-connect"
                checked={agreedToConnect}
                onCheckedChange={(checked) => setAgreedToConnect(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="consent-connect" className="text-xs leading-snug cursor-pointer" style={{ color: 'var(--ink3)' }}>
                Acconsento a condividere i miei dati Instagram (username, access token) con questa app come descritto nella{' '}
                <Link to="/privacy" className="underline" style={{ color: 'var(--viola)' }}>Privacy Policy</Link> e nei{' '}
                <Link to="/terms" className="underline" style={{ color: 'var(--viola)' }}>Termini di Servizio</Link>.
              </label>
            </div>

            <button
              onClick={handleConnect}
              disabled={connecting || !agreedToConnect}
              className="w-full text-white text-[11px] font-black uppercase py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
              style={{
                backgroundColor: 'var(--rosa)',
                border: '1px solid var(--rosa)',
                letterSpacing: '0.5px',
              }}
            >
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4" />}
              Connetti Instagram Business
            </button>

            <div className="text-xs space-y-1" style={{ color: 'var(--ink3)' }}>
              <p className="font-bold" style={{ color: 'var(--ink2)' }}>Requisiti:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Account Instagram Business o Creator</li>
                <li>Profilo pubblico (non privato)</li>
                <li>Se hai un account personale, convertilo: <span className="font-medium" style={{ color: 'var(--ink2)' }}>Impostazioni → Account → Passa a un account professionale</span></li>
              </ol>
            </div>
          </div>
        )}

        <PersonalAccountGuide open={showPersonalGuide} onOpenChange={setShowPersonalGuide} />
      </CardContent>
    </Card>
  );
};

export default MetaConnection;
