

## Fix: Pubblicazione Instagram fallita (non-2xx status code)

### Problema
L'errore "Edge Function returned a non-2xx status code" nasconde il vero problema. Ci sono due cause:

1. **CORS headers incompleti**: Il client Supabase invia header extra (`x-supabase-client-platform`, ecc.) che la funzione `meta-publish` non accetta. Questo puo' bloccare la richiesta.
2. **Gestione errori opaca**: Quando la funzione restituisce un errore (es. token scaduto, immagine non raggiungibile), il messaggio reale viene perso e l'utente vede solo "non-2xx status code".

### Soluzione

**File: `supabase/functions/meta-publish/index.ts`**

- Aggiornare i CORS headers per includere tutti gli header inviati dal client Supabase (stessa configurazione usata in `generate-carousel-images`)
- Aggiungere logging (`console.log`/`console.error`) per tracciare richieste e risposte Instagram, cosi' da poter debuggare errori futuri nei log

CORS headers aggiornati:
```text
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
```

**File: `src/services/metaService.ts`**

- Migliorare la gestione errori in `publishToInstagram`: quando `response.error` esiste MA `response.data` contiene dettagli, usare il messaggio da `response.data.error` invece del generico "non-2xx"
- Questo mostra all'utente il vero errore (es. "Token scaduto", "Immagine non raggiungibile")

Codice aggiornato:
```text
if (response.error) {
  // Il data potrebbe contenere il messaggio di errore reale
  const realError = response.data?.error || response.error.message;
  throw new Error(realError);
}
```

### Risultato
- Le richieste non vengono piu' bloccate dal CORS
- In caso di errore, l'utente vede il messaggio reale da Instagram (es. "Token scaduto") invece di "non-2xx status code"
- I log della funzione mostrano dettagli utili per il debug

