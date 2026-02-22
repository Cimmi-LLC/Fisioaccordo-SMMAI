

# Implementazione Connessione Canva API

## Step 1: Salvataggio Credenziali

Per prima cosa salveremo le tue credenziali Canva come secrets Supabase:
- **CANVA_CLIENT_ID** -- il Client ID dalla tua Canva Developer App
- **CANVA_CLIENT_SECRET** -- il Client Secret

## Step 2: Migrazione Database -- tabella `canva_connections`

Creeremo la tabella per salvare i token OAuth di chi collega il proprio Canva:

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| user_id | uuid | chi ha collegato |
| access_token | text | token Canva |
| refresh_token | text | per rinnovare |
| token_expires_at | timestamptz | scadenza |
| canva_user_id | text | ID utente Canva |
| display_name | text | nome visualizzato |
| is_owner | boolean | true = tu (i tuoi template vanno a tutti) |
| created_at | timestamptz | |

RLS: ogni utente vede solo la propria connessione.

## Step 3: Tre Edge Functions

### `canva-auth`
- Riceve `action` nel body: `get_auth_url` oppure `exchange_token`
- `get_auth_url`: genera URL OAuth Canva con PKCE e lo ritorna al frontend
- `exchange_token`: riceve il `code` dalla callback, chiama `POST https://api.canva.com/rest/v1/oauth/token` per ottenere access + refresh token, salva in `canva_connections`

### `canva-designs`
- Riceve il `user_id` autenticato
- Recupera il token dalla tabella `canva_connections`
- Chiama `GET https://api.canva.com/rest/v1/designs` con il token
- Ritorna la lista dei design con titolo e thumbnail

### `canva-import`
- Riceve `design_id` e `make_default` (boolean)
- Chiama `POST https://api.canva.com/rest/v1/exports` per esportare il design come PNG 1080x1080
- Scarica il PNG risultante
- Lo carica nel bucket Supabase `user-photos`
- Crea il record in `canva_templates` con `is_default = make_default`
- Analizza le zone di testo (zone chiare/scure) per determinare `text_zones` e `text_color`

## Step 4: Componente `CanvaConnection.tsx`

Nuovo componente (sostituisce il file vuoto attuale):
- Pulsante "Collega Canva" con icona
- Stato connessione (collegato/scollegato)
- Griglia dei design Canva disponibili
- Per ogni design: pulsante "Importa" e toggle "Per tutti" (solo per owner)
- Pulsante "Scollega"

## Step 5: Pagina Callback

Nuova rotta `/canva-callback` che:
- Riceve il codice OAuth dal redirect Canva
- Chiama `canva-auth` con `exchange_token`
- Redirige alla pagina principale con messaggio di successo

## Step 6: Integrare nell'App

- Aggiungere `CanvaConnection` nel tab "Genera" o come sezione dedicata nel `MainContent`
- Aggiungere rotta `/canva-callback` in `App.tsx`
- Aggiornare `supabase/config.toml` con le 3 nuove edge functions
- Aggiornare `CanvaTemplateSelector` con link "Collega il tuo Canva" quando non ci sono template utente

## Dettagli Tecnici

### File da creare:
- `supabase/functions/canva-auth/index.ts`
- `supabase/functions/canva-designs/index.ts`
- `supabase/functions/canva-import/index.ts`
- `src/pages/CanvaCallback.tsx`

### File da modificare:
- `src/components/CanvaConnection.tsx` -- riscrivere con UI completa
- `src/components/CanvaTemplateSelector.tsx` -- aggiungere link "Collega Canva"
- `src/components/MainContent.tsx` -- aggiungere sezione CanvaConnection
- `src/App.tsx` -- aggiungere rotta `/canva-callback`
- `supabase/config.toml` -- registrare 3 nuove edge functions

### Flusso OAuth Canva
1. Utente clicca "Collega Canva"
2. Frontend chiama `canva-auth` con `action: get_auth_url`
3. Edge function genera URL con PKCE e lo ritorna
4. Frontend apre URL in nuova finestra
5. Utente autorizza su Canva
6. Canva redirige a `/canva-callback?code=XXX`
7. Callback chiama `canva-auth` con `action: exchange_token, code: XXX`
8. Edge function scambia codice per token e salva in DB
9. Callback redirige alla home con toast di successo
