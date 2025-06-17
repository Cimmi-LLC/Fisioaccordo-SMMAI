
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
import { Loader2, Heart, Zap } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header con branding e logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <img 
              src="/lovable-uploads/217c8d5c-ce96-40c5-ab52-ff057f4b0d15.png" 
              alt="FisioAccordo Logo" 
              className="h-16 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            FisioAccordo<span className="text-purple-300">(VIRAL)</span>ContentAI
          </h1>
          <p className="text-gray-300">
            Genera contenuti professionali per i tuoi social
          </p>
        </div>

        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-center">
              Accedi alla Piattaforma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-700">
                <TabsTrigger value="signin" className="text-white data-[state=active]:bg-blue-600">
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-white data-[state=active]:bg-blue-600">
                  Registrati
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Email</Label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="la-tua-email@esempio.com"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Password</Label>
                    <Input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
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
                      <Label className="text-gray-300">Nome</Label>
                      <Input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="Mario"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Cognome</Label>
                      <Input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="Rossi"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300">Centro/Studio</Label>
                    <Input
                      type="text"
                      name="clinicName"
                      value={formData.clinicName}
                      onChange={handleInputChange}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Studio Fisioterapico XYZ"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Email</Label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="la-tua-email@esempio.com"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Password</Label>
                    <Input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  
                  {/* Consensi e Privacy */}
                  <div className="space-y-3 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                    <div className="flex items-start space-x-2">
                      <Checkbox 
                        id="terms" 
                        checked={agreedToTerms}
                        onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                      />
                      <Label htmlFor="terms" className="text-xs text-gray-300 leading-relaxed cursor-pointer">
                        Accetto i <span className="text-blue-400 underline">Termini e Condizioni</span>, l'
                        <span className="text-blue-400 underline">Informativa Privacy</span> e autorizzo 
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
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
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

        <div className="text-center mt-6 text-gray-400 text-sm">
          <p>Crea contenuti professionali per Instagram, LinkedIn e Facebook</p>
          <p className="mt-2">✨ AI copywriting + immagini generate automaticamente</p>
        </div>

        {/* Disclaimer Copyright */}
        <div className="mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
          <p className="text-xs text-gray-400 text-center leading-relaxed">
            © 2024 Cimmi LLC. Tutti i diritti riservati.<br/>
            FisioAccordo(VIRAL)ContentAI è proprietà esclusiva di Cimmi LLC.<br/>
            È vietata la copia, riproduzione o replica di questa piattaforma senza autorizzazione scritta.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
