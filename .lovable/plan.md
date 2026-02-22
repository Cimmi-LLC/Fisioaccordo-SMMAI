

# Pubblicazione Social: Copia Smart + Meta API Diretta

## Panoramica

Due sistemi di pubblicazione che funzionano in parallelo:

1. **Copia & Incolla Smart** (funziona subito, per tutti) - L'utente genera il contenuto, clicca un pulsante, testo copiato + immagini scaricate. Zero configurazione.
2. **Meta API Diretta** (per chi ha Instagram Business) - L'utente clicca "Collega con Facebook", fa login, autorizza, e da quel momento pubblica direttamente dall'app.

## Cosa serve da te (una volta sola)

Prima di implementare la parte Meta API, devi:
1. Creare una Meta App su [developers.facebook.com](https://developers.facebook.com)
2. Aggiungere il prodotto "Facebook Login for Business"
3. Configurare i permessi: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`
4. Aggiungere il Redirect URI: `https://social-generator-fisioaccordo.lovable.app/auth/instagram/callback`
5. Darmi l'App Secret (lo salvo nei secrets Supabase in modo sicuro)

I tuoi utenti non dovranno fare NIENTE di tutto questo. Vedranno solo "Collega con Facebook" e cliccano.

---

## Step 1: Copia & Incolla Smart (nessun prerequisito)

### Nuovo componente `SmartCopyActions.tsx`
Bottoni che appaiono sotto il contenuto generato:
- **"Copia Testo"**: copia il testo negli appunti con `navigator.clipboard.writeText()`
- **"Scarica Immagini"**: scarica le immagini del carosello come file ZIP o singolarmente
- **"Apri Instagram"**: apre `instagram.com` in una nuova tab (su mobile apre l'app)
- **"Apri Facebook"**: apre la pagina di creazione post Facebook

Feedback visivo: il bottone diventa verde con checkmark dopo la copia.

### Modifica `PreviewSection.tsx`
Aggiungere il componente `SmartCopyActions` sotto l'anteprima del contenuto generato, sempre visibile.

---

## Step 2: Database - Tabella `meta_connections`

Nuova tabella per salvare le connessioni Meta degli utenti:

- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `facebook_user_id` (text)
- `page_id` (text)
- `page_name` (text)
- `page_access_token` (text) - token per pubblicare
- `instagram_business_id` (text, nullable)
- `instagram_username` (text, nullable)
- `token_expires_at` (timestamptz) - scadenza token long-lived
- `is_active` (boolean, default true)
- `created_at`, `updated_at` (timestamptz)

RLS: ogni utente vede/gestisce solo le proprie connessioni.

---

## Step 3: Edge Function `meta-auth` (riscrittura di `instagram-auth`)

Corregge il bug critico della fetch (oggetto + stringa concatenati) e aggiunge:

1. Riceve codice OAuth da Facebook
2. Scambia per short-lived token (fix del bug fetch)
3. Converte in long-lived token (60 giorni) via `GET /oauth/access_token?grant_type=fb_exchange_token`
4. Trova pagine Facebook e account Instagram Business collegati
5. Salva tutto in `meta_connections`

---

## Step 4: Edge Function `meta-publish` (nuova)

Gestisce la pubblicazione su entrambe le piattaforme:

**Facebook Page:**
- Testo: `POST /{page_id}/feed` con `message`
- Con immagine: `POST /{page_id}/photos` con `url` + `caption`

**Instagram Business:**
- Step 1: Crea media container via `POST /{ig_id}/media` con `caption` + `image_url`
- Step 2: Pubblica via `POST /{ig_id}/media_publish` con `creation_id`
- Carousel: crea N container figli, poi container padre con `children[]`

L'immagine deve essere un URL pubblico: useremo le immagini gia nel bucket `user-photos` che e' pubblico.

---

## Step 5: Servizio Frontend `metaService.ts`

Sostituisce `instagramService.ts` e le parti mock di `blotatoService.ts`:

- `initiateAuth()` - Apre popup OAuth Facebook
- `exchangeCodeForToken(code)` - Chiama `meta-auth`
- `getConnections()` - Legge da `meta_connections`
- `disconnect(id)` - Disattiva connessione
- `publishToFacebook(connectionId, content, imageUrl?)` - Chiama `meta-publish`
- `publishToInstagram(connectionId, caption, imageUrl)` - Chiama `meta-publish`
- `isConnected()` - Verifica se ha connessione attiva

---

## Step 6: Componente `MetaConnection.tsx`

Sostituisce `InstagramConnection.tsx` e `BlotatoConnection.tsx`:

**Stato non collegato:**
- Pulsante grande "Collega con Facebook" (gradiente blu)
- Sotto: "Collega il tuo Instagram Business e la tua Pagina Facebook per pubblicare direttamente"
- Se non ha Business: guida passo-passo per convertire (3 step con screenshot)

**Stato collegato:**
- Mostra: nome pagina Facebook, username Instagram, follower count
- Badge verde "Collegato"
- Pulsante "Scollega"

---

## Step 7: Aggiornare il flusso pubblicazione

### `MainContent.tsx`
- Sostituire `BlotatoService` con `metaService`
- `handlePublish`: se Meta collegato --> pubblica via API, altrimenti --> mostra SmartCopy

### `ContentForm.tsx`
- Semplificare la sezione piattaforme: mostrare solo Instagram e Facebook (le piattaforme realmente supportate)
- Se Meta non collegato: il bottone dice "Copia per pubblicare" invece di "Pubblica"

### `PreviewSection.tsx`
- Aggiungere `SmartCopyActions` sempre visibile dopo il contenuto generato

---

## Step 8: Aggiornare routing e callback

### `InstagramCallback.tsx`
- Aggiornare per usare `metaService` invece di `InstagramService`

### `App.tsx`
- La route `/auth/instagram/callback` resta invariata

---

## Riepilogo file da creare/modificare

**Nuovi file:**
- `src/components/SmartCopyActions.tsx`
- `src/components/MetaConnection.tsx`
- `src/services/metaService.ts`
- `supabase/functions/meta-auth/index.ts`
- `supabase/functions/meta-publish/index.ts`

**File da modificare:**
- `src/components/MainContent.tsx` - usa metaService
- `src/components/ContentForm.tsx` - semplifica piattaforme
- `src/components/PreviewSection.tsx` - aggiunge SmartCopyActions
- `src/pages/InstagramCallback.tsx` - usa metaService
- `supabase/config.toml` - aggiunge meta-auth e meta-publish

**File da rimuovere (opzionale, dopo test):**
- `src/services/instagramService.ts`
- `src/components/InstagramConnection.tsx`
- `src/services/blotatoService.ts`
- `src/components/BlotatoConnection.tsx`

