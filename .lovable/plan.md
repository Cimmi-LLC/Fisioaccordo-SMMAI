

## Fix: Errore caricamento foto/immagini + Generazione immagini piu' robusta

### Problemi identificati

1. **Bug reset loading**: Se il campo "descrizione" e' vuoto, `generateCarouselSlides()` setta `isGeneratingImages = true` ma poi esce senza rimetterlo a `false` (linea 29). L'app resta bloccata in stato di caricamento.

2. **Generazione immagini fallisce per rate limiting**: Le 5 immagini del carosello vengono generate tutte in parallelo. Questo causa il rate limit dell'API AI. Bisogna generarle in sequenza con retry automatico.

3. **Nessun feedback visivo quando le immagini falliscono**: L'utente non sa cosa e' successo. Bisogna mostrare un toast chiaro quando la generazione immagini fallisce e offrire un tasto "Riprova".

4. **Errore pubblicazione Instagram**: Il toast "Edge Function returned a non-2xx status code" e' un problema separato della funzione `meta-publish` (probabilmente token scaduto o immagine non accessibile). Non blocca la generazione.

### Soluzioni

**File: `src/hooks/useCarouselSlides.ts`**

- Linea 29: Aggiungere `setIsGeneratingImages(false)` prima del `return` quando il topic e' vuoto
- Cambiare `generateImagesForSlides` da parallelo a **sequenziale con retry**: generare 1 immagine alla volta con 1 retry automatico e 2 secondi di pausa tra una e l'altra per evitare rate limiting
- Aggiungere un toast di errore quando tutte le immagini falliscono
- Aggiungere un toast di avviso quando alcune immagini falliscono (es. "3 su 5 immagini generate")

**File: `supabase/functions/generate-carousel-images/index.ts`**

- Cambiare da `Promise.all` (parallelo) a **generazione sequenziale** con delay di 2 secondi tra le immagini
- Aggiungere retry automatico (1 tentativo) per ogni immagine che fallisce
- Migliorare il logging per diagnostica

**File: `src/components/PreviewSection.tsx`**

- Aggiungere un tasto "Rigenera Immagini" visibile quando le immagini non sono state generate (slides senza `imageUrl`)
- Mostrare un messaggio chiaro "Immagini non disponibili - clicca per rigenerare" invece di slide vuote

### Dettagli tecnici

**Edge function - generazione sequenziale con retry:**
```text
// Invece di Promise.all(imagePromises), generare una alla volta:
const results = [];
for (const slide of slides) {
  const result = await generateSingleImage(slide, index);
  if (result.error && result.error !== 'payment_required') {
    // Retry dopo 2 secondi
    await delay(2000);
    const retry = await generateSingleImage(slide, index);
    results.push(retry);
  } else {
    results.push(result);
  }
  // Pausa tra le immagini per evitare rate limit
  if (index < slides.length - 1) await delay(1500);
}
```

**useCarouselSlides - fix return anticipato:**
```text
if (!topic.trim()) {
  setIsGeneratingImages(false);
  return;
}
```

**useCarouselSlides - toast feedback:**
```text
// Dopo la generazione immagini
const successCount = data.images.filter(img => img.url).length;
const totalCount = data.images.length;
if (successCount === 0) {
  toast({ title: "Immagini non generate", description: "Riprova tra qualche secondo", variant: "destructive" });
} else if (successCount < totalCount) {
  toast({ title: `${successCount}/${totalCount} immagini generate`, description: "Alcune immagini non sono state create" });
}
```

**PreviewSection - tasto rigenera:**
```text
// Sotto le slide, se hanno imageUrl mancanti
{carouselSlides.some(s => !s.imageUrl) && !isGeneratingImages && (
  <Button onClick={onRegenerateImages} variant="outline" size="sm">
    Rigenera Immagini
  </Button>
)}
```

### Risultato
- Le immagini vengono generate una alla volta, evitando il rate limit
- Se un'immagine fallisce, viene ritentata automaticamente
- L'utente vede sempre un messaggio chiaro su cosa e' successo
- C'e' un tasto per rigenerare le immagini se qualcuna manca
- Il bug del loading infinito e' corretto
