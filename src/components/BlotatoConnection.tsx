import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BlotatoService, BlotatoAccount } from '@/services/blotatoService';
import { Loader2, Plus, CheckCircle, AlertCircle, Clock, Unlink } from 'lucide-react';

const BlotatoConnection: React.FC = () => {
  const [accounts, setAccounts] = useState<BlotatoAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadConnectedAccounts();
  }, []);

  const loadConnectedAccounts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await BlotatoService.getConnectedAccounts();
      
      if (error) {
        throw new Error(error.message);
      }
      
      setAccounts(data || []);
    } catch (error) {
      console.error('Errore caricamento account:', error);
      toast({
        title: "❌ Errore",
        description: "Impossibile caricare gli account collegati",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectAccount = async (accountId: string, platform: string) => {
    try {
      const result = await BlotatoService.disconnectAccount(accountId);
      
      if (result.success) {
        toast({
          title: "✅ Account Scollegato",
          description: `Account ${platform} scollegato con successo`
        });
        loadConnectedAccounts();
      } else {
        throw new Error(result.error || 'Errore sconosciuto');
      }
    } catch (error) {
      toast({
        title: "❌ Errore",
        description: `Impossibile scollegare l'account: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      connected: { variant: 'default' as const, label: 'Collegato' },
      error: { variant: 'destructive' as const, label: 'Errore' },
      pending: { variant: 'secondary' as const, label: 'In Attesa' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.error;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {config.label}
      </Badge>
    );
  };

  const getPlatformInfo = (platform: string) => {
    const platforms = BlotatoService.getSupportedPlatforms();
    return platforms.find(p => p.id === platform) || { name: platform, icon: '🔗', color: 'from-gray-500 to-gray-600' };
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-primary-foreground flex items-center justify-center">
              🚀
            </div>
            Blotato Multi-Platform
          </CardTitle>
          <CardDescription>
            Gestisci i tuoi account social collegati
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Caricamento account...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-primary-foreground flex items-center justify-center">
            🚀
          </div>
          Blotato Multi-Platform
        </CardTitle>
        <CardDescription>
          Pubblica su 15+ piattaforme social con un click
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.length === 0 ? (
          <div className="text-center py-8">
            <div className="mb-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nessun Account Collegato</h3>
              <p className="text-muted-foreground mb-4">
                Collega i tuoi account social per iniziare a pubblicare
              </p>
            </div>
            <Button className="bg-gradient-to-r from-primary to-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Collega Primo Account
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => {
                const platformInfo = getPlatformInfo(account.platform);
                return (
                  <div
                    key={account.id}
                    className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-full bg-gradient-to-r ${platformInfo.color} flex items-center justify-center text-white text-sm`}>
                          {platformInfo.icon}
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{platformInfo.name}</h4>
                          <p className="text-xs text-muted-foreground">@{account.username}</p>
                        </div>
                      </div>
                      {getStatusBadge(account.status)}
                    </div>
                    
                    {account.status === 'connected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnectAccount(account.id, platformInfo.name)}
                        className="w-full"
                      >
                        <Unlink className="h-3 w-3 mr-2" />
                        Scollega
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Collega Nuovo Account
              </Button>
            </div>
          </>
        )}

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Piattaforme Supportate</h4>
          <div className="flex flex-wrap gap-2">
            {BlotatoService.getSupportedPlatforms().map((platform) => (
              <Badge key={platform.id} variant="secondary" className="flex items-center gap-1">
                <span>{platform.icon}</span>
                {platform.name}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BlotatoConnection;