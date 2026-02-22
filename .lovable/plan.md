

## Aggiornamento App ID Meta

L'App ID attualmente nel codice (`1440410323636643`) non corrisponde a quello della tua app Meta (`1261520952551293`). Bisogna aggiornarlo in tutti i punti dove viene usato.

### Modifiche necessarie

1. **`src/services/metaService.ts`** - Aggiornare `META_APP_ID` da `1440410323636643` a `1261520952551293`

2. **`supabase/functions/meta-auth/index.ts`** - Aggiornare la variabile `appId` da `1440410323636643` a `1261520952551293`

3. **`supabase/functions/instagram-auth/index.ts`** - Aggiornare `INSTAGRAM_APP_ID` da `1440410323636643` a `1261520952551293`

### Dettagli tecnici

Sono 3 file con una modifica semplice in ciascuno: sostituzione della stringa dell'App ID. Nessuna altra modifica necessaria.

### Nota importante

Dopo l'aggiornamento del codice, assicurati di aver configurato nella tua app Meta:
- Il redirect URI: `https://social-generator-fisioaccordo.lovable.app/auth/instagram/callback`
- I permessi: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`

