

## Fix scope + configurazione Instagram Business Login

### Problema
Il codice richiede lo scope `instagram_content_publish`, ma nella tua app Meta il permesso si chiama `instagram_business_content_publish`. Questo causerebbe un errore OAuth.

### Modifica necessaria

**`src/services/metaService.ts`** (riga 24): Sostituire `instagram_content_publish` con `instagram_business_content_publish` nell'array degli scope OAuth.

### Cosa fare nella dashboard Meta

1. **Sezione 3 (Webhook)**: Saltala, non serve per pubblicare contenuti
2. **Sezione 4 (Instagram Business Login)**: Clicca "Configura" e aggiungi come redirect URI valido: `https://social-generator-fisioaccordo.lovable.app/auth/instagram/callback`
3. Verifica che tutti i permessi siano attivi: `instagram_basic`, `instagram_business_content_publish`, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`

### Dettagli tecnici

Una sola modifica in `src/services/metaService.ts`, nell'array `scopes` del metodo `initiateAuth()`:
- Da: `instagram_content_publish`
- A: `instagram_business_content_publish`

