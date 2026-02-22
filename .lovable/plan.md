

## Fix: Pubblicazione Instagram fallisce con status 400

### Problema identificato

I log mostrano:
1. Il collegamento ora funziona (la connessione viene salvata nel database)
2. La pubblicazione restituisce **status 400** in ~1.5 secondi
3. Non ci sono log di polling, quindi l'errore avviene al **primo step** (creazione media container)
4. Il token e' **short-lived** (1 ora) e l'`instagram_business_id` viene dal `user_id` dello Step 1

La causa probabile: la chiamata `POST graph.instagram.com/v21.0/{igId}/media` fallisce perche':
- Il short-lived token potrebbe non avere lo scope `instagram_business_content_publish` (necessario per pubblicare)
- Oppure il formato dell'`instagram_business_id` non e' corretto per l'API Content Publishing

### Soluzione

**1. Aggiungere logging dettagliato in `meta-publish`** per capire l'errore esatto dall'API Instagram:

```text
// In publishSingleImage, loggare la risposta completa di Instagram:
console.log('Container creation response:', JSON.stringify(containerData))
console.log('Using igId:', igId, 'imageUrl:', imageUrl)
```

**2. Aggiungere lo scope `instagram_business_content_publish` alla richiesta OAuth** in `metaService.ts`:

Attualmente gli scope sono:
```text
instagram_business_basic, instagram_business_content_publish
```

Questo sembra gia' corretto. Ma verificare che nel codice siano effettivamente questi gli scope richiesti.

**3. Migliorare la gestione errori in `meta-publish`** per restituire messaggi utili invece del generico "non-2xx status code":

- Loggare ogni risposta dall'API Instagram prima di controllare errori
- Includere l'errore esatto nell'output per diagnostica

### Modifiche tecniche

**File: `supabase/functions/meta-publish/index.ts`**

- Aggiungere `console.log` dettagliati in `publishSingleImage` e `publishCarousel` per vedere la risposta esatta di Instagram
- Loggare `igId`, `token length`, e `image_url` per diagnostica
- Loggare la risposta completa di Instagram quando la creazione del container fallisce

**File: `src/services/metaService.ts`**

- In `publishToInstagram`, loggare l'errore completo ricevuto dalla edge function per mostrarlo nella console del browser

### Risultato

Con questi log potremo vedere esattamente quale errore ritorna Instagram e risolvere il problema specifico (token non valido, scope mancante, formato ID sbagliato, ecc.).
