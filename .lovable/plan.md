

## Fix Pubblicazione Instagram - Aggiunta Polling Status

### Problema riscontrato
Ho testato la edge function `meta-publish` direttamente e ho ricevuto l'errore: **"Media ID is not available"**. 

Questo succede perche' Instagram ha bisogno di tempo per elaborare l'immagine caricata. La funzione attuale crea il media container e prova a pubblicarlo immediatamente, ma Instagram non ha ancora finito di processare l'immagine.

### Soluzione
Aggiungere un meccanismo di **polling** nella funzione `publishContainer` che:
1. Crea il media container (gia' implementato)
2. Controlla periodicamente lo stato del container con `GET /{container-id}?fields=status_code`
3. Aspetta finche' lo status diventa `FINISHED`
4. Solo allora pubblica il container

### Dettagli tecnici

**File da modificare:** `supabase/functions/meta-publish/index.ts`

Nella funzione `publishContainer`, prima di chiamare `media_publish`, aggiungere:

```text
Ciclo di polling (max 30 tentativi, 2 secondi tra uno e l'altro = max ~60 secondi):
  1. GET graph.instagram.com/v21.0/{creationId}?fields=status_code&access_token={token}
  2. Se status_code == "FINISHED" -> procedi con publish
  3. Se status_code == "ERROR" -> ritorna errore
  4. Se status_code == "IN_PROGRESS" -> aspetta 2 secondi e riprova
  5. Se raggiunto il limite -> ritorna errore timeout
```

Stessa logica per i carousel items nella funzione `publishCarousel`.

### Risultato atteso
I post verranno pubblicati correttamente su Instagram, con un'attesa automatica di pochi secondi per permettere a Instagram di elaborare le immagini.
