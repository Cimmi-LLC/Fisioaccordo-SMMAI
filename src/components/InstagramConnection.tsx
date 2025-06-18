
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Instagram, CheckCircle, ExternalLink, BarChart3 } from "lucide-react";

interface InstagramData {
  username: string;
  followers_count: number;
  media_count: number;
  account_type: string;
  profile_picture_url?: string;
}

const InstagramConnection: React.FC = () => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [instagramData, setInstagramData] = useState<InstagramData | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Controlla se c'è già una connessione salvata
    const savedConnection = localStorage.getItem('instagram_connection');
    if (savedConnection) {
      const data = JSON.parse(savedConnection);
      setIsConnected(true);
      setInstagramData(data);
    }
  }, []);

  const connectInstagram = () => {
    setIsConnecting(true);
    
    // Simula la connessione Instagram (in un'app reale useresti l'API di Instagram)
    setTimeout(() => {
      const mockData: InstagramData = {
        username: 'fisioterapista_pro',
        followers_count: 2547,
        media_count: 156,
        account_type: 'BUSINESS'
      };
      
      setInstagramData(mockData);
      setIsConnected(true);
      localStorage.setItem('instagram_connection', JSON.stringify(mockData));
      
      toast({
        title: "🎉 Instagram Collegato!",
        description: "Il tuo account Instagram è stato collegato con successo"
      });
      
      setIsConnecting(false);
    }, 2000);
  };

  const disconnectInstagram = () => {
    setIsConnected(false);
    setInstagramData(null);
    localStorage.removeItem('instagram_connection');
    
    toast({
      title: "Account scollegato",
      description: "Il tuo account Instagram è stato scollegato"
    });
  };

  if (isConnected && instagramData) {
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
                  <p className="text-white font-medium">@{instagramData.username}</p>
                  <p className="text-gray-400 text-sm">{instagramData.account_type}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 p-3 rounded-lg">
                  <p className="text-pink-400 text-sm font-medium">Follower</p>
                  <p className="text-white text-xl font-bold">{instagramData.followers_count.toLocaleString()}</p>
                </div>
                <div className="bg-gray-700/50 p-3 rounded-lg">
                  <p className="text-purple-400 text-sm font-medium">Post</p>
                  <p className="text-white text-xl font-bold">{instagramData.media_count}</p>
                </div>
              </div>
            </div>

            {/* Azioni */}
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-pink-500/20 to-purple-600/20 p-4 rounded-lg border border-pink-500/30">
                <h4 className="text-white font-medium mb-2 flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2 text-pink-400" />
                  Analisi Disponibili
                </h4>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>📊 Statistiche engagement</li>
                  <li>📈 Crescita follower</li>
                  <li>🎯 Analisi contenuti</li>
                  <li>⏰ Orari ottimali posting</li>
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
                Analisi dettagliate delle performance dei tuoi post
              </li>
              <li className="flex items-start">
                <span className="text-pink-400 mr-2">✓</span>
                Statistiche follower e engagement in tempo reale
              </li>
              <li className="flex items-start">
                <span className="text-pink-400 mr-2">✓</span>
                Suggerimenti per orari ottimali di pubblicazione
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
                Collega il tuo account Instagram Business per sbloccare analytics avanzate
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
