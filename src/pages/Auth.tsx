import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    clinicName: ''
  });

  useEffect(() => {
    // Controlla se l'utente è già autenticato
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkAuth();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      toast({
        title: "Termini e condizioni",
        description: "Devi accettare i termini e condizioni per registrarti",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            clinic_name: formData.clinicName
          }
        }
      });

      if (error) {
        toast({
          title: "Errore registrazione",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "🎉 Registrazione completata!",
          description: "Verifica la tua email per attivare l'account"
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la registrazione",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) {
        toast({
          title: "Errore login",
          description: error.message,
          variant: "destructive"
        });
      } else {
        // Se "Resta collegato" è selezionato, aggiorna le impostazioni di sessione
        if (rememberMe) {
          // Questo permette alla sessione di rimanere attiva più a lungo
          await supabase.auth.refreshSession();
        }
        
        toast({
          title: "🚀 Benvenuto!",
          description: "Login effettuato con successo"
        });
        navigate('/');
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante il login",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent -z-10" />
      <div className="w-full max-w-md relative z-10">
        {/* Header con branding e logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <img 
              src="/lovable-uploads/217c8d5c-ce96-40c5-ab52-ff057f4b0d15.png" 
              alt="FisioAccordo Logo" 
              className="h-16 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            FisioAccordo<span className="text-fisio">(VIRAL)</span>ContentAI
          </h1>
          <p className="text-muted-foreground">
            Genera contenuti professionali per i tuoi social
          </p>
        </div>

        <Card className="bg-card/90 border-border backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-card-foreground text-center">
              Accedi alla Piattaforma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted">
                <TabsTrigger value="signin" className="data-[state=active]:bg-fisio data-[state=active]:text-fisio-foreground">
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-fisio data-[state=active]:text-fisio-foreground">
                  Registrati
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="bg-muted border-border"
                      placeholder="la-tua-email@esempio.com"
                      required
                    />
                  </div>
                   <div>
                     <Label className="text-muted-foreground">Password</Label>
                     <div className="relative">
                       <Input
                         type={showPassword ? "text" : "password"}
                         name="password"
                         value={formData.password}
                         onChange={handleInputChange}
                         className="bg-muted border-border pr-10"
                         placeholder="••••••••"
                         required
                       />
                       <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                         {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                       </button>
                     </div>
                   </div>
                  
                  {/* Opzione "Resta collegato" */}
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="rememberMe" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer">
                      🔒 Resta collegato
                    </Label>
                  </div>
                   
                   <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm text-fisio hover:underline w-full text-right">
                     Password dimenticata?
                   </button>

                   <Button
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-fisio hover:bg-fisio/90 text-fisio-foreground"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Accesso...
                      </>
                    ) : (
                      'Accedi'
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Nome</Label>
                      <Input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="bg-muted border-border"
                        placeholder="Mario"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Cognome</Label>
                      <Input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="bg-muted border-border"
                        placeholder="Rossi"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Centro/Studio</Label>
                    <Input
                      type="text"
                      name="clinicName"
                      value={formData.clinicName}
                      onChange={handleInputChange}
                      className="bg-muted border-border"
                      placeholder="Studio Fisioterapico XYZ"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="bg-muted border-border"
                      placeholder="la-tua-email@esempio.com"
                      required
                    />
                  </div>
                   <div>
                     <Label className="text-muted-foreground">Password</Label>
                     <div className="relative">
                       <Input
                         type={showPassword ? "text" : "password"}
                         name="password"
                         value={formData.password}
                         onChange={handleInputChange}
                         className="bg-muted border-border pr-10"
                         placeholder="••••••••"
                         required
                       />
                       <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                         {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                       </button>
                     </div>
                   </div>
                  
                  {/* Consensi e Privacy */}
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-start space-x-2">
                      <Checkbox 
                        id="terms" 
                        checked={agreedToTerms}
                        onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                      />
                      <Label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                        Accetto i <span className="text-fisio underline">Termini e Condizioni</span>, l'
                        <span className="text-fisio underline">Informativa Privacy</span> e autorizzo 
                        Cimmi LLC al trattamento dei miei dati personali per la fornitura del servizio, 
                        l'invio di comunicazioni commerciali e l'analisi statistica dei contenuti generati. 
                        Comprendo che i miei dati saranno trattati in conformità al GDPR e che posso 
                        revocare il consenso in qualsiasi momento.
                      </Label>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading || !agreedToTerms}
                    className="w-full bg-fisio hover:bg-fisio/90 text-fisio-foreground disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registrazione...
                      </>
                    ) : (
                      'Crea Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-foreground/70 text-sm">
          <p>Crea contenuti professionali per Instagram, LinkedIn e Facebook</p>
          <p className="mt-2">✨ AI copywriting + immagini generate automaticamente</p>
        </div>

        {/* Disclaimer Copyright */}
        <div className="mt-8 p-4 bg-card/50 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            © 2024 Cimmi LLC. Tutti i diritti riservati.<br/>
            FisioAccordo(VIRAL)ContentAI è proprietà esclusiva di Cimmi LLC.<br/>
            È vietata la copia, riproduzione o replica di questa piattaforma senza autorizzazione scritta.
          </p>
        </div>

        <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-card-foreground">Recupera Password</DialogTitle>
              <DialogDescription>Inserisci la tua email e ti invieremo un link per reimpostare la password.</DialogDescription>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setForgotLoading(true);
              try {
                const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
                  redirectTo: `${window.location.origin}/reset-password`
                });
                if (error) {
                  toast({ title: "Errore", description: error.message, variant: "destructive" });
                } else {
                  toast({ title: "📧 Email inviata!", description: "Controlla la tua casella email per il link di recupero" });
                  setShowForgotPassword(false);
                  setForgotEmail('');
                }
              } catch {
                toast({ title: "Errore", description: "Errore durante l'invio", variant: "destructive" });
              } finally {
                setForgotLoading(false);
              }
            }} className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <Input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="bg-muted border-border" placeholder="la-tua-email@esempio.com" required />
              </div>
              <Button type="submit" disabled={forgotLoading} className="w-full bg-fisio hover:bg-fisio/90 text-fisio-foreground">
                {forgotLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Invio...</> : 'Invia link di recupero'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Auth;
