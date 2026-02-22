import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('type=recovery')) {
      toast({ title: "Link non valido", description: "Questo link di recupero non è valido.", variant: "destructive" });
      navigate('/auth');
    }
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Errore", description: "Le password non coincidono", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Errore", description: "La password deve avere almeno 6 caratteri", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({ title: "Errore", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "✅ Password aggiornata!", description: "Ora puoi accedere con la nuova password" });
        navigate('/auth');
      }
    } catch {
      toast({ title: "Errore", description: "Errore durante l'aggiornamento", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent -z-10" />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/lovable-uploads/217c8d5c-ce96-40c5-ab52-ff057f4b0d15.png" alt="Logo" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground">Reimposta Password</h1>
        </div>
        <Card className="bg-card/90 border-border backdrop-blur-sm">
          <CardHeader><CardTitle className="text-card-foreground text-center">Inserisci la nuova password</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Nuova password</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="bg-muted border-border pr-10" placeholder="••••••••" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Conferma password</Label>
                <div className="relative">
                  <Input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="bg-muted border-border pr-10" placeholder="••••••••" required />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-fisio hover:bg-fisio/90 text-fisio-foreground">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Aggiornamento...</> : 'Aggiorna Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
