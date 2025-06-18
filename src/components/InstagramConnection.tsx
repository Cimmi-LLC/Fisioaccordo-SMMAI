
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Instagram, CheckCircle, ExternalLink, BarChart3, AlertCircle, Zap } from "lucide-react";
import { InstagramService } from '@/services/instagramService';

interface InstagramConnectionData {
  id: string;
  instagram_user_id: string;
  username: string;
  profile_data: {
    username: string;
    account_type: 'PERSONAL' | 'BUSINESS';
    media_count: number;
    followers_count?: number;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const InstagramConnection: React.FC = () => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionData, setConnectionData] = useState<InstagramConnectionData | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInstagramConnections();
  }, []);

  const loadInstagramConnections = async () => {
    try {
      const { data, error } = await InstagramService.getUserConnections();
      
      if (error) {
        console.error('Errore caricamento connessioni:', error);
        return;
      }

      if (data && data.length > 0) {
        setConnectionData(data[0]);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Errore:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const connectInstagram = async () => {
    setIsConnecting(true);
    try {
      InstagramService.initiateAuth();
      
      toast({
        title: "🚀 Connessione in corso...",
        description: "Ti stiamo reindirizzando a Instagram. Autorizza l'accesso per collegare il tuo account."
      });
    } catch (error) {
      console.error('Errore avvio autenticazione:', error);
      toast({
        title: "❌ Errore",
        description: error instanceof Error ? error.message : "Impossibile avviare l'autenticazione Instagram",
        variant: "destructive"
      });
      setIsConnecting(false);
    }
  };

  const disconnectInstagram = async () => {
    if (!connectionData) return;

    try {
      const { error } = await InstagramService.disconnectAccount(connectionData.id);
      
      if (error) {
        toast({
          title: "❌ Errore",
          description: "Impossibile disconnettere l'account",
          variant: "destructive"
        });
        return;
      }

      setIsConnected(false);
      setConnectionData(null);
      
      toast({
        title: "✅ Account scollegato",
        description: "Il tuo account Instagram è stato scollegato con successo"
      });
    } catch (error) {
      console.error('Errore disconnessione:', error);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div>
            <span className="ml-2 text-gray-300">Caricamento...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isConnected && connectionData) {
    const profileData = connectionData.profile_data;

    return (
      <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center text-lg">
            <Instagram className="h-6 w-6 mr-2 text-pink-400" />
            Account Instagram Collegato
            <CheckCircle className="h-5 w-5 ml-2 text-green-400" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Informazioni Account */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Instagram className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">@{profileData.username}</p>
                  <p className="text-gray-400 text-sm">{profileData.account_type} Account</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {profileData.followers_count !== undefined && (
                  <div className="bg-gray-700/50 p-3 rounded-lg">
                    <p className="text-pink-400 text-sm font-medium">Follower</p>
                    <p className="text-white text-xl font-bold">{profileData.followers_count.toLocaleString()}</p>
                  </div>
                )}
                <div className="bg-gray-700/50 p-3 rounded-lg">
                  <p className="text-purple-400 text-sm font-medium">Post</p>
                  <p className="text-white text-xl font-bold">{profileData.media_count}</p>
                </div>
              </div>
            </div>

            {/* Azioni */}
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-green-500/20 to-blue-600/20 p-4 rounded-lg border border-green-500/30">
                <h4 className="text-white font-medium mb-2 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                  Connesso e Funzionante
                </h4>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>✅ Dati reali sincronizzati</li>
                  <li>✅ API Instagram Graph attiva</li>
                  <li>✅ Account {profileData.account_type.toLowerCase()}</li>
                  <li>🔄 Analytics in tempo reale</li>
                </ul>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  size="sm" 
                  className="bg-pink-600 hover:bg-pink-700 flex-1"
                  onClick={() => toast({
                    title: "🚀 Funzionalità in arrivo!",
                    description: "Le analisi dettagliate saranno presto disponibili"
                  })}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Visualizza Analytics
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={disconnectInstagram}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                >
                  Scollega
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center text-lg">
          <Instagram className="h-6 w-6 mr-2 text-pink-400" />
          Collega il tuo Account Instagram Business
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Requisiti e Benefici */}
          <div>
            <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20 mb-4">
              <h4 className="text-blue-400 font-medium mb-2 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                Requisiti
              </h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>📱 Account Instagram Business</li>
                <li>📄 Pagina Facebook collegata</li>
                <li>✅ Admin della pagina Facebook</li>
              </ul>
            </div>

            <h4 className="text-white font-medium mb-3 flex items-center">
              <Zap className="h-4 w-4 mr-2 text-yellow-400" />
              Cosa ottieni:
            </h4>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-start">
                <span className="text-pink-400 mr-2">✓</span>
                Dati reali del tuo profilo Instagram
              </li>
              <li className="flex items-start">
                <span className="text-pink-400 mr-2">✓</span>
                Conteggio follower e post aggiornati
              </li>
              <li className="flex items-start">
                <span className="text-pink-400 mr-2">✓</span>
                Accesso completo alle Instagram API
              </li>
              <li className="flex items-start">
                <span className="text-pink-400 mr-2">✓</span>
                Analytics e insights dettagliati
              </li>
            </ul>
          </div>

          {/* Azione di Connessione */}
          <div className="flex flex-col justify-center">
            <div className="bg-gradient-to-br from-pink-500/10 to-purple-600/10 p-6 rounded-lg border border-pink-500/20 text-center">
              <Instagram className="h-12 w-12 text-pink-400 mx-auto mb-4" />
              
              <h3 className="text-white font-semibold mb-2">Connessione Semplificata</h3>
              <p className="text-gray-300 mb-4 text-sm">
                Sistema centralizzato - nessuna configurazione richiesta. 
                Un clic e sei collegato! 🚀
              </p>
              
              <Button 
                onClick={connectInstagram}
                disabled={isConnecting}
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-semibold"
                size="lg"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Collegamento...
                  </>
                ) : (
                  <>
                    <Instagram className="h-5 w-5 mr-2" />
                    Collega Instagram Business
                  </>
                )}
              </Button>
              
              <p className="text-xs text-gray-400 mt-3">
                ✅ Sicuro e conforme alle policy Instagram<br/>
                ⚡ Configurazione automatica
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InstagramConnection;
