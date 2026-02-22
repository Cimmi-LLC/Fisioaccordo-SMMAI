

## Aggiornamento App Secret Instagram

### Problema
L'`INSTAGRAM_APP_SECRET` salvato nel progetto potrebbe essere quello della vecchia configurazione. Va aggiornato con la chiave segreta visibile nella dashboard: `faf444aeb17a3119a0d9c46b44f20911`.

### Azioni

1. **Aggiornare il secret `INSTAGRAM_APP_SECRET`** con il valore `faf444aeb17a3119a0d9c46b44f20911`
2. **Deploy della edge function `meta-auth`** per assicurarsi che usi il nuovo secret

### Azione manuale richiesta (dashboard Meta)
Nella stessa pagina dello screenshot, scorri fino alla **sezione 3 - "Configura Instagram Business Login"** e assicurati che il Redirect URI sia configurato:
- `https://social-generator-fisioaccordo.lovable.app/auth/instagram/callback`

Senza questo redirect URI, Instagram rifiutera' la richiesta di autenticazione.

### Dopo l'approvazione
- Aggiornamento del secret
- Deploy della edge function
- Test della connessione

