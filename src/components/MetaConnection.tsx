import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
        title: "Error",
        description: error instanceof Error ? error.message : "Unable to start authentication",
        variant: "destructive"
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      await MetaService.disconnect(connectionId);
      toast({ title: "Disconnected", description: "Meta account disconnected successfully" });
      loadConnections();
    } catch {
      toast({ title: "Error", description: "Unable to disconnect", variant: "destructive" });
    }
  };

  const handleSaveUsername = async (connectionId: string) => {
    const cleaned = usernameInput.replace(/^@/, '').trim();
    if (!cleaned) {
      toast({ title: "Error", description: "Enter a valid username", variant: "destructive" });
      return;
    }
    setSavingUsername(true);
    try {
      const { error } = await supabase
        .from('meta_connections' as any)
        .update({ instagram_username: cleaned } as any)
        .eq('id', connectionId);

      if (error) throw error;

      toast({ title: "Saved!", description: `Username @${cleaned} updated` });
      setEditingUsername(false);
      setUsernameInput('');
      loadConnections();
    } catch (err) {
      toast({ title: "Error", description: "Unable to save username", variant: "destructive" });
    } finally {
      setSavingUsername(false);
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
          Social Connection
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeConnection ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                ✅ Connected
              </Badge>
            </div>
            
            {editingUsername ? (
              <div className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-pink-500 shrink-0" />
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
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => handleSaveUsername(activeConnection.id)} disabled={savingUsername}>
                  {savingUsername ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-green-500" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setEditingUsername(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : activeConnection.instagram_username ? (
              <div className="flex items-center gap-2 text-sm text-card-foreground">
                <Instagram className="h-4 w-4 text-pink-500" />
                <span>@{activeConnection.instagram_username}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setUsernameInput(activeConnection.instagram_username || ''); setEditingUsername(true); }}>
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-amber-400">
                  ⚠️ Username not retrieved automatically. Enter it manually:
                </p>
                <div className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-500 shrink-0" />
                  <Input value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} placeholder="yourusername" className="h-8 text-sm" onKeyDown={(e) => { if (e.key === 'Enter') handleSaveUsername(activeConnection.id); }} />
                  <Button size="sm" onClick={() => handleSaveUsername(activeConnection.id)} disabled={savingUsername || !usernameInput.trim()} className="shrink-0">
                    {savingUsername ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                  </Button>
                </div>
              </div>
            )}

            <Button onClick={() => handleDisconnect(activeConnection.id)} variant="outline" size="sm" className="w-full mt-2">
              <Unlink className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your Instagram Business account to publish directly.
            </p>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="consent-connect"
                checked={agreedToConnect}
                onCheckedChange={(checked) => setAgreedToConnect(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="consent-connect" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                I agree to share my Instagram data (username, access token) with this app as described in the{' '}
                <Link to="/privacy" className="underline text-primary hover:text-primary/80">Privacy Policy</Link> and{' '}
                <Link to="/terms" className="underline text-primary hover:text-primary/80">Terms of Service</Link>.
              </label>
            </div>
            
            <Button onClick={handleConnect} disabled={connecting || !agreedToConnect} className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white">
              {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Instagram className="mr-2 h-4 w-4" />}
              Connect Instagram Business
            </Button>

            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Requirements:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Instagram Business or Creator account</li>
                <li>Public profile (not private)</li>
                <li>If you have a personal account, convert it: <span className="font-medium">Settings → Account → Switch to professional account</span></li>
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
