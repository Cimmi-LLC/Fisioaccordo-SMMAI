
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye, EyeOff, MailCheck, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  // post-signup state
  const [emailSent, setEmailSent] = useState(false);
  const [sentToEmail, setSentToEmail] = useState('');
  // email-not-confirmed state
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [loginError, setLoginError] = useState<'invalid_credentials' | 'email_not_confirmed' | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
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
      if (session) navigate('/');
    };
    checkAuth();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // reset error state on typing
    if (e.target.name === 'email' || e.target.name === 'password') {
      setEmailNotConfirmed(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      toast({ title: "Termini e Condizioni", description: "Devi accettare i termini e condizioni per registrarti", variant: "destructive" });
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
          data: { first_name: formData.firstName, last_name: formData.lastName, clinic_name: formData.clinicName }
        }
      });
      if (error) {
        if (error.message.includes('already registered') || (error as any).code === 'user_already_exists') {
          toast({ title: "Email già registrata", description: "Hai già un account! Ti portiamo al Login." });
          setActiveTab('signin');
          return;
        }
        toast({ title: "Errore di registrazione", description: error.message, variant: "destructive" });
      } else {
        setSentToEmail(formData.email);
        setEmailSent(true);
      }
    } catch {
      toast({ title: "Errore", description: "Errore durante la registrazione", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEmailNotConfirmed(false);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: formData.email, password: formData.password });
      if (error) {
        if (error.message.includes('Email not confirmed') || (error as any).code === 'email_not_confirmed') {
          setEmailNotConfirmed(true);
        } else {
          toast({ title: "Errore di accesso", description: "Email o password non corretti. Usa 'Password dimenticata?' per reimpostarla.", variant: "destructive" });
        }
      } else {
        if (rememberMe) await supabase.auth.refreshSession();
        toast({ title: "Benvenuto!", description: "Accesso effettuato con successo" });
        navigate('/');
      }
    } catch {
      toast({ title: "Errore", description: "Errore durante il login", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: formData.email });
      if (error) {
        toast({ title: "Errore", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Email inviata!", description: "Controlla la tua casella di posta e la cartella spam." });
        setEmailNotConfirmed(false);
        setSentToEmail(formData.email);
        setEmailSent(true);
      }
    } catch {
      toast({ title: "Errore", description: "Impossibile inviare l'email", variant: "destructive" });
    } finally {
      setResendLoading(false);
    }
  };

  /* ── Shared field label ── */
  const FieldLabel: React.FC<{ children: React.ReactNode; htmlFor?: string }> = ({ children, htmlFor }) => (
    <label
      htmlFor={htmlFor}
      className="block text-[10px] font-black uppercase mb-1.5"
      style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}
    >
      {children}
    </label>
  );

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--line)',
    borderRadius: '9px',
    color: 'var(--ink)',
    fontSize: '12px',
    fontWeight: 500,
    fontFamily: 'Montserrat, sans-serif',
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-md">

        {/* ── Logo / brand ── */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--viola)' }}>
              <img
                src="/lovable-uploads/217c8d5c-ce96-40c5-ab52-ff057f4b0d15.png"
                alt="FisioAccordo Logo"
                className="h-12 w-auto"
              />
            </div>
          </div>
          <h1 className="text-2xl leading-tight mb-1" style={{ fontWeight: 900, color: 'var(--ink)', letterSpacing: '-1px' }}>
            FisioAccordo<span style={{ color: 'var(--rosa)' }}>(VIRAL)</span>ContentAI
          </h1>
          <p className="text-[13px] font-medium" style={{ color: 'var(--ink3)' }}>
            Genera contenuti professionali per i tuoi social media
          </p>
        </div>

        {/* ── Card ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            boxShadow: '0 2px 12px rgba(85,70,151,0.07)',
          }}
        >
          {/* ── Email sent state ── */}
          {emailSent ? (
            <div className="p-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--viola-dim)' }}>
                  <MailCheck className="w-7 h-7" style={{ color: 'var(--viola)' }} />
                </div>
              </div>
              <div>
                <h2 className="text-[16px] font-black mb-1" style={{ color: 'var(--ink)' }}>Controlla la tua email</h2>
                <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink3)' }}>
                  Abbiamo inviato un link di conferma a<br />
                  <span className="font-semibold" style={{ color: 'var(--ink)' }}>{sentToEmail}</span>
                </p>
              </div>
              <div className="p-3 rounded-xl text-[11px] leading-relaxed" style={{ backgroundColor: 'var(--viola-dim)', color: 'var(--ink3)' }}>
                Clicca il link nell'email per attivare l'account. Controlla anche la cartella <strong>spam</strong> o <strong>promozioni</strong>.
              </div>
              <button
                onClick={() => { setEmailSent(false); setActiveTab('signin'); }}
                className="w-full text-white text-[12px] font-black uppercase py-3.5 rounded-xl"
                style={{ backgroundColor: 'var(--rosa)' }}
              >
                Torna al Login
              </button>
              <button
                onClick={async () => {
                  setResendLoading(true);
                  try {
                    await supabase.auth.resend({ type: 'signup', email: sentToEmail });
                    toast({ title: "Email reinviata!", description: "Controlla la tua casella di posta." });
                  } catch {
                    toast({ title: "Errore", description: "Impossibile reinviare", variant: "destructive" });
                  } finally {
                    setResendLoading(false);
                  }
                }}
                disabled={resendLoading}
                className="w-full text-[11px] font-semibold flex items-center justify-center gap-1.5 py-2 disabled:opacity-50"
                style={{ color: 'var(--ink3)', background: 'transparent', border: 'none' }}
              >
                {resendLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Non hai ricevuto l'email? Reinvia
              </button>
            </div>
          ) : (
            <>
              {/* Tab switcher */}
              <div style={{ borderBottom: '1.5px solid var(--line)' }} className="flex">
                {(['signin', 'signup'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setEmailNotConfirmed(false); }}
                    className="flex-1 py-3 text-[11px] font-black uppercase relative transition-colors"
                    style={{
                      color: activeTab === tab ? 'var(--ink)' : 'var(--ink3)',
                      letterSpacing: '0.6px',
                      background: 'transparent',
                      border: 'none',
                    }}
                  >
                    {tab === 'signin' ? 'Accedi' : 'Registrati'}
                    {activeTab === tab && (
                      <span
                        className="absolute bottom-[-1.5px] left-0 right-0 h-[2px] rounded-t"
                        style={{ backgroundColor: 'var(--rosa)' }}
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'signin' && (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <FieldLabel htmlFor="email-signin">Email</FieldLabel>
                      <Input id="email-signin" type="email" name="email" value={formData.email} onChange={handleInputChange} style={inputStyle} placeholder="tua-email@esempio.com" required />
                    </div>
                    <div>
                      <FieldLabel htmlFor="pwd-signin">Password</FieldLabel>
                      <div className="relative">
                        <Input id="pwd-signin" type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} style={{ ...inputStyle, paddingRight: '40px' }} placeholder="••••••••" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink3)' }}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Email not confirmed banner */}
                    {emailNotConfirmed && (
                      <div className="p-3 rounded-xl space-y-2" style={{ backgroundColor: 'var(--viola-dim)', border: '1px solid var(--line)' }}>
                        <p className="text-[11px] font-semibold" style={{ color: 'var(--ink)' }}>
                          ✉️ Email non ancora confermata
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--ink3)' }}>
                          Controlla la tua casella di posta (anche spam) e clicca il link di conferma.
                        </p>
                        <button
                          type="button"
                          onClick={handleResendConfirmation}
                          disabled={resendLoading}
                          className="flex items-center gap-1.5 text-[11px] font-semibold underline disabled:opacity-50"
                          style={{ color: 'var(--viola)', background: 'transparent', border: 'none', padding: 0 }}
                        >
                          {resendLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          Reinvia email di conferma
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="rememberMe" checked={rememberMe} onCheckedChange={(c) => setRememberMe(c as boolean)} />
                        <label htmlFor="rememberMe" className="text-[11px] font-medium cursor-pointer" style={{ color: 'var(--ink3)' }}>
                          Ricordami
                        </label>
                      </div>
                      <button type="button" onClick={() => setShowForgotPassword(true)} className="text-[11px] font-semibold underline" style={{ color: 'var(--viola)' }}>
                        Password dimenticata?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full text-white text-[12px] font-black uppercase py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
                      style={{ backgroundColor: 'var(--rosa)', letterSpacing: '0.6px' }}
                    >
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Accesso in corso...</> : 'Accedi'}
                    </button>
                  </form>
                )}

                {activeTab === 'signup' && (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel>Nome</FieldLabel>
                        <Input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} style={inputStyle} placeholder="Mario" required />
                      </div>
                      <div>
                        <FieldLabel>Cognome</FieldLabel>
                        <Input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} style={inputStyle} placeholder="Rossi" required />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Studio / Clinica</FieldLabel>
                      <Input type="text" name="clinicName" value={formData.clinicName} onChange={handleInputChange} style={inputStyle} placeholder="Studio di Fisioterapia XYZ" />
                    </div>
                    <div>
                      <FieldLabel>Email</FieldLabel>
                      <Input type="email" name="email" value={formData.email} onChange={handleInputChange} style={inputStyle} placeholder="tua-email@esempio.com" required />
                    </div>
                    <div>
                      <FieldLabel>Password</FieldLabel>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} style={{ ...inputStyle, paddingRight: '40px' }} placeholder="Min. 6 caratteri" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink3)' }}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div
                      className="p-4 rounded-xl space-y-2"
                      style={{ backgroundColor: 'var(--viola-dim)', border: '1px solid var(--line)' }}
                    >
                      <div className="flex items-start space-x-2">
                        <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(c) => setAgreedToTerms(c as boolean)} />
                        <label htmlFor="terms" className="text-[11px] leading-relaxed cursor-pointer" style={{ color: 'var(--ink3)' }}>
                          Accetto i <a href="/terms" className="underline font-semibold" style={{ color: 'var(--viola)' }}>Termini di Servizio</a>, la{' '}
                          <a href="/privacy" className="underline font-semibold" style={{ color: 'var(--viola)' }}>Privacy Policy</a> e autorizzo
                          Cimmi LLC a trattare i miei dati personali per l'erogazione del servizio,
                          comunicazioni commerciali e analisi statistica dei contenuti generati.
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !agreedToTerms}
                      className="w-full text-white text-[12px] font-black uppercase py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                      style={{ backgroundColor: 'var(--rosa)', letterSpacing: '0.6px' }}
                    >
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Registrazione in corso...</> : 'Crea Account'}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer note ── */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-[12px] font-medium" style={{ color: 'var(--ink3)' }}>
            Crea contenuti professionali per Instagram, LinkedIn e Facebook
          </p>
          <p className="text-[11px]" style={{ color: 'var(--ink3)' }}>
            Copywriting AI + immagini generate automaticamente
          </p>
        </div>

        <div
          className="mt-6 p-4 rounded-xl"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          <p className="text-[10px] text-center leading-relaxed" style={{ color: 'var(--ink3)' }}>
            © {new Date().getFullYear()} Cimmi LLC. Tutti i diritti riservati. |{' '}
            <a href="/privacy" className="underline" style={{ color: 'var(--viola)' }}>Privacy Policy</a> |{' '}
            <a href="/terms" className="underline" style={{ color: 'var(--viola)' }}>Termini di Servizio</a>
          </p>
        </div>

        {/* ── Forgot password dialog ── */}
        <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
          <DialogContent style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)' }}>
            <DialogHeader>
              <DialogTitle style={{ color: 'var(--ink)', fontWeight: 800 }}>Reimposta Password</DialogTitle>
              <DialogDescription style={{ color: 'var(--ink3)' }}>
                Inserisci la tua email e ti invieremo un link per reimpostare la password.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setForgotLoading(true);
                try {
                  const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
                    redirectTo: `${window.location.origin}/reset-password`
                  });
                  if (error) {
                    toast({ title: "Errore", description: error.message, variant: "destructive" });
                  } else {
                    toast({ title: "Email inviata!", description: "Controlla la tua casella di posta per il link di recupero" });
                    setShowForgotPassword(false);
                    setForgotEmail('');
                  }
                } catch {
                  toast({ title: "Errore", description: "Errore nell'invio dell'email", variant: "destructive" });
                } finally {
                  setForgotLoading(false);
                }
              }}
              className="space-y-4 mt-2"
            >
              <div>
                <label className="block text-[10px] font-black uppercase mb-1.5" style={{ color: 'var(--ink2)', letterSpacing: '0.8px' }}>Email</label>
                <Input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="tua-email@esempio.com"
                  required
                  style={{
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '9px',
                    color: 'var(--ink)',
                    fontSize: '12px',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full text-white text-[12px] font-black uppercase py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: 'var(--rosa)' }}
              >
                {forgotLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Invio in corso...</> : 'Invia Link di Recupero'}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Auth;
