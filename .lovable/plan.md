

## Fix: Instagram Content Publishing richiede form-urlencoded, non JSON

### Il problema (dai log)

```
Container creation failed: {
  message: "Unsupported request - method type: post",
  type: "IGApiException",
  code: 100
}
```

Il codice attuale in `meta-publish/index.ts` invia le richieste all'API Instagram con `Content-Type: application/json` e `JSON.stringify()`. L'API Instagram Content Publishing richiede invece `application/x-www-form-urlencoded` con `URLSearchParams`.

### La modifica

**File: `supabase/functions/meta-publish/index.ts`**

Cambiare TUTTE le chiamate `fetch` verso `graph.instagram.com` da JSON a form-urlencoded:

**1. publishSingleImage - creazione container (riga 92-97)**
```text
// PRIMA (non funziona):
const containerRes = await fetch(`https://graph.instagram.com/v21.0/${igId}/media`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ image_url: imageUrl, caption, access_token: token })
})

// DOPO (corretto):
const containerRes = await fetch(`https://graph.instagram.com/v21.0/${igId}/media`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ image_url: imageUrl, caption, access_token: token })
})
```

**2. publishCarousel - creazione item carousel (riga 114-119)**
```text
// PRIMA:
body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: token })

// DOPO:
headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
body: new URLSearchParams({ image_url: url, is_carousel_item: 'true', access_token: token })
```

**3. publishCarousel - creazione container carousel (riga 126-130)**
```text
// PRIMA:
body: JSON.stringify({ media_type: 'CAROUSEL', children: childIds, caption, access_token: token })

// DOPO (children come comma-separated):
body: new URLSearchParams({
  media_type: 'CAROUSEL',
  caption,
  access_token: token,
  children: childIds.join(',')
})
```

**4. publishContainer - pubblicazione finale (riga 147-151)**
```text
// PRIMA:
body: JSON.stringify({ creation_id: creationId, access_token: token })

// DOPO:
headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
body: new URLSearchParams({ creation_id: creationId, access_token: token })
```

### Perche' funziona

L'API Instagram Graph (graph.instagram.com) accetta solo richieste form-urlencoded per la Content Publishing API. Quando riceve JSON, restituisce "Unsupported request - method type: post" perche' non riconosce il formato del body.

### Risultato atteso

- La creazione del media container funzionera' correttamente
- La pubblicazione su Instagram andra' a buon fine
- Sia post singoli che carousel funzioneranno

