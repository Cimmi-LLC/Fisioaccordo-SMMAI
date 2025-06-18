
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { InstagramService } from '@/services/instagramService';
import { useToast } from '@/hooks/use-toast';

const InstagramCallback: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        toast({
          title: "❌ Errore Autenticazione",
          description: "Autenticazione Instagram annullata o fallita",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      if (code) {
        const result = await InstagramService.exchangeCodeForToken(code);
        
        if (result.success) {
          toast({
            title: "🎉 Instagram Collegato!",
            description: "Il tuo account Instagram è stato collegato con successo"
          });
        } else {
          toast({
            title: "❌ Errore Collegamento",
            description: result.error || "Si è verificato un errore durante il collegamento",
            variant: "destructive"
          });
        }
      }

      // Chiudi la finestra popup se siamo in una
      if (window.opener) {
        window.close();
      } else {
        navigate('/');
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
        <p className="text-white">Elaborazione autenticazione Instagram...</p>
      </div>
    </div>
  );
};

export default InstagramCallback;
