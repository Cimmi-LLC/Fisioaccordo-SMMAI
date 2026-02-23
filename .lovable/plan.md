

## Fix errori Instagram API - formato richieste

### Problema

Tutte le chiamate all'API Instagram falliscono con "Unsupported request - method type: post/get" (codice 100). La causa principale sono due errori nel formato delle richieste HTTP.

### Causa

La documentazione ufficiale Meta (aggiornata 2025) specifica che le richieste al Content Publishing API devono usare:
- `Content-Type: application/json` con body JSON
- `Authorization: Bearer <TOKEN>` nell'header
- NON `application/x-www-form-urlencoded` con token nel body

Il codice attuale usa il formato vecchio (URLSearchParams) che non e' piu' supportato.

### Modifiche

**File 1: `supabase/functions/meta-publish/index.ts`**

Aggiornare tutte le chiamate a `graph.instagram.com` per usare il formato corretto:

- `publishSingleImage`: cambiare da URLSearchParams a JSON body + Authorization header
- `publishCarousel`: cambiare carousel item creation e carousel container creation
- `publishContainer`: cambiare la chiamata media_publish
- `waitForMediaReady`: aggiungere Authorization header nella GET

Esempio del cambiamento (container creation):
```text
// PRIMA (non funziona)
headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
body: new URLSearchParams({ image_url, caption, access_token: token })

// DOPO (formato ufficiale Meta)
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
},
body: JSON.stringify({ image_url: imageUrl, caption })
```

**File 2: `supabase/functions/meta-auth/index.ts`**

Aggiornare lo scambio long-lived token da POST a GET:
```text
// PRIMA (POST - fallisce)
fetch('https://graph.instagram.com/access_token', {
  method: 'POST',
  body: new URLSearchParams({ grant_type, client_secret, access_token })
})

// DOPO (GET con query params)
const params = new URLSearchParams({ grant_type, client_secret, access_token })
fetch(`https://graph.instagram.com/access_token?${params}`)
```

Aggiornare anche il profile fetch per usare Authorization header:
```text
fetch(`https://graph.instagram.com/v21.0/me?fields=user_id,username,account_type,name`, {
  headers: { 'Authorization': `Bearer ${finalToken}` }
})
```

### Riepilogo chiamate da aggiornare

| Funzione | Endpoint | Cambiamento |
|----------|----------|-------------|
| meta-auth | /access_token (long-lived) | POST -> GET con query params |
| meta-auth | /me (profilo) | Aggiungere Authorization header |
| meta-publish | /{igId}/media (single) | URLSearchParams -> JSON + Bearer |
| meta-publish | /{igId}/media (carousel item) | URLSearchParams -> JSON + Bearer |
| meta-publish | /{igId}/media (carousel container) | URLSearchParams -> JSON + Bearer |
| meta-publish | /{igId}/media_publish | URLSearchParams -> JSON + Bearer |
| meta-publish | /{containerId}?fields=status_code | Aggiungere Authorization header |

### Risultato atteso

- Long-lived token funzionante (60 giorni invece di 1 ora)
- Username recuperato correttamente nel profilo
- Pubblicazione su Instagram funzionante

