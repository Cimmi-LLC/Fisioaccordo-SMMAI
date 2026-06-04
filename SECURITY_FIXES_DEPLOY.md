# Deploy delle correzioni di sicurezza critiche

Data: 2026-05-09

Questo documento elenca le **azioni manuali** richieste per attivare i fix di sicurezza pushati sul repo. Senza questi step, alcune funzioni continueranno a girare in modalità di compatibilità (token non cifrati, cron senza secret).

---

## 1) Variabili di ambiente (Supabase Edge Functions Secrets)

Vai su: https://supabase.com/dashboard/project/cktdoqvyyvjlkpahbjyi/settings/functions

Aggiungi/verifica i seguenti secrets:

| Nome                  | Valore                                                                                  | Obbligatorio? |
|-----------------------|------------------------------------------------------------------------------------------|---------------|
| `INSTAGRAM_APP_SECRET`| Già presente — verificare                                                                | sì            |
| `INSTAGRAM_APP_ID`    | App ID Instagram (es. `1261520952551293`) — era hardcoded, ora va in env                | sì            |
| `META_APP_ID`         | App ID Meta (es. `1685995206180695`) — era hardcoded, ora va in env                     | sì            |
| `CRON_SECRET`         | Stringa random ≥ 32 char (es. `openssl rand -hex 32`). Identica al Vault `cron_secret`  | sì            |
| `ADMIN_EMAILS`        | Email admin separate da virgola (es. `gianfrancodurand@gmail.com`) — usate per debug    | sì            |
| `ALLOWED_ORIGINS`     | Origini comma-separated (es. `https://fisioaccordo-social-manger.vercel.app,http://localhost:5173`) | consigliato |

Se `ALLOWED_ORIGINS` non viene settato, il CORS resta aperto a `*` (compatibilità).

---

## 2) Setup Vault per token Meta cifrati

Vai su: https://supabase.com/dashboard/project/cktdoqvyyvjlkpahbjyi/sql/new

Esegui (UNA VOLTA SOLA, salva il valore in un password manager):

```sql
-- Genera una chiave a 32 byte e mettila nel Vault.
-- Sostituisci 'GENERA_QUI_UNA_PASSPHRASE_LUNGA_E_RANDOM_64_CHAR' con un valore vero.
SELECT vault.create_secret(
  'GENERA_QUI_UNA_PASSPHRASE_LUNGA_E_RANDOM_64_CHAR',
  'meta_token_key',
  'Encryption key for Meta/Instagram tokens at rest'
);

-- Stesso per il cron secret (deve combaciare con CRON_SECRET nei secrets edge functions)
SELECT vault.create_secret(
  'INCOLLA_QUI_LO_STESSO_VALORE_DI_CRON_SECRET',
  'cron_secret',
  'Header value used by pg_cron to authenticate process-scheduled-posts'
);
```

Comando per generare passphrase robuste:
```bash
openssl rand -hex 32
```

---

## 3) Applicare le migration

```bash
cd /Users/gianfrancodurand/remix-of-social-generator-fisioaccordo
npx supabase db push
```

Dovrebbero essere applicate:
- `20260509100000_encrypt_meta_tokens.sql` — colonna BYTEA + RPC + backfill
- `20260509110000_cron_secret_header.sql` — riprogramma cron con `x-cron-secret`

Se la passphrase Vault è già configurata, il backfill cifra automaticamente i token esistenti. Altrimenti la migration emette solo un `NOTICE` e i token restano in colonna plaintext finché non rilanci la migration con il secret presente.

---

## 4) Deploy delle Edge Functions

```bash
npx supabase functions deploy save-slide-image \
                                generate-carousel-images \
                                process-scheduled-posts \
                                meta-auth meta-publish instagram-auth
```

Oppure tutte insieme:
```bash
npx supabase functions deploy
```

---

## 5) Test post-deploy

| Cosa testare                              | Come                                                                                  |
|-------------------------------------------|----------------------------------------------------------------------------------------|
| Login + generate post (auth funziona)     | Da app: genera un carosello come utente normale                                       |
| Brand pool ownership                      | Loggato come utente A, prova a passare brandId di utente B → atteso 403               |
| SSRF su save-slide-image                  | `curl -X POST .../save-slide-image -d '{"imageUrl":"http://169.254.169.254/"}'` → 400 |
| Cron auth                                 | Aspetta ≥2 min: i post programmati vengono pubblicati come prima                      |
| Token Meta cifrati                        | `SELECT page_access_token, page_access_token_enc FROM meta_connections;` → enc != NULL|
| Pubblicazione Instagram                   | Pubblica un post → deve ancora funzionare (legge via RPC)                             |

---

## 6) Rollback rapido (in caso di problemi)

Se il deploy delle edge functions rompe la pubblicazione Instagram:

1. Verifica che `vault.decrypted_secrets` abbia `meta_token_key` (altrimenti la RPC ritorna NULL).
2. Verifica che le righe in `meta_connections` abbiano `page_access_token_enc` popolato. Se no:
   ```sql
   -- Forza backfill manuale
   UPDATE meta_connections
      SET page_access_token_enc = pgp_sym_encrypt(page_access_token, public._meta_token_key())
    WHERE page_access_token IS NOT NULL AND page_access_token_enc IS NULL;
   ```
3. Per emergenze, la RPC `get_meta_connection_token` ha un fallback che legge dalla colonna plaintext se la cifratura non è disponibile — quindi anche se il Vault è scollegato, niente downtime totale.

---

## 7) Cleanup (dopo 1-2 settimane di funzionamento stabile)

Una volta confermato che tutto gira bene con i token cifrati, droppa la colonna plaintext:

```sql
ALTER TABLE public.meta_connections DROP COLUMN page_access_token;
```

E rimuovi il fallback dalla RPC `get_meta_connection_token`.

---

## File modificati

### Nuovi
- `supabase/functions/_shared/auth.ts` — JWT + ownership + cron secret helpers
- `supabase/functions/_shared/cors.ts` — CORS whitelist da `ALLOWED_ORIGINS`
- `supabase/functions/_shared/ssrf.ts` — guard contro SSRF + size cap
- `supabase/migrations/20260509100000_encrypt_meta_tokens.sql`
- `supabase/migrations/20260509110000_cron_secret_header.sql`

### Modificati
- `supabase/functions/save-slide-image/index.ts` — JWT + SSRF + path da verifiedUserId
- `supabase/functions/generate-carousel-images/index.ts` — JWT + brandId ownership + SSRF
- `supabase/functions/process-scheduled-posts/index.ts` — cron secret check + RPC token
- `supabase/functions/meta-auth/index.ts` — RPC `upsert_meta_connection` + appId env
- `supabase/functions/meta-publish/index.ts` — RPC `get_meta_connection_token`
- `supabase/functions/instagram-auth/index.ts` — INSTAGRAM_APP_ID da env
- `supabase/config.toml` — commento esplicativo modello auth
- `src/services/metaService.ts` — META_APP_ID da `import.meta.env.VITE_META_APP_ID`

### Frontend env (opzionale, per `metaService.ts`)
Aggiungi a `.env.local`:
```
VITE_META_APP_ID=1685995206180695
VITE_META_REDIRECT_URI=https://fisioaccordo-social-manger.vercel.app/auth/instagram/callback
```
