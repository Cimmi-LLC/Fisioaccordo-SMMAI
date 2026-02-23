import React, { useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Instagram, Link2, Unlink, Loader2 } from "lucide-react";
import { MetaService, type MetaConnectionData } from '@/services/metaService';
import { useToast } from '@/hooks/use-toast';
import PersonalAccountGuide from './PersonalAccountGuide';

const MetaConnection: React.FC = () => {
  const [connections, setConnections] = useState<MetaConnectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [showPersonalGuide, setShowPersonalGuide] = useState(false);
  const { toast } = useToast();

  const loadConnections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await MetaService.getConnections();
      setConnections(data);
    } catch (error) {
      console.error('Errore caricamento connessioni:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for postMessage from auth popup
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

  const activeConnection = connections.find(c => c.is_active);

  if (loading) {
    return (
      <Card className="bg-card/50 border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-card-foreground flex items-center gap-2 text-base">
          <Link2 className="h-5 w-5" />
          Connessione Social
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeConnection ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                ✅ Collegato
              </Badge>
            </div>
            
            {activeConnection.instagram_username && (
              <div className="flex items-center gap-2 text-sm text-card-foreground">
                <Instagram className="h-4 w-4 text-pink-500" />
                <span>@{activeConnection.instagram_username}</span>
              </div>
            )}

            <Button
              onClick={() => handleDisconnect(activeConnection.id)}
              variant="outline"
              size="sm"
              className="w-full mt-2"
            >
              <Unlink className="mr-2 h-4 w-4" />
              Scollega
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Collega il tuo account Instagram Business per pubblicare direttamente.
            </p>
            
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white"
            >
              {connecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Instagram className="mr-2 h-4 w-4" />
              )}
              Collega Instagram Business
            </Button>

            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Requisiti:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Account Instagram Business o Creator</li>
                <li>Profilo pubblico (non privato)</li>
                <li>Se hai un account personale, convertilo: <span className="font-medium">Impostazioni → Account → Passa a un account professionale</span></li>
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
