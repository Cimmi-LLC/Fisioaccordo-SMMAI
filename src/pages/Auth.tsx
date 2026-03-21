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
  const [activeTab, setActiveTab] = useState('signin');
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
        title: "Termini e Condizioni",
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
        if (error.message.includes('already registered') || (error as any).code === 'user_already_exists') {
          toast({
            title: "📧 Email già registrata",
            description: "Hai già un account! Ti portiamo al Login.",
          });
          setActiveTab('signin');
          return;
        }
        toast({
          title: "Errore di registrazione",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "🎉 Registrazione completata!",
          description: "Controlla la tua email per attivare l'account"
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
          title: "Login error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        if (rememberMe) {
          await supabase.auth.refreshSession();
        }
        
        toast({
          title: "🚀 Welcome!",
          description: "Successfully logged in"
        });
        navigate('/');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error during login",
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
            Generate professional content for your social media
          </p>
        </div>

        <Card className="bg-card/90 border-border backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-card-foreground text-center">
              Access the Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted">
                <TabsTrigger value="signin" className="data-[state=active]:bg-fisio data-[state=active]:text-fisio-foreground">
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-fisio data-[state=active]:text-fisio-foreground">
                  Sign Up
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <Input type="email" name="email" value={formData.email} onChange={handleInputChange} className="bg-muted border-border" placeholder="your-email@example.com" required />
                  </div>
                   <div>
                     <Label className="text-muted-foreground">Password</Label>
                     <div className="relative">
                       <Input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} className="bg-muted border-border pr-10" placeholder="••••••••" required />
                       <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                         {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                       </button>
                     </div>
                   </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox id="rememberMe" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked as boolean)} />
                    <Label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer">
                      🔒 Remember me
                    </Label>
                  </div>
                   
                   <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm text-fisio hover:underline w-full text-right">
                     Forgot password?
                   </button>

                   <Button type="submit" disabled={loading} className="w-full bg-fisio hover:bg-fisio/90 text-fisio-foreground">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">First Name</Label>
                      <Input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="bg-muted border-border" placeholder="John" required />
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Last Name</Label>
                      <Input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="bg-muted border-border" placeholder="Doe" required />
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Clinic/Studio</Label>
                    <Input type="text" name="clinicName" value={formData.clinicName} onChange={handleInputChange} className="bg-muted border-border" placeholder="Physiotherapy Studio XYZ" />
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <Input type="email" name="email" value={formData.email} onChange={handleInputChange} className="bg-muted border-border" placeholder="your-email@example.com" required />
                  </div>
                   <div>
                     <Label className="text-muted-foreground">Password</Label>
                     <div className="relative">
                       <Input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} className="bg-muted border-border pr-10" placeholder="••••••••" required />
                       <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                         {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                       </button>
                     </div>
                   </div>
                  
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-start space-x-2">
                      <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)} />
                      <Label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                        I accept the <a href="/terms" className="text-fisio underline">Terms of Service</a>, the{' '}
                        <a href="/privacy" className="text-fisio underline">Privacy Policy</a> and authorize 
                        Cimmi LLC to process my personal data for service delivery, 
                        commercial communications, and statistical analysis of generated content. 
                        I understand that my data will be processed in compliance with GDPR and that I can 
                        withdraw consent at any time.
                      </Label>
                    </div>
                  </div>

                  <Button type="submit" disabled={loading || !agreedToTerms} className="w-full bg-fisio hover:bg-fisio/90 text-fisio-foreground disabled:opacity-50">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-foreground/70 text-sm">
          <p>Create professional content for Instagram, LinkedIn, and Facebook</p>
          <p className="mt-2">✨ AI copywriting + automatically generated images</p>
        </div>

        <div className="mt-8 p-4 bg-card/50 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            © {new Date().getFullYear()} Cimmi LLC. All rights reserved. | <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> | <a href="/terms" className="text-primary hover:underline">Terms of Service</a><br/>
            POST PER I SOCIAL 2-IG is the exclusive property of Cimmi LLC.<br/>
            Copying, reproduction, or replication of this platform without written authorization is prohibited.
          </p>
        </div>

        <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-card-foreground">Reset Password</DialogTitle>
              <DialogDescription>Enter your email and we'll send you a link to reset your password.</DialogDescription>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setForgotLoading(true);
              try {
                const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
                  redirectTo: `${window.location.origin}/reset-password`
                });
                if (error) {
                  toast({ title: "Error", description: error.message, variant: "destructive" });
                } else {
                  toast({ title: "📧 Email sent!", description: "Check your inbox for the recovery link" });
                  setShowForgotPassword(false);
                  setForgotEmail('');
                }
              } catch {
                toast({ title: "Error", description: "Error sending email", variant: "destructive" });
              } finally {
                setForgotLoading(false);
              }
            }} className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <Input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="bg-muted border-border" placeholder="your-email@example.com" required />
              </div>
              <Button type="submit" disabled={forgotLoading} className="w-full bg-fisio hover:bg-fisio/90 text-fisio-foreground">
                {forgotLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : 'Send Recovery Link'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Auth;
