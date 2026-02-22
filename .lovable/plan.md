

## Fix: Collegamento Instagram fallisce per alcuni utenti

### Problema identificato

Ho analizzato i log, il codice, il database e la documentazione Meta. Il problema e' chiaro:

1. L'utente clicca "Collega", autorizza su Instagram, il codice riceve il token correttamente (Step 1 funziona)
2. Lo scambio per il **long-lived token** (Step 2) fallisce con errore "Unsupported request" - sia con GET che con POST
3. Questo e' un **bug noto di Meta** che colpisce alcuni account ma non altri (il tuo account `attiliocimminiello` funziona, altri utenti no)
4. Siccome lo Step 2 fallisce, la connessione non viene MAI salvata nel database, e l'utente torna sull'app senza nulla collegato

### Soluzione

Rendere lo Step 2 (long-lived token) **non bloccante**. Se fallisce, il sistema salva comunque la connessione usando il token short-lived (dura 1 ora invece di 60 giorni). L'utente vede immediatamente il collegamento e puo' usare l'app.

### Modifiche tecniche

**1. `supabase/functions/meta-auth/index.ts`**

- Cambiare lo Step 2 da GET a... tentare GET (come da documentazione ufficiale Meta), e se fallisce, usare il short-lived token come fallback
- Aggiungere try/catch attorno allo Step 2 per non bloccare il flusso
- Salvare il token disponibile (long-lived se possibile, short-lived come fallback)
- Aggiungere log dettagliati per diagnostica

```text
// Step 2: Try to exchange for long-lived token (best effort)
let finalToken = shortLivedToken
let tokenExpiresAt = new Date(Date.now() + 3600 * 1000).toISOString() // 1 ora

try {
  const longLivedRes = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`
  )
  const longLivedData = await longLivedRes.json()

  if (longLivedData.access_token) {
    finalToken = longLivedData.access_token
    const expiresIn = longLivedData.expires_in || 5184000
    tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
    console.log('Long-lived token ottenuto con successo')
  } else {
    console.warn('Long-lived token fallback: usando short-lived token')
  }
} catch (e) {
  console.warn('Long-lived token exchange fallito, uso short-lived:', e.message)
}

// Continua con finalToken (long-lived o short-lived)
```

**2. `src/pages/InstagramCallback.tsx`**

- Aggiungere logging piu' dettagliato per capire cosa succede nel popup
- Migliorare la comunicazione tra popup e finestra principale

**3. `src/services/metaService.ts`**

- Migliorare la gestione errori in `exchangeCodeForToken` per gestire il caso dove `response.data` ha `success: true` ma `error` e' anche presente (caso edge del Supabase SDK con status non-2xx)

### Risultato atteso

- Gli utenti che prima non riuscivano a collegare Instagram vedranno immediatamente la connessione attiva
- Il token short-lived durera' 1 ora (sufficiente per pubblicare)
- Per gli account dove il long-lived token funziona, si avranno i 60 giorni come prima
- Nessun errore silenzioso: tutto viene loggato per diagnostica futura
