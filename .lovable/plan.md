

# Fix Upload Foto - PhotoLibrary

## Problema Identificato

L'upload delle foto non funziona. Dalle analisi:
- Le policy RLS e storage sono configurate correttamente
- Il network log non mostra NESSUNA richiesta di upload allo storage
- Il codice usa cast `as any` ovunque che nascondono errori TypeScript
- Se il file supera 10MB viene saltato silenziosamente senza avvisare l'utente

## Causa Probabile

Il hook `useUserPhotos.ts` usa `as any` per bypassare errori di tipo con la tabella `user_photos`. Questo potrebbe causare errori runtime silenziosi. Inoltre il componente `PhotoLibrary` non mostra alcun feedback se il file viene scartato per dimensione.

## Correzioni

### 1. Fix `src/hooks/useUserPhotos.ts`
- Rimuovere i cast `as any` e usare i tipi corretti dal database
- Aggiungere logging dettagliato per catturare eventuali errori
- Verificare che `user.id` sia disponibile prima dell'upload

### 2. Fix `src/components/PhotoLibrary.tsx`
- Aggiungere toast di errore quando il file supera 10MB
- Aggiungere logging per debug
- Mostrare stato di caricamento per ogni file

### 3. Aggiornare `src/integrations/supabase/types.ts`
- Verificare che la tabella `user_photos` sia presente nei tipi (potrebbe non essere stata aggiornata dopo la migrazione)

## Dettagli Tecnici

I file da modificare sono:

**`src/hooks/useUserPhotos.ts`**: Sostituire tutti i cast `as any` con tipi corretti. Aggiungere `console.error` dettagliato prima del `throw` per ogni errore.

**`src/components/PhotoLibrary.tsx`**: Aggiungere nel loop `handleFileSelect` un toast quando `file.size > 10MB` invece del semplice `continue`. Aggiungere un `console.log` quando il file viene selezionato per verificare che l'evento scatta.

