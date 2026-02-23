

## Fix completo: Pubblicazione Instagram e barra di caricamento

### Problema 1: Connessione duplicata nel database

Nel database ci sono DUE connessioni attive:
- `32f48d34` - Token valido (scade aprile 2026), username: attiliocimminiello
- `dff701c2` - Token SCADUTO (22 febbraio 2026), senza username

Il codice potrebbe usare quella sbagliata. Inoltre, lo step di disattivazione delle vecchie connessioni in `meta-auth` potrebbe non funzionare correttamente a causa di una race condition.

**Soluzione:**
- In `metaService.ts` > `getConnections()`: filtrare connessioni con token non scaduto
- In `meta-auth/index.ts`: assicurarsi che la disattivazione delle vecchie connessioni avvenga prima dell'inserimento

### Problema 2: Barra di caricamento ferma al 30%

In `useContentGeneration.ts`, il progress viene impostato al 30% (riga 52) prima della chiamata API. Se la generazione riesce ma poi l'utente clicca "Pubblica", il `handlePublish` in `MainContent.tsx` non gestisce il loading state globale. Se la pubblicazione fallisce, il loading non viene resettato.

**Soluzione:**
- Aggiungere `loadingState.startLoading` / `finishLoading` nel `handlePublish` di `MainContent.tsx`
- Aggiungere progressi graduali durante la pubblicazione (30% -> 60% -> 100%)

### Problema 3: CORS headers incompleti in meta-auth

Il file `meta-auth/index.ts` ha CORS headers ridotti rispetto al formato richiesto da Supabase. Questo potrebbe causare errori di preflight.

**Soluzione:**
- Aggiornare i CORS headers in `meta-auth/index.ts` per includere tutti gli headers necessari

### Modifiche tecniche

**File 1: `supabase/functions/meta-auth/index.ts`**
- Aggiornare CORS headers da `'authorization, x-client-info, apikey, content-type'` alla versione completa con tutti gli headers Supabase

**File 2: `src/services/metaService.ts`**
- In `getConnections()`: aggiungere filtro `token_expires_at > now()` per escludere connessioni scadute
- Oppure filtrare lato client controllando la data di scadenza

**File 3: `src/components/MainContent.tsx`**
- Nel `handlePublish`: aggiungere gestione loading state con progress incrementale
- Aggiungere `try/finally` per garantire che il loading venga resettato anche in caso di errore

```text
// In handlePublish:
loadingState.startLoading('Pubblicazione in corso...');
loadingState.updateProgress(30, 'Connessione a Instagram...');
// ... dopo la chiamata API
loadingState.updateProgress(80, 'Invio contenuto...');
// ... dopo successo/errore
loadingState.finishLoading(success, message);
```

**File 4: `supabase/functions/meta-publish/index.ts`**
- Il codice form-urlencoded e' gia' corretto dall'ultimo deploy
- Aggiungere un log iniziale per confermare che la versione deployata sia quella aggiornata

### Risultato atteso

- Solo la connessione con token valido verra' usata
- La barra di caricamento mostrera' il progresso reale e si resettera' sempre
- I CORS non bloccheranno le chiamate
- Messaggi di errore chiari in caso di problemi

