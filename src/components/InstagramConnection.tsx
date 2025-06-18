
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Instagram, CheckCircle, ExternalLink, BarChart3 } from "lucide-react";
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

  const connectInstagram = () => {
    setIsConnecting(true);
    try {
      InstagramService.initiateAuth();
    } catch (error) {
      console.error('Errore avvio autenticazione:', error);
      toast({
        title: "❌ Errore",
        description: "Impossibile avviare l'autenticazione Instagram",
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
        title: "Account scollegato",
        description: "Il tuo account Instagram è stato scollegato"
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
                  <p className="text-gray-400 text-sm">{profileData.account_type}</p>
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
              <div className="bg-gradient-to-r from-pink-500/20 to-purple-600/20 p-4 rounded-lg border border-pink-500/30">
                <h4 className="text-white font-medium mb-2 flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2 text-pink-400" />
                  Dati Reali Disponibili
                </h4>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>✅ Profilo collegato</li>
                  <li>✅ Conteggio post reale</li>
                  {profileData.account_type === 'BUSINESS' && <li>✅ Follower count (Business)</li>}
                  <li>🔄 Analytics in sviluppo</li>
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
          Collega il tuo Account Instagram
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Benefici */}
          <div>
            <h4 className="text-white font-medium mb-3">🚀 Cosa ottieni collegando Instagram:</h4>
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
                Accesso a statistiche dettagliate (in arrivo)
              </li>
              <li className="flex items-start">
                <span className="text-pink-400 mr-2">✓</span>
                Contenuti personalizzati basati sul tuo pubblico
              </li>
            </ul>
          </div>

          {/* Azione di Connessione */}
          <div className="flex flex-col justify-center">
            <div className="bg-gradient-to-br from-pink-500/10 to-purple-600/10 p-6 rounded-lg border border-pink-500/20 text-center">
              <Instagram className="h-12 w-12 text-pink-400 mx-auto mb-4" />
              <p className="text-gray-300 mb-4 text-sm">
                Collega il tuo account Instagram per accedere ai dati reali del tuo profilo
              </p>
              <Button 
                onClick={connectInstagram}
                disabled={isConnecting}
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Collegamento...
                  </>
                ) : (
                  <>
                    <Instagram className="h-4 w-4 mr-2" />
                    Collega Instagram
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-400 mt-2">
                Sicuro e conforme alle policy di Instagram
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InstagramConnection;
