

## Fix Pubblicazione Instagram - Analisi Completa

### Problemi trovati

Ho analizzato tutto il flusso e trovato **3 problemi critici**:

**1. L'immagine non viene trovata**
Il pulsante "Pubblica su X Piattaforme" usa solo `basePhoto` (la foto caricata nel form) come immagine. Se non hai caricato una foto base ma hai slide nel carosello con immagini, il sistema pensa che non ci siano immagini e **salta Instagram silenziosamente**.

**2. Il messaggio "Pubblicato!" appare anche se Instagram viene saltato**
Quando manca l'immagine, il codice fa `continue` (salta Instagram) ma dopo il ciclo mostra comunque il toast "Pubblicato!" -- quindi sembra che abbia pubblicato quando in realta' non ha fatto nulla.

**3. I pulsanti "Pubblica su Instagram/Facebook" nella preview NON pubblicano via API**
I pulsanti in SmartCopyActions copiano il testo, scaricano le immagini e aprono il browser. Non chiamano la funzione di pubblicazione diretta via Meta API.

### Soluzione

**File: `src/components/MainContent.tsx`**
- Modificare `handlePublish` per usare anche le immagini delle carousel slides, non solo `basePhoto`
- Aggiungere un contatore di pubblicazioni riuscite per mostrare il messaggio corretto
- Mostrare un errore chiaro se nessuna piattaforma e' stata effettivamente pubblicata

**File: `src/components/SmartCopyActions.tsx`**
- Aggiungere un nuovo pulsante "Pubblica Direttamente su Instagram" che chiama la Meta API (separato dal pulsante copia+apri)
- Questo pulsante usera' la connessione Meta esistente per pubblicare davvero il post

### Dettagli tecnici

**MainContent.tsx - handlePublish:**
```text
Invece di:
  const imageUrl = basePhoto || undefined;

Fare:
  const imageUrl = basePhoto 
    || carouselSlides.find(s => s.userImageUrl || s.imageUrl)?.userImageUrl 
    || carouselSlides.find(s => s.userImageUrl || s.imageUrl)?.imageUrl 
    || undefined;

Aggiungere contatore:
  let publishedCount = 0;
  // dopo ogni pubblicazione riuscita: publishedCount++;
  // alla fine: se publishedCount === 0, mostrare errore
```

**SmartCopyActions.tsx:**
- Ricevere `onPublishDirect` come prop opzionale
- Aggiungere pulsante "Pubblica Direttamente" che chiama `onPublishDirect(['instagram'])`
- Mantenere i pulsanti esistenti per il flusso copia+apri

