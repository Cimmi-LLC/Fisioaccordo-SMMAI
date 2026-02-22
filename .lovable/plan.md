

## Fix completo scope e flusso OAuth per Instagram Platform API

### Problema
La tua app Meta usa la **nuova Instagram Platform API** (non la vecchia "Instagram Graph API via Facebook Login"). Gli scope come `instagram_basic`, `instagram_content_publish`, `pages_show_list` ecc. NON sono validi per questa API. L'errore "Invalid Scopes" lo conferma.

### Modifiche necessarie

#### 1. `src/services/metaService.ts` - Aggiornare gli scope OAuth
Sostituire l'intero array degli scope con:
- `instagram_business_basic`
- `instagram_business_content_publish`

Rimuovere `instagram_basic`, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts` che non sono validi per la nuova API.

#### 2. `supabase/functions/meta-auth/index.ts` - Adattare il flusso di autenticazione
Il flusso di scambio token e recupero account potrebbe necessitare aggiornamenti per funzionare con la nuova API. I passaggi per ottenere pagine e account Instagram Business potrebbero cambiare.

#### 3. `supabase/functions/meta-publish/index.ts` - Verificare compatibilita endpoint
Assicurarsi che gli endpoint di pubblicazione siano compatibili con i nuovi token ottenuti.

### Azione immediata richiesta
**Prima di implementare**: Pubblica ("Publish") le modifiche attuali su Lovable, cosi il sito live avra almeno l'App ID corretto (`1261520952551293`).

### Dettagli tecnici

**`src/services/metaService.ts`** - riga 22-28: sostituire l'array degli scope:
```
// DA:
'instagram_basic',
'instagram_business_content_publish',
'pages_show_list',
'pages_read_engagement',
'pages_manage_posts'

// A:
'instagram_business_basic',
'instagram_business_content_publish'
```

**`supabase/functions/meta-auth/index.ts`**: aggiornare il flusso per gestire correttamente i token della nuova API. Il flusso di base (code -> short-lived token -> long-lived token) resta simile, ma il recupero dell'account Instagram Business potrebbe cambiare.

