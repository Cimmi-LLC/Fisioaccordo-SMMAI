

## Fix: Errore "richiede almeno un'immagine" quando le slide esistono

### Il problema
La slide che vedi nell'anteprima e' renderizzata come HTML (testo su sfondo colorato tramite il template engine). Ma Instagram ha bisogno di un'immagine vera (un URL di file immagine), non di HTML. Il campo `imageUrl` sulla slide e' `undefined` perche' la generazione AI delle immagini e' fallita o non e' ancora completata.

Quando clicchi "Pubblica su Instagram", il codice controlla se esiste un `imageUrl` reale -- non lo trova e mostra l'errore.

### Soluzione

**File: `src/components/MainContent.tsx`**

1. Se `isGeneratingImages` e' true quando l'utente clicca "Pubblica", mostrare: "Attendi il completamento della generazione immagini..." invece dell'errore attuale
2. Se le slide esistono ma non hanno immagini (generazione fallita), mostrare un messaggio piu' chiaro: "La generazione immagini non e' riuscita. Carica una foto manualmente o riprova a generare il contenuto."
3. Aggiungere come fallback: se ci sono slide senza immagini, provare a usare `basePhoto` come immagine per tutte le slide

**File: `src/components/PreviewSection.tsx`**

4. Disabilitare il pulsante "Pubblica su Instagram" mentre `isGeneratingImages` e' true, con testo "Generazione immagini..." per evitare che l'utente clicchi prima che le immagini siano pronte

### Dettagli tecnici

**MainContent.tsx - handlePublish (riga 118-122):**
```text
// Prima del check imageUrl, aggiungere:
if (isGeneratingImages) {
  toast({ title: "⏳ Attendi", description: "Le immagini sono ancora in fase di creazione. Riprova tra qualche secondo." });
  return;
}

// Modificare il messaggio di errore:
if (!imageUrl) {
  errors.push("La generazione immagini non e' riuscita. Carica una foto o riprova a generare il contenuto.");
  continue;
}
```

**SmartCopyActions.tsx:**
- Passare `isGeneratingImages` come prop
- Disabilitare il pulsante "Pubblica su Instagram" quando `isGeneratingImages === true`
- Mostrare testo "⏳ Generazione immagini..." sul pulsante durante il caricamento

