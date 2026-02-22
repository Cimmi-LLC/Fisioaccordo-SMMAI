

## Fix: Usare l'ID App Instagram corretto

### Problema
Il codice usa l'App ID Facebook (`3382844873466520`) per l'OAuth Instagram, ma serve l'**ID app Instagram** (`1685995206180695`) visibile nella dashboard.

### Modifiche al codice

#### 1. `src/services/metaService.ts` (riga 18)
- Cambiare `META_APP_ID` da `'3382844873466520'` a `'1685995206180695'`

#### 2. `supabase/functions/meta-auth/index.ts` (riga 26)
- Cambiare `appId` da `'3382844873466520'` a `'1685995206180695'`

### Azione manuale (dashboard Meta)
Nella pagina che hai aperto, scorri in basso fino a **"3. Configura Instagram Business Login"**:
1. Trova il campo **"URI di reindirizzamento OAuth validi"**
2. Aggiungi: `https://social-generator-fisioaccordo.lovable.app/auth/instagram/callback`
3. Salva

### Dettagli tecnici
L'endpoint `https://www.instagram.com/oauth/authorize` richiede il `client_id` uguale all'**Instagram App ID**, non all'ID dell'app Facebook. Lo stesso vale per lo scambio del token in `https://api.instagram.com/oauth/access_token`.

