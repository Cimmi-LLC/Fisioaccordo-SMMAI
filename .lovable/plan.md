

## Aggiornamento App ID Meta

### Problema
Il codice usa l'App ID vecchio `1261520952551293`, ma la tua app Meta ha ID `3382844873466520`.

### Modifiche

#### 1. `src/services/metaService.ts` (riga 15)
- Cambiare `META_APP_ID` da `'1261520952551293'` a `'3382844873466520'`

#### 2. `supabase/functions/meta-auth/index.ts` (riga 26)
- Cambiare `appId` da `'1261520952551293'` a `'3382844873466520'`

### Azione manuale richiesta (dashboard Meta)
Nella dashboard Meta della tua app "POST PER I SOCIAL 2":
1. Vai in **Instagram** nella sidebar
2. Cerca le impostazioni di **Instagram Business Login**
3. Aggiungi il redirect URI: `https://social-generator-fisioaccordo.lovable.app/auth/instagram/callback`
4. Salva

