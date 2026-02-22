

## Salvataggio INSTAGRAM_APP_SECRET

### Azione
Salvare il valore `766feebad49b035474c3ba05fa4c4612` come secret Supabase con nome `INSTAGRAM_APP_SECRET`.

Questo secret viene usato dalla edge function `meta-auth` per lo scambio del codice OAuth con il token di accesso Instagram.

### Dopo il salvataggio
1. Pubblica ("Publish") il progetto per portare live tutte le modifiche (App ID, scope, edge functions)
2. Vai nella dashboard Meta > Sezione 4 "Instagram Business Login" e aggiungi il redirect URI: `https://social-generator-fisioaccordo.lovable.app/auth/instagram/callback`
3. Testa la connessione Instagram dall'app

