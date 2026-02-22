

# Collegamento Canva API -- I Tuoi Template per Tutti

## Cosa Faremo

Collegheremo il tuo account Canva tramite le API ufficiali (OAuth 2.0). I tuoi template selezionati diventeranno disponibili a TUTTI gli utenti dell'app come template predefiniti. In piu, ogni utente potra collegare il proprio account Canva per importare i propri template personali.

## Come Funziona

### Flusso Owner (Tu)
1. Vai nelle impostazioni dell'app e clicchi "Collega Canva"
2. Si apre la pagina di autorizzazione Canva -- fai login con il tuo account
3. L'app ti mostra i tuoi design Canva
4. Selezioni quali template vuoi rendere disponibili a tutti
5. L'app li esporta come PNG 1080x1080, li salva nel bucket Supabase, e li inserisce nella tabella `canva_templates` con `is_default = true`

### Flusso Utente (Chiunque altro)
1. L'utente vede gia i tuoi template nella griglia di selezione
2. Se vuole, puo cliccare "Collega il tuo Canva" per aggiungere i propri template personali
3. Stesso flusso OAuth, ma i template importati hanno `is_default = false` e `user_id = [loro id]`

### Riconoscimento Automatico Zone di Testo
Quando importi un template, l'app analizza l'immagine per capire dove posizionare il testo:
- Zone chiare/scure vengono identificate come aree di testo
- Il colore del testo viene scelto automaticamente per massimo contrasto
- Tu puoi personalizzare le zone manualmente se necessario

## Prerequisiti -- Credenziali Canva

Per far funzionare le API Canva servono:
1. **Canva Developer App** -- da creare su [canva.com/developers](https://www.canva.com/developers)
2. **Client ID** e **Client Secret** -- generati nella Developer Portal
3. **Redirect URI** configurata -- puntera alla nostra edge function
4. **Scopi richiesti**: `design:content:read`, `design:meta:read`

Ti guidero passo passo nella creazione dell'app Canva.

## Dettagli Tecnici

### Nuova tabella `canva_connections`
Salva i token OAuth degli utenti che collegano il proprio Canva.

| Colonna | Tipo | Note |
|---------|------|------|
| id | uuid | PK |
| user_id | uuid | chi ha collegato |
| access_token | text | token Canva (cifrato) |
| refresh_token | text | per rinnovare il token |
| token_expires_at | timestamptz | scadenza |
| canva_user_id | text | ID utente Canva |
| display_name | text | nome visualizzato |
| is_owner | boolean | true = tu (template per tutti) |
| created_at | timestamptz | |

RLS: ogni utente vede solo la propria connessione.

### Edge Functions

**`canva-auth`** -- Gestisce OAuth
- Genera authorization URL con PKCE
- Scambia il codice per access/refresh token
- Salva in `canva_connections`

**`canva-designs`** -- Lista design dell'utente
- Chiama `GET /v1/designs` con il token salvato
- Ritorna la lista dei design con anteprima

**`canva-import`** -- Importa un design come template
- Chiama `POST /v1/exports` per esportare come PNG 1080x1080
- Scarica il PNG e lo carica nel bucket Supabase
- Crea record in `canva_templates`
- Se l'utente e l'owner, setta `is_default = true`

### Componente `CanvaConnection.tsx`
- Pulsante "Collega Canva" con logo Canva
- Stato connessione (collegato/non collegato)
- Griglia dei design disponibili su Canva
- Pulsante "Importa" per ogni design
- Toggle "Disponibile a tutti" (solo per l'owner)

### Modifiche a File Esistenti

- **`CanvaTemplateSelector.tsx`**: aggiungere sezione "Collega il tuo Canva" in fondo alla griglia
- **`PreviewSection.tsx`**: gia predisposto per template con sfondo PNG (fatto nello step precedente)
- **`supabase/config.toml`**: registrare le 3 nuove edge functions
- **`MainContent.tsx`**: aggiungere pannello connessione Canva nelle impostazioni

### Secrets Necessari
- `CANVA_CLIENT_ID` -- Client ID dalla Canva Developer Portal
- `CANVA_CLIENT_SECRET` -- Client Secret dalla Canva Developer Portal

### Sequenza di Implementazione
1. Ti guido a creare la Canva Developer App e ottenere le credenziali
2. Salvo le credenziali come secrets Supabase
3. Creo la tabella `canva_connections` con migrazione
4. Creo le 3 edge functions (auth, designs, import)
5. Creo il componente `CanvaConnection.tsx`
6. Aggiorno `CanvaTemplateSelector` con opzione di collegamento
7. Test end-to-end: colleghi il tuo account, importi template, li vedi nella griglia

