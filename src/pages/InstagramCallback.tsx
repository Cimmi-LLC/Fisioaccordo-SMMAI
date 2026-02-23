
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MetaService } from '@/services/metaService';
import { useToast } from '@/hooks/use-toast';

const InstagramCallback: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      console.log('[InstagramCallback] Callback ricevuto, code:', !!code, 'error:', error);

      if (error) {
        toast({
          title: "❌ Errore Autenticazione",
          description: "Autenticazione Instagram annullata o fallita",
          variant: "destructive"
        });
        if (window.opener) {
          window.opener.postMessage({ type: 'meta-auth-error', error }, '*');
          window.close();
        } else {
          navigate('/');
        }
        return;
      }

      if (code) {
        console.log('[InstagramCallback] Scambio codice per token...');
        const result = await MetaService.exchangeCodeForToken(code);
        console.log('[InstagramCallback] Risultato:', result);
        
        if (result.success) {
          toast({
            title: "🎉 Instagram Collegato!",
            description: "Il tuo account Instagram è stato collegato con successo"
          });
          if (window.opener) {
            window.opener.postMessage({ type: 'meta-auth-success' }, '*');
          }
        } else {
          const isPersonalAccount = result.error?.includes('personale non supportato');
          toast({
            title: isPersonalAccount ? "⚠️ Account Personale" : "❌ Errore Collegamento",
            description: isPersonalAccount
              ? "Il tuo account è personale. Vai su Impostazioni → Account → Passa a un account professionale, poi riprova."
              : (result.error || "Si è verificato un errore durante il collegamento"),
            variant: "destructive"
          });
          if (window.opener) {
            window.opener.postMessage({ type: 'meta-auth-error', error: result.error }, '*');
          }
        }
      }

      // Close popup or navigate home
      if (window.opener) {
        setTimeout(() => window.close(), 1500);
      } else {
        navigate('/');
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-foreground">Elaborazione autenticazione Instagram...</p>
      </div>
    </div>
  );
};

export default InstagramCallback;
